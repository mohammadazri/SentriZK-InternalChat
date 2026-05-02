# SentriZK — Automated Security Testing Dashboard

> CIA Triad adversarial test suite with real-time streaming output.
> Built for FYP cybersecurity demonstration.

## Project Structure

```
Testing/
├── server/                ← Node.js Express test runner (SSE)
│   ├── index.js           ← Main server
│   ├── config.js          ← Reads from .env
│   ├── .env.example       ← Copy to .env and fill in your values
│   ├── ml_inference.py    ← Python TFLite inference helper
│   └── tests/             ← 21 adversarial test modules
│       ├── auth/          ← C1, I1–I7
│       ├── chat/          ← C4, I8
│       ├── apk/           ← C3a, C3b, C3c
│       ├── ml/            ← C6, ML1–ML3
│       └── availability/  ← A1–A4
└── client/                ← React + Vite dashboard
    └── src/
        ├── App.tsx
        ├── hooks/useTestRunner.ts
        └── components/
```

## Quick Start

### 1. Configure the server
```bash
cd Testing/server
cp .env.example .env
# Edit .env with your Supabase URL, service role key, test account credentials
```

### 2. Install server dependencies
```bash
cd Testing/server
npm install
```

### 3. Install client dependencies
```bash
cd Testing/client
npm install
```

### 4. Start the server
```bash
cd Testing/server
npm start        # production
# OR
npm run dev      # development with auto-reload (requires nodemon)
```

### 5. Start the client
```bash
cd Testing/client
npm run dev
# Open http://localhost:5173
```

## Test Catalog (21 tests)

| ID  | Category        | Name                              |
|-----|-----------------|-----------------------------------|
| C1  | Confidentiality | DB Breach: No Passwords Stored    |
| C2  | Confidentiality | Static Secret Analysis (Code Audit)|
| C3a | Confidentiality | APK Decompile: jadx               |
| C3c | Confidentiality | APK Binary: Secrets in libapp.so  |
| C4  | Confidentiality | Firebase E2EE: Messages Ciphertext|
| I1  | Integrity       | ZKP Proof Forgery                 |
| I2  | Integrity       | Nonce Replay Attack               |
| I3  | Integrity       | Commitment Substitution           |
| I4  | Integrity       | MAT Single-Use Enforcement        |
| I5  | Integrity       | Admin JWT Forgery (4 vectors)     |
| I6  | Integrity       | Session Rotation Anti-Replay      |
| I7  | Integrity       | Device Binding: Session Hijack    |
| I8  | Integrity       | Input Injection & Validation      |
| A1  | Availability    | Rate Limit: Login (10/min)        |
| A2  | Availability    | Rate Limit: Admin (5/min)         |
| A3  | Availability    | Payload Flood: Body Size (100KB)  |
| ML1 | ML Detection    | Phishing Messages Detected        |
| ML2 | ML Detection    | Safe Messages Pass Through        |
| ML3 | ML Detection    | Short Messages Skipped            |

## Optional Tools (for APK tests C3a, C3b)

| Tool    | Install              |
|---------|----------------------|
| jadx    | https://github.com/skylot/jadx/releases → extract, add `bin/` to PATH |
| apktool | `choco install apktool` |

## Optional: ML Inference (for ML1–ML3)

```bash
pip install tflite-runtime   # lightweight
# OR
pip install tensorflow        # full TensorFlow
```

If neither is available, the tests use a keyword heuristic fallback for demonstration.

## Test Account Setup

1. Open `https://frontend.sentrizk.me/register` (or your web frontend)
2. Register with username: `sentrizk_test_user`
3. Save your secret, salt, and mnemonic
4. Run the registration ZKP to get `TEST_UNAME_HASH`
5. Fill in `server/.env` with these values
