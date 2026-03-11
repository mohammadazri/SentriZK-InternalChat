import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_webrtc/flutter_webrtc.dart';
import '../services/call_service.dart';

class CallScreen extends StatefulWidget {
  final String currentUserId;
  final String peerId;
  final String peerName;
  final CallType callType;
  final bool isIncoming;
  final CallInfo? incomingCallInfo;
  final Map<String, dynamic>? incomingOfferData;

  const CallScreen({
    super.key,
    required this.currentUserId,
    required this.peerId,
    required this.peerName,
    required this.callType,
    this.isIncoming = false,
    this.incomingCallInfo,
    this.incomingOfferData,
  });

  @override
  State<CallScreen> createState() => _CallScreenState();
}

class _CallScreenState extends State<CallScreen> with TickerProviderStateMixin {
  final CallService _callService = CallService();
  final RTCVideoRenderer _localRenderer = RTCVideoRenderer();
  final RTCVideoRenderer _remoteRenderer = RTCVideoRenderer();

  bool _isMuted = false;
  bool _isCameraOff = false;
  bool _isSpeaker = false;
  bool _isFrontCamera = true;
  CallState _callState = CallState.idle;
  bool _isReceiverOnline = false;
  Timer? _durationTimer;
  int _callDuration = 0;

  late AnimationController _pulseController;

  @override
  void initState() {
    super.initState();
    _initRenderers();
    _pulseController = AnimationController(
      duration: const Duration(milliseconds: 1500),
      vsync: this,
    )..repeat(reverse: true);
  }

  Future<void> _initRenderers() async {
    await _localRenderer.initialize();
    await _remoteRenderer.initialize();

    _callService.onLocalStream = (stream) {
      setState(() {
        _localRenderer.srcObject = stream;
      });
    };

    _callService.onRemoteStream = (stream) {
      setState(() {
        _remoteRenderer.srcObject = stream;
      });
    };

    _callService.onStateChanged = (state) {
      if (!mounted) return;
      setState(() {
        _callState = state;
      });

      if (state == CallState.active) {
        _startDurationTimer();
      }

      if (state == CallState.ended || state == CallState.rejected ||
          state == CallState.missed || state == CallState.idle) {
        _durationTimer?.cancel();
        if (mounted) {
          Future.delayed(const Duration(milliseconds: 800), () {
            if (mounted) Navigator.of(context).pop();
          });
        }
      }
    };

    _callService.onRingingStatusChanged = (isOnline) {
      if (!mounted) return;
      setState(() {
        _isReceiverOnline = isOnline;
        if (isOnline && _callState == CallState.outgoing) {
          _callState = CallState.ringing;
        }
      });
    };

    // Start or accept call
    if (widget.isIncoming && widget.incomingCallInfo != null && widget.incomingOfferData != null) {
      await _callService.acceptCall(widget.incomingCallInfo!, widget.incomingOfferData!);
    } else {
      await _callService.startCall(widget.peerId, widget.callType);
    }
  }

  void _startDurationTimer() {
    _durationTimer?.cancel();
    _callDuration = 0;
    _durationTimer = Timer.periodic(const Duration(seconds: 1), (_) {
      if (mounted) {
        setState(() => _callDuration++);
      }
    });
  }

  String _formatDuration(int seconds) {
    final m = (seconds ~/ 60).toString().padLeft(2, '0');
    final s = (seconds % 60).toString().padLeft(2, '0');
    return '$m:$s';
  }

