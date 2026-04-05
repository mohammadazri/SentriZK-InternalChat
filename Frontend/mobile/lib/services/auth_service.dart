import 'dart:async';
import 'dart:convert';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:http/http.dart' as http;
import 'package:firebase_auth/firebase_auth.dart';
import 'dart:math';
import '../config/app_config.dart';
import 'recovery_service.dart';

class SaveResult {
  final String message;
  final String mnemonic;
  SaveResult(this.message, this.mnemonic);
}

class AuthService {
  final _secureStorage = const FlutterSecureStorage();
  Timer? _refreshTimer;
  String? _cachedDeviceId;

  // Generate a unique device ID (public)
  Future<String> getDeviceId() async {
    if (_cachedDeviceId != null) return _cachedDeviceId!;

    final prefs = await SharedPreferences.getInstance();
    String? deviceId = prefs.getString('device_id');

    if (deviceId == null) {
      // Generate new device ID
      deviceId = _generateRandomString(32);
      await prefs.setString('device_id', deviceId);
    }

    _cachedDeviceId = deviceId;
    return deviceId;
  }

  String _generateRandomString(int length) {
    const chars = 'abcdef0123456789';
    final random = Random.secure();
    return List.generate(
      length,
      (index) => chars[random.nextInt(chars.length)],
    ).join();
  }

  /// Generate Mobile Access Token from backend
  Future<Map<String, dynamic>> generateMobileAccessToken(String action) async {
    try {
      final deviceId = await getDeviceId();
      final endpoint = AppConfig.generateMATEndpoint;

      print('🔐 Generating MAT...');
      print('📍 Endpoint: $endpoint');
      print('📱 Device ID: $deviceId');
      print('🎯 Action: $action');

      final response = await http.post(
        Uri.parse(endpoint),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'deviceId': deviceId,
          'action': action, // 'register' or 'login'
        }),
      );

