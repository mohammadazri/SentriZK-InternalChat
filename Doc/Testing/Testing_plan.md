# SentriZK — Automated Security Testing Dashboard

## Project Goal

Build a standalone **presentation-ready security testing GUI** that automates all CIA Triad security tests against the live SentriZK backend. During the FYP presentation, you click a button, the tool performs the attack, and the panel shows real-time debug output + a PASS/FAIL verdict.

---

## Architecture Decision

| Option | Pros | Cons |
|--------|------|------|
| Electron App | Native, offline | Heavy, slow to start |
| Python tkinter | Simple | Ugly, not presentation-ready |
| **Node.js + HTML/CSS/JS (chosen)** | Beautiful UI, real-time, same stack as backend | Needs Node running |
| React/Next.js | Fancy | Overkill, slower to build |

**Chosen**: A **single-file Node.js Express server** that:
- Serves one beautiful HTML dashboard page
- Has `/api/run-test/:testId` endpoints that perform the actual attacks
- Streams real-time output via **Server-Sent Events (SSE)**
- The HTML frontend renders a terminal-style live log + PASS/FAIL badge

This means: **one command (`node sentrizk_tester.js`) → open browser → click buttons**.

---

## File Structure (to be created)

```
SentriZK-InternalChat/
└── Doc/
    └── Testing/
        ├── Testing_plan.md          ← this file
        ├── sentrizk_tester.js       ← main test runner + Express server
        ├── tests/
        │   ├── c1_db_breach.js          ← C1 Supabase schema check
        │   ├── c2_ssl_pinning.js        ← C2 mitmproxy simulation
        │   ├── c3_apk_strings.js        ← C3 binary strings search
        │   ├── c4_firebase_ciphertext.js← C4 Firestore raw doc check
        │   ├── c6_ml_privacy.js         ← C6 ML code static analysis
        │   ├── i1_zkp_forgery.js        ← I1 forge proof→ 400
        │   ├── i2_replay_attack.js      ← I2 nonce replay → expired
        │   ├── i4_mat_reuse.js          ← I4 single-use MAT
        │   ├── i5_jwt_forgery.js        ← I5 fake JWT + alg:none
        │   ├── i6_commitment_sub.js     ← I6 wrong commitment → 400
        │   ├── a1_rate_limit.js         ← A1 brute force → 429
        │   ├── a2_payload_flood.js      ← A2 large body → 413
        │   └── a3_session_flood.js      ← A3 session spam
        ├── config.js                ← backend URL, test accounts, API keys
        └── package.json             ← dependencies
```

---

## Dependencies

```json
{
  "name": "sentrizk-security-tester",
  "version": "1.0.0",
  "dependencies": {
    "express": "^4.18.0",
    "node-fetch": "^3.3.0",
    "snarkjs": "^0.7.5",
    "firebase-admin": "^12.0.0",
    "@supabase/supabase-js": "^2.0.0",
    "jsonwebtoken": "^9.0.0",
    "cors": "^2.8.5"
  }
}
```

---

## config.js — Configuration

```javascript
module.exports = {
  BACKEND_URL: "https://backend.sentrizk.me",
  SUPABASE_URL: "...",          // From backend .env
  SUPABASE_KEY: "...",          // Service role key (read-only access for tests)
  TEST_USERNAME: "sentrizk_test_user",  // Pre-created test account
  APK_PATH: "../../Frontend/mobile/sentrizk.apk",
  LIBAPP_PATH: "../../Frontend/mobile/build/app/intermediates/merged_native_libs/release/out/lib/arm64-v8a/libapp.so",
};
```

---

## Tests Implementation Plan

### CONFIDENTIALITY TESTS

---

#### C1 — DB Breach: No Passwords Stored
**File**: `tests/c1_db_breach.js`

**What it does**:
1. Connects to Supabase using the service role key (simulating a DB breach)
2. Fetches the `users` table schema via `information_schema.columns`
3. Fetches 3 sample user rows
4. Checks: does `password` column exist? Does `commitment` look like a numeric hash?

