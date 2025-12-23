import 'package:flutter/material.dart';
import '../models/message.dart';
import '../services/chat_service.dart';

import 'package:isar/isar.dart';
import '../models/local_message.dart';

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

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text('Chat with ${widget.peerName}')),
      body: Column(
        children: [
          Expanded(
            child: StreamBuilder<List<Message>>(
              stream: _chatService.getMessages(widget.username, widget.peerId),
              builder: (context, snapshot) {
                if (snapshot.connectionState == ConnectionState.waiting) {
                  return const Center(child: CircularProgressIndicator());
                }
                final received = snapshot.data ?? [];
                return StreamBuilder<List<Message>>(
                  stream: _chatService.getMessages(
                    widget.peerId,
                    widget.username,
                  ),
                  builder: (context, sentSnapshot) {
                    final sent = sentSnapshot.data ?? [];
                    final allMessages = [...received, ...sent];
                    allMessages.sort(
                      (a, b) => a.timestamp.compareTo(b.timestamp),
                    );
                    // Mark received messages as seen, save locally, then delete from Firestore
                    for (final msg in received) {
                      if (msg.status != 'seen') {
                        _chatService.markMessageSeen(widget.username, msg.id);
                        // Save to Isar local DB
                        Future.microtask(() async {
                          final isar = await Isar.open([LocalMessageSchema]);
                          await isar.writeTxn(() async {
                            await isar.localMessages.put(
                              LocalMessage()
                                ..content = msg.content
                                ..senderId = msg.senderId
                                ..receiverId = msg.receiverId
                                ..timestamp = msg.timestamp
                                ..attachmentUrl = msg.attachmentUrl
                                ..status = msg.status,
                            );
                          });
                          await _chatService.deleteMessageAfterLocalSave(
                            widget.username,
                            msg.id,
                          );
                          await isar.close();
                        });
                      }
                    }
                    return ListView.builder(
                      padding: const EdgeInsets.all(8),
                      itemCount: allMessages.length,
                      itemBuilder: (context, index) {
                        final msg = allMessages[index];
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
                                Text(msg.content),
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
                      await _chatService.sendMessage(
                        content: text,
                        senderId: widget.username,
                        receiverId: widget.peerId,
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
