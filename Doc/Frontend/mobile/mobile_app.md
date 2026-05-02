# 📱 Mobile Application — Flutter 3.8

> SentriZK mobile app for Android with E2EE messaging, WebRTC calling, on-device AI threat detection, and ZKP-based authentication.  
> **Current Version**: 1.0.5+6

---

## Technology Stack

| Technology | Version | Purpose |
|-----------|---------|---------|
| Flutter | 3.8.1 | Cross-platform UI framework |
| Dart | 3.8 | Language |
| firebase_core / cloud_firestore | latest | Real-time messaging backend |
| firebase_auth | 6.1.3 | Custom token authentication |
| firebase_messaging | latest | Push notifications (FCM) |
| flutter_secure_storage | 10.0.0 | Android Keystore / iOS Keychain |
| libsignal_protocol_dart | 0.7.2 | Signal Protocol E2EE |
| tflite_flutter | 0.12.0 | On-device ML inference |
| flutter_webrtc | 0.12.1 | WebRTC audio/video calling |
| app_links | 7.0.0 | Deep link handling (`sentriapp://`) |
| bip39 | 1.0.6 | Mnemonic generation |
| encrypt | 5.0.3 | AES encryption utilities |
| isar | 3.1.0 | Local embedded database |
| device_info_plus | 11.1.1 | Device identifier |
| provider | 6.1.5 | State management |
| google_fonts | 8.0.2 | Typography (Material 3) |
| image_picker | 1.1.2 | Profile avatar selection |
| audioplayers | 6.6.0 | Call ringtones |
| permission_handler | 11.3.1 | Runtime permissions |

---

## Project Structure

```
Frontend/mobile/lib/
├── main.dart                    # App entry point, Firebase init, ML init
├── firebase_options.dart        # Firebase configuration
│
├── config/
│   └── app_config.dart          # All URLs, timeouts, ML config, endpoints
│
├── screens/                     # 7 app screens
│   ├── auth_screen.dart         # Authentication (MAT + deep link)
│   ├── user_list_screen.dart    # Contact list + user discovery
│   ├── chat_screen.dart         # E2EE messaging UI
│   ├── call_screen.dart         # WebRTC audio/video call UI
│   ├── profile_setup_screen.dart# Display name, avatar, bio setup
│   ├── settings_screen.dart     # App settings + account management
│   └── security_test_screen.dart# Security test demonstration screen
│
├── services/                    # 12 service files
│   ├── auth_service.dart        # Session management, MAT, deep links
│   ├── chat_service.dart        # Firestore chat CRUD, message sync
│   ├── call_service.dart        # WebRTC, Firestore signaling, ICE
│   ├── user_service.dart        # User profiles, avatar upload
│   ├── notification_service.dart# FCM token management, local notifications
│   ├── message_scan_service.dart# TFLite ML inference (singleton)
│   ├── message_security_service.dart # 4-layer URL security scanning
│   ├── recovery_service.dart    # Account recovery from mnemonic
│   ├── permission_service.dart  # Camera, microphone permissions
│   ├── sound_service.dart       # Call ringtone audio
│   │
│   ├── signal/                  # Signal Protocol E2EE
│   │   ├── signal_manager.dart  # Session establishment, encrypt/decrypt
│   │   └── signal_store_impl.dart# Local key/session persistence (Isar)
│   │
│   └── security/                # URL security layers
│       ├── homograph_detector.dart    # Punycode/Unicode attack detection
│       ├── local_phishing_database.dart# Known phishing domain database
│       └── safe_browsing_service.dart  # Google Safe Browsing API
│
├── models/                      # Data models
├── providers/                   # State management (Provider)
├── theme/                       # Material 3 theme configuration
├── utils/                       # Utility functions
└── widgets/                     # Reusable UI components
```

---

## Core Features

### 1. Authentication (`auth_service.dart`)

The mobile app never handles ZKP proof generation directly — it delegates to the web portal:

```
App starts → check stored sessionId
  → POST /validate-session
  → Valid? → skip login, go to chat
  → Expired? → start auth flow:
    1. POST /generate-mobile-access-token {deviceId, action}
    2. Open browser: webUrl/login?mat=MAT&device=deviceId
    3. Web generates ZKP proof, submits to backend
    4. Backend redirects via deep link: sentriapp://auth?token=TOKEN
    5. App intercepts deep link (app_links)
    6. GET /validate-token?token=TOKEN&device=deviceId
    7. Store sessionId in FlutterSecureStorage
    8. POST /firebase-token {sessionId} → signInWithCustomToken
    9. ✅ Fully authenticated
```

**Session Refresh**: Auto-scheduled 60 seconds before expiry. Rotates sessionId and validates device binding.

### 2. E2EE Messaging (`signal/signal_manager.dart`)