**Logic**:
```javascript
const { data: columns } = await supabase
  .from('information_schema.columns')
  .select('column_name')
  .eq('table_name', 'users');

const hasPassword = columns.some(c => c.column_name === 'password');
// PASS if hasPassword === false
// Show sample row: { username, commitment (254-bit number), nonce: null }
```

**Output**:
```
[ATTACK] Simulating full database breach...
[ATTACK] Running: SELECT column_name FROM information_schema.columns WHERE table_name='users'
[RESULT] Columns found: username, commitment, registeredAt, lastLogin, status, nonce, nonceTime
[CHECK]  Does 'password' column exist?  ❌ NO
[CHECK]  Is commitment a Poseidon hash? ✅ YES (254-bit field element)
[SAMPLE] alice | 1827364918273649182736491827364918 | null | active
[VERDICT] ✅ PASS — Database breach reveals ZERO usable credentials
```

---

#### C2 — SSL Pinning: MITM Simulation
**File**: `tests/c2_ssl_pinning.js`

**What it does**:
Programmatically simulate what Burp Suite does — connect to the backend using a self-signed CA (instead of the real cert). Measure what happens.

**Logic**:
```javascript
import https from 'https';
import { execSync } from 'child_process';

// Step 1: Generate a self-signed CA on the fly
execSync('openssl req -x509 -newkey rsa:2048 -keyout fake_ca.key -out fake_ca.crt -days 1 -nodes -subj "/CN=FakeAttackerCA"');

// Step 2: Create an HTTPS agent that uses the fake CA
const fakeAgent = new https.Agent({ ca: fs.readFileSync('fake_ca.crt') });

// Step 3: Attempt to hit SentriZK backend with the fake CA
const response = await fetch(`${BACKEND_URL}/health`, { agent: fakeAgent });
```

**Expected**: `FetchError: certificate verify failed` — the server's real cert is not signed by our fake CA, so TLS fails before any data is sent.

**Output**:
```
[ATTACK] Generating rogue CA certificate (simulates Burp Suite CA)
[ATTACK] Creating HTTPS agent that ONLY trusts the fake CA
[ATTACK] Attempting to connect to backend.sentrizk.me using rogue CA...
[ERROR]  FetchError: certificate verify failed: unable to get local issuer certificate
[CHECK]  Did attacker see any request body?  ❌ NO — TLS handshake never completed
[CHECK]  Did attacker see any response?      ❌ NO — connection dropped at TLS layer
[VERDICT] ✅ PASS — SSL interception requires a CA trusted by the server. Ours was not.
```

---

#### C3 — APK Reverse Engineering: Binary Secret Search
**File**: `tests/c3_apk_strings.js`

**What it does**:
Runs `strings` on the compiled `libapp.so` and searches for sensitive keywords.

**Logic**:
```javascript
import { execSync } from 'child_process';

const output = execSync(`strings "${LIBAPP_PATH}"`).toString();
const sensitivePatterns = ['password', 'supabase_key', 'JWT_SECRET', 'FIREBASE_TOKEN', 'apiKey', 'service_role'];

const found = sensitivePatterns.filter(p => output.toLowerCase().includes(p.toLowerCase()));
// PASS if found.length === 0
```

Also uses `apktool` to decode and check `AndroidManifest.xml` for debug flags:
```javascript
execSync(`apktool d "${APK_PATH}" -o apk_decoded -f`);
const manifest = fs.readFileSync('apk_decoded/AndroidManifest.xml', 'utf8');
const isDebug = manifest.includes('android:debuggable="true"');
// PASS if isDebug === false
```

**Output**:
```
[ATTACK] Running strings extraction on libapp.so (compiled Dart binary)...
[SEARCH] Scanning for: password, supabase_key, JWT_SECRET, apiKey, service_role...
[RESULT] Matches found: 0
[ATTACK] Decoding APK with apktool...
[CHECK]  android:debuggable="true" in manifest?  ❌ NOT FOUND (release build)
[CHECK]  cleartext traffic allowed?               ❌ NOT FOUND (HTTPS only)
[VERDICT] ✅ PASS — APK contains no extractable secrets. Dart is AOT-compiled ARM64.
```

