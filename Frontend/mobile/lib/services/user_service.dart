import 'package:cloud_firestore/cloud_firestore.dart';
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
    final signalManager = SignalManager.instance;
    await signalManager.init(SignalManager.generateRandomRegistrationId());

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
  }
}
