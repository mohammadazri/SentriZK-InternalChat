# 🏗️ System Overview

> **Project**: SentriZK — Secure Internal Messaging with Zero-Knowledge Authentication & AI Anomaly Detection  
> **Type**: Final Year Project (BCSS) · 2024/2025  
> **Author**: Mohammad Azri Bin Aziz

---

## Architecture Diagram

```
┌──────────────────────────────────────────────────────────────────────────┐
│                           CLIENT LAYER                                   │
├────────────────────────────────┬─────────────────────────────────────────┤
│   📱 Mobile App (Flutter 3.8)  │   🌐 Web Portal (Next.js 15)            │
│                                │                                         │
│   • Deep Link Auth (MAT)      │   • Registration Page (ZKP gen)         │
│   • E2EE Chat (Signal Proto)  │   • Login Page (ZKP gen)                │
│   • TFLite Threat Detection   │   • Admin Dashboard (SSE)               │
│   • WebRTC Audio/Video Call   │   • Account Recovery                    │
│   • Secure Storage (KeyStore) │   • MAT Validation                      │
│   • 4-Layer URL Scanning      │   • Wallet Simulator (MetaMask)         │
└───────────────┬────────────────┴──────────────┬──────────────────────────┘
                │          HTTPS                │
┌───────────────▼───────────────────────────────▼──────────────────────────┐
│                    BACKEND SERVER (Node.js 18+ / Express 5.1)            │
│                                                                          │
│   Auth Routes          Session Routes          Admin Routes              │
│   POST /register       POST /validate-session  POST /admin/login         │
│   POST /login          POST /refresh-session   GET  /admin/users         │
│   GET  /commitment     POST /logout            POST /admin/users/hold    │
│   POST /firebase-token GET  /validate-token    POST /admin/users/restore │
│   POST /threat-log     POST /gen-mat           POST /admin/users/revoke  │
│   POST /notify                                 GET  /admin/threat-logs   │
│                                                GET  /admin/stream (SSE)  │
│                                                                          │
│   Security: Rate Limiting · CORS · 100KB Body Limit · Prob. GC (10%)   │
│   ZKP:      snarkjs 0.7.5 Groth16 · Poseidon Hash · Nonce Mgmt        │
│   Admin:    bcrypt/timingSafeEqual · JWT HS256 · SSE Broadcast          │
└──────────┬────────────────────────────┬──────────────────────────────────┘
           │                            │
    ┌──────▼──────┐              ┌──────▼──────┐
    │  Supabase   │              │  Firebase   │
    │  PostgreSQL │              │  (Google)   │
    │             │              │             │
    │  • users    │              │  • profiles │
    │  • sessions │              │  • chats    │
    │  • tokens   │              │  • messages │
    │  • MATs     │              │  • signals  │
    │  • threats  │              │  • calls    │
    │             │              │  • fcmTokens│
    │  Indexes:   │              │  • Auth     │
    │  4 perf idx │              │  • FCM      │
    └─────────────┘              └─────────────┘
```

---

## Technology Stack

| Layer | Technology | Version | Purpose |
|-------|-----------|---------|---------|
| **Backend** | Node.js + Express | 18+ / 5.1.0 | REST API, ZKP verification, session management |
| **Database (Auth)** | Supabase PostgreSQL | — | Users, sessions, tokens, MATs, threat logs |
| **Database (Chat)** | Firebase Firestore | — | Real-time chat, profiles, call signaling |
| **Web Frontend** | Next.js (App Router) + React | 15 / 19 | Registration, login, admin dashboard |
| **Mobile App** | Flutter + Dart | 3.8.1 / 3.8 | Cross-platform chat app with E2EE, calling, AI |
| **ZKP Circuits** | Circom 2.x + snarkjs (Groth16) | 0.7.5 | Zero-knowledge registration and login proofs |
| **Auth Bridge** | Firebase Auth (custom tokens) | — | Mobile ↔ Firestore authentication bridge |
| **ML Model** | TensorFlow Lite (Conv1D) | — | On-device insider threat detection (< 1 MB) |
| **Encryption** | Signal Protocol (libsignal) | 0.7.2 | End-to-end encrypted chat messages |
| **Calling** | WebRTC (DTLS-SRTP) | 0.12.1 | Peer-to-peer encrypted audio/video calls |
| **Push Notifications** | Firebase Cloud Messaging | — | Data-only (messages) and visible (calls) pushes |