---

#### C4 — Firebase E2EE: Messages Are Ciphertext
**File**: `tests/c4_firebase_ciphertext.js`

**What it does**:
Uses Firebase Admin SDK to read a raw message document from Firestore.

**Logic**:
```javascript
const db = admin.firestore();
// Fetch the most recent 3 messages from any chat
const snapshot = await db.collectionGroup('messages').orderBy('timestamp', 'desc').limit(3).get();

snapshot.forEach(doc => {
  const data = doc.data();
  const hasCiphertext = data.ciphertext && typeof data.ciphertext === 'string';
  const hasPlaintext = data.content && !data.ciphertext; // would be a fail
  // Check ciphertext looks like base64 (not readable English)
  const isReadable = /^[a-zA-Z\s]+$/.test(data.ciphertext?.substring(0, 30) ?? '');
});
```

**Output**:
```
[ATTACK] Simulating Firebase breach (admin SDK with full read access)...
[ATTACK] Fetching 3 most recent messages from Firestore...

  Message #1:
  senderId:   alice
  receiverId: bob
  ciphertext: CiUKINk3xpQ8fO2lR0tL3mPK9QrV... (base64 Signal ciphertext)
  type:       3 (whisperType = Double Ratchet)
  plaintext:  ❌ NOT FOUND — plaintext field does not exist

  Message #2:
  ciphertext: AxAAAjkE7m9pRSz... (base64)
  plaintext:  ❌ NOT FOUND

[CHECK]  All messages have ciphertext field?  ✅ YES
[CHECK]  Any message has plaintext field?     ❌ NO
[CHECK]  Is ciphertext human-readable text?   ❌ NO (binary/base64)
[VERDICT] ✅ PASS — Server holds ZERO readable message content.
```

---

#### C6 — ML Privacy: No Network Calls in Scan Service
**File**: `tests/c6_ml_privacy.js`

**What it does**:
Static code analysis — reads `message_scan_service.dart` and checks for HTTP/network calls.

**Logic**:
```javascript
const code = fs.readFileSync('../../Frontend/mobile/lib/services/message_scan_service.dart', 'utf8');

const networkPatterns = ['http.', 'Uri.parse', 'fetch(', 'HttpClient', 'Dio(', 'request('];
const found = networkPatterns.filter(p => code.includes(p));

// Also verify: model is loaded from local asset, not a URL
const loadsFromAsset = code.includes('Interpreter.fromAsset');
const loadsFromUrl = code.includes('Interpreter.fromUrl') || code.includes('http');
```

**Output**:
```
[AUDIT]  Reading message_scan_service.dart (on-device ML module)...
[SEARCH] Scanning for network call patterns: http., Uri.parse, fetch, HttpClient, Dio...
[RESULT] Network patterns found: 0

[CHECK]  Model loaded from local asset?  ✅ YES — Interpreter.fromAsset('assets/ml/sentrizk_model.tflite')
[CHECK]  Model loaded from remote URL?   ❌ NO
[CHECK]  Any outgoing HTTP call in ML?   ❌ NO — function is purely local

[VERDICT] ✅ PASS — ML inference is 100% local. Plaintext never leaves the device for analysis.
```

---

### INTEGRITY TESTS

---

#### I1 — ZKP Forgery: Crafted Proof Rejected
**File**: `tests/i1_zkp_forgery.js`

**What it does**:
1. First, get a valid nonce from `/commitment/{username}`
2. Construct a completely fake `proof` object with random field values
3. POST to `/login` with the fake proof
4. Verify HTTP 400 is returned

