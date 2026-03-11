# 🏗️ System Overview

> **Project**: SentriZK — Secure Internal Messaging with Zero-Knowledge Authentication & AI Anomaly Detection  
> **Type**: Final Year Project (BCSS)

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        Client Layer                             │
├──────────────────────────┬──────────────────────────────────────┤
│   Web (Next.js + React)  │   Mobile (Flutter)                   │
│   • Registration UI      │   • Deep Link Handler                │
│   • Login UI             │   • Secure Storage (KeyStore)        │
│   • ZKP Proof Generation │   • E2EE Chat (Signal Protocol)     │
│   • Wallet Simulator     │   • Audio/Video Calling (WebRTC)    │
│                          │   • Phishing Detection (TFLite)     │
│                          │   • MAT Token Management             │
└──────────────┬───────────┴──────────────┬───────────────────────┘
               │         HTTPS            │
               │                          │
┌──────────────▼──────────────────────────▼───────────────────────┐
│                  Backend Server (Node.js + Express)              │
├─────────────────────────────────────────────────────────────────┤
│  • POST /register              (ZKP registration)               │
│  • POST /login                 (ZKP login)                      │
│  • GET  /commitment/:user      (nonce for login)                │
│  • POST /generate-mobile-access-token  (MAT)                   │
│  • POST /validate-session      (session check)                  │
│  • POST /refresh-session       (extend session)                 │
│  • POST /logout                (end session)                    │
├─────────────────────────────────────────────────────────────────┤
│  ZKP: snarkjs Groth16 verifier + Circom circuits               │
│  Security: CORS, rate limiting (10 req/min), nonce TTL          │
└────────────────────────────┬────────────────────────────────────┘
                             │
               ┌─────────────┴──────────────┐
               │                            │
       ┌───────▼────────┐          ┌────────▼────────┐
       │  JSON File DB   │          │  Firebase        │
       │  (Auth data)    │          │  (Chat data)     │
       │                 │          │                  │
       │  • Users        │          │  • Firestore     │
       │  • Sessions     │          │    (messages,    │
       │  • Nonces       │          │     users,       │
       │  • MAT Tokens   │          │     calls)       │
       └─────────────────┘          │  • Auth          │
                                    │  • Storage       │
                                    └─────────────────┘
```

---

## Technology Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Backend** | Node.js 16+ / Express 5 | REST API, ZKP verification, session management |
| **Web Frontend** | Next.js 15 / React 19 / TypeScript | Registration & Login UI, in-browser ZKP proof generation |
| **Mobile App** | Flutter 3.8.1 / Dart | Cross-platform chat app with E2EE, calling, phishing detection |
| **ZKP Circuits** | Circom 2.x / snarkjs (Groth16) | Zero-knowledge registration and login proofs |
| **Real-time DB** | Firebase Firestore | Chat messages, user profiles, call signaling |
| **Auth Bridge** | Firebase Auth (custom tokens) | Mobile ↔ Firestore authentication bridge |
| **ML Model** | TensorFlow Lite | On-device phishing URL detection |
| **Encryption** | Signal Protocol (libsignal) | End-to-end encrypted chat messages |
| **Calling** | WebRTC (DTLS-SRTP) | Peer-to-peer encrypted audio/video calls |

---

## Component Responsibilities

### Backend (`Backend/`)
- Verifies ZKP registration and login proofs using snarkjs
- Issues and validates session tokens (30-min TTL)
- Generates Mobile Access Tokens (MAT) for mobile-to-web auth
- Manages nonces for anti-replay protection (60-sec TTL)
- Generates Firebase custom tokens for Firestore access

### Web Frontend (`Frontend/web/`)
- Registration page: generates BIP-39 mnemonic, derives salt, generates ZKP proof
- Login page: decrypts stored salt, fetches nonce, generates login proof
- Wallet simulation: simulates Web3 wallet behavior for UX
- Auto-closes browser tab after auth and redirects to mobile via deep link

### Mobile App (`Frontend/mobile/`)
- **Auth**: Deep link handling, MAT generation, secure credential storage
- **Chat**: Signal Protocol E2EE (X3DH + Double Ratchet), Firestore sync
- **Calling**: WebRTC audio/video with Firestore signaling, DTLS-SRTP encryption
- **Security**: On-device phishing detection (TFLite), homograph detection, Safe Browsing API
- **UI**: Material 3, dark theme, glassmorphism, real-time message sync

### ML (`ML/`)
- Python training pipeline for phishing URL classification
- Exports trained model to TensorFlow Lite format for mobile
- Dataset management and model evaluation

---

## Data Flow Summary

| Flow | Path | Encryption |
|------|------|-----------|
| **Registration** | Mobile → Browser → Backend (ZKP proof) | TLS + proof reveals nothing |
| **Login** | Mobile → Browser → Backend (ZKP proof + nonce) | TLS + proof reveals nothing |
| **Chat Message** | Mobile A → Firestore → Mobile B | Signal Protocol E2EE (unreadable on server) |
| **Audio/Video** | Mobile A ↔ Mobile B (P2P via WebRTC) | DTLS-SRTP (media never hits server) |
| **Call Signaling** | Mobile ↔ Firestore | TLS 1.3 (SDP/ICE metadata only) |
| **Phishing Scan** | On-device ML inference | Never leaves device |
