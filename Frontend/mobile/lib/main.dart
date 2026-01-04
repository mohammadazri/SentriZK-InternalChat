import 'package:flutter/material.dart';
import 'package:firebase_core/firebase_core.dart';
import 'firebase_options.dart';
import 'screens/auth_screen.dart';
import 'services/message_security_service.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await Firebase.initializeApp(options: DefaultFirebaseOptions.currentPlatform);

  // Initialize security scan cache
  await MessageSecurityService.initialize();

  runApp(const SentriZKApp());
}

class SentriZKApp extends StatelessWidget {
  const SentriZKApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'SentriZK',
      theme: ThemeData(primarySwatch: Colors.blue, useMaterial3: true),
      home: const AuthScreen(),
    );
  }
}
