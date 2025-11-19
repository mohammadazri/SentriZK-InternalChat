import 'dart:convert';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:http/http.dart' as http;
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

  // Generate a unique device ID
  Future<String> _getDeviceId() async {
    final prefs = await SharedPreferences.getInstance();
    String? deviceId = prefs.getString('device_id');

    if (deviceId == null) {
      // Generate new device ID
      deviceId = _generateRandomString(32);
      await prefs.setString('device_id', deviceId);
    }

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
      final deviceId = await _getDeviceId();
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
    }

    // Optionally update username if it changed
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('username', username);
  }

  /// Get current session ID
  Future<String?> getSessionId() async {
    return await _secureStorage.read(key: 'session_id');
  }

  /// Check if session is still valid
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

  /// Refresh the current session
  Future<bool> refreshSession() async {
    try {
      final sessionId = await getSessionId();
      if (sessionId == null) return false;

      final response = await http.post(
        Uri.parse(AppConfig.refreshSessionEndpoint),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'sessionId': sessionId}),
      );

      if (response.statusCode == 200) {
        await _secureStorage.write(
          key: 'session_refreshed_at',
          value: DateTime.now().toIso8601String(),
        );
        return true;
      }

      return false;
    } catch (e) {
      return false;
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

    // Clear local session data
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
        "EncryptedSalt: ${encryptedSalt != null ? encryptedSalt.substring(0, 12) + '...' : 'None'}\n"
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
      final deviceId = await _getDeviceId();

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
