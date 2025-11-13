import 'package:flutter/material.dart';
import 'screens/auth_screen.dart';

void main() {
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
