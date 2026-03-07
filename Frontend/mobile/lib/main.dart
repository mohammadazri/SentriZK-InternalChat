import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
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
      title: 'SentriZK Core',
      theme: ThemeData(
        useMaterial3: true,
        brightness: Brightness.dark,
        scaffoldBackgroundColor: const Color(0xFF0B0F19), // Deep corporate navy
        colorScheme: const ColorScheme.dark(
          primary: Color(0xFF2563EB), // Cobalt Blue
          secondary: Color(0xFF38BDF8),
          surface: Color(0xFF0F172A), // Slate 900
          background: Color(0xFF0B0F19),
        ),
        textTheme: GoogleFonts.interTextTheme(
          ThemeData(brightness: Brightness.dark).textTheme,
        ).apply(
          bodyColor: Colors.white,
          displayColor: Colors.white,
        ),
      ),
      home: const AuthScreen(),
    );
  }
}
