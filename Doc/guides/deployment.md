# 🚀 Deployment Guide

Production build and deployment instructions for all SentriZK components.

---

## 1. Mobile App (Flutter → Release APK)

### Build Release APK

```bash
cd Frontend/mobile
flutter pub get
flutter build apk --release
```

**Output**: `build/app/outputs/flutter-apk/app-release.apk`

### Build App Bundle (for Play Store)

```bash
flutter build appbundle --release
```

**Output**: `build/app/outputs/bundle/release/app-release.aab`

### Signing Configuration

For Play Store submission, configure signing in `android/app/build.gradle`:

```groovy
signingConfigs {
    release {
        keyAlias 'your-key-alias'
        keyPassword 'your-key-password'
        storeFile file('your-keystore.jks')
        storePassword 'your-store-password'
    }
}
```

---

## 2. Backend (Node.js)

### Production Setup

```bash
cd Backend
npm install --production
```

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | `3000` |
| `CORS_ORIGIN` | Allowed frontend origin | `http://localhost:3001` |

### Run with Process Manager

```bash
npm install -g pm2
pm2 start server.js --name sentrizk-backend
pm2 save
pm2 startup
```

### Nginx Reverse Proxy (recommended)

```nginx
server {
    listen 443 ssl;
    server_name backend.yourdomain.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

---

## 3. Web Frontend (Next.js)

### Build for Production

```bash
cd Frontend/web
npm install
npm run build
```

### Environment Variables

Create `.env.local` with:

```env
NEXT_PUBLIC_BACKEND_URL=https://backend.yourdomain.com
NEXT_PUBLIC_MOBILE_SCHEME=sentriapp
```

### Deploy Options

| Platform | Command |
|----------|---------|
| **Vercel** | `vercel --prod` |
| **Self-hosted** | `npm start` (runs on port 3001) |
| **Docker** | Build and run with `Dockerfile` |

---

## 4. Firebase Configuration

### Required Services

- **Firestore**: Chat messages, user profiles, call signaling
- **Firebase Auth**: Custom token authentication (mobile ↔ Firestore bridge)
- **Firebase Storage**: File attachments (if applicable)

### Security Rules

Ensure Firestore security rules restrict access:
- Users can only read/write their own messages
- Call documents restricted to caller/receiver
- User profiles readable by authenticated users only

### Service Account Key

Place `serviceAccountKey.json` in `Backend/` for Firebase Admin SDK:

```bash
# Download from Firebase Console → Project Settings → Service Accounts
```

---

## 5. Pre-Deployment Checklist

- [ ] Backend `CORS_ORIGIN` set to production frontend URL
- [ ] Replace `localhost` with production URLs in `app_config.dart`
- [ ] Firebase security rules deployed and tested
- [ ] HTTPS/TLS configured for backend
- [ ] Rate limiting configured in production
- [ ] ZKP circuit keys (`*.zkey`, `verification_key.json`) deployed
- [ ] WASM circuit files in `Frontend/web/public/circuits/`
- [ ] Mobile release APK signed with production keystore