---

## Component Responsibilities

### Backend (`Backend/`)
- Verifies ZKP registration and login proofs using snarkjs Groth16 verifier
- Issues and validates session tokens (30-min TTL) with device binding
- Generates Mobile Access Tokens (MAT) for mobile-to-web auth bridge (5-min TTL)
- Manages nonces for anti-replay protection (60-sec TTL)
- Generates Firebase custom tokens for Firestore access
- Receives and stores ML threat logs with input validation
- Admin panel API with JWT auth, SSE real-time updates, user management
- Push notification relay (FCM) for messages and calls
- Probabilistic garbage collection (10% per-request cleanup of expired tokens)

### Web Frontend (`Frontend/web/`)
- Registration page: generates BIP-39 mnemonic, derives salt via HKDF, generates ZKP proof
- Login page: decrypts stored salt with password, fetches nonce, generates login proof
- Wallet simulation: simulates MetaMask wallet behavior for deriving secret
- Admin dashboard: user management, threat log viewer, real-time SSE updates
- Account recovery flow
- Auto-redirects to mobile via `sentriapp://` deep link after auth

### Mobile App (`Frontend/mobile/`)
- **Auth**: Deep link handling, MAT generation, secure credential storage (Android Keystore)
- **Chat**: Signal Protocol E2EE (X3DH + Double Ratchet) via Firestore
- **Calling**: WebRTC audio/video with Firestore signaling, DTLS-SRTP encryption
- **ML Threat Detection**: On-device TFLite Conv1D model, pre-encryption scanning
- **URL Security**: 4-layer scanning (homograph detection, local phishing DB, HTTPS check, Google Safe Browsing API)
- **Notifications**: FCM push for messages (data-only) and calls (visible)
- **UI**: Material 3, dark/light theme, Google Fonts, glassmorphism elements

### ML Pipeline (`ML/`)
- Dual-model training: Bi-LSTM (PC research) + Conv1D (mobile production)
- Dataset: `train_ready.csv` with class-weighted training (1.5× threat penalty)
- Exports: TFLite model (Conv1D, < 300 KB) + `vocab.json` (10,000 words)
- Mobile integration: `tflite_flutter` with GPU delegate and NNAPI

### Testing Suite (`Testing/`)
- 18 adversarial tests across CIA triad + ML categories
- Express + SSE test runner with React dashboard
- Auto-registration of test identity with real ZKP proofs
- SecurityReport component for print-ready audit reports

---

## Data Flow Summary

| Flow | Path | Encryption |
|------|------|-----------:|
| **Registration** | Mobile → Browser → Backend (ZKP proof) | TLS + proof reveals nothing |
| **Login** | Mobile → Browser → Backend (ZKP proof + nonce) | TLS + proof reveals nothing |
| **Chat Message** | Mobile A → Firestore → Mobile B | Signal Protocol E2EE |
| **Audio/Video** | Mobile A ↔ Mobile B (P2P via WebRTC) | DTLS-SRTP (media never hits server) |
| **Call Signaling** | Mobile ↔ Firestore | TLS 1.3 (SDP/ICE metadata only) |
| **ML Scan** | On-device TFLite inference | Never leaves device |
| **Threat Report** | Mobile → Backend → Supabase | TLS (only flagged messages reported) |
| **Push Notification** | Backend → FCM → Mobile | Metadata only — no content |

---

## Related Documentation

- [API Reference](../api/api_reference.md) — Complete REST endpoint documentation
- [Cryptographic Stack](../security/cryptographic_stack.md) — All crypto protocols
- [Database Schema](../database/schema_reference.md) — Supabase + Firestore schema
- [Testing Overview](../testing/testing_overview.md) — CIA triad test suite
- [Deployment Guide](../deployment/deployment_guide.md) — Production setup
