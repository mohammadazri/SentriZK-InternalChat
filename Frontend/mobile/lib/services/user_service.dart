import 'package:cloud_firestore/cloud_firestore.dart';

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
    await _firestore.collection('users').doc(userId).set({
      'id': userId,
      'username': username,
      'deviceId': deviceId,
      'avatarUrl': avatarUrl,
      'phone': phone,
      'activityStatus': activityStatus,
      'updatedAt': FieldValue.serverTimestamp(),
    }, SetOptions(merge: true));
  }
}
