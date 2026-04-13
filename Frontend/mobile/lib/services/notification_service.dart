import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:flutter/material.dart';
import '../main.dart';
import '../screens/call_screen.dart';
import 'call_service.dart';

/// Handles all push notification logic:
/// - Saving the FCM token to Firestore
/// - Initialising android notification channels
/// - Displaying local banners for foreground messages & calls
/// - Background messages are handled by the top-level handler in main.dart
class NotificationService {
  NotificationService._();
  static final NotificationService instance = NotificationService._();

  final FirebaseFirestore _firestore = FirebaseFirestore.instance;
  final FirebaseMessaging _messaging = FirebaseMessaging.instance;
  final FlutterLocalNotificationsPlugin _localNotifications =
      FlutterLocalNotificationsPlugin();

  // ── Android notification channels ──────────────────────────────────────────
  static const AndroidNotificationChannel _msgChannel =
      AndroidNotificationChannel(
    'sentrizk_messages',
    'New Messages',
    description: 'Notifications for new encrypted messages',
    importance: Importance.defaultImportance,
    playSound: true,
  );

  static const AndroidNotificationChannel _callChannel =
      AndroidNotificationChannel(
    'sentrizk_calls',
    'Incoming Calls',
    description: 'Notifications for incoming voice and video calls',
    importance: Importance.high,
    playSound: true,
    enableVibration: true,
  );

  // ── Initialise ──────────────────────────────────────────────────────────────

  Future<void> initialize() async {
    // Request permission (Android 13+)
    await _messaging.requestPermission(alert: true, badge: true, sound: true);

    // Register Android channels
    final androidPlugin = _localNotifications
        .resolvePlatformSpecificImplementation<
            AndroidFlutterLocalNotificationsPlugin>();
    await androidPlugin?.createNotificationChannel(_msgChannel);
    await androidPlugin?.createNotificationChannel(_callChannel);

    // Initialise local notifications plugin
    const androidSettings =
        AndroidInitializationSettings('@mipmap/ic_launcher');
    const initSettings = InitializationSettings(android: androidSettings);
    
    await _localNotifications.initialize(
      initSettings,
      onDidReceiveNotificationResponse: _handleNotificationAction,
    );

    // Foreground FCM messages — show a local banner
    FirebaseMessaging.onMessage.listen(_onForegroundMessage);
  }

  void _handleNotificationAction(NotificationResponse response) async {
    final payload = response.payload;
    if (payload == null) return;

    final Map<String, dynamic> data = Uri.splitQueryString(payload);
    final actionId = response.actionId;
    final callId = data['callId'];
    final callerId = data['callerId'];
    final callerName = data['callerName'];
    final callTypeStr = data['callType'];

    if (callId == null) return;

    if (actionId == 'accept' || response.notificationResponseType == NotificationResponseType.selectedNotification) {
      // 🚀 NAVIGATE TO CALL SCREEN (ACCEPT)
      SentriZKApp.navigatorKey.currentState?.push(
        MaterialPageRoute(
          builder: (_) => CallScreen(
            currentUserId: data['toUserId'] ?? '', // We'll need to ensure this is in payload
            peerId: callerId ?? '',
            peerName: callerName ?? 'Caller',
            callType: callTypeStr == 'video' ? CallType.video : CallType.audio,
            isIncoming: true,
            // Pass the offer data if we have it? 
            // Better to let CallScreen fetch it via CallService
          ),
        ),
      );
    } else if (actionId == 'reject') {
      // 🛑 REJECT CALL
      await CallService().rejectCall(callId);
      await dismissCallNotification();
    }
  }

  // ── Save FCM token ──────────────────────────────────────────────────────────

  Future<void> saveFcmToken({required String userId}) async {
    final token = await _messaging.getToken();
    if (token != null) {
      await _firestore.collection('fcmTokens').doc(userId).set({
        'token': token,
        'updatedAt': FieldValue.serverTimestamp(),
      });
    }

    // Refresh token if it changes (e.g. app reinstall)
    _messaging.onTokenRefresh.listen((newToken) {
      _firestore.collection('fcmTokens').doc(userId).set({
        'token': newToken,
        'updatedAt': FieldValue.serverTimestamp(),
      });
    });
  }

  // ── Foreground message handler ──────────────────────────────────────────────

  void _onForegroundMessage(RemoteMessage message) {
    final type = message.data['type'];
    if (type == 'message') {
      // Intentionally do nothing for foreground messages.
      // The `user_list_screen`'s `_globalMessageSub` handles
      // saving the message and playing the in-app sound dynamically.
      // Showing an OS banner while inside the app is redundant.
    } else if (type == 'call') {
      showCallNotification(
        callerName: message.data['callerName'] ?? 'Unknown',
        callType: message.data['callType'] ?? 'audio',
        callId: message.data['callId'] ?? '',
        callerId: message.data['callerId'] ?? '',
        toUserId: message.data['toUserId'] ?? '',
      );
    }
  }

  // ── Show local notifications ────────────────────────────────────────────────

  Future<void> showMessageNotification({
    required String senderName,
    String body = 'You have a new encrypted message',
  }) async {
    const details = NotificationDetails(
      android: AndroidNotificationDetails(
        'sentrizk_messages',
        'New Messages',
        channelDescription: 'Notifications for new encrypted messages',
        importance: Importance.defaultImportance,
        priority: Priority.defaultPriority,
        icon: '@mipmap/ic_launcher',
      ),
    );
    await _localNotifications.show(
      1001,
      senderName,
      body,
      details,
    );
  }

  Future<void> showCallNotification({
    required String callerName,
    required String callType,
    required String callId,
    required String callerId,
    required String toUserId,
  }) async {
    final details = NotificationDetails(
      android: AndroidNotificationDetails(
        'sentrizk_calls',
        'Incoming Calls',
        channelDescription: 'Notifications for incoming voice and video calls',
        importance: Importance.max,
        priority: Priority.max,
        icon: '@mipmap/ic_launcher',
        fullScreenIntent: true,
        category: AndroidNotificationCategory.call,
        ongoing: true,
        autoCancel: false,
        actions: [
          const AndroidNotificationAction(
            'accept',
            'Answer',
            titleColor: Color(0xFF10B981), // Emerald
            showsUserInterface: true,
          ),
          const AndroidNotificationAction(
            'reject',
            'Decline',
            titleColor: Color(0xFFEF4444), // Red
            showsUserInterface: false,
          ),
        ],
      ),
    );

    final emoji = callType == 'video' ? '📹' : '📞';
    final payload = 'callId=$callId&callerId=$callerId&callerName=$callerName&callType=$callType&toUserId=$toUserId';

    await _localNotifications.show(
      1002,
      '$emoji Incoming ${callType == 'video' ? 'Video' : 'Audio'} Call',
      '$callerName is calling you',
      details,
      payload: payload,
    );
  }

  Future<void> dismissCallNotification() async {
    await _localNotifications.cancel(1002);
  }
}
