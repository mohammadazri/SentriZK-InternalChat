import 'dart:io';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_storage/firebase_storage.dart';
import '../models/message.dart';

class ChatService {
  final FirebaseFirestore _firestore = FirebaseFirestore.instance;
  final FirebaseStorage _storage = FirebaseStorage.instance;

  Stream<List<Message>> getMessages(String ownId, String peerId) {
    return _firestore
        .collection('chats')
        .doc(ownId)
        .collection('messages')
        .where('senderId', isEqualTo: peerId)
        .orderBy('timestamp', descending: false)
        .snapshots()
        .map(
          (snapshot) =>
              snapshot.docs.map((doc) => Message.fromFirestore(doc)).toList(),
        );
  }

  Future<void> sendMessage({
    required String content,
    required String senderId,
    required String receiverId,
    DateTime? timestamp,
    File? attachment,
  }) async {
    String? attachmentUrl;
    final createdAt = timestamp ?? DateTime.now();

    if (attachment != null) {
      final ref = _storage.ref().child(
        'attachments/${createdAt.millisecondsSinceEpoch}_${attachment.path.split('/').last}',
      );
      await ref.putFile(attachment);
      attachmentUrl = await ref.getDownloadURL();
    }
    final message = Message(
      id: '',
      content: content,
      senderId: senderId,
      receiverId: receiverId,
      timestamp: createdAt,
      attachmentUrl: attachmentUrl,
      status: 'sent',
    );
    final docRef = _firestore
        .collection('chats')
        .doc(receiverId)
        .collection('messages')
        .doc();
    await docRef.set(message.toMap());
    // Do NOT delete immediately. Deletion will occur after receiver marks as 'seen'.
  }

  Future<void> markMessageSeen(String ownId, String messageId) async {
    final docRef = _firestore
        .collection('chats')
        .doc(ownId)
        .collection('messages')
        .doc(messageId);
    await docRef.update({'status': 'seen'});
    // Do NOT delete here! Deletion will occur after local save.
  }

  Future<void> deleteMessageAfterLocalSave(
    String ownId,
    String messageId,
  ) async {
    await _firestore
        .collection('chats')
        .doc(ownId)
        .collection('messages')
        .doc(messageId)
        .delete();
  }

  Future<void> deleteMessage(String ownId, String messageId) async {
    await _firestore
        .collection('chats')
        .doc(ownId)
        .collection('messages')
        .doc(messageId)
        .delete();
  }
}
