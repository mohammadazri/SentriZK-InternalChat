import 'dart:async';

import 'package:flutter/material.dart';
import '../models/message.dart';
import '../services/chat_service.dart';
import '../services/message_security_service.dart';

import 'package:isar/isar.dart';
import '../models/local_message.dart';
// path_provider no longer required here; Isar instance is provided by MessageSecurityService

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
  StreamSubscription<List<Message>>? _incomingSub;

  @override
  void initState() {
    super.initState();
    _initLocalStore();
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
    _localMessagesStream = isar.localMessages.where().sortByTimestamp().watch(
      fireImmediately: true,
    );
    _subscribeToIncoming();
    setState(() {});
  }

  void _subscribeToIncoming() {
    _incomingSub = _chatService
        .getMessages(widget.username, widget.peerId)
        .listen((messages) async {
          for (final msg in messages) {
            if (msg.status != 'seen') {
              await _chatService.markMessageSeen(widget.username, msg.id);
              await _saveMessageLocally(msg, status: 'seen');
              await _chatService.deleteMessageAfterLocalSave(
                widget.username,
                msg.id,
              );
            }
          }
        });
  }

  Future<void> _saveMessageLocally(
    Message msg, {
    String status = 'sent',
  }) async {
    if (_isar == null || !_isar!.isOpen) return;

    await _isar!.writeTxn(() async {
      await _isar!.localMessages.put(
        LocalMessage()
          ..content = msg.content
          ..senderId = msg.senderId
          ..receiverId = msg.receiverId
          ..timestamp = msg.timestamp
          ..attachmentUrl = msg.attachmentUrl
          ..status = status,
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
                      ..sort((a, b) => a.timestamp.compareTo(b.timestamp));

                return ListView.builder(
                  padding: const EdgeInsets.all(8),
                  itemCount: messages.length,
                  itemBuilder: (context, index) {
                    final msg = messages[index];
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
                            // Use SecureLinkText instead of Text for security
                            SecureLinkText(
                              text: msg.content,
                              textStyle: const TextStyle(fontSize: 14),
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
                                child: Text(
                                  '[Attachment]',
                                  style: TextStyle(color: Colors.blue),
                                ),
                              ),
                            Text(
                              msg.timestamp.toLocal().toString().substring(
                                0,
                                16,
                              ),
                              style: const TextStyle(
                                fontSize: 10,
                                color: Colors.grey,
                              ),
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
                      await _chatService.sendMessage(
                        content: text,
                        senderId: widget.username,
                        receiverId: widget.peerId,
                        timestamp: sentAt,
                      );
                      await _saveMessageLocally(
                        Message(
                          id: '',
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
    _incomingSub?.cancel();
    _isar?.close();
    super.dispose();
  }
}