  @override
  void dispose() {
    _pulseController.dispose();
    _durationTimer?.cancel();
    _localRenderer.dispose();
    _remoteRenderer.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final isVideo = widget.callType == CallType.video;
    final isActive = _callState == CallState.active;

    return Scaffold(
      backgroundColor: const Color(0xFF0F172A),
      body: Stack(
        children: [
          // ── Background: Remote video or Audio avatar ──
          if (isVideo && isActive)
            Positioned.fill(
              child: RTCVideoView(
                _remoteRenderer,
                objectFit: RTCVideoViewObjectFit.RTCVideoViewObjectFitCover,
              ),
            )
          else
            Positioned.fill(
              child: Container(
                decoration: const BoxDecoration(
                  gradient: LinearGradient(
                    begin: Alignment.topCenter,
                    end: Alignment.bottomCenter,
                    colors: [Color(0xFF1E293B), Color(0xFF0F172A)],
                  ),
                ),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    // Pulsing avatar
                    AnimatedBuilder(
                      animation: _pulseController,
                      builder: (context, child) {
                        final scale = 1.0 + (_pulseController.value * 0.05);
                        return Transform.scale(
                          scale: isActive ? 1.0 : scale,
                          child: child,
                        );
                      },
                      child: Container(
                        width: 120,
                        height: 120,
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          gradient: const LinearGradient(
                            colors: [Color(0xFF2563EB), Color(0xFF3B82F6)],
                          ),
                          boxShadow: [
                            BoxShadow(
                              color: const Color(0xFF3B82F6).withOpacity(0.3),
                              blurRadius: 30,
                              spreadRadius: 5,
                            ),
                          ],
                        ),
                        child: Center(
                          child: Text(
                            _getInitials(widget.peerName),
                            style: const TextStyle(
                              color: Colors.white,
                              fontSize: 40,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(height: 24),
                    Text(
                      widget.peerName,
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 28,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      _getStatusText(),
                      style: TextStyle(
                        color: Colors.white.withOpacity(0.6),
                        fontSize: 16,
                      ),
                    ),
                  ],
                ),
              ),
            ),

          // ── Local video PiP (top right) ──
          if (isVideo && isActive)
            Positioned(
              top: MediaQuery.of(context).padding.top + 16,
              right: 16,
              child: ClipRRect(
                borderRadius: BorderRadius.circular(16),
                child: SizedBox(
                  width: 120,
                  height: 160,
                  child: RTCVideoView(
                    _localRenderer,
                    mirror: _isFrontCamera,
                    objectFit: RTCVideoViewObjectFit.RTCVideoViewObjectFitCover,
                  ),
                ),
              ),
            ),

          // ── Top bar: encryption badge + duration ──
          Positioned(
            top: MediaQuery.of(context).padding.top + 8,
            left: 16,
            child: SafeArea(
              child: Row(
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                    decoration: BoxDecoration(
                      color: Colors.black.withOpacity(0.4),
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(color: const Color(0xFF10B981).withOpacity(0.3)),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Icon(Icons.lock_rounded, size: 14, color: Color(0xFF10B981)),
                        const SizedBox(width: 4),
                        Text(
                          isActive ? _formatDuration(_callDuration) : 'Encrypted',
                          style: const TextStyle(color: Color(0xFF10B981), fontSize: 12, fontWeight: FontWeight.w600),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),

          // ── Bottom controls ──
          Positioned(
            bottom: 0,
            left: 0,
            right: 0,
            child: Container(
              padding: EdgeInsets.only(
                top: 24,
                bottom: MediaQuery.of(context).padding.bottom + 24,
                left: 24,
                right: 24,
              ),
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topCenter,
                  end: Alignment.bottomCenter,
                  colors: [
                    Colors.transparent,
                    Colors.black.withOpacity(0.6),
                    Colors.black.withOpacity(0.9),
                  ],
                ),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                children: [
                  // Mute
                  _ControlButton(
                    icon: _isMuted ? Icons.mic_off_rounded : Icons.mic_rounded,
                    label: _isMuted ? 'Unmute' : 'Mute',
                    isActive: _isMuted,
                    onTap: () {
                      _callService.toggleMute();
                      setState(() => _isMuted = !_isMuted);
                    },
                  ),

                  // Camera toggle (video only)
                  if (isVideo)
                    _ControlButton(
                      icon: _isCameraOff ? Icons.videocam_off_rounded : Icons.videocam_rounded,
                      label: _isCameraOff ? 'Camera On' : 'Camera Off',
                      isActive: _isCameraOff,
                      onTap: () {
                        _callService.toggleCamera();
                        setState(() => _isCameraOff = !_isCameraOff);
                      },
                    ),

                  // End call
                  _ControlButton(
                    icon: Icons.call_end_rounded,
                    label: 'End',
                    isEndCall: true,
                    onTap: () => _callService.endCall(),
                  ),

                  // Speaker
                  _ControlButton(
                    icon: _isSpeaker ? Icons.volume_up_rounded : Icons.volume_down_rounded,
                    label: _isSpeaker ? 'Earpiece' : 'Speaker',
                    isActive: _isSpeaker,
                    onTap: () {
                      setState(() => _isSpeaker = !_isSpeaker);
                      _callService.toggleSpeaker(_isSpeaker);
                    },
                  ),

                  // Switch camera (video only)
                  if (isVideo)
                    _ControlButton(
                      icon: Icons.cameraswitch_rounded,
                      label: 'Flip',
                      onTap: () {
                        _callService.switchCamera();
                        setState(() => _isFrontCamera = !_isFrontCamera);
                      },
                    ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  String _getInitials(String name) {
    final parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return '${parts[0][0]}${parts[1][0]}'.toUpperCase();
    }
    return name.isNotEmpty ? name[0].toUpperCase() : '?';
  }

  String _getStatusText() {
    switch (_callState) {
      case CallState.outgoing:
        return 'Calling...';
      case CallState.ringing:
        return 'Ringing...';
      case CallState.incoming:
        return 'Incoming call...';
      case CallState.connecting:
        return 'Connecting...';
      case CallState.active:
        return _formatDuration(_callDuration);
      case CallState.ended:
        return 'Call ended';
      case CallState.rejected:
        return 'Call declined';
      case CallState.missed:
        return 'No answer';
      default:
        return '';
    }
  }
}

// ───────────────────────────────────────────────────────────────
// Control Button Widget
// ───────────────────────────────────────────────────────────────

class _ControlButton extends StatelessWidget {
  final IconData icon;
  final String label;
  final VoidCallback onTap;
  final bool isActive;
  final bool isEndCall;

  const _ControlButton({
    required this.icon,
    required this.label,
    required this.onTap,
    this.isActive = false,
    this.isEndCall = false,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 56,
            height: 56,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: isEndCall
                  ? const Color(0xFFEF4444)
                  : (isActive
                      ? Colors.white.withOpacity(0.3)
                      : Colors.white.withOpacity(0.1)),
              border: Border.all(
                color: isEndCall
                    ? const Color(0xFFEF4444)
                    : Colors.white.withOpacity(0.15),
                width: 1.5,
              ),
            ),
            child: Icon(icon, color: Colors.white, size: 26),
          ),
          const SizedBox(height: 8),
          Text(
            label,
            style: TextStyle(
              color: Colors.white.withOpacity(0.7),
              fontSize: 11,
              fontWeight: FontWeight.w500,
            ),
          ),
        ],
      ),
    );
  }
}
