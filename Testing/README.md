# SentriZK — Automated Security Testing Dashboard

> CIA Triad adversarial test suite with real-time streaming output.
> Built for FYP cybersecurity demonstration.

## Project Structure

```
Testing/
├── server/                ← Node.js Express test runner (SSE)
│   ├── index.js           ← Main server (auto-registers test identity)
│   ├── config.js          ← Reads from .env
│   ├── .env.example       ← Copy to .env and fill in your values
│   ├── ml_inference.py    ← Python TFLite inference helper
│   └── tests/             ← 18 adversarial test modules
│       ├── auth/          ← C1, C2, I1–I7
│       ├── chat/          ← C4, I8
│       ├── apk/           ← C3a, C3c
│       ├── ml/            ← ML1–ML3
│       └── availability/  ← A1–A3
└── client/                ← React + Vite dashboard
    └── src/
        ├── App.tsx
        ├── hooks/useTestRunner.ts
        └── components/
            ├── TestSection.tsx
            └── SecurityReport.tsx   ← Print-ready audit report
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

## Test Catalog (18 active tests)

### Confidentiality (5 tests)

| ID  | Name                              | Description |
|-----|-----------------------------------|-------------|
| C1  | DB Breach: No Passwords Stored    | Queries Supabase directly, verifies only Poseidon commitments exist |
| C2  | Static Secret Analysis (Code Audit)| Scans server source code for hardcoded secrets |
| C3a | APK Decompile: jadx               | Full jadx decompilation, searches for Dart code/secrets |
| C3c | APK Binary: Secrets in libapp.so  | String analysis on ARM64 binary for embedded secrets |
| C4  | Firebase E2EE: Messages Ciphertext| Reads Firestore messages, verifies Signal Protocol encryption |

### Integrity (8 tests)

| ID  | Name                              | Description |
|-----|-----------------------------------|-------------|
| I1  | ZKP Proof Forgery                 | Submits fabricated Groth16 proofs |
| I2  | Nonce Replay Attack               | Generates real proof, replays it after nonce consumed |
| I3  | Commitment Substitution           | Mismatched commitment attack |
| I4  | MAT Single-Use Enforcement        | Reuses consumed MAT token |
| I5  | Admin JWT Forgery (4 vectors)     | Wrong secret, expired, missing role, alg:none |
| I6  | Session Rotation Anti-Replay      | Uses old sessionId after rotation |
| I7  | Device Binding: Session Hijack    | Refreshes from wrong device |
| I8  | Input Injection & Validation      | XSS, SQLi, oversized content to threat-log |

### Availability (3 tests)

| ID  | Name                              | Description |
|-----|-----------------------------------|-------------|
| A1  | Rate Limit: Login (10/min)        | 15 rapid requests, expects 429 after 10th |
| A2  | Rate Limit: Admin (5/min)         | 8 rapid requests, expects 429 after 5th |
| A3  | Payload Flood: Body Size (100KB)  | 200KB JSON body, expects 413 |

### ML Detection (3 tests)

| ID  | Name                              | Description |
|-----|-----------------------------------|-------------|
| ML1 | Phishing Messages Detected        | Known threats scored > 0.65 |
| ML2 | Safe Messages Pass Through        | Benign messages scored < 0.5 |
| ML3 | Short Messages Skipped            | < 4 words return 0.0 without model |

### Disabled Tests

| ID  | Reason |
|-----|--------|
| C6  | Requires local TFLite runtime (commented out) |
| A4  | Requires 30-min wait per test (commented out) |

## Optional Tools (for APK tests C3a, C3c)

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

**Or**: The test server auto-registers the test user on startup if credentials are configured in `.env`.

## Security Report

The dashboard includes a print-ready **SecurityReport** component that generates a professional audit document with:
- Cover page with security grade (A+ / B)
- Executive summary with risk matrix
- Internal secret incident documentation
- Per-test detailed findings with telemetry traces
