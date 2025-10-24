import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:app_links/app_links.dart';

void main() {
  runApp(MyApp());
}

class MyApp extends StatefulWidget {
  @override
  State<MyApp> createState() => _MyAppState();
}

class _MyAppState extends State<MyApp> {
  final FlutterSecureStorage _storage = const FlutterSecureStorage();
  String? _token;
  late final AppLinks _appLinks;

  @override
  void initState() {
    super.initState();
    _appLinks = AppLinks();
    _initDeepLinkListener();
  }

  void _initDeepLinkListener() async {
    // Listen for app links (deep link)
    _appLinks.uriLinkStream.listen((Uri? uri) async {
      if (uri != null && uri.queryParameters.containsKey('token')) {
        String token = uri.queryParameters['token']!;
        await _storage.write(key: 'auth_token', value: token);
        setState(() {
          _token = token;
        });
      }
    });
  }

  Future<void> _openWebRegistration() async {
    const String url = 'https://029a2d30aa60.ngrok-free.app/register';
    if (await canLaunchUrl(Uri.parse(url))) {
      await launchUrl(Uri.parse(url), mode: LaunchMode.externalApplication);
    } else {
      print('Could not launch $url');
    }
  }

  Future<void> _readToken() async {
    String? token = await _storage.read(key: 'auth_token');
    setState(() {
      _token = token;
    });
  }

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      home: Scaffold(
        appBar: AppBar(title: const Text('ZKP Mobile Test')),
        body: Padding(
          padding: const EdgeInsets.all(16.0),
          child: Column(
            children: [
              ElevatedButton(
                onPressed: _openWebRegistration,
                child: const Text('Open Web Registration'),
              ),
              const SizedBox(height: 20),
              ElevatedButton(
                onPressed: _readToken,
                child: const Text('Read Stored Token'),
              ),
              const SizedBox(height: 20),
              if (_token != null) Text('Token: $_token'),
            ],
          ),
        ),
      ),
    );
  }
}
