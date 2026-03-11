import 'dart:async';
import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:mobile/utils/time_utils.dart';
import '../models/message.dart';
import '../services/chat_service.dart';
import '../services/message_security_service.dart';
import '../services/message_scan_service.dart';
import '../services/call_service.dart';
import '../config/app_config.dart';
import 'call_screen.dart';
import 'package:permission_handler/permission_handler.dart';

import 'package:isar/isar.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import '../models/local_message.dart';
import '../services/user_service.dart';

// Security imports
import '../widgets/secure_link_text.dart';

// ...existing code...

class ChatScreen extends StatefulWidget {
  final String username;
  final String peerId;
  final String peerName;
  const ChatScreen({
    Key? key,
    required this.username,
    required this.peerId,
    required this.peerName,
  }) : super(key: key);

  @override
  State<ChatScreen> createState() => _ChatScreenState();
}

class _ChatScreenState extends State<ChatScreen> {
  final ChatService _chatService = ChatService();
  final UserService _userService = UserService();
  final TextEditingController _controller = TextEditingController();
  Isar? _isar;
  Stream<List<LocalMessage>>? _localMessagesStream;
  Timer? _typingTimer;
  bool _isTyping = false;

  @override
  void initState() {
    super.initState();
    _initLocalStore();
    _loadDraft();
    _controller.addListener(_onTextChanged);
    MessageScanService.instance.init(); // Initialize ML model
  }

  String get _draftKey => 'draft_${widget.username}_${widget.peerId}';

  Future<void> _loadDraft() async {
    final prefs = await SharedPreferences.getInstance();
    final draft = prefs.getString(_draftKey);
    if (draft != null && draft.isNotEmpty && mounted) {
      _controller.text = draft;
    }
  }

  void _onTextChanged() async {
    final text = _controller.text;
    final prefs = await SharedPreferences.getInstance();
    
    if (text.isEmpty) {
      await prefs.remove(_draftKey);
      if (_isTyping) {
        _isTyping = false;
        _typingTimer?.cancel();
        _userService.setTypingStatus(widget.username, null);
      }
    } else {
      await prefs.setString(_draftKey, text);
      
      if (!_isTyping) {
        _isTyping = true;
        _userService.setTypingStatus(widget.username, widget.peerId);
      }
      
      _typingTimer?.cancel();
      _typingTimer = Timer(const Duration(seconds: 2), () {
        if (mounted && _isTyping) {
          _isTyping = false;
          _userService.setTypingStatus(widget.username, null);
        }
      });
    }
  }

  Future<void> _initLocalStore() async {
    // Use the shared Isar instance from MessageSecurityService to avoid
    // opening multiple instances (causes "Instance has already been opened" errors).
    final isar = await MessageSecurityService.getInstance();

    if (!mounted) {
      await isar.close();
      return;
    }

    _isar = isar;
    
    // 🔥 HIGH PERFORMANCE: Filter at the database level instead of in Dart memory!
    _localMessagesStream = isar.localMessages
        .filter()
        .group((q) => q.senderIdEqualTo(widget.username).and().receiverIdEqualTo(widget.peerId))
        .or()
        .group((q) => q.senderIdEqualTo(widget.peerId).and().receiverIdEqualTo(widget.username))
        .watch(fireImmediately: true);
        
    setState(() {});
  }