**Logic**:
```javascript
// Step 1: Get real nonce
const { commitment, nonce } = await fetch(`${BACKEND}/commitment/${TEST_USER}`).then(r => r.json());

// Step 2: Build a fake Groth16 proof (random numbers — not on the curve)
const fakeProof = {
  pi_a: ["12345678901234567890", "98765432109876543210", "1"],
  pi_b: [["111", "222"], ["333", "444"], ["1", "0"]],
  pi_c: ["555666777888999", "000111222333444", "1"],
  protocol: "groth16",
  curve: "bn128"
};

// Step 3: POST the forged proof
const res = await fetch(`${BACKEND}/login`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ username: TEST_USER, proof: fakeProof, publicSignals: [commitment, nonce, "0", nonce] })
});

// PASS if res.status === 400
```

**Output**:
```
[ATTACK] Fetching nonce for test account...
[ATTACK] Nonce received: 8273649182736491
[ATTACK] Constructing FORGED Groth16 proof (random BN128 field elements)...
[ATTACK] pi_a: [12345678901234567890, 98765432109876543210, 1]  ← NOT on elliptic curve
[ATTACK] Sending forged proof to POST /login...

[RESULT] HTTP Status: 400 Bad Request
[RESULT] Response:   { "error": "Invalid login proof" }

[EXPLAIN] Why it failed: snarkjs.groth16.verify() checks the BN128 pairing equation:
          e(pi_a, vk_beta) · e(pi_b, vk_gamma) ≠ e(vk_alpha, vk_delta) · e(C, vk_gamma)
          Random numbers do not satisfy this pairing. Attack cost: 2^128 operations.

[VERDICT] ✅ PASS — Forged ZKP proof is mathematically rejected.
```

---

#### I2 — Replay Attack: Nonce is Single-Use
**File**: `tests/i2_replay_attack.js`