Full Signal Protocol implementation using `libsignal_protocol_dart`:

- **X3DH Key Agreement**: 4 Diffie-Hellman exchanges for initial session
- **Double Ratchet**: Per-message key rotation with forward secrecy
- **Pre-Key Bundles**: 100 one-time pre-keys uploaded to Firestore `signals/{username}`
- **Key Storage**: Signal sessions stored in local Isar database

```dart
// First message to a new contact
encryptMessage(recipientId, plaintext):
  1. Fetch recipient's PreKey bundle from Firestore
  2. Pick random preKey from 100 available (prevents collision bug)
  3. SessionBuilder.processPreKeyBundle(bundle)  // X3DH
  4. SessionCipher.encrypt(utf8.encode(plaintext))
  5. → type: PREKEYTYPE (3), ciphertext: base64

// Subsequent messages
  → SessionCipher.encrypt(utf8.encode(plaintext))
  → type: WHISPER (1), ciphertext: base64
  → key ratcheted, old key deleted
```

### 3. ML Threat Detection (`message_scan_service.dart`)

Singleton service initialized at app startup:

- **Model**: Conv1D TFLite (~300 KB)
- **Vocab**: 10,000 words from `vocab.json`
- **Input**: Tokenized message, padded to 120 tokens
- **Output**: Threat score 0.0–1.0
- **Threshold**: 0.65 (configurable in `AppConfig`)
- **Skip**: Messages < 4 words (prevents OOV false positives)
- **Hardware Acceleration**: GPU Delegate V2 + NNAPI for Android
- **Inference Time**: < 100 ms on modern phones

**Privacy**: Scanning happens **before** Signal Protocol encryption. The server never sees plaintext — only flagged messages are reported to `/threat-log`.

### 4. 4-Layer URL Security (`message_security_service.dart`)

Received messages are scanned through 4 layers:

| Layer | Service | What It Detects |
|-------|---------|-----------------|
| 1 | `HomographDetector` | Unicode/Punycode lookalike domains (e.g., `gοogle.com` with Greek 'ο') |
| 2 | `LocalPhishingDatabase` | Known phishing domains from embedded database |
| 3 | HTTPS Check | HTTP-only links (missing TLS) |
| 4 | `SafeBrowsingService` | Google Safe Browsing API v4 real-time check |

Results are cached for 7 days (`AppConfig.scanCacheDays`) to avoid redundant API calls.

### 5. WebRTC Calling (`call_service.dart`)

Peer-to-peer encrypted audio/video calls:

- **Signaling**: Firestore `calls/{callId}` documents
- **ICE Candidates**: Exchanged via Firestore subcollection
- **STUN Servers**: 3× Google STUN servers (`stun.l.google.com:19302`)
- **Media Encryption**: DTLS-SRTP (media never passes through server)
- **Missed Call Timer**: 45 seconds
- **Controls**: Mute, camera toggle, camera switch, speaker toggle

### 6. Push Notifications (`notification_service.dart`)

- **Messages**: Data-only push (silent). App receives, decrypts, builds local notification.
- **Calls**: Visible notification with `sentrizk_calls` channel, HIGH priority, ringtone.
- **FCM Token**: Stored in Firestore `fcmTokens/{username}`, refreshed on update.

---

## Configuration (`app_config.dart`)

| Config | Value | Description |
|--------|-------|-------------|
| `apiUrl` | `https://backend.sentrizk.me` | Backend API |
| `webUrl` | `https://frontend.sentrizk.me` | Web frontend |
| `deepLinkScheme` | `sentriapp` | Deep link URI scheme |
| `sessionTimeoutMinutes` | 30 | Session TTL |
| `matExpiryMinutes` | 5 | MAT TTL |
| `mlModelAsset` | `assets/ml/sentrizk_model.tflite` | TFLite model path |
| `mlVocabAsset` | `assets/ml/vocab.json` | Vocabulary path |
| `mlMaxLen` | 120 | Max token sequence length |
| `mlThreatThreshold` | 0.65 | Threat detection threshold |
| `mlMinWordCount` | 4 | Minimum words for scanning |
| `scanCacheDays` | 7 | URL scan cache duration |

---

## Secure Storage

| Storage | Technology | Contents |
|---------|-----------|----------|
| `FlutterSecureStorage` | Android Keystore (HSM) | Encrypted salt, session ID |
| `SharedPreferences` | XML (app sandbox) | Username (non-sensitive) |
| `Isar DB` | Embedded NoSQL | Signal protocol sessions, scan cache |

---

## Build Commands

```bash
# Development
flutter run

# Release APK
flutter build apk --release

# App Bundle (Google Play)
flutter build appbundle --release

# Current version: 1.0.5+6
```
