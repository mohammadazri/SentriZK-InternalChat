# 🧪 Testing Overview — CIA Triad Adversarial Security Suite

> **Philosophy**: Every test uses the exact same techniques a real attacker would use.  
> **Architecture**: Express.js test runner → SSE streaming → React dashboard  
> **Total Tests**: 18 active tests across 4 categories

---

## Test Runner Architecture

```
┌──────────────────────────────────┐
│   React + Vite Dashboard         │
│   (Testing/client/)              │
│                                  │
│   • TestSection cards            │
│   • Real-time SSE log viewer     │
│   • SecurityReport (print-ready) │
│   • Per-test pass/fail badges    │
└──────────┬───────────────────────┘
           │ SSE (Server-Sent Events)
           │ GET /api/stream/:testId
           │ GET /api/run-all
┌──────────▼───────────────────────┐
│   Express Test Server (port 3001)│
│   (Testing/server/)              │
│                                  │
│   • Auto-registers test identity │
│   • Loads 18 test modules        │
│   • Streams output via SSE       │
│   • GET /api/tests (catalog)     │
│   • GET /api/health              │
└──────────┬───────────────────────┘
           │ HTTPS
           │ Against live backend
┌──────────▼───────────────────────┐
│   SentriZK Backend               │
│   (backend.sentrizk.me)          │
└──────────────────────────────────┘
```

### Auto-Identity Setup

On startup, the test server checks if `sentrizk_test_user` exists on the backend. If not, it performs a **real ZKP registration** using snarkjs with credentials from `.env` — the test account is created with a real Groth16 proof, not a mock.

---

## Test Catalog — 18 Active Tests

### Confidentiality (5 tests)

| ID | Name | What It Does |
|----|------|-------------|
| **C1** | DB Breach: No Passwords Stored | Queries Supabase directly via service role key. Verifies `users` table contains only Poseidon commitments — no plaintext passwords, salts, or secrets. |
| **C2** | Static Secret Analysis (Code Audit) | Scans the backend source code (`server.js`) for hardcoded secrets, API keys, JWT secrets, or passwords. Checks for `.env` usage. |
| **C3a** | APK Decompile (jadx) | Runs jadx CLI on `sentrizk.apk`. Decompiles all Java classes and searches for Dart source code or embedded secrets. Flutter AOT compilation should prevent code recovery. |
| **C3c** | APK Binary: Secrets in libapp.so | Extracts `libapp.so` from the APK (ZIP), runs string analysis scanning for passwords, API keys, JWT secrets. Dart release builds strip all symbols. |
| **C4** | Firebase E2EE: Messages Ciphertext | Reads live Firestore `chats/*/messages/*` documents via Firebase Admin SDK. Verifies all message content is encrypted Signal Protocol ciphertext (Base64), not plaintext. |

### Integrity (8 tests)

| ID | Name | What It Does |
|----|------|-------------|
| **I1** | ZKP Proof Forgery | Sends a fabricated Groth16 proof with random BN128 field elements to `POST /login`. Backend must reject with `400`. |
| **I2** | Nonce Replay Attack | Generates a **real** valid login proof using snarkjs, submits it, then replays the same proof. Second attempt must fail due to consumed nonce. |
| **I3** | Commitment Substitution | Attempts to log in with a valid proof structure but a mismatched commitment (proof from a different user). Backend must detect the mismatch. |
| **I4** | MAT Single-Use Enforcement | Generates a MAT, uses it once, then attempts to reuse it. Second attempt must fail with `403`. Also tests expired MATs. |
| **I5** | Admin JWT Forgery (4 vectors) | Attempts 4 JWT forgery attacks: wrong secret, expired token, missing `role:admin`, and `alg:none` bypass. All must return `401`. |
| **I6** | Session Rotation Anti-Replay | Refreshes a session (gets new sessionId), then attempts to use the **old** sessionId. Old session must be invalidated. |
| **I7** | Device Binding: Session Hijack | Creates a session bound to `device_A`, then attempts to refresh it from `device_B`. Must return `403 Device mismatch`. |
| **I8** | Input Injection & Validation | Sends XSS payloads, SQL injection, oversized content, and invalid types to `POST /threat-log`. All must be rejected or sanitized. |

### Availability (3 tests)

| ID | Name | What It Does |
|----|------|-------------|
| **A1** | Rate Limit: Login (10/min) | Fires 15 rapid `POST /login` requests. Expects `429 Too Many Requests` after the 10th request within 60 seconds. |
| **A2** | Rate Limit: Admin (5/min) | Fires 8 rapid `POST /admin/login` requests. Expects `429` after the 5th request. |
| **A3** | Payload Flood: Body Size (100KB) | Sends a `POST /login` with a 200KB JSON body. Backend must reject with `413 Payload Too Large`. |

### ML Detection (3 tests)

| ID | Name | What It Does |
|----|------|-------------|
| **ML1** | Phishing Messages Detected | Sends known phishing messages through Python TFLite inference. Model should score them above `0.65` threshold. |
| **ML2** | Safe Messages Pass Through | Sends benign messages. Model should score them below `0.5`. |
| **ML3** | Short Messages Skipped | Sends messages with fewer than 4 words. Service should return `0.0` without invoking the model (prevents OOV noise). |

---

## Disabled Tests (not loaded in registry)

| ID | Reason |
|----|--------|
| C6 (ML Privacy) | Commented out in `tests/index.js` — requires local TFLite runtime |
| A4 (Session Expiry) | Commented out — requires 30-minute wait per test |

---

## SSE Event Types

Each test emits events through the SSE stream with these types:

| Event Type | Purpose | Dashboard Rendering |
|-----------|---------|-------------------|
| `TRACE` | Step-by-step execution trace | Dim monospace text |
| `ATTACK` | Active attack description | Red highlight |
| `RESULT` | Check result (pass/fail) | White with ✅/❌ |
| `EXPLAIN` | Technical explanation of why it passed/failed | Info block |
| `VERDICT` | Final test verdict with `passed: true/false` | Green/red badge |
| `DONE` | Test complete | Updates dashboard state |
| `START_TEST` | Test beginning (in run-all mode) | Card highlight |
| `SUMMARY` | Full suite summary (in run-all mode) | Summary bar |
| `ERROR` | Test crash/exception | Red error banner |

---

## Security Report

The React dashboard includes a **SecurityReport** component (`SecurityReport.tsx`) that generates a professional, print-ready PDF-style security audit report with:

- Cover page with security grade (A+ or B)
- Executive summary with risk assessment matrix
- Internal secret incidents audit (e.g., GitGuardian-detected JWT leak)
- Detailed findings per CIA category with:
  - Technical control review
  - Full audit telemetry trace
  - Per-test verdict

---

## Running the Test Suite

### Server
```bash
cd Testing/server
cp .env.example .env    # Configure credentials
npm install
npm start               # → http://localhost:3001
```

### Dashboard
```bash
cd Testing/client
npm install
npm run dev             # → http://localhost:5173
```

### Environment Variables (`.env`)

| Variable | Description |
|----------|-------------|
| `BACKEND_URL` | Target backend (default: `https://backend.sentrizk.me`) |
| `SUPABASE_URL` | Supabase project URL (for C1 direct DB access) |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key |
| `TEST_USER` | Test account username |
| `TEST_SECRET` | Test account ZKP secret (BigInt string) |
| `TEST_SALT` | Test account salt (BigInt string) |
| `TEST_UNAME_HASH` | `keccak256(TEST_USER)` as BigInt string |
| `ADMIN_USERNAME` | Admin credentials for I5/A2 tests |
| `ADMIN_PASSWORD` | Admin password |
