import 'package:flutter/material.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'firebase_options.dart';
import 'screens/auth_screen.dart';
import 'services/message_security_service.dart';

import 'package:provider/provider.dart';
import 'providers/theme_provider.dart';
import 'theme/app_theme.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await _loadLocalEnv();
  await Firebase.initializeApp(options: DefaultFirebaseOptions.currentPlatform);

  // Initialize security scan cache
  await MessageSecurityService.initialize();

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
