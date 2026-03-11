import 'dart:io';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:firebase_storage/firebase_storage.dart';
import 'signal/signal_manager.dart';

class UserService {
  final FirebaseFirestore _firestore = FirebaseFirestore.instance;

  Future<void> createOrUpdateUser({
    required String userId,
    required String username,
    required String deviceId,
    String? avatarUrl,
    String? phone,
    String activityStatus = 'Online',
  }) async {
    // Diagnostic: Log current user info before Firestore call
    final currentUser = FirebaseAuth.instance.currentUser;
    print('🔥 [USER_SERVICE] Updating user: $userId (Username: $username)');
    print('🔥 [USER_SERVICE] Authenticated UID: ${currentUser?.uid}');

    final signalManager = SignalManager.instance;
    await signalManager.init(SignalManager.generateRandomRegistrationId());

    try {
      // Check if the user already has a signalBundle to avoid overwriting all prekeys constantly
      final doc = await _firestore.collection('users').doc(userId).get();
      Map<String, dynamic>? bundle;
      if (!doc.exists || !doc.data()!.containsKey('signalBundle')) {
        print('🔐 [E2EE] Generating new Signal PreKey bundle for user...');
        bundle = await signalManager.generatePreKeyBundle();
      }

      await _firestore.collection('users').doc(userId).set({
        'id': userId,
        'username': username,
        'deviceId': deviceId,
        'avatarUrl': avatarUrl,
        'phone': phone,
        'activityStatus': activityStatus,
        if (bundle != null) 'signalBundle': bundle,
        'updatedAt': FieldValue.serverTimestamp(),
      }, SetOptions(merge: true));
    } catch (e) {
      print('🔥 [USER_SERVICE] Firestore error for $userId: $e');
      // If it's a permission error, we still want the app to function
      if (e.toString().contains('permission-denied')) {
        print('⚠️ [USER_SERVICE] Permission denied. This usually means Request.Auth.UID != Document ID.');
      }
    }
  }

  Future<void> setTypingStatus(String userId, String? typingTo) async {
    try {
      await _firestore.collection('users').doc(userId).set({
        'typingTo': typingTo,
        'updatedAt': FieldValue.serverTimestamp(),
      }, SetOptions(merge: true));
    } catch (e) {
      print('🔥 [USER_SERVICE] setTypingStatus error: $e');
    }
  }

  /// Updates the user's display name
  Future<void> updateDisplayName(String userId, String newDisplayName) async {
    try {
      await _firestore.collection('users').doc(userId).set({
        'displayName': newDisplayName,
        'updatedAt': FieldValue.serverTimestamp(),
      }, SetOptions(merge: true));
    } catch (e) {
      print('🔥 [USER_SERVICE] updateDisplayName error: $e');
      rethrow;
    }
  }

  /// Compresses the avatar to Base64 and updates the user record
  Future<String> updateProfileAvatar(String userId, File imageFile) async {
    try {
      final bytes = await imageFile.readAsBytes();
      final base64Image = base64Encode(bytes);
      final dataUri = 'data:image/jpeg;base64,$base64Image';

      // Update Firestore user document directly
      await _firestore.collection('users').doc(userId).set({
        'avatarUrl': dataUri,
        'updatedAt': FieldValue.serverTimestamp(),
      }, SetOptions(merge: true));

      return dataUri;
    } catch (e) {
      print('🔥 [USER_SERVICE] updateProfileAvatar error: $e');
      rethrow;
    }
  }
}
