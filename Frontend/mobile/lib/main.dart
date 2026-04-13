import 'package:flutter/material.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'firebase_options.dart';
import 'screens/auth_screen.dart';
import 'services/message_security_service.dart';
import 'services/notification_service.dart';

import 'package:provider/provider.dart';
import 'providers/theme_provider.dart';
import 'theme/app_theme.dart';

import 'package:cloud_firestore/cloud_firestore.dart';
import 'services/signal/signal_manager.dart';

// ── Background FCM handler ────────────────────────────────────────────────────
// Must be a top-level function (not a class method). Runs in a separate Dart
// isolate when the app is in the background or terminated.
@pragma('vm:entry-point')
Future<void> _firebaseMessagingBackgroundHandler(RemoteMessage message) async {
  WidgetsFlutterBinding.ensureInitialized();
  await Firebase.initializeApp(options: DefaultFirebaseOptions.currentPlatform);
  await NotificationService.instance.initialize();

  final type = message.data['type'];
  if (type == 'message') {
    final senderName = message.data['senderName'] ?? 'SentriZK';
    final messageId = message.data['messageId'];
    final receiverId = message.data['toUserId'];

    String decryptedText = 'You have a new encrypted message';

    if (messageId != null && messageId.toString().isNotEmpty && receiverId != null && receiverId.toString().isNotEmpty) {
      try {
        // Initialize Isar for Security/Signal Store in Isolate
        await MessageSecurityService.initialize();
        // Load Signal keys locally
        await SignalManager.instance.init(0);

        final doc = await FirebaseFirestore.instance
            .collection('chats')
            .doc(receiverId)
            .collection('messages')
            .doc(messageId)
            .get();

        if (doc.exists) {
          final data = doc.data()!;
          final ciphertext = data['content'] as String;
          final signalType = data['signalType'] as int?;

          if (signalType != null) {
            decryptedText = await SignalManager.instance.decryptMessage(
              senderName, 
              signalType, 
              ciphertext
            );
          } else {
            decryptedText = ciphertext; // Plaintext fallback
          }
        }
      } catch (e) {
        print('🔐 [E2EE] Background decryption failed: $e');
        // Keep the default encrypted banner notification.
      }
    }

    await NotificationService.instance.showMessageNotification(
      senderName: senderName,
      body: decryptedText,
    );
  } else if (type == 'call') {
    await NotificationService.instance.showCallNotification(
      callerName: message.data['callerName'] ?? 'Unknown',
      callType: message.data['callType'] ?? 'audio',
    );
  }
}

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await _loadLocalEnv();
  await Firebase.initializeApp(options: DefaultFirebaseOptions.currentPlatform);

  // Register the background handler BEFORE runApp
  FirebaseMessaging.onBackgroundMessage(_firebaseMessagingBackgroundHandler);

  // Initialize security scan cache
  await MessageSecurityService.initialize();

  // Initialize notification channels & foreground listener
  await NotificationService.instance.initialize();

  runApp(
    ChangeNotifierProvider(
      create: (_) => ThemeProvider(),
      child: const SentriZKApp(),
    ),
  );
}

Future<void> _loadLocalEnv() async {
  try {
    await dotenv.load(fileName: '.env');
  } catch (_) {
    // Local .env is optional so CI/clean setups can still run.
  }
}

class SentriZKApp extends StatelessWidget {
  const SentriZKApp({super.key});

  @override
  Widget build(BuildContext context) {
    return Consumer<ThemeProvider>(
      builder: (context, themeProvider, child) {
        return MaterialApp(
          title: 'SentriZK Core',
          theme: AppTheme.lightTheme,
          darkTheme: AppTheme.darkTheme,
          themeMode: themeProvider.themeMode,
          home: const AuthScreen(),
        );
      },
    );
  }
}
