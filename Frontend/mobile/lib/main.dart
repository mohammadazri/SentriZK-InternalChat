import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:app_links/app_links.dart';

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
  String status = "Ready to register...";
  String token = "";
  String username = "";
  String salt = "";
  String mnemonic = "";

  @override
  void initState() {
    super.initState();
    _listenForRedirect();
  }

  void _listenForRedirect() {
    appLinks.uriLinkStream.listen((uri) {
      if (uri == null || uri.scheme != 'sentriapp') return;

      setState(() {
        // Extract query parameters
        token = uri.queryParameters['token'] ?? "";
        username = uri.queryParameters['username'] ?? "";
        salt = uri.queryParameters['salt'] ?? "";
        final encodedMnemonic = uri.queryParameters['mnemonic'] ?? "";
        mnemonic = encodedMnemonic.isNotEmpty ? utf8.decode(base64Decode(encodedMnemonic)) : "";

        status =
            "✅ Registration completed!\n\nToken: $token\nUsername: $username\nSalt: $salt\nMnemonic (24 words):\n$mnemonic";
      });
    });
  }

  Future<void> _openWebRegistration() async {
    const url = "https://b243b7e3d485.ngrok-free.app/register"; // Your web registration page
    final uri = Uri.parse(url);

    if (!await launchUrl(uri, mode: LaunchMode.externalApplication)) {
      setState(() => status = "❌ Could not open browser.");
    } else {
      setState(() => status = "🌐 Browser opened. Complete registration there...");
    }
  }

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: "Web-to-App Registration",
      home: Scaffold(
        appBar: AppBar(title: const Text("Web Registration Test")),
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
              const SizedBox(height: 20),
              const Text(
                "Flow:\n"
                "1️⃣ Tap button to open browser\n"
                "2️⃣ Complete registration on web\n"
                "3️⃣ App auto-opens via deep link with token, salt & mnemonic ✅",
              ),
            ],
          ),
        ),
      ),
    );
  }
}
