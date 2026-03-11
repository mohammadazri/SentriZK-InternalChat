import 'dart:async';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_webrtc/flutter_webrtc.dart';

// ───────────────────────────────────────────────────────────────
// Enums
// ───────────────────────────────────────────────────────────────

enum CallType { audio, video }

enum CallState {
  idle,
  outgoing,   // caller waiting for receiver to pick up
  incoming,   // receiver sees the ringing UI
  connecting, // WebRTC handshake in progress
  active,     // media flowing
  ended,      // call terminated normally
  rejected,   // receiver declined
  missed,     // receiver didn't pick up
}

// ───────────────────────────────────────────────────────────────
// Call Metadata
// ───────────────────────────────────────────────────────────────

class CallInfo {
  final String callId;
  final String callerId;
  final String receiverId;
  final CallType type;
  final DateTime startedAt;

  const CallInfo({
    required this.callId,
    required this.callerId,
    required this.receiverId,
    required this.type,
    required this.startedAt,
  });
}

// ───────────────────────────────────────────────────────────────
// Call Service
// ───────────────────────────────────────────────────────────────

class CallService {
  // Singleton
  static final CallService _instance = CallService._();
  factory CallService() => _instance;
  CallService._();

  // ── External callbacks ──
  Function(MediaStream stream)? onLocalStream;
  Function(MediaStream stream)? onRemoteStream;
  Function(CallState state)? onStateChanged;
  Function(CallInfo info)? onIncomingCall;

  // ── Internal state ──
  final FirebaseFirestore _firestore = FirebaseFirestore.instance;
  RTCPeerConnection? _pc;
  MediaStream? _localStream;
  MediaStream? _remoteStream;
  CallState _state = CallState.idle;
  CallInfo? _currentCall;
  String? _currentUserId;

  StreamSubscription? _callDocSub;
  StreamSubscription? _iceSub;
  StreamSubscription? _incomingCallSub;

  // ── ICE config with STUN + free TURN ──
  // For production, swap with Twilio or Metered TURN credentials.
  static const Map<String, dynamic> _rtcConfig = {
    'iceServers': [
      {'urls': 'stun:stun.l.google.com:19302'},
      {'urls': 'stun:stun1.l.google.com:19302'},
      {'urls': 'stun:stun2.l.google.com:19302'},
    ],
    'sdpSemantics': 'unified-plan',
  };

  // ── Public getters ──
  CallState get state => _state;
  CallInfo? get currentCall => _currentCall;
  bool get isInCall => _state == CallState.active || _state == CallState.connecting;

  // ══════════════════════════════════════════════════════════════
  // Initialization
  // ══════════════════════════════════════════════════════════════

  /// Must be called once after login with the user's ID.
  void init(String userId) {
    _currentUserId = userId;
    _listenForIncomingCalls();
  }

  /// Stop listening when user logs out.
  void dispose() {
    _incomingCallSub?.cancel();
    _callDocSub?.cancel();
    _iceSub?.cancel();
    _cleanup();
  }

  // ══════════════════════════════════════════════════════════════
  // 1. CALLER: Start a call
  // ══════════════════════════════════════════════════════════════

  Future<void> startCall(String receiverId, CallType type) async {
    if (_state != CallState.idle) return;
    final callerId = _currentUserId!;

    final callId = '${callerId}_${receiverId}_${DateTime.now().millisecondsSinceEpoch}';
    _currentCall = CallInfo(
      callId: callId,
      callerId: callerId,
      receiverId: receiverId,
      type: type,
      startedAt: DateTime.now(),
    );

    _setState(CallState.outgoing);

    // 1. Get local media
    _localStream = await _getUserMedia(type);
    onLocalStream?.call(_localStream!);

    // 2. Create peer connection
    _pc = await createPeerConnection(_rtcConfig);
    _registerPeerCallbacks();

    // 3. Add tracks
    for (final track in _localStream!.getTracks()) {
      await _pc!.addTrack(track, _localStream!);
    }

    // 4. Create offer
    final offer = await _pc!.createOffer({
      'offerToReceiveAudio': true,
      'offerToReceiveVideo': type == CallType.video,
    });
    await _pc!.setLocalDescription(offer);

    // 5. Write call document to Firestore (plain SDP — secured by Firestore rules + WebRTC DTLS)
    await _firestore.collection('calls').doc(callId).set({
      'callerId': callerId,
      'receiverId': receiverId,
      'type': type.name,
      'status': 'outgoing',
      'offer': {'type': offer.type, 'sdp': offer.sdp},
      'createdAt': FieldValue.serverTimestamp(),
    });

    // 6. Listen for answer & remote ICE
    _listenForCallDoc(callId);
    _listenForRemoteIce(callId, receiverId);
  }

