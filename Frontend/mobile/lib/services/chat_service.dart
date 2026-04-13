import 'dart:async';
import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_storage/firebase_storage.dart';
import '../models/message.dart';
import 'signal/signal_manager.dart';

class ChatService {
  final FirebaseFirestore _firestore = FirebaseFirestore.instance;
  final FirebaseStorage _storage = FirebaseStorage.instance;
  final SignalManager _signalManager = SignalManager.instance;

  // Cache decrypted messages to avoid DuplicateMessageException from the Ratchet when snapshots update
  final Map<String, String> _decryptedCache = {};

  Stream<List<Message>> getMessages(String ownId, String peerId) {
    return _firestore
        .collection('chats')
        .doc(ownId)
        .collection('messages')
        .where('senderId', isEqualTo: peerId)
        .orderBy('timestamp', descending: false)
        .snapshots()
        .handleError((e) {
      debugPrint('🔒 [CHAT_SERVICE] Ignoring getMessages permission-denied during logout.');
    })
        .asyncMap((snapshot) async {
      final List<Message> messages = [];
      for (var doc in snapshot.docs) {
        final data = doc.data();
        var plaintext = data['content'] as String;
        final type = data['signalType'] as int?;

        if (type != null) {
          if (_decryptedCache.containsKey(doc.id)) {
            plaintext = _decryptedCache[doc.id]!;
          } else {
            try {
              plaintext = await _signalManager.decryptMessage(peerId, type, plaintext);
              _decryptedCache[doc.id] = plaintext;
            } catch (e) {
              print('🔐 [E2EE] Failed to decrypt message: $e');
              plaintext = '🔒 [Decryption Failed]';
              _decryptedCache[doc.id] = plaintext;
            }
          }
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
      }
      return messages;
    });
  }

  // Global listener for all incoming messages (WhatsApp-style)
  Stream<List<Message>> getAllIncomingMessages(String ownId) {
    return _firestore
        .collection('chats')
        .doc(ownId)
        .collection('messages')
        .orderBy('timestamp', descending: false)
        .snapshots()
        .handleError((e) {
      if (e.toString().contains('permission-denied') || e.toString().contains('PERMISSION_DENIED')) {
        debugPrint('🔒 [CHAT_SERVICE] Ignoring message permission-denied during logout.');
      } else {
        debugPrint('🔥 [CHAT_SERVICE] Unexpected error in getAllIncomingMessages: $e');
      }
    }).asyncMap((snapshot) async {
      final List<Message> newMessages = [];
      
      for (var change in snapshot.docChanges) {
        if (change.type == DocumentChangeType.added) {
          final doc = change.doc;
          final data = doc.data() as Map<String, dynamic>;
          var plaintext = data['content'] as String;
          final type = data['signalType'] as int?;
          final senderId = data['senderId'] as String? ?? '';

          if (type != null && senderId.isNotEmpty) {
            if (_decryptedCache.containsKey(doc.id)) {
              plaintext = _decryptedCache[doc.id]!;
            } else {
              try {
                // The senderId of the incoming message is our peerId for decryption
                plaintext = await _signalManager.decryptMessage(senderId, type, plaintext);
                _decryptedCache[doc.id] = plaintext;
              } catch (e) {
                print('🔐 [E2EE] Failed to decrypt message globally: $e');
                
                // Heal the session by deleting the stale identity/session. 
                // The next message we SEND to them will fetch a fresh bundle.
                // The next PreKeyMessage they send us will use TOFU.
                await _signalManager.deleteSessionAndIdentity(senderId);
                
                plaintext = '🔒 [Decryption Failed - Session Resynced]';
                _decryptedCache[doc.id] = plaintext;
              }
            }
          }

          newMessages.add(Message(
            id: doc.id,
            content: plaintext,
            senderId: senderId,
            receiverId: data['receiverId'] ?? '',
            timestamp: data['timestamp'] != null
                ? (data['timestamp'] as Timestamp).toDate()
                : DateTime.now(),
            attachmentUrl: data['attachmentUrl'],
            status: data['status'] ?? 'sent',
            threatScore: (data['threatScore'] as num?)?.toDouble(),
            signalType: type,
          ));
        }
      }
      return newMessages;
    });
  }

  Future<String> sendMessage({
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
        
        // Auto-Heal: Check if the remote user has a NEW identity key (e.g. they recovered account)
        final remoteIdentityKey = bundle['identityKey'];
        final isMatch = await _signalManager.hasMatchingIdentity(receiverId, remoteIdentityKey);
        if (!isMatch) {
          print('🔐 [E2EE] Remote identity changed for $receiverId. Rebuilding session...');
          await _signalManager.deleteSessionAndIdentity(receiverId);
        }
        
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

    if (docRef.id.isEmpty) {
      throw Exception('Firestore generated an empty Document ID for the message.');
    }
    // Return the generated message ID!
    return docRef.id;
  }

  // ── Delete for Everyone ────────────────────────────────────────────────────
  // WhatsApp-style: sender can delete within 1 hour of sending.
  // Marks the Firestore document so the receiver's device shows a tombstone.
  // ──────────────────────────────────────────────────────────────────────────

  static const Duration _deleteForEveryoneWindow = Duration(hours: 1);

  /// Returns true if the message is still within the deletion window.
  bool canDeleteForEveryone(DateTime messageSentAt) {
    return DateTime.now().difference(messageSentAt) <= _deleteForEveryoneWindow;
  }

  /// Sends a deletion signal to the receiver via a dedicated 'deletions'
  /// subcollection. The original message doc may already be deleted from
  /// Firestore (downloaded & purged), so we cannot .update() it.
  /// [receiverId] is the person who received the message.
  /// [messageId]  is the Firestore document ID the receiver saved locally as firebaseId.
  /// [messageSentAt] is used to enforce the 1-hour window.
  Future<void> deleteForEveryone({
    required String receiverId,
    required String messageId,
    required DateTime messageSentAt,
  }) async {
    if (!canDeleteForEveryone(messageSentAt)) {
      throw Exception('You can only delete messages within 1 hour of sending.');
    }
    // Write a lightweight deletion marker into the receiver's 'deletions' subcollection.
    await _firestore
        .collection('chats')
        .doc(receiverId)
        .collection('deletions')
        .doc(messageId)
        .set({
      'deletedAt': FieldValue.serverTimestamp(),
    });
  }

  /// Listens for incoming deletion signals in our own 'deletions' subcollection.
  /// Returns the firebaseId(s) of messages the sender wants wiped.
  Stream<List<String>> listenForRemoteDeletions(String ownId) {
    return _firestore
        .collection('chats')
        .doc(ownId)
        .collection('deletions')
        .snapshots()
        .handleError((e) {
      if (e.toString().contains('permission-denied') ||
          e.toString().contains('PERMISSION_DENIED')) {
        debugPrint('🔒 [CHAT] Ignoring deletion-listener permission-denied.');
      } else {
        debugPrint('🔥 [CHAT] listenForRemoteDeletions error: $e');
      }
    }).map((snapshot) {
      return snapshot.docChanges
          .where((c) => c.type == DocumentChangeType.added)
          .map((c) => c.doc.id)
          .toList();
    });
  }

  /// Removes the deletion marker from Firestore after applying it locally.
  Future<void> deleteDeletionMarker(String ownId, String messageId) async {
    await _firestore
        .collection('chats')
        .doc(ownId)
        .collection('deletions')
        .doc(messageId)
        .delete();
  }

  /// Deletes a message from Firestore after it has been securely saved to the local database.
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

  // --- E2EE Safe Delivery Receipts (WhatsApp Ticks) ---

  /// Sends a completely opaque receipt token to the original sender's `receipts` subcollection.
  /// Status can be 'delivered' (UserListScreen downloaded it) or 'read' (ChatScreen opened it).
  Future<void> sendReceipt(String originalSenderId, String messageId, String status) async {
    try {
      await _firestore
          .collection('chats')
          .doc(originalSenderId)
          .collection('receipts')
          .doc(messageId)
          .set({
        'status': status,
        'timestamp': FieldValue.serverTimestamp(),
      }, SetOptions(merge: true)); // Merge so 'read' overwrites 'delivered'
    } catch (e) {
      print('⚠️ Failed to send $status receipt: $e');
    }
  }

  /// Listens to incoming receipt tokens (Sent to us by people who received our messages).
  Stream<List<Map<String, dynamic>>> listenForReceipts(String ownId) {
    return _firestore
        .collection('chats')
        .doc(ownId)
        .collection('receipts')
        .snapshots()
        .handleError((e) {
      if (e.toString().contains('permission-denied') || e.toString().contains('PERMISSION_DENIED')) {
        print('🔒 [CHAT_SERVICE] Ignoring receipt permission-denied during logout.');
      } else {
        print('🔥 [CHAT_SERVICE] Unexpected error in listenForReceipts: $e');
      }
    }).map((snapshot) {
      final List<Map<String, dynamic>> newReceipts = [];
      for (var change in snapshot.docChanges) {
        if (change.type == DocumentChangeType.added || change.type == DocumentChangeType.modified) {
          newReceipts.add({
            'messageId': change.doc.id,
            'status': change.doc.data()!['status'] as String,
          });
        }
      }
      return newReceipts;
    });
  }

  /// Deletes a receipt out of Firebase once our local database has ingested it.
  Future<void> deleteReceiptAfterLocalSave(String ownId, String messageId) async {
    await _firestore
        .collection('chats')
        .doc(ownId)
        .collection('receipts')
        .doc(messageId)
        .delete();
  }
}
