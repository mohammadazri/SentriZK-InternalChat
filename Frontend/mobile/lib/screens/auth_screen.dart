import 'package:flutter/material.dart';
import 'package:app_links/app_links.dart';
import '../services/auth_service.dart';
import '../config/app_config.dart';

class AuthScreen extends StatefulWidget {
  const AuthScreen({super.key});

  @override
  State<AuthScreen> createState() => _AuthScreenState();
}

class _AuthScreenState extends State<AuthScreen> {
  final AppLinks _appLinks = AppLinks();
  final AuthService _authService = AuthService();

  String status = "Ready to register or login...";
  String mnemonicDisplay = "";

  @override
  void initState() {
    super.initState();
    _listenForRedirect();
  }

  /// Listen for redirect after web authentication
  void _listenForRedirect() {
    _appLinks.uriLinkStream.listen((uri) async {
      if (uri.scheme != 'sentriapp') return;

      // Debug: Print received URI
      print('📱 Received deep link: $uri');
      print('📱 Full URI string: ${uri.toString()}');

      final host = uri.host; // For deep links like sentriapp://auth-callback
      final path = uri.path; // For URLs with path component
      final uriString = uri.toString(); // Full URI as string

      // Determine callback type from various URI formats
      String callbackType = '';
      if (host.isNotEmpty && host != 'null') {
        callbackType = host;
      } else if (path.isNotEmpty && path != '/') {
        callbackType = path;
      } else if (uriString.contains('auth-callback')) {
        callbackType = 'auth-callback';
      } else if (uriString.contains('login-success')) {
        callbackType = 'login-success';
      }

      final token = uri.queryParameters['token'] ?? "";
      final username = uri.queryParameters['username'] ?? "";
      final encryptedSalt = uri.queryParameters['encryptedSalt'] ?? "";
      final encodedMnemonic = uri.queryParameters['mnemonic'] ?? "";

      print('📱 Host: $host');
      print('📱 Path: $path');
      print('📱 Callback Type: $callbackType');
      print('📱 Token: ${token.isNotEmpty ? "✓" : "✗"}');
      print('📱 Username: ${username.isNotEmpty ? "✓" : "✗"}');
      print('📱 EncryptedSalt: ${encryptedSalt.isNotEmpty ? "✓" : "✗"}');
      print('📱 Mnemonic: ${encodedMnemonic.isNotEmpty ? "✓" : "✗"}');

      // Handle different redirect types
      if (callbackType.contains('auth-callback')) {
        // Registration callback - requires all data
        print('📱 Processing registration callback...');
        final result = await _authService.saveRedirectData(
          token: token,
          username: username,
          encryptedSalt: encryptedSalt,
          encodedMnemonic: encodedMnemonic,
        );

        setState(() {
          status = result.message;
          mnemonicDisplay = result.mnemonic;
        });
      } else if (callbackType.contains('login-success')) {
        // Login callback - extract sessionId
        print('📱 Processing login callback...');
        final sessionId = uri.queryParameters['sessionId'] ?? "";

        if (token.isEmpty || username.isEmpty) {
          setState(() {
            status =
                "⚠️ Login failed: Invalid data received.\nToken: ${token.isEmpty ? 'missing' : 'ok'}\nUsername: ${username.isEmpty ? 'missing' : 'ok'}";
          });
          return;
        }

        try {
          // Update token and session
          await _authService.updateLoginToken(
            token: token,
            username: username,
            sessionId: sessionId.isNotEmpty ? sessionId : null,
          );

          setState(() {
            status =
                "✅ Login successful! Welcome back, $username\n"
                "🔐 Token updated securely\n"
                "⏰ Session active (30 min timeout)";
            mnemonicDisplay = "";
          });
        } catch (e) {
          setState(() {
            status = "⚠️ Login error: $e";
          });
        }
      } else {
        // Unknown callback type
        setState(() {
          status =
              "⚠️ Unknown redirect: $callbackType\nExpected: auth-callback or login-success\nFull URI: $uri";
        });
      }
    });
  }

  /// ✅ Before opening registration, check for existing account
  Future<void> _checkBeforeRegistration() async {
    final existing = await _authService.loadLoginData();
    final existingUsername = existing['username'];
    final existingSalt = existing['salt'];

    if (existingUsername != null && existingSalt != null) {
      final action = await showDialog<String>(
        context: context,
        builder: (context) => AlertDialog(
          title: const Text("Existing Account Detected"),
          content: Text(
            "An account for '$existingUsername' already exists on this device.\n\nWould you like to remove it and register a new one, or just log in?",
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context, "cancel"),
              child: const Text("Cancel"),
            ),
            TextButton(
              onPressed: () => Navigator.pop(context, "login"),
              child: const Text("Login Instead"),
            ),
            ElevatedButton(
              onPressed: () => Navigator.pop(context, "new"),
              child: const Text("Remove & Register New"),
            ),
          ],
        ),
      );