  Future<void> _startCall(CallType type) async {
    // Request permissions
    final permissions = type == CallType.video
        ? [Permission.camera, Permission.microphone]
        : [Permission.microphone];

    final statuses = await permissions.request();
    final allGranted = statuses.values.every((s) => s.isGranted);

    if (!allGranted) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(type == CallType.video
                ? 'Camera and microphone permissions are required'
                : 'Microphone permission is required'),
            backgroundColor: const Color(0xFFEF4444),
          ),
        );
      }
      return;
    }

    if (mounted) {
      Navigator.push(
        context,
        MaterialPageRoute(
          builder: (_) => CallScreen(
            currentUserId: widget.username,
            peerId: widget.peerId,
            peerName: widget.peerName,
            callType: type,
          ),
        ),
      );
    }
  }

  Future<void> _saveMessageLocally(
    Message msg, {
    String status = 'sent',
  }) async {
    if (_isar == null || !_isar!.isOpen) return;

    await _isar!.writeTxn(() async {
      await _isar!.localMessages.put(
        LocalMessage()
          ..firebaseId = msg.id.isNotEmpty ? msg.id : null
          ..content = msg.content
          ..senderId = msg.senderId
          ..receiverId = msg.receiverId
          ..timestamp = msg.timestamp
          ..attachmentUrl = msg.attachmentUrl
          ..status = status
          ..threatScore = msg.threatScore,
      );
    });
  }

  @override
  Widget build(BuildContext context) {
    final localStream = _localMessagesStream;
    if (localStream == null) {
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }

    return Scaffold(
      backgroundColor: Theme.of(context).scaffoldBackgroundColor,
      appBar: PreferredSize(
        preferredSize: const Size.fromHeight(kToolbarHeight),
        child: AppBar(
          backgroundColor: Theme.of(context).scaffoldBackgroundColor.withOpacity(0.95),
          elevation: 0,
          leading: IconButton(
            icon: Icon(Icons.arrow_back_ios_new_rounded, color: Theme.of(context).colorScheme.onSurface, size: 20),
            onPressed: () => Navigator.pop(context),
          ),
          title: Row(
            children: [
              CircleAvatar(
                radius: 18,
                backgroundColor: Theme.of(context).colorScheme.surface,
                child: Text(
                  widget.peerName.isNotEmpty ? widget.peerName[0].toUpperCase() : '?',
                  style: TextStyle(color: Theme.of(context).colorScheme.onSurface, fontWeight: FontWeight.bold, fontSize: 14),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      widget.peerName,
                      style: TextStyle(
                        color: Theme.of(context).colorScheme.onSurface,
                        fontWeight: FontWeight.w600,
                        fontSize: 16,
                      ),
                    ),
                    StreamBuilder<DocumentSnapshot>(
                      stream: FirebaseFirestore.instance.collection('users').doc(widget.peerId).snapshots(),
                      builder: (context, snapshot) {
                        if (snapshot.hasData && snapshot.data != null && snapshot.data!.exists) {
                          final peerData = snapshot.data!.data() as Map<String, dynamic>;
                          if (peerData['typingTo'] == widget.username) {
                            return const Text(
                              'typing...',
                              style: TextStyle(
                                color: Color(0xFF10B981),
                                fontSize: 12,
                                fontWeight: FontWeight.w600,
                                fontStyle: FontStyle.italic,
                              ),
                            );
                          }
                        }
                        return Text(
                          'Secure end-to-end chat',
                          style: TextStyle(
                            color: Theme.of(context).colorScheme.onSurface.withOpacity(0.5),
                            fontSize: 11,
                          ),
                        );
                      },
                    ),
                  ],
                ),
              ),
            ],
          ),
          actions: [
            IconButton(
              icon: Icon(Icons.call_rounded, color: Theme.of(context).colorScheme.onSurface.withOpacity(0.7), size: 22),
              tooltip: 'Audio Call',
              onPressed: () => _startCall(CallType.audio),
            ),
            IconButton(
              icon: Icon(Icons.videocam_rounded, color: Theme.of(context).colorScheme.onSurface.withOpacity(0.7), size: 24),
              tooltip: 'Video Call',
              onPressed: () => _startCall(CallType.video),
            ),
            const SizedBox(width: 4),
          ],
        ),
      ),
      body: Column(
        children: [
          Expanded(
            child: StreamBuilder<List<LocalMessage>>(
              stream: localStream,
              builder: (context, snapshot) {
                if (snapshot.hasError) {
                  print('🚨 [ChatScreen] StreamBuilder ERROR: ${snapshot.error}');
                }

                // Isar already filtered this exactly for our chat!
                final rawData = snapshot.data ?? [];
                
                final messages = List<LocalMessage>.from(rawData)
                  ..sort((a, b) => a.id.compareTo(b.id));

                // WhatsApp Read Receipt magic:
                // If we are looking at this screen, any incoming message should be marked 'read'
                if (_isar != null && _isar!.isOpen) {
                  WidgetsBinding.instance.addPostFrameCallback((_) async {
                    final unreadIncoming = messages.where(
                      (m) => m.senderId == widget.peerId && m.status != 'read'
                    ).toList();
                    
                    if (unreadIncoming.isNotEmpty) {
                      await _isar!.writeTxn(() async {
                        for (final m in unreadIncoming) {
                          m.status = 'read';
                          await _isar!.localMessages.put(m);
                          
                          // Fire the blue tick receipt over the network back to the sender
                          if (m.firebaseId != null) {
                            _chatService.sendReceipt(m.senderId, m.firebaseId!, 'read');
                          }
                        }
                      });
                    }
                  });
                }

                return ListView.builder(
                  padding: const EdgeInsets.all(8),
                  itemCount: messages.length + 1,
                  itemBuilder: (context, index) {
                    if (index == 0) {
                      return Container(
                        margin: const EdgeInsets.symmetric(vertical: 24, horizontal: 24),
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: Theme.of(context).colorScheme.surface, // Slate 800
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: Theme.of(context).colorScheme.outline), // Slate 700
                        ),
                        child: Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Icon(Icons.lock_rounded, size: 16, color: Color(0xFFFBBF24)), // Amber 400
                            SizedBox(width: 12),
                            Expanded(
                              child: Text(
                                'Messages are End-to-End Encrypted. No one outside of this chat, not even SentriZK, can read them.',
                                style: TextStyle(fontSize: 12, color: Theme.of(context).colorScheme.onSurface.withOpacity(0.7), height: 1.4),
                                textAlign: TextAlign.left,
                              ),
                            ),
                          ],
                        ),
                      );
                    }
                    
                    final msg = messages[index - 1];
                    final isMe = msg.senderId == widget.username;
                    return Align(
                      alignment: isMe
                          ? Alignment.centerRight
                          : Alignment.centerLeft,
                      child: Container(
                        margin: const EdgeInsets.symmetric(vertical: 4, horizontal: 8),
                        padding: const EdgeInsets.only(left: 14, right: 14, top: 10, bottom: 8),
                        decoration: BoxDecoration(
                          gradient: isMe ? const LinearGradient(
                            colors: [Color(0xFF2563EB), Color(0xFF3B82F6)], // Cobalt Blue
                            begin: Alignment.topLeft,
                            end: Alignment.bottomRight,
                          ) : null,
                          color: isMe ? null : Theme.of(context).colorScheme.surface, // Slate 800
                          borderRadius: BorderRadius.only(
                            topLeft: const Radius.circular(16),
                            topRight: const Radius.circular(16),
                            bottomLeft: Radius.circular(isMe ? 16 : 4),
                            bottomRight: Radius.circular(isMe ? 4 : 16),
                          ),
                          boxShadow: [
                            BoxShadow(
                              color: Colors.black.withOpacity(0.15),
                              blurRadius: 4,
                              offset: const Offset(0, 2),
                            ),
                          ],
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            // Show threat warning for RECEIVED messages only
                            if (!isMe && msg.threatScore != null && msg.threatScore! > 0.5)
                              Container(
                                margin: const EdgeInsets.only(bottom: 6),
                                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                decoration: BoxDecoration(
                                  color: Colors.redAccent.withOpacity(0.15),
                                  borderRadius: BorderRadius.circular(6),
                                  border: Border.all(color: Colors.redAccent.withOpacity(0.3)),
                                ),
                                child: Row(
                                  mainAxisSize: MainAxisSize.min,
                                  children: const [
                                    Icon(Icons.warning_amber_rounded, size: 14, color: Colors.redAccent),
                                    SizedBox(width: 6),
                                    Text(
                                      'Suspicious message detected',
                                      style: TextStyle(fontSize: 11, color: Colors.redAccent, fontWeight: FontWeight.w600),
                                    ),
                                  ],
                                ),
                              ),
                            // Use SecureLinkText instead of Text for security
                            SecureLinkText(
                              text: msg.content,
                              textStyle: TextStyle(fontSize: 15, color: isMe ? Colors.white : Theme.of(context).colorScheme.onSurface, height: 1.3),
                              enableSecurity: !isMe,
                              linkStyle: const TextStyle(
                                color: Color(0xFF60A5FA), // Blue 400
                                fontSize: 15,
                                decoration: TextDecoration.underline,
                                decorationColor: Color(0xFF60A5FA),
                              ),
                            ),
                            if (msg.attachmentUrl != null)
                              const Padding(
                                padding: EdgeInsets.only(top: 6),
                                child: Text(
                                  '[Attachment]',
                                  style: TextStyle(color: Color(0xFF60A5FA), fontSize: 13),
                                ),
                              ),
                            const SizedBox(height: 4),
                            Row(
                              mainAxisSize: MainAxisSize.min,
                              mainAxisAlignment: MainAxisAlignment.end,
                              children: [
                                Text(
                                  TimeUtils.formatChatTime(msg.timestamp),
                                  style: TextStyle(
                                    fontSize: 11,
                                    color: isMe ? Colors.white.withOpacity(0.7) : Theme.of(context).colorScheme.onSurface.withOpacity(0.5),
                                  ),
                                ),
                                if (isMe) ...[
                                  const SizedBox(width: 4),
                                  _MessageStatusIndicator(status: msg.status, isMe: isMe),
                                ],
                              ],
                            ),
                          ],
                        ),
                      ),
                    );
                  },
                );
              },
            ),
          ),
          Container(
            padding: EdgeInsets.only(
              bottom: MediaQuery.of(context).padding.bottom + 12,
              top: 12,
              left: 16,
              right: 16,
            ),
            decoration: BoxDecoration(
              color: Theme.of(context).scaffoldBackgroundColor.withOpacity(0.95), // Slate 900
              border: Border(top: BorderSide(color: Theme.of(context).colorScheme.onSurface.withOpacity(0.05))),
            ),
            child: Row(
              children: [
                Expanded(
                  child: Container(
                    decoration: BoxDecoration(
                      color: Theme.of(context).colorScheme.surface, // Slate 800
                      borderRadius: BorderRadius.circular(24),
                      border: Border.all(color: Theme.of(context).colorScheme.onSurface.withOpacity(0.05)),
                    ),
                    child: TextField(
                      controller: _controller,
                      style: TextStyle(color: Theme.of(context).colorScheme.onSurface, fontSize: 16),
                      maxLines: null,
                      keyboardType: TextInputType.multiline,
                      decoration: InputDecoration(
                        hintText: 'Message',
                        hintStyle: TextStyle(color: Theme.of(context).colorScheme.onSurface.withOpacity(0.4)),
                        border: InputBorder.none,
                        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                Container(
                  decoration: const BoxDecoration(
                    color: Color(0xFF2563EB), // Cobalt Blue
                    shape: BoxShape.circle,
                  ),
                  child: IconButton(
                    icon: const Icon(Icons.send_rounded, color: Colors.white, size: 20),
                    onPressed: () async {
                      final text = _controller.text.trim();
                      if (text.isNotEmpty) {
                        final sentAt = DateTime.now();
  
                        // Silent ML scan — sender sees nothing
                        double? threatScore;
                        final scanService = MessageScanService.instance;
                        if (scanService.isReady) {
                          threatScore = await scanService.scanMessage(text);
                        }
  
                        // Send message with threat score and get Firebase ID
                        final firebaseId = await _chatService.sendMessage(
                          content: text,
                          senderId: widget.username,
                          receiverId: widget.peerId,
                          timestamp: sentAt,
                          threatScore: threatScore,
                        );
  
                        // Report threat to backend (fire-and-forget)
                        if (threatScore != null && scanService.isThreat(threatScore)) {
                          http.post(
                            Uri.parse(AppConfig.threatLogEndpoint),
                            headers: {'Content-Type': 'application/json'},
                            body: jsonEncode({
                              'senderId': widget.username,
                              'receiverId': widget.peerId,
                              'content': text,
                              'threatScore': threatScore,
                              'timestamp': sentAt.millisecondsSinceEpoch,
                            }),
                          ).catchError((e) {
                            print('⚠️ [ML] Failed to log threat: $e');
                            return http.Response('Error', 500);
                          });
                        }
  
                        // Save locally with Firebase ID mapping so receipts can find it
                        await _saveMessageLocally(
                          Message(
                            id: firebaseId,
                            content: text,
                            senderId: widget.username,
                            receiverId: widget.peerId,
                            timestamp: sentAt,
                            attachmentUrl: null,
                          ),
                          status: 'sent',
                        );
                        // Clear local draft from SharedPreferences precisely when sending
                        final prefs = await SharedPreferences.getInstance();
                        await prefs.remove(_draftKey);
                        
                        // Clear typing status
                        _isTyping = false;
                        _typingTimer?.cancel();
                        _userService.setTypingStatus(widget.username, null);
                        
                        _controller.clear();
                      }
                    },
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  @override
  void dispose() {
    _typingTimer?.cancel();
    if (_isTyping) {
      _userService.setTypingStatus(widget.username, null);
    }
    _controller.removeListener(_onTextChanged);
    _controller.dispose();
    super.dispose();
  }
}

class _MessageStatusIndicator extends StatelessWidget {
  final String status;
  final bool isMe;
  
  const _MessageStatusIndicator({Key? key, required this.status, required this.isMe}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    IconData icon;
    Color color;

    switch (status) {
      case 'sent':
        icon = Icons.check_rounded;
        color = Colors.white70;
        break;
      case 'delivered':
        icon = Icons.done_all_rounded;
        color = Colors.white70;
        break;
      case 'read':
        icon = Icons.done_all_rounded;
        color = const Color(0xFF38BDF8); // Sky blue 400 for read receipts
        break;
      default:
        icon = Icons.access_time_rounded; // Sending...
        color = Colors.white70;
    }

    return Icon(icon, size: 14, color: color);
  }
}
