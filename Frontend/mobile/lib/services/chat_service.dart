import 'dart:io';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_storage/firebase_storage.dart';
import '../models/message.dart';
import 'signal/signal_manager.dart';

class ChatService {
  final FirebaseFirestore _firestore = FirebaseFirestore.instance;
  final FirebaseStorage _storage = FirebaseStorage.instance;
  final SignalManager _signalManager = SignalManager.instance;

  Stream<List<Message>> getMessages(String ownId, String peerId) {
    return _firestore
        .collection('chats')
        .doc(ownId)
        .collection('messages')
        .where('senderId', isEqualTo: peerId)
        .orderBy('timestamp', descending: false)
        .snapshots()
        .asyncMap((snapshot) async {
      final List<Message> messages = [];
      for (var doc in snapshot.docs) {
        try {
          final data = doc.data();
          var plaintext = data['content'] as String;
          final type = data['signalType'] as int?;

          if (type != null) {
            plaintext = await _signalManager.decryptMessage(peerId, type, plaintext);
          }

          messages.add(Message(
            id: doc.id,
            content: plaintext,
            senderId: data['senderId'] ?? '',
            receiverId: data['receiverId'] ?? '',
            timestamp: data['timestamp'] != null
                ? (data['timestamp'] as Timestamp).toDate()
                : DateTime.now(),
            attachmentUrl: data['attachmentUrl'],
            status: data['status'] ?? 'sent',
            threatScore: (data['threatScore'] as num?)?.toDouble(),
            signalType: type,
          ));
        } catch (e) {
          print('🔐 [E2EE] Failed to decrypt message: $e');
          final data = doc.data();
          messages.add(Message(
            id: doc.id,
            content: '🔒 [Decryption Failed]',
            senderId: data['senderId'] ?? '',
            receiverId: data['receiverId'] ?? '',
            timestamp: data['timestamp'] != null
                ? (data['timestamp'] as Timestamp).toDate()
                : DateTime.now(),
            attachmentUrl: data['attachmentUrl'],
            status: data['status'] ?? 'sent',
            threatScore: null,
          ));
        }
      }
      return messages;
    });
  }

  Future<void> sendMessage({
    required String content,
    required String senderId,
    required String receiverId,
    DateTime? timestamp,
    File? attachment,
    double? threatScore,
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

    // 🔐 E2EE: Encrypt the message content before saving it to Firestore
    String finalContent = content;
    int? signalType;

    try {
      final userDoc = await _firestore.collection('users').doc(receiverId).get();
      if (userDoc.exists && userDoc.data()!.containsKey('signalBundle')) {
        final bundle = userDoc.data()!['signalBundle'];
        await _signalManager.establishSession(receiverId, bundle);
        final encrypted = await _signalManager.encryptMessage(receiverId, content);

        finalContent = encrypted['ciphertext'];
        signalType = encrypted['type'];
        print('🔐 [E2EE] Message Encrypted Successfully.');
      } else {
        print('⚠️ [E2EE] Receiver has no Signal bundle. Sending plaintext.');
      }
    } catch (e) {
      print('❌ [E2EE] Encryption failed: $e');
      throw Exception('Failed to end-to-end encrypt the message.');
    }

    final message = Message(
      id: '',
      content: finalContent,
      senderId: senderId,
      receiverId: receiverId,
      timestamp: createdAt,
      attachmentUrl: attachmentUrl,
      status: 'sent',
      threatScore: threatScore,
      signalType: signalType,
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