      if (action == "login") {
        await _openWebLogin();
        return;
      } else if (action == "new") {
        await _authService.clearAccountData();
        setState(
          () =>
              status = "🧹 Old account removed. Proceeding to registration...",
        );
        await Future.delayed(const Duration(milliseconds: 500));
        await _openWebRegistration();
        return;
      } else {
        setState(() => status = "❌ Registration cancelled.");
        return;
      }
    }

    // No existing account → go straight to registration
    await _openWebRegistration();
  }

  Future<void> _openWebRegistration() async {
    setState(() => status = "🔐 Generating secure access token...");

    final opened = await _authService.openUrlWithMAT(
      AppConfig.registerUrl,
      "register",
    );

    setState(
      () => status = opened
          ? "🌐 Registration page opened securely"
          : "❌ Could not open registration page",
    );
  }

  Future<void> _openWebLogin() async {
    final loginData = await _authService.loadLoginData();
    final encryptedSalt = loginData['encryptedSalt'];
    final username = loginData['username'];

    if (encryptedSalt == null) {
      setState(
        () => status = "⚠️ No saved encrypted salt. Please register first.",
      );
      return;
    }

    setState(() => status = "🔐 Generating secure access token...");

    final baseUrl = Uri.parse(AppConfig.loginUrl)
        .replace(
          queryParameters: {
            if (username != null) 'username': username,
            'encryptedSalt': encryptedSalt,
          },
        )
        .toString();

    final opened = await _authService.openUrlWithMAT(baseUrl, "login");

    setState(
      () => status = opened
          ? "🌐 Login page opened securely"
          : "❌ Could not open login page",
    );
  }

  Future<void> _loadSavedData() async {
    final savedData = await _authService.loadAllData();
    setState(() {
      status = savedData['status']!;
      mnemonicDisplay = "";
    });
  }

  Future<void> _checkSession() async {
    setState(() => status = "⏳ Checking session...");

    final isValid = await _authService.isSessionValid();

    setState(() {
      status = isValid
          ? "✅ Session is valid and active"
          : "❌ No valid session. Please login.";
    });
  }

  Future<void> _refreshSession() async {
    setState(() => status = "⏳ Refreshing session...");

    final refreshed = await _authService.refreshSession();

    setState(() {
      status = refreshed
          ? "✅ Session refreshed! Extended by 30 minutes."
          : "❌ Failed to refresh session. Please login again.";
    });
  }

  Future<void> _logout() async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text("Confirm Logout"),
        content: const Text("Are you sure you want to logout?"),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text("Cancel"),
          ),
          ElevatedButton(
            onPressed: () => Navigator.pop(context, true),
            style: ElevatedButton.styleFrom(backgroundColor: Colors.red),
            child: const Text("Logout"),
          ),
        ],
      ),
    );

    if (confirm == true) {
      setState(() => status = "⏳ Logging out...");

      await _authService.logout();

      setState(() {
        status = "✅ Logged out successfully";
        mnemonicDisplay = "";
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text("SentriApp Auth")),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(status, style: const TextStyle(fontSize: 16)),
            if (mnemonicDisplay.isNotEmpty) ...[
              const SizedBox(height: 20),
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  border: Border.all(color: Colors.blueAccent),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(
                  "📝 Your Mnemonic Words (Save safely!):\n$mnemonicDisplay",
                  style: const TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
            ],
            const SizedBox(height: 20),
            ElevatedButton(
              onPressed: _checkBeforeRegistration,
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.blue,
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 14),
              ),
              child: const Text("🔐 Open Web Registration"),
            ),
            const SizedBox(height: 10),
            ElevatedButton(
              onPressed: _openWebLogin,
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.green,
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 14),
              ),
              child: const Text("🔓 Open Web Login"),
            ),
            const SizedBox(height: 20),
            const Divider(),
            const Text(
              "Session Management",
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 10),
            Row(
              children: [
                Expanded(
                  child: ElevatedButton(
                    onPressed: _checkSession,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.orange,
                      foregroundColor: Colors.white,
                    ),
                    child: const Text("Check Session"),
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: ElevatedButton(
                    onPressed: _refreshSession,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.purple,
                      foregroundColor: Colors.white,
                    ),
                    child: const Text("Refresh"),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 10),
            ElevatedButton(
              onPressed: _logout,
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.red,
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 14),
              ),
              child: const Text("🚪 Logout"),
            ),
            const SizedBox(height: 20),
            const Divider(),
            const SizedBox(height: 10),
            ElevatedButton(
              onPressed: _loadSavedData,
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.grey[700],
                foregroundColor: Colors.white,
              ),
              child: const Text("📋 Load Saved Data"),
            ),
          ],
        ),
      ),
    );
  }
}
