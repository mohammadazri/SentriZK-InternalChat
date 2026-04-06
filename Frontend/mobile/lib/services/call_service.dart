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
  outgoing,   // caller waiting — receiver status unknown
  ringing,    // caller sees "Ringing..." — receiver is online
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
  Function(bool isReceiverOnline)? onRingingStatusChanged;

  // ── Internal state ──
  final FirebaseFirestore _firestore = FirebaseFirestore.instance;
  RTCPeerConnection? _pc;
  MediaStream? _localStream;
  MediaStream? _remoteStream;
  CallState _state = CallState.idle;
  CallInfo? _currentCall;
  String? _currentUserId;
  bool _receiverOnline = false;
  final List<RTCIceCandidate> _remoteIceBuffer = [];
  bool _isCleaningUp = false; // Guard against concurrent cleanup

  StreamSubscription? _callDocSub;
  StreamSubscription? _iceSub;
  StreamSubscription? _incomingCallSub;
  StreamSubscription? _receiverStatusSub;
  Timer? _missedCallTimer;

  // ── ICE config ──
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

  void init(String userId) {
    _currentUserId = userId;
    _listenForIncomingCalls();
  }

  void dispose() {
    _incomingCallSub?.cancel();
    _callDocSub?.cancel();
    _iceSub?.cancel();
    _receiverStatusSub?.cancel();
    _missedCallTimer?.cancel();
    _cleanup('dispose');
  }

  // ══════════════════════════════════════════════════════════════
  // 1. CALLER: Start a call
  // ══════════════════════════════════════════════════════════════

  Future<void> startCall(String receiverId, CallType type) async {
    if (_state != CallState.idle) {
      debugPrint('⚠️ [CALL] startCall ignored — state=$_state');
      return;
    }
    final callerId = _currentUserId!;

    final callId = '${callerId}_${receiverId}_${DateTime.now().millisecondsSinceEpoch}';
    _currentCall = CallInfo(
      callId: callId,
      callerId: callerId,
      receiverId: receiverId,
      type: type,
      startedAt: DateTime.now(),
    );

    debugPrint('📞 [CALL] Starting $type call to $receiverId (callId=$callId)');
    _setState(CallState.outgoing);

    try {
      _localStream = await _getUserMedia(type);
      onLocalStream?.call(_localStream!);

      _pc = await createPeerConnection(_rtcConfig);
      _registerPeerCallbacks();

      for (final track in _localStream!.getTracks()) {
        await _pc!.addTrack(track, _localStream!);
      }

      final offer = await _pc!.createOffer({
        'offerToReceiveAudio': true,
        'offerToReceiveVideo': type == CallType.video,
      });
      await _pc!.setLocalDescription(offer);

      await _firestore.collection('calls').doc(callId).set({
        'callerId': callerId,
        'receiverId': receiverId,
        'type': type.name,
        'status': 'outgoing',
        'offer': {'type': offer.type, 'sdp': offer.sdp},
        'createdAt': FieldValue.serverTimestamp(),
      });

      _listenForCallDoc(callId);
      _listenForRemoteIce(callId, receiverId);
      _watchReceiverStatus(receiverId);
      _startMissedCallTimer();

      debugPrint('✅ [CALL] Offer sent, listeners started.');
    } catch (e) {
      debugPrint('💥 [CALL] Error starting call: $e');
      _setState(CallState.ended);
      await _cleanup('startCall-error');
      rethrow;
    }
  }

  // ══════════════════════════════════════════════════════════════
  // 2. RECEIVER: Accept a call
  // ══════════════════════════════════════════════════════════════

  Future<void> acceptCall(CallInfo call, Map<String, dynamic> offerData) async {
    if (_state != CallState.incoming) {
      debugPrint('⚠️ [CALL] acceptCall ignored — state=$_state');
      return;
    }
    _currentCall = call;
    _setState(CallState.connecting);

    debugPrint('📞 [CALL] Accepting call from ${call.callerId} (callId=${call.callId})');

    try {
      _localStream = await _getUserMedia(call.type);
      onLocalStream?.call(_localStream!);

      _pc = await createPeerConnection(_rtcConfig);
      _registerPeerCallbacks();

      for (final track in _localStream!.getTracks()) {
        await _pc!.addTrack(track, _localStream!);
      }

      debugPrint('📡 [CALL] Setting remote offer...');
      await _pc!.setRemoteDescription(
        RTCSessionDescription(offerData['sdp'], offerData['type']),
      );

      final answer = await _pc!.createAnswer();
      await _pc!.setLocalDescription(answer);

      // Listen for remote ICE BEFORE writing answer to Firestore.
      // This ensures we're ready to receive candidates as soon as the
      // caller processes our answer and begins sending candidates.
      _listenForRemoteIce(call.callId, call.callerId);

      // Process any buffered ICE candidates that arrived while we
      // were setting up the peer connection.
      await _processBufferedIceCandidates();

      // NOW write the answer to Firestore — this triggers the caller
      // to set our answer as remote description.
      debugPrint('📡 [CALL] Writing answer to Firestore...');
      await _firestore.collection('calls').doc(call.callId).update({
        'status': 'active',
        'answer': {'type': answer.type, 'sdp': answer.sdp},
      });

      debugPrint('✅ [CALL] Answer sent, connection setup complete.');
    } catch (e) {
      debugPrint('💥 [CALL] Error accepting call: $e');
      _setState(CallState.ended);
      await _cleanup('acceptCall-error');
      rethrow;
    }
  }

  // ══════════════════════════════════════════════════════════════
  // 3. End / Reject
  // ══════════════════════════════════════════════════════════════

  Future<void> endCall() async {
    if (_currentCall == null) return;
    debugPrint('📞 [CALL] endCall() called, state=$_state');
    try {
      await _firestore.collection('calls').doc(_currentCall!.callId).update({
        'status': 'ended',
        'endedAt': FieldValue.serverTimestamp(),
      });
    } catch (_) {}
    await _cleanup('endCall');
  }

  Future<void> rejectCall(String callId) async {
    debugPrint('📞 [CALL] rejectCall() called');
    _setState(CallState.rejected);
    try {
      await _firestore.collection('calls').doc(callId).update({
        'status': 'rejected',
      });
    } catch (_) {}
    await _cleanup('rejectCall');
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
      if (candidate == null) {
        debugPrint('📡 [CALL] ICE gathering complete (null candidate).');
        return;
      }

      debugPrint('📡 [CALL] Local ICE: ${candidate.candidate?.substring(0, 30)}...');
      try {
        await _firestore
            .collection('calls')
            .doc(_currentCall!.callId)
            .collection('ice')
            .add({
          'senderId': _currentUserId,
          'candidate': candidate.toMap(),
          'ts': FieldValue.serverTimestamp(),
        });
      } catch (e) {
        debugPrint('💥 [CALL] Error writing ICE candidate: $e');
      }
    };

    _pc!.onTrack = (event) {
      debugPrint('📡 [CALL] onTrack: streams=${event.streams.length}');
      if (event.streams.isNotEmpty) {
        _remoteStream = event.streams.first;
        onRemoteStream?.call(_remoteStream!);
      }
    };

    _pc!.onIceConnectionState = (iceState) {
      debugPrint('📡 [CALL] ICE state: $iceState (callState=$_state)');
      if (iceState == RTCIceConnectionState.RTCIceConnectionStateConnected ||
          iceState == RTCIceConnectionState.RTCIceConnectionStateCompleted) {
        _setState(CallState.active);
      } else if (iceState == RTCIceConnectionState.RTCIceConnectionStateFailed) {
        debugPrint('💥 [CALL] ICE FAILED — ending call');
        endCall();
      }
      // NOTE: We intentionally do NOT call endCall on "disconnected" —
      // disconnected is often temporary (network switch) and may recover.
      // We also do NOT call endCall on "closed" — that's a result of
      // cleanup, not a trigger for it.
    };

    _pc!.onConnectionState = (state) {
      debugPrint('📡 [CALL] PeerConnection state: $state');
    };
  }

  // ══════════════════════════════════════════════════════════════
  // Private: Firestore listeners
  // ══════════════════════════════════════════════════════════════

  void _listenForIncomingCalls() {
    _incomingCallSub?.cancel();
    _incomingCallSub = _firestore
        .collection('calls')
        .where('receiverId', isEqualTo: _currentUserId)
        .where('status', whereIn: ['outgoing', 'ringing'])
        .snapshots()
        .handleError((e) {
      if (e.toString().contains('permission-denied') || e.toString().contains('PERMISSION_DENIED')) {
        debugPrint('🔒 [CALL] Ignoring permission-denied in incoming calls listener.');
      } else {
        debugPrint('🔥 [CALL] Error in _listenForIncomingCalls: $e');
      }
    }).listen((snapshot) {
      for (final change in snapshot.docChanges) {
        if (change.type == DocumentChangeType.added) {
          // Only handle if we're idle — prevents re-processing
          if (_state != CallState.idle) {
            debugPrint('⚠️ [CALL] Incoming call ignored — already in state=$_state');
            continue;
          }

          final data = change.doc.data()!;
          final callInfo = CallInfo(
            callId: change.doc.id,
            callerId: data['callerId'],
            receiverId: data['receiverId'],
            type: data['type'] == 'video' ? CallType.video : CallType.audio,
            startedAt: DateTime.now(),
          );

          debugPrint('📞 [CALL] Incoming call from ${data['callerId']} (callId=${change.doc.id})');
          _setState(CallState.incoming);
          _currentCall = callInfo;
          onIncomingCall?.call(callInfo);

          // Tell the caller we are online
          _firestore.collection('calls').doc(change.doc.id).update({
            'status': 'ringing',
          }).catchError((_) {});

          // Listen for caller hangup or status changes
          _listenForCallDoc(change.doc.id);

        } else if (change.type == DocumentChangeType.removed) {
          // Document left the query (status changed from outgoing/ringing).
          // This happens when:
          //   A) Caller cancelled before we answered (status → ended/missed)
          //   B) We accepted and changed status to 'active'
          //
          // We ONLY clean up for case A — when we're still in 'incoming' state.
          if (_currentCall?.callId == change.doc.id && _state == CallState.incoming) {
            debugPrint('📡 [CALL] Call doc removed while incoming — caller cancelled.');
            _setState(CallState.missed);
            _cleanup('incoming-removed');
          } else {
            debugPrint('📡 [CALL] Call doc removed (state=$_state) — ignoring (expected after accept).');
          }
        }
      }
    });
  }

  /// Listen for call document changes (answer from receiver, hangup, etc.)
  void _listenForCallDoc(String callId) {
    _callDocSub?.cancel();
    _callDocSub = _firestore.collection('calls').doc(callId).snapshots().handleError((e) {
      if (e.toString().contains('permission-denied') || e.toString().contains('PERMISSION_DENIED')) {
        debugPrint('🔒 [CALL] Ignoring permission-denied in call doc listener.');
      } else {
        debugPrint('🔥 [CALL] Error in _listenForCallDoc: $e');
      }
    }).listen((snap) async {
      if (!snap.exists) return;
      final data = snap.data()!;
      final status = data['status'] as String?;
      debugPrint('📡 [CALL] _listenForCallDoc: status=$status, myState=$_state');

      // ── CALLER: Receiver came online →  "Ringing"
      if (status == 'ringing' && _state == CallState.outgoing) {
        _setState(CallState.ringing);
      }

      // ── CALLER: Receiver accepted → set remote description (the answer)
      if (status == 'active' && data['answer'] != null && _pc != null) {
        // Only the CALLER needs to set the answer. The receiver already
        // has the offer set. Check that we're the caller by verifying
        // we're in outgoing/ringing state (not connecting/active).
        if (_state == CallState.outgoing || _state == CallState.ringing) {
          final answerData = data['answer'] as Map<String, dynamic>;
          debugPrint('📡 [CALL] Received answer — setting remote description...');
          _missedCallTimer?.cancel();

          try {
            await _pc!.setRemoteDescription(
              RTCSessionDescription(answerData['sdp'], answerData['type']),
            );
            debugPrint('✅ [CALL] Remote description (answer) set successfully.');
            _setState(CallState.connecting);

            await _processBufferedIceCandidates();
          } catch (e) {
            debugPrint('💥 [CALL] Error setting remote description: $e');
            endCall();
          }
        }
      }

      // ── Both sides: call ended by other party
      if (status == 'ended' || status == 'rejected') {
        if (_state != CallState.idle && _state != CallState.ended) {
          debugPrint('📡 [CALL] Call $status by remote — cleaning up.');
          _setState(status == 'rejected' ? CallState.rejected : CallState.ended);
          await _cleanup('callDoc-$status');
        }
      }
      if (status == 'missed') {
        if (_state != CallState.idle) {
          debugPrint('📡 [CALL] Call missed — cleaning up.');
          _setState(CallState.missed);
          await _cleanup('callDoc-missed');
        }
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
        .handleError((e) {
      if (e.toString().contains('permission-denied') || e.toString().contains('PERMISSION_DENIED')) {
        debugPrint('🔒 [CALL] Ignoring ICE permission-denied.');
      } else {
        debugPrint('🔥 [CALL] Error in _listenForRemoteIce: $e');
      }
    }).listen((snapshot) async {
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

            if (_pc != null) {
              try {
                final remoteDesc = await _pc!.getRemoteDescription();
                if (remoteDesc != null) {
                  debugPrint('📡 [CALL] Adding remote ICE: ${candidate.candidate?.substring(0, 30)}...');
                  await _pc!.addCandidate(candidate);
                } else {
                  debugPrint('⏳ [CALL] Buffering ICE candidate (no remote desc yet)');
                  _remoteIceBuffer.add(candidate);
                }
              } catch (e) {
                debugPrint('💥 [CALL] Error adding ICE candidate: $e');
              }
            } else {
              debugPrint('⏳ [CALL] Buffering ICE candidate (_pc is null)');
              _remoteIceBuffer.add(candidate);
            }
          }
        }
      }
    });
  }

  Future<void> _processBufferedIceCandidates() async {
    if (_pc == null || _remoteIceBuffer.isEmpty) return;

    debugPrint('📡 [CALL] Applying ${_remoteIceBuffer.length} buffered ICE candidates...');
    final candidates = List<RTCIceCandidate>.from(_remoteIceBuffer);
    _remoteIceBuffer.clear();

    for (final candidate in candidates) {
      try {
        await _pc!.addCandidate(candidate);
      } catch (e) {
        debugPrint('💥 [CALL] Error applying buffered ICE: $e');
      }
    }
  }

  // ══════════════════════════════════════════════════════════════
  // Private: Helpers
  // ══════════════════════════════════════════════════════════════

  void _setState(CallState newState) {
    debugPrint('📡 [CALL] State: $_state → $newState');
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

  void _watchReceiverStatus(String receiverId) {
    _receiverStatusSub?.cancel();
    _receiverStatusSub = _firestore
        .collection('users')
        .doc(receiverId)
        .snapshots()
        .handleError((e) {
      if (e.toString().contains('permission-denied') || e.toString().contains('PERMISSION_DENIED')) {
        debugPrint('🔒 [CALL] Ignoring receiver status permission-denied.');
      } else {
        debugPrint('🔥 [CALL] Error in _watchReceiverStatus: $e');
      }
    }).listen((snap) {
      if (!snap.exists) return;
      final data = snap.data()!;
      final status = data['activityStatus'] as String? ?? 'Offline';
      _receiverOnline = (status == 'Online');
      onRingingStatusChanged?.call(_receiverOnline);
    });
  }

  void _startMissedCallTimer() {
    _missedCallTimer?.cancel();
    _missedCallTimer = Timer(const Duration(seconds: 45), () {
      if (_state == CallState.outgoing || _state == CallState.ringing) {
        debugPrint('⏰ [CALL] Missed call timer fired.');
        if (_currentCall != null) {
          _firestore.collection('calls').doc(_currentCall!.callId).update({
            'status': 'missed',
            'endedAt': FieldValue.serverTimestamp(),
          }).catchError((_) {});
        }
        _setState(CallState.missed);
        _cleanup('missedTimer');
      }
    });
  }

  Future<void> _cleanup(String caller) async {
    if (_isCleaningUp) {
      debugPrint('⚠️ [CALL] _cleanup($caller) skipped — already cleaning up.');
      return;
    }
    _isCleaningUp = true;
    debugPrint('🧹 [CALL] _cleanup($caller) — state=$_state, pc=${_pc != null}, localStream=${_localStream != null}');

    _callDocSub?.cancel();
    _iceSub?.cancel();
    _receiverStatusSub?.cancel();
    _missedCallTimer?.cancel();
    _callDocSub = null;
    _iceSub = null;
    _receiverStatusSub = null;
    _missedCallTimer = null;
    _receiverOnline = false;

    try {
      _localStream?.getTracks().forEach((t) => t.stop());
      _localStream?.dispose();
    } catch (e) {
      debugPrint('⚠️ [CALL] Error disposing local stream: $e');
    }
    try {
      _remoteStream?.dispose();
    } catch (e) {
      debugPrint('⚠️ [CALL] Error disposing remote stream: $e');
    }
    _localStream = null;
    _remoteStream = null;

    try {
      await _pc?.close();
    } catch (e) {
      debugPrint('⚠️ [CALL] Error closing peer connection: $e');
    }
    _pc = null;

    _remoteIceBuffer.clear();
    _currentCall = null;
    _isCleaningUp = false;

    if (_state != CallState.idle) {
      _setState(CallState.idle);
    }
  }
}
