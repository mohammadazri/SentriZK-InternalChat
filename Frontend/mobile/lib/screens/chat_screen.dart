import 'dart:async';
import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import '../models/message.dart';
import '../services/chat_service.dart';
import '../services/message_security_service.dart';
import '../services/message_scan_service.dart';
import '../config/app_config.dart';

import 'package:isar/isar.dart';
import '../models/local_message.dart';

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
  final TextEditingController _controller = TextEditingController();
  Isar? _isar;
  Stream<List<LocalMessage>>? _localMessagesStream;

  @override
  void initState() {
    super.initState();
    _initLocalStore();
    MessageScanService.instance.init(); // Initialize ML model
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
    _localMessagesStream = isar.localMessages.where().watch(
      fireImmediately: true,
    );
    setState(() {});
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
      appBar: AppBar(title: Text('Chat with ${widget.peerName}')),
      body: Column(
        children: [
          Expanded(
            child: StreamBuilder<List<LocalMessage>>(
              stream: localStream,
              builder: (context, snapshot) {
                final messages =
                    (snapshot.data ?? [])
                        .where(
                          (msg) =>
                              (msg.senderId == widget.username &&
                                  msg.receiverId == widget.peerId) ||
                              (msg.senderId == widget.peerId &&
                                  msg.receiverId == widget.username),
                        )
                        .toList()
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
                        margin: const EdgeInsets.symmetric(vertical: 16, horizontal: 24),
                        padding: const EdgeInsets.all(8),
                        decoration: BoxDecoration(
                          color: Colors.amber[50],
                          borderRadius: BorderRadius.circular(8),
                          border: Border.all(color: Colors.amber[200]!),
                        ),
                        child: Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: const [
                            Icon(Icons.lock, size: 16, color: Colors.amber),
                            SizedBox(width: 8),
                            Expanded(
                              child: Text(
                                'Messages are End-to-End Encrypted. No one outside of this chat, not even SentriZK, can read them.',
                                style: TextStyle(fontSize: 12, color: Colors.black87),
                                textAlign: TextAlign.center,
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
                        margin: const EdgeInsets.symmetric(vertical: 2),
                        padding: const EdgeInsets.all(10),
                        decoration: BoxDecoration(
                          color: isMe ? Colors.blue[100] : Colors.grey[200],
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            // Show threat warning for RECEIVED messages only
                            if (!isMe && msg.threatScore != null && msg.threatScore! > 0.5)
                              Container(
                                margin: const EdgeInsets.only(bottom: 4),
                                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                decoration: BoxDecoration(
                                  color: Colors.red[50],
                                  borderRadius: BorderRadius.circular(4),
                                  border: Border.all(color: Colors.red[300]!),
                                ),
                                child: Row(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    Icon(Icons.warning_amber_rounded, size: 14, color: Colors.red[700]),
                                    const SizedBox(width: 4),
                                    Text(
                                      'Suspicious message detected',
                                      style: TextStyle(fontSize: 11, color: Colors.red[700], fontWeight: FontWeight.w600),
                                    ),
                                  ],
                                ),
                              ),
                            // Use SecureLinkText instead of Text for security
                            SecureLinkText(
                              text: msg.content,
                              textStyle: const TextStyle(fontSize: 14),
                              enableSecurity: !isMe,
                              linkStyle: TextStyle(
                                color: isMe
                                    ? Colors.blue[800]
                                    : Colors.blue[700],
                                fontSize: 14,
                              ),
                            ),
                            if (msg.attachmentUrl != null)
                              Padding(
                                padding: const EdgeInsets.only(top: 4),
                                child: const Text(
                                  '[Attachment]',
                                  style: TextStyle(color: Colors.blue),
                                ),
                              ),
                            Row(
                              mainAxisSize: MainAxisSize.min,
                              mainAxisAlignment: MainAxisAlignment.end,
                              children: [
                                Text(
                                  msg.timestamp.toLocal().toString().substring(0, 16),
                                  style: const TextStyle(
                                    fontSize: 10,
                                    color: Colors.grey,
                                  ),
                                ),
                                if (isMe) ...[
                                  const SizedBox(width: 4),
                                  _MessageStatusIndicator(status: msg.status),
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
          Padding(
            padding: const EdgeInsets.all(8.0),
            child: Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _controller,
                    decoration: const InputDecoration(
                      hintText: 'Type a message...',
                    ),
                  ),
                ),
                IconButton(
                  icon: const Icon(Icons.send),
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
                        ).catchError((e) => print('⚠️ [ML] Failed to log threat: $e'));
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
                      _controller.clear();
                    }
                  },
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
    _controller.dispose();
    super.dispose();
  }
}

class _MessageStatusIndicator extends StatelessWidget {
  final String status;
  
  const _MessageStatusIndicator({Key? key, required this.status}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    IconData icon;
    Color color;

    switch (status) {
      case 'sent':
        icon = Icons.check;
        color = Colors.grey;
        break;
      case 'delivered':
        icon = Icons.done_all;
        color = Colors.grey;
        break;
      case 'read':
        icon = Icons.done_all;
        color = Colors.blue;
        break;
      default:
        icon = Icons.schedule; // Sending...
        color = Colors.grey;
    }

    return Icon(icon, size: 14, color: color);
  }
}