  // ══════════════════════════════════════════════════════════════
  // 2. RECEIVER: Accept a call
  // ══════════════════════════════════════════════════════════════

  Future<void> acceptCall(CallInfo call, Map<String, dynamic> offerData) async {
    if (_state != CallState.incoming) return;
    _currentCall = call;
    _setState(CallState.connecting);

    // 1. Get local media
    _localStream = await _getUserMedia(call.type);
    onLocalStream?.call(_localStream!);

    // 2. Create peer connection
    _pc = await createPeerConnection(_rtcConfig);
    _registerPeerCallbacks();

    for (final track in _localStream!.getTracks()) {
      await _pc!.addTrack(track, _localStream!);
    }

    // 3. Set remote description (the offer)
    await _pc!.setRemoteDescription(
      RTCSessionDescription(offerData['sdp'], offerData['type']),
    );

    // 4. Create answer
    final answer = await _pc!.createAnswer();
    await _pc!.setLocalDescription(answer);

    // 5. Write answer to Firestore
    await _firestore.collection('calls').doc(call.callId).update({
      'status': 'active',
      'answer': {'type': answer.type, 'sdp': answer.sdp},
    });

    // 6. Listen for remote ICE
    _listenForRemoteIce(call.callId, call.callerId);
  }

  // ══════════════════════════════════════════════════════════════
  // 3. End / Reject
  // ══════════════════════════════════════════════════════════════

  Future<void> endCall() async {
    if (_currentCall == null) return;
    try {
      await _firestore.collection('calls').doc(_currentCall!.callId).update({
        'status': 'ended',
        'endedAt': FieldValue.serverTimestamp(),
      });
    } catch (_) {}
    await _cleanup();
  }

  Future<void> rejectCall(String callId) async {
    _setState(CallState.rejected);
    try {
      await _firestore.collection('calls').doc(callId).update({
        'status': 'rejected',
      });
    } catch (_) {}
    await _cleanup();
  }

  // ══════════════════════════════════════════════════════════════
  // 4. In-call controls
  // ══════════════════════════════════════════════════════════════

  void toggleMute() {
    final audioTracks = _localStream?.getAudioTracks();
    if (audioTracks != null && audioTracks.isNotEmpty) {
      audioTracks.first.enabled = !audioTracks.first.enabled;
    }
  }

  void toggleCamera() {
    final videoTracks = _localStream?.getVideoTracks();
    if (videoTracks != null && videoTracks.isNotEmpty) {
      videoTracks.first.enabled = !videoTracks.first.enabled;
    }
  }

  Future<void> switchCamera() async {
    final videoTracks = _localStream?.getVideoTracks();
    if (videoTracks != null && videoTracks.isNotEmpty) {
      await Helper.switchCamera(videoTracks.first);
    }
  }

  void toggleSpeaker(bool enabled) {
    final audioTracks = _localStream?.getAudioTracks();
    if (audioTracks != null && audioTracks.isNotEmpty) {
      audioTracks.first.enableSpeakerphone(enabled);
    }
  }

  // ══════════════════════════════════════════════════════════════
  // Private: Peer Connection callbacks
  // ══════════════════════════════════════════════════════════════

