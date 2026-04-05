# 📱 SentriZK Mobile App

Flutter mobile application with ZKP authentication and deep linking.

## 🚀 Quick Start

```bash
# Install Flutter SDK (3.8.1+)
# https://docs.flutter.dev/get-started/install

# Install dependencies
flutter pub get

# Configure backend URL
# Edit lib/config/app_config.dart

# Run on device/emulator
flutter run

# Run with Safe Browsing key (recommended)
flutter run --dart-define=SAFE_BROWSING_API_KEY=your_key_here

# Build release APK (Android)
flutter build apk --release

# Build release APK with Safe Browsing key
flutter build apk --release --dart-define=SAFE_BROWSING_API_KEY=your_key_here
```

## 📦 Tech Stack

- **Framework**: Flutter 3.8.1+
- **Language**: Dart 3.8.1+
- **Secure Storage**: flutter_secure_storage 9.2.4
- **Deep Linking**: app_links 6.4.1
- **HTTP Client**: http 1.2.2

## ⚙️ Configuration

Edit `lib/config/app_config.dart`:

```dart
static const String baseUrl = 'http://your-backend-url:3000';
static const String webBaseUrl = 'http://localhost:3001';
static const String deepLinkScheme = 'sentriapp';
```

## 📖 Documentation

For comprehensive documentation, see:
- **Complete Guide**: [Doc/Frontend/mobile_documentation.md](../../Doc/Frontend/mobile_documentation.md)
- **API Reference**: [Doc/Backend/api_reference.md](../../Doc/Backend/api_reference.md)
- **Main README**: [../../README.md](../../README.md)
