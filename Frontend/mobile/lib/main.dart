import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:app_links/app_links.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

void main() {
  runApp(const WebRedirectTestApp());
}

class WebRedirectTestApp extends StatefulWidget {
  const WebRedirectTestApp({super.key});

  @override
  State<WebRedirectTestApp> createState() => _WebRedirectTestAppState();
}

class _WebRedirectTestAppState extends State<WebRedirectTestApp> {
  final appLinks = AppLinks();
  final storage = const FlutterSecureStorage();

  String status = "Ready to register or login...";
  String token = "";
  String username = "";
  String salt = "";
  String mnemonic = "";

  @override
  void initState() {
    super.initState();
    _listenForRedirect();
  }

  /// Listen for redirect from browser (registration/login complete)
  void _listenForRedirect() {
    appLinks.uriLinkStream.listen((uri) async {
      if (uri == null || uri.scheme != 'sentriapp') return;

      setState(() {
        token = uri.queryParameters['token'] ?? "";
        username = uri.queryParameters['username'] ?? "";
        salt = uri.queryParameters['salt'] ?? "";
        final encodedMnemonic = uri.queryParameters['mnemonic'] ?? "";
        mnemonic = encodedMnemonic.isNotEmpty
            ? utf8.decode(base64Decode(encodedMnemonic))
            : "";

        status =
            "✅ Received redirect!\n\nToken: $token\nUsername: $username\nSalt: $salt\nMnemonic: $mnemonic";
      });

      // Save securely
      await storage.write(key: 'token', value: token);
      await storage.write(key: 'username', value: username);
      await storage.write(key: 'salt', value: salt);
      await storage.write(key: 'mnemonic', value: mnemonic);
    });
  }

  /// Open the web registration page
  Future<void> _openWebRegistration() async {
    const url = "https://b243b7e3d485.ngrok-free.app/register";
    await _openUrl(url, "register");
  }

  /// Open the web login page, passing saved salt & username
  Future<void> _openWebLogin() async {
    final savedUsername = await storage.read(key: 'username');
    final savedSalt = await storage.read(key: 'salt');

    if (savedSalt == null) {
      setState(() => status = "⚠️ No saved salt found. Please register first.");
      return;
    }

    final queryParams = {
      if (savedUsername != null) 'username': savedUsername,
      'salt': savedSalt,
    };
    final loginUrl =
        Uri.parse("https://b243b7e3d485.ngrok-free.app/login")
            .replace(queryParameters: queryParams)
            .toString();

    await _openUrl(loginUrl, "login");
  }

  Future<void> _openUrl(String url, String type) async {
    final uri = Uri.parse(url);
    if (!await launchUrl(uri, mode: LaunchMode.externalApplication)) {
      setState(() => status = "❌ Could not open $type page.");
    } else {
      setState(() => status = "🌐 Opened $type page in browser...");
    }
  }

  /// Load saved secure data
  Future<void> _loadFromStorage() async {
    final savedToken = await storage.read(key: 'token');
    final savedUsername = await storage.read(key: 'username');
    final savedSalt = await storage.read(key: 'salt');
    final savedMnemonic = await storage.read(key: 'mnemonic');

    setState(() {
      status =
          "🔐 From Secure Storage:\nToken: $savedToken\nUsername: $savedUsername\nSalt: $savedSalt\nMnemonic: $savedMnemonic";
    });
  }

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: "SentriApp",
      home: Scaffold(
        appBar: AppBar(title: const Text("SentriApp Auth")),
        body: SingleChildScrollView(
          padding: const EdgeInsets.all(20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(status, style: const TextStyle(fontSize: 16)),
              const SizedBox(height: 20),
              ElevatedButton(
                onPressed: _openWebRegistration,
                child: const Text("Open Web Registration"),
              ),
              const SizedBox(height: 10),
              ElevatedButton(
                onPressed: _openWebLogin,
                child: const Text("Open Web Login"),
              ),
              const SizedBox(height: 10),
              ElevatedButton(
                onPressed: _loadFromStorage,
                child: const Text("Load Saved Data"),
              ),
              const SizedBox(height: 20),
              const Text(
                "Flow:\n"
                "🔹 Register → App stores username, salt, mnemonic\n"
                "🔹 Login → App passes username & salt to browser autofill\n"
                "🔹 Browser only asks for wallet address\n"
                "🔹 After success, redirects back to app ✅",
              ),
            ],
          ),
        ),
      ),
    );
  }
}