      print('📥 Response Status: ${response.statusCode}');
      print('📥 Response Body: ${response.body}');

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        print('✅ MAT generated successfully');
        return data;
      } else {
        throw Exception(
          'Failed to generate mobile access token: ${response.statusCode} - ${response.body}',
        );
      }
    } catch (e) {
      print('❌ Error generating MAT: $e');
      throw Exception('Error generating mobile access token: $e');
    }
  }

  /// Save encrypted salt (secure), username (normal), mnemonic only displayed
  /// Used for registration - requires all fields
  Future<SaveResult> saveRedirectData({
    required String token,
    required String username,
    required String encryptedSalt,
    required String encodedMnemonic,
  }) async {
    // Validate required fields for registration
    if (token.isEmpty || username.isEmpty || encryptedSalt.isEmpty) {
      return SaveResult(
        "⚠️ Invalid registration data. Missing: ${token.isEmpty ? 'token ' : ''}${username.isEmpty ? 'username ' : ''}${encryptedSalt.isEmpty ? 'encryptedSalt' : ''}",
        "",
      );
    }

    String mnemonic = "";
    if (encodedMnemonic.isNotEmpty) {
      try {
        mnemonic = utf8.decode(base64Decode(encodedMnemonic));
      } catch (e) {
        return SaveResult("⚠️ Invalid mnemonic encoding: $e", "");
      }
    }

    // Save data (encrypted salt)
    await _secureStorage.write(key: 'encrypted_salt', value: encryptedSalt);
    await _secureStorage.write(key: 'token', value: token);

    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('username', username);

    return SaveResult("✅ Account registered successfully!", mnemonic);
  }

  /// Validate one-time token with backend and bind to this device
  Future<Map<String, dynamic>> validateToken(String token) async {
    try {
      final deviceId = await getDeviceId();
      final url =
          '${AppConfig.apiUrl}/validate-token?token=$token&device=$deviceId';
      final response = await http.get(Uri.parse(url));

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        return Map<String, dynamic>.from(data);
      } else {
        throw Exception('Token validation failed: ${response.statusCode}');
      }
    } catch (e) {
      throw Exception('Error validating token: $e');
    }
  }

  /// Full redirect processing: validate one-time token and store validated session
  Future<void> processLoginRedirect({
    required String token,
    required String username,
  }) async {
    if (token.isEmpty || username.isEmpty) {
      throw Exception("Token and username required");
    }

    // Validate token with backend (binds session to this device)
    final data = await validateToken(token);
    if (data['valid'] != true) {
      throw Exception('Token not valid');
    }

    if (data['username'] != username) {
      throw Exception('Username mismatch in token validation');
    }

    final sessionId = data['sessionId'];
    if (sessionId == null) {
      throw Exception('No sessionId returned from validation');
    }

    // Persist validated session and schedule refresh
    await updateLoginToken(
      token: token,
      username: username,
      sessionId: sessionId,
    );
  }

  /// Update login token and session after successful login
  Future<void> updateLoginToken({
    required String token,
    required String username,
    String? sessionId,
  }) async {
    if (token.isEmpty || username.isEmpty) {
      throw Exception("Token and username required");
    }

    // Update token and session
    await _secureStorage.write(key: 'token', value: token);
    if (sessionId != null) {
      await _secureStorage.write(key: 'session_id', value: sessionId);
      await _secureStorage.write(
        key: 'session_created_at',
        value: DateTime.now().toIso8601String(),
      );
      // Schedule automatic refresh using configured TTL
      final ttl = Duration(minutes: AppConfig.sessionTimeoutMinutes);
      scheduleSessionRefresh(ttl);
    }

    // Optionally update username if it changed
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('username', username);
  }

  /// Get current session ID
  Future<String?> getSessionId() async {
    return await _secureStorage.read(key: 'session_id');
  }

  /// Fast parallel validation for boot up sequence
  Future<Map<String, dynamic>> validateLocalSession() async {
    final results = await Future.wait([
      getSessionId(),
      loadLoginData(),
    ]);
    
    final sessionId = results[0] as String?;
    final loginData = results[1] as Map<String, String?>;
    
    final hasValidSession = sessionId != null && sessionId.isNotEmpty;
    final username = loginData['username'];
    
    return {
      'isValid': hasValidSession && username != null,
      'username': username,
      'encryptedSalt': loginData['encryptedSalt'],
    };
  }

  /// Check if session exists locally (Fast, non-blocking startup)
  Future<bool> hasLocalSession() async {
    final sessionId = await getSessionId();
    return sessionId != null && sessionId.isNotEmpty;
  }

  /// Check if session is still valid with the backend (Network request)
  Future<bool> isSessionValid() async {
    try {
      final sessionId = await getSessionId();
      if (sessionId == null) return false;

      final response = await http.post(
        Uri.parse(AppConfig.validateSessionEndpoint),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'sessionId': sessionId}),
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        return data['valid'] == true;
      }

      return false;
    } catch (e) {
      return false;
    }
  }

  /// Refresh the current session (sends deviceId, handles rotated sessionId)
  Future<bool> refreshSession() async {
    try {
      final sessionId = await getSessionId();
      if (sessionId == null) return false;

      final deviceId = await getDeviceId();
      final response = await http.post(
        Uri.parse(AppConfig.refreshSessionEndpoint),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'sessionId': sessionId, 'deviceId': deviceId}),
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        final newSessionId = data['sessionId'];
        final expiresIn = data['expiresIn'];

        // If server rotated the sessionId, update stored value
        if (newSessionId != null && newSessionId != sessionId) {
          await _secureStorage.write(key: 'session_id', value: newSessionId);
        }

        await _secureStorage.write(
          key: 'session_refreshed_at',
          value: DateTime.now().toIso8601String(),
        );

        // Reschedule next refresh using server-provided TTL when available
        if (expiresIn != null) {
          try {
            final ttl = Duration(milliseconds: expiresIn);
            scheduleSessionRefresh(ttl);
          } catch (_) {}
        }

        return true;
      }

      return false;
    } catch (e) {
      return false;
    }
  }

  /// Schedule an automatic refresh before session expiry
  void scheduleSessionRefresh(Duration ttl) {
    // Cancel existing timer
    _refreshTimer?.cancel();

    // Refresh 60 seconds before expiry (or 20s if TTL small)
    final refreshBefore = Duration(seconds: 60);
    final delay = ttl > refreshBefore
        ? ttl - refreshBefore
        : Duration(seconds: 20);

    _refreshTimer = Timer(delay, () async {
      // Try refresh; on failure retry once after short delay
      var ok = await refreshSession();
      if (!ok) {
        await Future.delayed(const Duration(seconds: 5));
        ok = await refreshSession();
      }
      if (!ok) {
        // If still failing, clear session and require re-login
        await logout();
      }
    });
  }

  /// Sign in to Firebase using a custom token from the backend
  Future<void> signInToFirebase(String sessionId) async {
    try {
      print('🔥 Requesting Firebase custom token...');
      final response = await http.post(
        Uri.parse(AppConfig.firebaseTokenEndpoint),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'sessionId': sessionId}),
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        final firebaseToken = data['firebaseToken'];

        if (firebaseToken != null) {
          await FirebaseAuth.instance.signInWithCustomToken(firebaseToken);
          print('✅ Firebase Auth signed in successfully');
        } else {
          throw Exception('No firebaseToken in response');
        }
      } else {
        throw Exception('Firebase token request failed: ${response.statusCode} - ${response.body}');
      }
    } catch (e) {
      print('❌ Firebase sign-in error: $e');
      rethrow;
    }
  }

  /// Logout (clear session)
  Future<void> logout() async {
    try {
      final sessionId = await getSessionId();
      if (sessionId != null) {
        await http.post(
          Uri.parse(AppConfig.logoutEndpoint),
          headers: {'Content-Type': 'application/json'},
          body: jsonEncode({'sessionId': sessionId}),
        );
      }
    } catch (e) {
      // Ignore logout errors
    }

    // Sign out of Firebase Auth
    try {
      await FirebaseAuth.instance.signOut();
    } catch (e) {
      // Ignore Firebase sign-out errors
    }

    // Clear local session data
    _refreshTimer?.cancel();
    await _secureStorage.delete(key: 'session_id');
    await _secureStorage.delete(key: 'session_created_at');
    await _secureStorage.delete(key: 'session_refreshed_at');
    await _secureStorage.delete(key: 'token');
  }

  /// Load login data
  Future<Map<String, String?>> loadLoginData() async {
    final prefs = await SharedPreferences.getInstance();
    final username = prefs.getString('username');
    final encryptedSalt = await _secureStorage.read(key: 'encrypted_salt');
    return {'username': username, 'encryptedSalt': encryptedSalt};
  }

  /// Save username and encrypted salt bundle (from recovery/import)
  Future<void> saveRecoveredAccount({
    required String username,
    required String encryptedSaltBundle,
  }) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('username', username);
    await _secureStorage.write(
      key: 'encrypted_salt',
      value: encryptedSaltBundle,
    );
  }

  /// Derive salt from mnemonic + passphrase, encrypt with password, store locally
  /// Returns the encrypted bundle (base64 JSON) for convenience
  Future<String> recoverAndStoreEncryptedSalt({
    required String username,
    required String mnemonic,
    String passphrase = '',
    required String password,
  }) async {
    final saltHex = await RecoveryService.deriveSaltFromMnemonic(
      mnemonic,
      passphrase: passphrase,
    );
    final encrypted = await RecoveryService.encryptSaltHex(saltHex, password);
    await saveRecoveredAccount(
      username: username,
      encryptedSaltBundle: encrypted,
    );
    return encrypted;
  }

  /// Load all stored data for debug/view
  Future<Map<String, String?>> loadAllData() async {
    final prefs = await SharedPreferences.getInstance();
    final username = prefs.getString('username');
    final encryptedSalt = await _secureStorage.read(key: 'encrypted_salt');
    final token = await _secureStorage.read(key: 'token');
    final sessionId = await _secureStorage.read(key: 'session_id');
    final sessionValid = await isSessionValid();

    final status =
        "🔐 Saved Data:\n"
        "Username: $username\n"
        "Token: ${token?.substring(0, 8)}...\n"
        "EncryptedSalt: ${encryptedSalt != null ? '${encryptedSalt.substring(0, 12)}...' : 'None'}\n"
        "Session: ${sessionId != null ? '✓ Active' : '✗ None'}\n"
        "Valid: ${sessionValid ? '✓ Yes' : '✗ No'}";
    return {'status': status};
  }

  /// Remove all stored data (for new registration)
  Future<void> clearAccountData() async {
    await logout(); // Clear session first

    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('username');
    await _secureStorage.delete(key: 'encrypted_salt');
    await _secureStorage.delete(key: 'token');
  }

  /// Open external URL with Mobile Access Token
  Future<bool> openUrlWithMAT(String baseUrl, String action) async {
    try {
      print('🌐 Opening URL with MAT...');
      print('📍 Base URL: $baseUrl');
      print('🎯 Action: $action');

      // Generate MAT
      final matData = await generateMobileAccessToken(action);
      final mat = matData['mobileAccessToken'];
      final deviceId = await getDeviceId();

      if (mat == null || mat.isEmpty) {
        print('❌ MAT is empty!');
        return false;
      }

      // Append MAT to URL
      final uri = Uri.parse(baseUrl);
      final urlWithMAT = uri.replace(
        queryParameters: {
          ...uri.queryParameters,
          'mat': mat,
          'device': deviceId,
        },
      );

      print('🔗 Final URL: $urlWithMAT');
      print('🚀 Launching browser...');

      final launched = await launchUrl(
        urlWithMAT,
        mode: LaunchMode.externalApplication,
      );

      print(launched ? '✅ Browser launched' : '❌ Failed to launch browser');
      return launched;
    } catch (e) {
      print('❌ Error opening URL with MAT: $e');
      return false;
    }
  }

  /// Open external URL (legacy, without MAT)
  Future<bool> openUrl(String url) async {
    final uri = Uri.parse(url);
    return await launchUrl(uri, mode: LaunchMode.externalApplication);
  }
}
