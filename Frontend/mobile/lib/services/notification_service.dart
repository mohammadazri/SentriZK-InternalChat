import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_messaging/firebase_messaging.dart';

class NotificationService {
  final FirebaseFirestore _firestore = FirebaseFirestore.instance;
  final FirebaseMessaging _messaging = FirebaseMessaging.instance;

  Future<void> saveFcmToken({required String userId}) async {
    final token = await _messaging.getToken();
    if (token != null) {
      await _firestore.collection('fcmTokens').doc(userId).set({
        'token': token,
      });
    }
  }
}
