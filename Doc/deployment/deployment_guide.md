# 🚀 Deployment Guide

> Step-by-step deployment instructions for all SentriZK components.

---

## Prerequisites

| Tool | Version | Purpose |
|------|---------|---------|
| **Node.js** | 18+ | Backend server |
| **npm** | 9+ | Package management |
| **Flutter** | 3.8+ | Mobile app builds |
| **Dart** | 3.8+ | Flutter language |
| **Git** | 2.x | Version control |
| **Supabase Account** | — | PostgreSQL database |
| **Firebase Project** | — | Firestore, Auth, FCM |

---

## 1. Backend Deployment

### 1.1 Clone and Install

```bash
git clone https://github.com/mohammadazri/SentriZK-InternalChat.git
cd SentriZK-InternalChat/Backend
npm install
```

### 1.2 Configure Environment

```bash
cp .env.example .env
```

Edit `.env` with your values:

| Variable | Description | Example |
|----------|-------------|---------|
| `SUPABASE_URL` | Your Supabase project URL | `https://xxxx.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (Project Settings → API) | `eyJhbGci...` |
| `ADMIN_USERNAME` | Admin dashboard login | `admin` |
| `ADMIN_PASSWORD` | Admin password (plaintext or bcrypt hash) | `$2b$10$...` |
| `JWT_SECRET` | Secret key for signing admin JWTs | `your-random-secret` |
| `JWT_TTL` | Admin token expiry | `1h` |
| `PORT` | Server port (optional) | `6000` |

### 1.3 Firebase Setup

1. Go to [Firebase Console](https://console.firebase.google.com/) → Project Settings → Service Accounts
2. Click **Generate New Private Key**
3. Save as `Backend/serviceAccountKey.json`

### 1.4 Database Setup

Run the SQL schema in [Supabase SQL Editor](https://supabase.com/dashboard):

```bash
# The schema file is at:
Backend/supabase_schema.sql
```

This creates 5 tables: `users`, `sessions`, `tokens`, `mobile_access_tokens`, `threat_logs` with performance indexes.

### 1.5 ZKP Circuit Files

The compiled circuits are already included in the repository:

```
Backend/circuits/
├── key_generation/
│   ├── registration_verification_key.json
│   ├── login_verification_key.json
│   ├── registration_final.zkey
│   └── login_final.zkey
├── registration/
│   └── registration_js/registration.wasm
└── login/
    └── login_js/login.wasm
```

If you need to regenerate circuits:
```bash
# Requires circom 2.x installed
circom registration.circom --r1cs --wasm --sym
circom login.circom --r1cs --wasm --sym
# Then perform Groth16 trusted setup with snarkjs
```

### 1.6 Start Server

```bash
node server.js
# 🚀 Server starts on http://localhost:6000
```

**Startup Checks**:
- ✅ Firebase Admin SDK initialized
- ✅ Supabase client connected
- ✅ Verification keys loaded
- ✅ Poseidon hash function built

---

## 2. Web Frontend Deployment

### 2.1 Install Dependencies

```bash
cd Frontend/web
npm install
```

### 2.2 Configure Environment

```bash
cp .env.example .env.local
```

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_API_URL` | Backend URL (e.g., `https://backend.sentrizk.me`) |
| `NEXT_PUBLIC_REG_WASM` | Path to registration WASM |
| `NEXT_PUBLIC_REG_ZKEY` | Path to registration zkey |
| `NEXT_PUBLIC_LOGIN_WASM` | Path to login WASM |
| `NEXT_PUBLIC_LOGIN_ZKEY` | Path to login zkey |

### 2.3 Circuit Files for Browser

Copy circuit files to the `public/` directory:

```
Frontend/web/public/circuits/
├── registration.wasm
├── registration.zkey
├── login.wasm
└── login.zkey
```

### 2.4 Development

```bash
npm run dev
# 🌐 http://localhost:3000
```

### 2.5 Production Build

```bash
npm run build
npm run start
```

Or deploy to Vercel:
```bash
npx vercel --prod
```

---

## 3. Mobile App Deployment

### 3.1 Install Dependencies

```bash
cd Frontend/mobile
flutter pub get
```

### 3.2 Configure URLs

Edit `lib/config/app_config.dart`:

```dart
static const String apiUrl = "https://backend.sentrizk.me";
static const String webUrl = "https://frontend.sentrizk.me";
```

### 3.3 Firebase Configuration

1. Add `google-services.json` to `android/app/`
2. Add `GoogleService-Info.plist` to `ios/Runner/` (if targeting iOS)

### 3.4 ML Assets

Ensure ML model files are present:

```
Frontend/mobile/assets/ml/
├── sentrizk_model.tflite    # TFLite model (~300 KB)
└── vocab.json               # Vocabulary (10,000 words)
```

### 3.5 Build APK (Release)

```bash
flutter build apk --release
# Output: build/app/outputs/flutter-apk/app-release.apk
```

### 3.6 Build App Bundle (Google Play)

```bash
flutter build appbundle --release
```

### 3.7 App Signing

For release builds, configure signing in `android/app/build.gradle` with your keystore.

---

## 4. Environment Variable Reference

### Backend (`Backend/.env`)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `SUPABASE_URL` | ✅ | — | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | — | Supabase service role key |
| `ADMIN_USERNAME` | ✅ | — | Admin login username |
| `ADMIN_PASSWORD` | ✅ | — | Admin login password |
| `JWT_SECRET` | ✅ | — | JWT signing secret |
| `JWT_TTL` | ❌ | `1h` | Admin token expiry |
| `PORT` | ❌ | `6000` | Server port |

### Web Frontend (`Frontend/web/.env.local`)

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_API_URL` | ✅ | Backend API URL |
| `NEXT_PUBLIC_REG_WASM` | ✅ | Path to registration circuit WASM |
| `NEXT_PUBLIC_REG_ZKEY` | ✅ | Path to registration proving key |
| `NEXT_PUBLIC_LOGIN_WASM` | ✅ | Path to login circuit WASM |
| `NEXT_PUBLIC_LOGIN_ZKEY` | ✅ | Path to login proving key |

### Mobile App (`Frontend/mobile/.env`)

Firebase configuration is handled by `google-services.json`. All other config is in `lib/config/app_config.dart`.

### Test Runner (`Testing/server/.env`)

| Variable | Required | Description |
|----------|----------|-------------|
| `BACKEND_URL` | ✅ | Target backend URL |
| `SUPABASE_URL` | ✅ | For direct DB access tests |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | Service role key |
| `TEST_USER` | ✅ | Test account username |
| `TEST_SECRET` | ✅ | Test account ZKP secret |
| `TEST_SALT` | ✅ | Test account salt |
| `TEST_UNAME_HASH` | ✅ | keccak256 of test username |
| `ADMIN_USERNAME` | ✅ | Admin credentials for tests |
| `ADMIN_PASSWORD` | ✅ | Admin password for tests |

---

## 5. Production Checklist

- [ ] Supabase database created with all 5 tables and indexes
- [ ] Firebase project configured (Firestore, Auth, FCM enabled)
- [ ] `serviceAccountKey.json` in `Backend/`
- [ ] All `.env` files configured with production values
- [ ] Backend deployed and accessible via HTTPS
- [ ] Web frontend deployed with circuit files in `public/circuits/`
- [ ] Mobile app built with production `apiUrl` and `webUrl`
- [ ] Admin credentials are strong (bcrypt-hashed recommended)
- [ ] JWT_SECRET is cryptographically random
- [ ] Rate limiting tested on production endpoints
- [ ] Deep link scheme `sentriapp://` registered in AndroidManifest.xml
