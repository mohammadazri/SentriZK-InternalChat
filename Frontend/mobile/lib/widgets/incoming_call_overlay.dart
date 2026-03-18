import 'dart:async';
import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import '../services/call_service.dart';
import '../screens/call_screen.dart';

/// A full-screen overlay shown when an incoming call is detected.
/// Push this as a route or show it with showDialog.
class IncomingCallOverlay extends StatefulWidget {
  final CallInfo callInfo;
  final Map<String, dynamic> offerData;

  const IncomingCallOverlay({
    super.key,
    required this.callInfo,
    required this.offerData,
  });

  @override
  State<IncomingCallOverlay> createState() => _IncomingCallOverlayState();
}

class _IncomingCallOverlayState extends State<IncomingCallOverlay>
    with SingleTickerProviderStateMixin {
  late AnimationController _pulseController;
  StreamSubscription? _callDocSub;

  @override
  void initState() {
    super.initState();
    _pulseController = AnimationController(
      duration: const Duration(milliseconds: 1200),
      vsync: this,
    )..repeat(reverse: true);
    
    // Auto-dismiss if caller hangs up or times out
    _callDocSub = FirebaseFirestore.instance
        .collection('calls')
        .doc(widget.callInfo.callId)
        .snapshots()
        .listen((snap) {
      if (snap.exists) {
        final status = snap.data()?['status'] as String?;
        if (status == 'ended' || status == 'missed' || status == 'rejected') {
          if (mounted) Navigator.of(context).pop();
        }
      } else {
        if (mounted) Navigator.of(context).pop();
      }
    });
  }

  @override
  void dispose() {
    _callDocSub?.cancel();
    _pulseController.dispose();
    super.dispose();
  }

  ImageProvider? _getAvatarProvider(String? url) {
    if (url == null || url.isEmpty) return null;
    if (url.startsWith('data:image')) {
      try {
        final base64String = url.split(',').last;
        return MemoryImage(base64Decode(base64String));
      } catch (e) {
        return null;
      }
    }
    return NetworkImage(url);
  }

  String _getInitials(String name) {
    final parts = name.trim().split(' ');
    if (parts.length >= 2) return '${parts[0][0]}${parts[1][0]}'.toUpperCase();
    return name.isNotEmpty ? name[0].toUpperCase() : '?';
  }

  @override
  Widget build(BuildContext context) {
    final isVideo = widget.callInfo.type == CallType.video;
    final callerName = widget.callInfo.callerName;
    final callerAvatar = widget.callInfo.callerAvatarUrl;

    return Scaffold(
      backgroundColor: const Color(0xFF0F172A),
      body: Container(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: [Color(0xFF1E293B), Color(0xFF0F172A)],
          ),
        ),
        child: SafeArea(
          child: Column(
            children: [
              const Spacer(flex: 2),

              // ── Encryption badge ──
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
                decoration: BoxDecoration(
                  color: const Color(0xFF10B981).withOpacity(0.1),
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(color: const Color(0xFF10B981).withOpacity(0.3)),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Icon(Icons.lock_rounded, size: 14, color: Color(0xFF10B981)),
                    const SizedBox(width: 6),
                    Text(
                      'End-to-End Encrypted',
                      style: TextStyle(
                        color: const Color(0xFF10B981).withOpacity(0.9),
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 32),

              // ── Pulsing avatar ──
              AnimatedBuilder(
                animation: _pulseController,
                builder: (context, child) {
                  return Transform.scale(
                    scale: 1.0 + (_pulseController.value * 0.08),
                    child: child,
                  );
                },
                child: Container(
                  width: 130,
                  height: 130,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    gradient: const LinearGradient(
                      colors: [Color(0xFF2563EB), Color(0xFF3B82F6)],
                    ),
                    boxShadow: [
                      BoxShadow(
                        color: const Color(0xFF3B82F6).withOpacity(0.4),
                        blurRadius: 40,
                        spreadRadius: 8,
                      ),
                    ],
                    image: _getAvatarProvider(callerAvatar) != null ? DecorationImage(
                      image: _getAvatarProvider(callerAvatar)!,
                      fit: BoxFit.cover,
                    ) : null,
                  ),
                  child: _getAvatarProvider(callerAvatar) == null ? Center(
                    child: Text(
                      _getInitials(callerName),
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 48,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ) : null,
                ),
              ),

              const SizedBox(height: 28),

              // ── Caller name ──
              Text(
                callerName,
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 30,
                  fontWeight: FontWeight.w600,
                  letterSpacing: -0.5,
                ),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),

              const SizedBox(height: 12),

              // ── Call type label ──
              Text(
                isVideo ? 'Incoming Video Call' : 'Incoming Voice Call',
                style: TextStyle(
                  color: Colors.white.withOpacity(0.5),
                  fontSize: 16,
                ),
              ),

              const Spacer(flex: 3),

              // ── Action buttons ──
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 48),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                  children: [
                    // Reject
                    _ActionButton(
                      icon: Icons.call_end_rounded,
                      label: 'Decline',
                      color: const Color(0xFFEF4444),
                      onTap: () {
                        CallService().rejectCall(widget.callInfo.callId);
                        Navigator.of(context).pop();
                      },
                    ),

                    // Accept
                    _ActionButton(
                      icon: isVideo ? Icons.videocam_rounded : Icons.call_rounded,
                      label: 'Accept',
                      color: const Color(0xFF10B981),
                      onTap: () {
                        Navigator.of(context).pushReplacement(
                          MaterialPageRoute(
                            builder: (_) => CallScreen(
                              currentUserId: widget.callInfo.receiverId,
                              peerId: widget.callInfo.callerId,
                              peerName: widget.callInfo.callerId,
                              callType: widget.callInfo.type,
                              isIncoming: true,
                              incomingCallInfo: widget.callInfo,
                              incomingOfferData: widget.offerData,
                            ),
                          ),
                        );
                      },
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 48),
            ],
          ),
        ),
      ),
    );
  }
}

// ───────────────────────────────────────────────────────────────
// Circular Action Button
// ───────────────────────────────────────────────────────────────

class _ActionButton extends StatelessWidget {
  final IconData icon;
  final String label;
  final Color color;
  final VoidCallback onTap;

  const _ActionButton({
    required this.icon,
    required this.label,
    required this.color,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 72,
            height: 72,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: color,
              boxShadow: [
                BoxShadow(
                  color: color.withOpacity(0.4),
                  blurRadius: 16,
                  spreadRadius: 2,
                ),
              ],
            ),
            child: Icon(icon, color: Colors.white, size: 32),
          ),
          const SizedBox(height: 10),
          Text(
            label,
            style: TextStyle(
              color: Colors.white.withOpacity(0.7),
              fontSize: 14,
              fontWeight: FontWeight.w500,
            ),
          ),
        ],
      ),
    );
  }
}
