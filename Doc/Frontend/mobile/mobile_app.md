# 📱 SentriZK Mobile App

Flutter mobile application with deep linking and secure credential storage.

---

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Installation](#installation)
- [Configuration](#configuration)
- [Project Structure](#project-structure)
- [Authentication Flow](#authentication-flow)
- [Deep Linking Setup](#deep-linking-setup)
- [Security](#security)
- [Building](#building)

---

## Overview

The SentriZK mobile app is a Flutter application that provides a native mobile interface for Zero-Knowledge Proof authentication. It features a modern glassmorphic UI, secure credential storage, and seamless integration with the web frontend through deep linking.

### Key Features

- ✅ **Native Mobile UI**: Beautiful animations and transitions
- ✅ **Secure Storage**: Platform-specific encrypted storage
- ✅ **Deep Linking**: Seamless web-to-mobile authentication
- ✅ **Recovery Phrase**: Copyable recovery phrase dialog
- ✅ **Session Management**: Automatic session validation
- ✅ **Cross-Platform**: Android, iOS, Windows, Linux, macOS

---

## Features

### Authentication

- **Registration Flow**
  - Check for existing account
  - Generate Mobile Access Token (MAT)
  - Open system browser with MAT
  - Handle deep link callback
  - Display recovery phrase
  - Secure storage of credentials

- **Login Flow**
  - Load encrypted salt from storage
  - Generate MAT with credentials
  - Open system browser
  - Handle deep link callback
  - Session management

- **Account Management**
  - Existing account detection
  - Clear account option
  - Logout functionality
  - Session validation

### UI/UX

- **Glassmorphism Design**: Modern blurred glass aesthetic
- **Particle Animations**: Animated background particles
- **Pulse Animations**: Breathing shield logo effect
- **Two-State Interface**: Landing page vs authenticated dashboard
- **Recovery Phrase Dialog**: Copyable with confirmation flow
- **Account Detection Dialog**: Modern gradient design with clear actions

### Security

- **Encrypted Storage**: Platform-specific secure storage
- **MAT Protection**: One-time use tokens with 5-minute expiry
- **Deep Link Validation**: URI scheme verification
- **Timeout Protection**: 10-second network timeout
- **Session Expiration**: Auto-logout after 30 minutes

---

## Tech Stack

| Category | Technology | Version |
|----------|-----------|---------|
| Framework | Flutter | 3.8.1+ |
| Language | Dart | 3.8.1+ |
| Secure Storage | flutter_secure_storage | 9.2.4 |
| HTTP Client | http | 1.2.2 |
| Deep Linking | app_links | 6.4.1 |
| URL Launcher | url_launcher | 6.3.2 |
| Local Storage | shared_preferences | 2.5.3 |
| Encryption | encrypt | 5.0.3 |

---

## Installation

### Prerequisites

- Flutter SDK 3.8.1 or higher
- Dart SDK 3.8.1 or higher
- Android Studio (for Android)
- Xcode (for iOS, macOS only)
- Backend server running

### Installation Steps

1. **Install Flutter**

Follow the official Flutter installation guide:
https://docs.flutter.dev/get-started/install

2. **Clone Repository**

```bash
git clone https://github.com/mohammadazri/SentriZK-InternalChat.git
cd SentriZK-InternalChat/Frontend/mobile
```

3. **Install Dependencies**

```bash
flutter pub get
```

4. **Configure Backend URL**

Edit `lib/config/app_config.dart`:

```dart
class AppConfig {
  static const String baseUrl = 'http://your-backend-url:3000';
  // ... rest of configuration
}
```

5. **Run App**

```bash
# On connected device/emulator
flutter run

# On specific device
flutter devices
flutter run -d device_id
```

---

## Configuration

### Backend Configuration (`lib/config/app_config.dart`)

```dart
class AppConfig {
  // Backend API URL
  static const String baseUrl = 'http://10.0.2.2:3000'; // Android emulator
  // static const String baseUrl = 'http://localhost:3000'; // iOS simulator
  // static const String baseUrl = 'https://api.sentrizk.com'; // Production
  
  // API Endpoints
  static const String generateMATEndpoint = '$baseUrl/generate-mobile-access-token';
  static const String validateSessionEndpoint = '$baseUrl/validate-session';
  static const String refreshSessionEndpoint = '$baseUrl/refresh-session';
  static const String logoutEndpoint = '$baseUrl/logout';
  
  // Web App URLs
  static const String webBaseUrl = 'http://localhost:3001';
  static const String registerUrl = '$webBaseUrl/register';
  static const String loginUrl = '$webBaseUrl/login';
  
  // Deep Link Scheme
  static const String deepLinkScheme = 'sentriapp';
}
```

---

## Project Structure

```
Frontend/mobile/
├── lib/
│   ├── main.dart                  # App entry point
│   ├── screens/
│   │   └── auth_screen.dart       # Main authentication UI
│   ├── services/
│   │   └── auth_service.dart      # Authentication logic
│   └── config/
│       └── app_config.dart        # App configuration
│
├── android/
│   ├── app/
│   │   └── src/main/
│   │       └── AndroidManifest.xml  # Deep link config
│   └── build.gradle
│
├── ios/
│   └── Runner/
│       └── Info.plist             # Deep link config
│
├── windows/
│   └── runner/
│       └── main.cpp               # Windows config
│
├── linux/
│   └── ...
│
├── macos/
│   └── ...
│
├── pubspec.yaml                   # Dependencies
└── README.md
```

---

## Authentication Flow

### Registration Flow

```dart
// 1. Check for existing account
Future<void> _checkBeforeRegistration() async {
  final existing = await _authService.loadLoginData();
  
  if (existing['username'] != null && existing['encryptedSalt'] != null) {
    // Show account detection dialog
    final action = await showDialog(...);
    
    if (action == "login") {
      await _openWebLogin();
    } else if (action == "new") {
      await _authService.clearAccountData();
      await _openWebRegistration();
    }
  } else {
    await _openWebRegistration();
  }
}

// 2. Generate MAT and open browser
Future<void> _openWebRegistration() async {
  final opened = await _authService.openUrlWithMAT(
    AppConfig.registerUrl,
    "register",
  );
}

// 3. Handle deep link callback
void _listenForRedirect() {
  _appLinks.uriLinkStream.listen((uri) async {
    if (uri.host.contains('auth-callback')) {
      // Registration callback
      final token = uri.queryParameters['token'] ?? "";
      final username = uri.queryParameters['username'] ?? "";
      final encryptedSalt = uri.queryParameters['encryptedSalt'] ?? "";
      final encodedMnemonic = uri.queryParameters['mnemonic'] ?? "";
      
      final result = await _authService.saveRedirectData(
        token: token,
        username: username,
        encryptedSalt: encryptedSalt,
        encodedMnemonic: encodedMnemonic,
      );
      
      // Show recovery phrase dialog
      await _showRecoveryPhraseDialog(result.mnemonic);
    }
  });
}
```

### Login Flow

```dart
// 1. Load credentials and generate MAT
Future<void> _openWebLogin() async {
  final loginData = await _authService.loadLoginData();
  final encryptedSalt = loginData['encryptedSalt'];
  final username = loginData['username'];
  
  final baseUrl = Uri.parse(AppConfig.loginUrl)
      .replace(queryParameters: {
        if (username != null) 'username': username,
        'encryptedSalt': encryptedSalt,
      })
      .toString();
  
  await _authService.openUrlWithMAT(baseUrl, "login");
}

// 2. Handle login callback
void _listenForRedirect() {
  _appLinks.uriLinkStream.listen((uri) async {
    if (uri.host.contains('login-success')) {
      final token = uri.queryParameters['token'] ?? "";
      final username = uri.queryParameters['username'] ?? "";
      final sessionId = uri.queryParameters['sessionId'] ?? "";
      
      await _authService.updateLoginToken(
        token: token,
        username: username,
        sessionId: sessionId,
      );
      
      setState(() {
        _isLoggedIn = true;
        _username = username;
      });
    }
  });
}
```

---

## Deep Linking Setup

### Android Configuration

Edit `android/app/src/main/AndroidManifest.xml`:

```xml
<activity
    android:name=".MainActivity"
    android:launchMode="singleTop">
    
    <!-- Deep Link Intent Filter -->
    <intent-filter android:autoVerify="true">
        <action android:name="android.intent.action.VIEW" />
        <category android:name="android.intent.category.DEFAULT" />
        <category android:name="android.intent.category.BROWSABLE" />
        
        <!-- Custom URI Scheme -->
        <data android:scheme="sentriapp" />
        <data android:host="auth-callback" />
        <data android:host="login-success" />
    </intent-filter>
</activity>
```

### iOS Configuration

Edit `ios/Runner/Info.plist`:

```xml
<key>CFBundleURLTypes</key>
<array>
    <dict>
        <key>CFBundleTypeRole</key>
        <string>Editor</string>
        <key>CFBundleURLSchemes</key>
        <array>
            <string>sentriapp</string>
        </array>
    </dict>
</array>
```

### Windows Configuration

Edit `windows/runner/main.cpp`:

```cpp
// Add URL protocol handler
HKEY hKey;
RegOpenKeyEx(HKEY_CURRENT_USER, 
    L"Software\\Classes\\sentriapp", 
    0, KEY_ALL_ACCESS, &hKey);
```

### Testing Deep Links

```bash
# Android
adb shell am start -W -a android.intent.action.VIEW \
  -d "sentriapp://auth-callback?token=xyz&username=alice"

# iOS
xcrun simctl openurl booted \
  "sentriapp://auth-callback?token=xyz&username=alice"
```

---

## Key Features Implementation

### 1. Recovery Phrase Dialog

```dart
Future<void> _showRecoveryPhraseDialog(String mnemonic) async {
  bool isCopied = false;
  
  return showDialog(
    context: context,
    barrierDismissible: false,
    builder: (context) => StatefulBuilder(
      builder: (context, setDialogState) => Dialog(
        child: Container(
          child: Column(
            children: [
              // Tap to copy
              GestureDetector(
                onTap: () async {
                  await Clipboard.setData(ClipboardData(text: mnemonic));
                  setDialogState(() => isCopied = true);
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(content: Text('Copied to clipboard!')),
                  );
                },
                child: SelectableText(mnemonic),
              ),
              
              // Confirm button
              ElevatedButton(
                onPressed: () async {
                  if (!isCopied) {
                    final confirm = await showDialog<bool>(...);
                    if (confirm != true) return;
                  }
                  
                  Navigator.of(context).pop();
                  setState(() {
                    _mnemonicDisplay = '';
                    _isLoggedIn = false;
                  });
                },
                child: Text('I\'ve Saved It Securely'),
              ),
            ],
          ),
        ),
      ),
    ),
  );
}
```

### 2. Secure Storage

```dart
class AuthService {
  final _secureStorage = const FlutterSecureStorage();
  
  // Save credentials
  Future<SaveResult> saveRedirectData({
    required String token,
    required String username,
    required String encryptedSalt,
    required String encodedMnemonic,
  }) async {
    // Decode mnemonic
    String mnemonic = utf8.decode(base64Decode(encodedMnemonic));
    
    // Save to secure storage (encrypted by platform)
    await _secureStorage.write(key: 'encrypted_salt', value: encryptedSalt);
    await _secureStorage.write(key: 'token', value: token);
    
    // Save username to SharedPreferences
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('username', username);
    
    return SaveResult("Account registered successfully!", mnemonic);
  }
  
  // Load credentials
  Future<Map<String, String?>> loadLoginData() async {
    final prefs = await SharedPreferences.getInstance();
    final username = prefs.getString('username');
    final encryptedSalt = await _secureStorage.read(key: 'encrypted_salt');
    
    return {
      'username': username,
      'encryptedSalt': encryptedSalt
    };
  }
}
```

### 3. MAT Generation

```dart
Future<Map<String, dynamic>> generateMobileAccessToken(String action) async {
  final deviceId = await _getDeviceId();
  
  final response = await http.post(
    Uri.parse(AppConfig.generateMATEndpoint),
    headers: {'Content-Type': 'application/json'},
    body: jsonEncode({
      'deviceId': deviceId,
      'action': action, // 'register' or 'login'
    }),
  );
  
  if (response.statusCode == 200) {
    return jsonDecode(response.body);
  } else {
    throw Exception('Failed to generate MAT');
  }
}
```

---

## Security

### Platform-Specific Secure Storage

| Platform | Storage Mechanism |
|----------|------------------|
| Android | KeyStore (hardware-backed when available) |
| iOS | Keychain |
| Windows | Credential Manager (DPAPI) |
| Linux | Secret Service API / libsecret |
| macOS | Keychain |

### Security Features

1. **Encrypted Storage**: All sensitive data encrypted at rest
2. **MAT Validation**: One-time use tokens with expiration
3. **URI Scheme Validation**: Only accept `sentriapp://` scheme
4. **Timeout Protection**: 10-second network timeout
5. **Session Validation**: Check session on app launch
6. **Error Handling**: Secure error messages

---

## Building

### Debug Build

```bash
# Android
flutter build apk --debug

# iOS
flutter build ios --debug
```

### Release Build

```bash
# Android
flutter build apk --release
flutter build appbundle --release

# iOS
flutter build ios --release

# Windows
flutter build windows --release

# Linux
flutter build linux --release

# macOS
flutter build macos --release
```

### Build Outputs

- **Android APK**: `build/app/outputs/flutter-apk/app-release.apk`
- **Android Bundle**: `build/app/outputs/bundle/release/app-release.aab`
- **iOS**: `build/ios/iphoneos/Runner.app`
- **Windows**: `build/windows/runner/Release/`

---

## Testing

```bash
# Run all tests
flutter test

# Run with coverage
flutter test --coverage

# Integration tests
flutter test integration_test/
```

---

## Troubleshooting

### Issue: Deep links not working

**Android:**
1. Check `AndroidManifest.xml` configuration
2. Verify `android:autoVerify="true"`
3. Test with `adb shell am start`

**iOS:**
1. Check `Info.plist` configuration
2. Verify URL scheme registration
3. Test with `xcrun simctl openurl`

### Issue: Secure storage fails

**Solution:**
```dart
// Add error handling
try {
  await _secureStorage.write(key: 'test', value: 'value');
} catch (e) {
  print('Secure storage error: $e');
  // Fallback to SharedPreferences
}
```

### Issue: Network timeout

**Solution:** Increase timeout or check network connection:
```dart
await http.post(uri).timeout(
  Duration(seconds: 30),
  onTimeout: () => throw TimeoutException('Request timeout'),
);
```

---

## Deployment

### Android

1. **Generate Keystore**

```bash
keytool -genkey -v -keystore ~/upload-keystore.jks \
  -keyalg RSA -keysize 2048 -validity 10000 \
  -alias upload
```

2. **Configure Signing**

Edit `android/key.properties`:
```properties
storePassword=<password>
keyPassword=<password>
keyAlias=upload
storeFile=<path>/upload-keystore.jks
```

3. **Build & Upload**

```bash
flutter build appbundle --release
# Upload to Google Play Console
```

### iOS

1. **Configure Xcode**
   - Open `ios/Runner.xcworkspace`
   - Set Team and Bundle ID
   - Configure signing

2. **Build**

```bash
flutter build ios --release
open build/ios/archive/Runner.xcarchive
```

3. **Upload to App Store Connect**

---

## Support

- **Documentation**: [Main README](../../README.md)
- **API Docs**: [Backend API](../../Doc/Backend/api_reference.md)
- **Email**: mohamedazri@protonmail.com

---

## License

MIT License - See [LICENSE](../../LICENSE) for details