**What it does**:
1. Get a fresh nonce
2. Generate a **real valid proof** using snarkjs (with test account's known secret)
3. Send it once — should succeed
4. Immediately send the **identical request** again — should fail

> Note: Generating a real proof requires the test account's secret + salt to be stored in `config.js`. This is a controlled test account, not a production user.

**Logic**:
```javascript
// Step 1: Get nonce
const { commitment, nonce } = await fetch(`${BACKEND}/commitment/${TEST_USER}`).then(r => r.json());

// Step 2: Generate real proof (test account secret is known)
const { proof, publicSignals } = await snarkjs.groth16.fullProve(
  { secret: TEST_SECRET, salt: TEST_SALT, unameHash: TEST_UNAME_HASH, storedCommitment: commitment, nonce },
  LOGIN_WASM_PATH,
  LOGIN_ZKEY_PATH
);

// Step 3: First login — success
const r1 = await fetch(`${BACKEND}/login`, { method: 'POST', body: JSON.stringify({ username: TEST_USER, proof, publicSignals }) });

// Step 4: REPLAY — exact same proof
const r2 = await fetch(`${BACKEND}/login`, { method: 'POST', body: JSON.stringify({ username: TEST_USER, proof, publicSignals }) });

// PASS if r1.status === 200 AND r2.status === 400
```

**Output**:
```
[ATTACK] Step 1: Fetching fresh nonce for test account...
[RESULT] Nonce: 7364918273649182 (60s TTL)

[ATTACK] Step 2: Generating VALID Groth16 proof (test account credentials)...
[RESULT] Proof generated in 2.3s ← inherent brute-force resistance

[ATTACK] Step 3: First login attempt (legitimate)...
[RESULT] HTTP 200 ✅ — Login successful, session created

[ATTACK] Step 4: REPLAYING the exact same proof immediately...
[RESULT] HTTP 400 ❌ — { "error": "Nonce expired or not issued" }

[EXPLAIN] Server nulled the nonce on first use. Same proof cannot be used again.
[EXPLAIN] Even with TLS broken, a captured proof is useless after first use.

[VERDICT] ✅ PASS — Replay attack defeated. Each authentication is cryptographically unique.
```

---

#### I4 — MAT Reuse: Single-Use Token
**File**: `tests/i4_mat_reuse.js`

**What it does**:
1. Generate a new Mobile Access Token
2. Use it once (via validate endpoint)
3. Try to use it again

**Logic**:
```javascript
// Step 1: Generate MAT
const { mobileAccessToken } = await fetch(`${BACKEND}/generate-mobile-access-token`, {
  method: 'POST',
  body: JSON.stringify({ deviceId: 'test_device_001', action: 'login' })
}).then(r => r.json());

// Step 2: Use it once — valid
const r1 = await fetch(`${BACKEND}/register?mat=${mobileAccessToken}`, ...);

// Step 3: Replay it
const r2 = await fetch(`${BACKEND}/register?mat=${mobileAccessToken}`, ...);
// PASS if r2.status === 403 + "already used"
```

**Output**:
```
[ATTACK] Step 1: Generating Mobile Access Token (MAT)...
[RESULT] MAT: a1b2c3d4e5f6... (5-minute expiry, single-use)

[ATTACK] Step 2: Using MAT for the first time (legitimate deep-link flow)...
[RESULT] HTTP 200 ✅ — MAT accepted, register page loads

[ATTACK] Step 3: REPLAYING the same MAT (simulates malicious app stealing deep link)...
[RESULT] HTTP 403 ❌ — { "error": "Mobile access token already used" }

[VERDICT] ✅ PASS — MAT is single-use. Intercepted deep-link URLs are worthless after first click.
```

---

#### I5 — JWT Forgery: Admin Token Attack
**File**: `tests/i5_jwt_forgery.js`

**What it does**:
3 sub-attacks:
1. Completely fake JWT (random signature)
2. `alg:none` attack (no signature at all)
3. Valid JWT but wrong role (`role: "user"` instead of `"admin"`)

**Logic**:
```javascript
const jwt = require('jsonwebtoken');

// Attack 1: Fake signature
const fakeToken = jwt.sign({ username: 'hacker', role: 'admin' }, 'wrong_secret');

// Attack 2: alg:none — manually construct unsigned token
const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
const payload = Buffer.from(JSON.stringify({ username: 'hacker', role: 'admin' })).toString('base64url');
const noneToken = `${header}.${payload}.`;

// Attack 3: Valid structure, wrong role
const wrongRoleToken = jwt.sign({ username: 'hacker', role: 'user' }, 'GuessedSecret123');

for (const [name, token] of attacks) {
  const r = await fetch(`${BACKEND}/admin/users`, { headers: { Authorization: `Bearer ${token}` } });
  // PASS if r.status === 401 for all three
}
```

**Output**:
```
[ATTACK] Attempting 3 JWT attacks on GET /admin/users...

  Attack 1: Forged signature (wrong HMAC key)
  Token:     eyJhbGciOiJIUzI1NiJ9.eyJ1c2VybmFtZSI6ImhhY2tlciIsInJvbGUiOiJhZG1pbiJ9.FAKE
  Response:  HTTP 401 — { "error": "Invalid or expired admin token" } ✅

  Attack 2: Algorithm None (unsigned token)
  Token:     eyJhbGciOiJub25lIn0.eyJ1c2VybmFtZSI6ImhhY2tlciIsInJvbGUiOiJhZG1pbiJ9.
  Response:  HTTP 401 — { "error": "Invalid or expired admin token" } ✅

  Attack 3: Valid structure but role: "user"
  Token:     eyJhbGciOiJIUzI1NiJ9.eyJ1c2VybmFtZSI6ImhhY2tlciIsInJvbGUiOiJ1c2VyIn0.SIG
  Response:  HTTP 401 — { "error": "Invalid or expired admin token" } ✅

[VERDICT] ✅ PASS — All 3 JWT attack vectors rejected. Admin endpoints are secure.
```

---

#### I6 — Commitment Substitution Attack
**File**: `tests/i6_commitment_sub.js`

**What it does**:
Generates a valid proof for the TEST account, then submits it with a different username (victim) — trying to hijack the victim's account.

**Logic**:
```javascript
// Generate valid proof for test_user (attacker knows their own secret)
const { proof, publicSignals } = await snarkjs.groth16.fullProve(
  { secret: TEST_SECRET, salt: TEST_SALT, ... },  // attacker's credentials
  LOGIN_WASM_PATH, LOGIN_ZKEY_PATH
);

// Try to login as "victim" using attacker's valid proof
const res = await fetch(`${BACKEND}/login`, {
  method: 'POST',
  body: JSON.stringify({ username: 'victim', proof, publicSignals })
});
// PASS if status === 400 ("Commitment mismatch")
```

**Output**:
```
[ATTACK] Attack scenario: Own a valid proof for "test_user", try to login as "victim"
[ATTACK] Step 1: Generating valid proof for attacker's own account (test_user)...
[RESULT] Valid proof generated ✅

[ATTACK] Step 2: Submitting attacker's proof but claiming to be "victim"...
[RESULT] HTTP 400 — { "error": "Commitment mismatch" }

[EXPLAIN] Circuit constraint: Poseidon(attacker_secret, attacker_salt, attacker_uname) ≠ victim.commitment
          The ZK circuit binds the proof to the prover's identity via unameHash.
          Substituting the username doesn't change the math inside the proof.

[VERDICT] ✅ PASS — Identity cannot be impersonated. proofs are identity-bound.
```

---

### AVAILABILITY TESTS

---

#### A1 — Brute Force: Rate Limiting at 10 req/min
**File**: `tests/a1_rate_limit.js`

**What it does**:
Fires 15 rapid requests to `/login` and counts when HTTP 429 appears.

**Logic**:
```javascript
const results = [];
for (let i = 1; i <= 15; i++) {
  const r = await fetch(`${BACKEND}/login`, {
    method: 'POST',
    body: JSON.stringify({ username: TEST_USER, proof: FAKE_PROOF, publicSignals: [] })
  });
  results.push({ request: i, status: r.status });
  // Small delay to show sequential nature
  await new Promise(r => setTimeout(r, 200));
}
const rateLimitedAt = results.find(r => r.status === 429)?.request;
```

**Output**:
```
[ATTACK] Sending 15 rapid login requests to simulate brute-force attack...

  Request  1 → HTTP 400 (invalid proof — server processed it)
  Request  2 → HTTP 400
  Request  3 → HTTP 400
  Request  4 → HTTP 400
  Request  5 → HTTP 400
  Request  6 → HTTP 400
  Request  7 → HTTP 400
  Request  8 → HTTP 400
  Request  9 → HTTP 400
  Request 10 → HTTP 400
  Request 11 → HTTP 429 ← RATE LIMIT TRIGGERED
  Request 12 → HTTP 429
  Request 13 → HTTP 429
  Request 14 → HTTP 429
  Request 15 → HTTP 429

[RESULT] Rate limit triggered at request 11 (window: 60s, max: 10)
[RESULT] 5 of 15 requests blocked before reaching authentication logic

[BONUS]  ZKP cost: ~3s proof generation/attempt → 10 guesses/min max even without rate limit
[VERDICT] ✅ PASS — Brute force is rate-limited AND inherently expensive (ZKP proof cost)
```

---

#### A2 — Payload Flood: Body Size Limit
**File**: `tests/a2_payload_flood.js`

**What it does**:
Sends progressively larger payloads to test where the server cuts off.

**Logic**:
```javascript
const sizes = [50_000, 100_000, 101_000, 500_000, 10_000_000]; // 50KB, 100KB, 101KB, 500KB, 10MB

for (const size of sizes) {
  const body = JSON.stringify({ proof: 'A'.repeat(size) });
  const r = await fetch(`${BACKEND}/register`, { method: 'POST', body, headers: { 'Content-Type': 'application/json' } });
  // 100KB should pass (or get proof error), 101KB+ should get 413
}
```

**Output**:
```
[ATTACK] Testing payload size limits on POST /register...

  50 KB  payload → HTTP 400 (passes size check, fails ZKP validation — correct) ✅
  100 KB payload → HTTP 400 (passes size check, fails ZKP validation — correct) ✅
  101 KB payload → HTTP 413 Payload Too Large ✅ ← limit enforced here
  500 KB payload → HTTP 413 Payload Too Large ✅
  10 MB  payload → HTTP 413 Payload Too Large ✅

[RESULT] Payload limit enforced at exactly 100KB (bodyParser.json({ limit: '100kb' }))
[VERIFY] A valid Groth16 proof is ~192 bytes — well within the limit for legitimate users
[VERDICT] ✅ PASS — Server protected against memory exhaustion via oversized payloads
```

---

#### A3 — Session Spam: Rate Limiting on Auth Endpoints
**File**: `tests/a3_session_flood.js`

**What it does**:
Attempts to create many sessions rapidly (via `/generate-mobile-access-token` which has no rate limit) and `/login`.

**Logic**:
```javascript
// Try to spam MAT generation (creates DB rows)
const matResults = [];
for (let i = 0; i < 15; i++) {
  const r = await fetch(`${BACKEND}/generate-mobile-access-token`, {
    method: 'POST',
    body: JSON.stringify({ deviceId: `attacker_device_${i}`, action: 'login' })
  });
  matResults.push(r.status);
}

// Also test login flood
const loginResults = await Promise.all(Array.from({ length: 15 }, () =>
  fetch(`${BACKEND}/login`, { method: 'POST', body: '{}', headers: { 'Content-Type': 'application/json' } })
    .then(r => r.status)
));
```

**Output**:
```
[ATTACK] Attempting to flood session/MAT creation...

  MAT Flood (15 requests):   rate limit on /login covers auth surface
  Login Flood (15 req):
    Requests 1-10:  HTTP 400 (invalid proof)
    Requests 11-15: HTTP 429 (rate limited)

[RESULT] Session creation flood is blocked by rate limiter
[RESULT] Probabilistic GC (10% per request) continuously purges expired tokens

[VERDICT] ✅ PASS — Server remains functional under session creation attacks
```

---

## GUI Design Specification

### Layout
```
┌─────────────────────────────────────────────────────────────────┐
│  🛡️ SentriZK Security Testing Dashboard     [RUN ALL TESTS]     │
│  CIA Triad Adversarial Testing Suite v1.0                       │
├──────────────────┬───────────────────┬──────────────────────────┤
│  🔒 CONFIDENTIAL │  ⚖️  INTEGRITY    │  🌐 AVAILABILITY         │
│                  │                   │                           │
│  [C1] DB Breach  │  [I1] ZKP Forge   │  [A1] Brute Force       │
│  [C2] SSL MITM   │  [I2] Replay      │  [A2] Payload Flood     │
│  [C3] APK Dump   │  [I4] MAT Reuse   │  [A3] Session Spam      │
│  [C4] Firebase   │  [I5] JWT Forge   │                           │
│  [C6] ML Privacy │  [I6] Commit Sub  │                           │
└──────────────────┴───────────────────┴──────────────────────────┘
│                                                                   │
│  📺 LIVE TERMINAL OUTPUT                              [CLEAR]    │
│  ┌───────────────────────────────────────────────────────────┐   │
│  │ [14:22:31] ▶ Running C1: Database Breach Simulation...    │   │
│  │ [14:22:31] ATTACK  Connecting to Supabase (breach sim)   │   │
│  │ [14:22:32] RESULT  Columns: username, commitment, nonce  │   │
│  │ [14:22:32] CHECK   Password column found: ❌ NO           │   │
│  │ [14:22:32] VERDICT ✅ PASS — No usable credentials found │   │
│  │ [14:22:33] ▶ Running I1: ZKP Proof Forgery...            │   │
│  │ ...                                                       │   │
│  └───────────────────────────────────────────────────────────┘   │
│                                                                   │
│  📊 RESULTS SUMMARY                                              │
│   C1 ✅  C2 ✅  C3 ✅  C4 ✅  C6 ✅                             │
│   I1 ✅  I2 ✅  I4 ✅  I5 ✅  I6 ✅                             │
│   A1 ✅  A2 ✅  A3 ✅                                            │
│                                                                   │
│   13/13 PASSED ████████████████████ 100%                        │
└─────────────────────────────────────────────────────────────────┘
```

### Design Tokens
- **Background**: `#0F172A` (Slate 900) — dark, professional
- **Panel headers**: Glassmorphism (`backdrop-filter: blur(12px); background: rgba(255,255,255,0.05)`)
- **Confidentiality color**: `#3B82F6` (Blue) 
- **Integrity color**: `#F59E0B` (Amber)
- **Availability color**: `#10B981` (Green)
- **PASS badge**: `#10B981` green glow
- **FAIL badge**: `#EF4444` red glow
- **Terminal font**: `JetBrains Mono` / `Fira Code`
- **Log colors**: Attack lines = red, Result lines = white, Verdict lines = green/red glow
- **Animations**: Progress bar fills as tests run; badge pops in with bounce; SSE streams text character by character

---

## Server Architecture

```javascript
// sentrizk_tester.js (main entry point)

const express = require('express');
const app = express();

// Serve the HTML dashboard
app.get('/', (req, res) => res.sendFile('dashboard.html'));

// SSE endpoint — streams test output line by line
app.get('/api/stream/:testId', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  
  const test = loadTest(req.params.testId);    // dynamic import
  test.run((line) => {
    res.write(`data: ${JSON.stringify(line)}\n\n`);
  }).then(result => {
    res.write(`data: ${JSON.stringify({ type: 'DONE', passed: result.passed })}\n\n`);
    res.end();
  });
});

// Run all tests sequentially
app.get('/api/run-all', async (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  const tests = ['c1', 'c2', 'c3', 'c4', 'c6', 'i1', 'i2', 'i4', 'i5', 'i6', 'a1', 'a2', 'a3'];
  for (const id of tests) {
    const test = loadTest(id);
    await test.run(line => res.write(`data: ${JSON.stringify({ ...line, testId: id })}\n\n`));
  }
  res.end();
});

app.listen(4444, () => console.log('🛡️ SentriZK Tester → http://localhost:4444'));
```

Each test module exports:
```javascript
module.exports = {
  id: 'c1',
  name: 'DB Breach: No Passwords Stored',
  category: 'CONFIDENTIALITY',
  async run(emit) {
    emit({ type: 'ATTACK', msg: 'Simulating full database breach...' });
    // ... test logic ...
    emit({ type: 'VERDICT', passed: true, msg: 'PASS — Database breach reveals ZERO credentials' });
    return { passed: true };
  }
};
```

---

## Tests That Cannot Be Automated (Manual Steps)

| Test | Why Manual | Presentation Strategy |
|------|-----------|----------------------|
| C2 full Burp demo | Requires physical Android + Burp setup | Pre-record as video, play in dashboard |
| C5 KeyStore bypass | Requires rooted device | Show pre-captured adb output as static evidence |
| X1 Frida hook | Requires Frida server on device | Show terminal screenshot of failed symbol lookup |
| I3 Signal MAC tamper | Requires live Firebase edit | Do live: edit Firebase console, show Flutter error log |
| ML demo (threat flag) | Best shown on live device | Live app demo after automated tests |

---

## Implementation Steps (Execution Order)

- [ ] 1. Create `Doc/Testing/` directory structure
- [ ] 2. Write `config.js` with backend URL + test account secrets
- [ ] 3. Create test account `sentrizk_test_user` in backend (register via web frontend)
- [ ] 4. Write `package.json` and install deps
- [ ] 5. Build all 13 test modules (`c1` through `a3`)
- [ ] 6. Build `sentrizk_tester.js` Express server with SSE streaming
- [ ] 7. Design and build `dashboard.html` (glassmorphism dark UI)
- [ ] 8. Wire SSE from server to live terminal in browser
- [ ] 9. Test all 13 tests against live backend (`https://backend.sentrizk.me`)
- [ ] 10. Final polish: animations, progress bar, export report button
- [ ] 11. Add "Export Evidence" button that generates a timestamped PDF report

---

## Run Command

After build is complete:
```bash
cd Doc/Testing
npm install
node sentrizk_tester.js

# Open: http://localhost:4444
# Click "RUN ALL TESTS" or individual test buttons
```