  void _registerPeerCallbacks() {
    _pc!.onIceCandidate = (candidate) async {
      if (_currentCall == null) return;
      await _firestore
          .collection('calls')
          .doc(_currentCall!.callId)
          .collection('ice')
          .add({
        'senderId': _currentUserId,
        'candidate': candidate.toMap(),
        'ts': FieldValue.serverTimestamp(),
      });
    };

    _pc!.onTrack = (event) {
      if (event.streams.isNotEmpty) {
        _remoteStream = event.streams.first;
        onRemoteStream?.call(_remoteStream!);
      }
    };

    _pc!.onIceConnectionState = (iceState) {
      debugPrint('📡 ICE state: $iceState');
      if (iceState == RTCIceConnectionState.RTCIceConnectionStateConnected ||
          iceState == RTCIceConnectionState.RTCIceConnectionStateCompleted) {
        _setState(CallState.active);
      } else if (iceState == RTCIceConnectionState.RTCIceConnectionStateFailed ||
          iceState == RTCIceConnectionState.RTCIceConnectionStateDisconnected) {
        endCall();
      }
    };
  }

  // ══════════════════════════════════════════════════════════════
  // Private: Firestore listeners
  // ══════════════════════════════════════════════════════════════

  /// Listen for incoming calls directed at this user.
  void _listenForIncomingCalls() {
    _incomingCallSub?.cancel();
    _incomingCallSub = _firestore
        .collection('calls')
        .where('receiverId', isEqualTo: _currentUserId)
        .where('status', isEqualTo: 'outgoing')
        .snapshots()
        .listen((snapshot) {
      for (final change in snapshot.docChanges) {
        if (change.type == DocumentChangeType.added) {
          final data = change.doc.data()!;
          final callInfo = CallInfo(
            callId: change.doc.id,
            callerId: data['callerId'],
            receiverId: data['receiverId'],
            type: data['type'] == 'video' ? CallType.video : CallType.audio,
            startedAt: DateTime.now(),
          );
          _setState(CallState.incoming);
          _currentCall = callInfo;
          onIncomingCall?.call(callInfo);
        }
      }
    });
  }

  /// Caller listens for answer from receiver.
  void _listenForCallDoc(String callId) {
    _callDocSub?.cancel();
    _callDocSub = _firestore.collection('calls').doc(callId).snapshots().listen((snap) async {
      if (!snap.exists) return;
      final data = snap.data()!;
      final status = data['status'] as String?;

      if (status == 'active' && data['answer'] != null && _pc != null) {
        final answerData = data['answer'] as Map<String, dynamic>;
        final remoteDesc = await _pc!.getRemoteDescription();
        if (remoteDesc == null) {
          await _pc!.setRemoteDescription(
            RTCSessionDescription(answerData['sdp'], answerData['type']),
          );
          _setState(CallState.connecting);
        }
      }

      if (status == 'ended' || status == 'rejected') {
        await _cleanup();
      }
    });
  }

  /// Both sides listen for the other side's ICE candidates.
  void _listenForRemoteIce(String callId, String peerId) {
    _iceSub?.cancel();
    _iceSub = _firestore
        .collection('calls')
        .doc(callId)
        .collection('ice')
        .snapshots()
        .listen((snapshot) async {
      for (final change in snapshot.docChanges) {
        if (change.type == DocumentChangeType.added) {
          final data = change.doc.data()!;
          if (data['senderId'] == peerId) {
            final candidateMap = data['candidate'] as Map<String, dynamic>;
            final candidate = RTCIceCandidate(
              candidateMap['candidate'],
              candidateMap['sdpMid'],
              candidateMap['sdpMLineIndex'],
            );
            await _pc?.addCandidate(candidate);
          }
        }
      }
    });
  }

  // ══════════════════════════════════════════════════════════════
  // Private: Helpers
  // ══════════════════════════════════════════════════════════════

  void _setState(CallState newState) {
    _state = newState;
    onStateChanged?.call(newState);
  }

  Future<MediaStream> _getUserMedia(CallType type) async {
    return await navigator.mediaDevices.getUserMedia({
      'audio': true,
      'video': type == CallType.video
          ? {'facingMode': 'user', 'width': 640, 'height': 480}
          : false,
    });
  }

  Future<void> _cleanup() async {
    _callDocSub?.cancel();
    _iceSub?.cancel();
    _callDocSub = null;
    _iceSub = null;

    _localStream?.getTracks().forEach((t) => t.stop());
    _localStream?.dispose();
    _remoteStream?.dispose();
    _localStream = null;
    _remoteStream = null;

    await _pc?.close();
    _pc = null;

    _currentCall = null;
    _setState(CallState.idle);
  }
}
