# SentriZK — Automated Security Testing Plan
## CIA Triad Adversarial Test Suite (React + Node.js Dashboard)

> **Scope**: All tests in this document run automatically from the dashboard.
> No physical device required. Tests hit the live backend at `https://backend.sentrizk.me`
> and the live Firebase/Supabase services directly.

---

## Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 18 + Vite (TypeScript) |
| **Test Runner** | Node.js 18 Express (SSE streaming) |
| **Styling** | Vanilla CSS (glassmorphism, dark mode) |
| **Real-time output** | Server-Sent Events (SSE) |
| **ZKP Engine** | snarkjs 0.7.5 (same as backend) |
| **DB Check** | @supabase/supabase-js |
| **Firebase Check** | firebase-admin |
| **APK Analysis** | adm-zip (extract libapp.so) + child_process (jadx/apktool CLI) |

```
Doc/Testing/automated/
├── server/
│   ├── index.js              ← Express + SSE test runner
│   ├── config.js             ← backend URL, test credentials
│   └── tests/
│       ├── auth/
│       │   ├── c1_db_no_passwords.js
│       │   ├── i1_zkp_forgery.js
│       │   ├── i2_nonce_replay.js
│       │   ├── i3_commitment_sub.js
│       │   ├── i4_mat_reuse.js
│       │   ├── i5_jwt_forgery.js
│       │   ├── i6_session_rotation.js
│       │   └── i7_device_binding.js
│       ├── chat/
│       │   ├── c4_firebase_ciphertext.js
│       │   ├── i8_threat_log_validation.js
│       │   └── i9_input_injection.js
│       ├── ml/
│       │   ├── ml1_phishing_detection.js
│       │   ├── ml2_safe_message.js
│       │   └── ml3_short_message_skip.js
│       ├── apk/
│       │   ├── c3_jadx_decompile.js
│       │   ├── c3b_apktool_manifest.js
│       │   └── c3c_binary_strings.js
│       └── availability/
│           ├── a1_rate_limit_login.js
│           ├── a2_rate_limit_admin.js
│           ├── a3_payload_size.js
│           └── a4_session_flood.js
├── client/
│   ├── src/
│   │   ├── App.tsx
│   │   ├── components/
│   │   │   ├── TestPanel.tsx      ← CIA column panel
│   │   │   ├── TestCard.tsx       ← individual test card
│   │   │   ├── LiveTerminal.tsx   ← SSE log stream
│   │   │   ├── VerdictBadge.tsx   ← PASS/FAIL badge
│   │   │   └── SummaryBar.tsx     ← total pass/fail + export
│   │   └── hooks/
│   │       └── useTestStream.ts   ← SSE consumer hook
│   └── index.html
└── package.json
```

---

## Dashboard UI Specification

```
╔══════════════════════════════════════════════════════════════════════╗
║  🛡️  SentriZK Adversarial Security Dashboard          [RUN ALL]     ║
║  CIA Triad Testing Suite · FYP Cybersecurity Demonstration          ║
╠════════════════╦═══════════════════╦══════════════════════════════════╣
║  🔒 CONFIDENTIAL║  ⚖️  INTEGRITY   ║  🌐 AVAILABILITY                ║
║  (Blue theme)  ║  (Amber theme)   ║  (Green theme)                   ║
║                ║                  ║                                  ║
║  C1 DB Breach  ║  I1 ZKP Forge   ║  A1 Login Brute Force           ║
║  ⬜ Not run    ║  ⬜ Not run      ║  ⬜ Not run                      ║
║  [▶ RUN]       ║  [▶ RUN]        ║  [▶ RUN]                        ║
║                ║                  ║                                  ║
║  C3 APK Dump   ║  I2 Nonce Replay ║  A2 Admin Rate Limit           ║
║  C4 Firebase   ║  I3 Commit Sub   ║  A3 Payload Flood              ║
║  C6 ML Privacy ║  I4 MAT Reuse   ║  A4 Session Spam               ║
║                ║  I5 JWT Forge   ║                                  ║
║                ║  I6 Session Rot ║                                  ║
║                ║  I7 Device Bind ║                                  ║
╠════════════════╩═══════════════════╩══════════════════════════════════╣
║  🤖 ML DETECTION TESTS                                               ║
║  ML1 Phishing Text ⬜    ML2 Safe Text ⬜    ML3 Short Skip ⬜      ║
╠══════════════════════════════════════════════════════════════════════╣
║  📺 LIVE TERMINAL                                     [CLEAR] [COPY] ║
║  ┌────────────────────────────────────────────────────────────────┐  ║
║  │ 14:22:31  ▶  Running I1: ZKP Proof Forgery...                 │  ║
║  │ 14:22:31  ATTACK  Fetching nonce for sentrizk_test_user       │  ║
║  │ 14:22:32  ATTACK  Crafting forged Groth16 proof               │  ║
║  │ 14:22:32  RESULT  HTTP 400 — { "error": "Invalid login proof" }│  ║
║  │ 14:22:32  VERIFY  snarkjs pairing equation: FAILED ✓          │  ║
║  │ 14:22:32  VERDICT ✅ PASS  ZKP forgery is mathematically impossib║
║  └────────────────────────────────────────────────────────────────┘  ║
╠══════════════════════════════════════════════════════════════════════╣
║  📊 RESULTS                                                          ║
║  C1 ✅  C3 ✅  C4 ✅  C6 ✅   I1 ✅  I2 ✅  I3 ✅  I4 ✅  I5 ✅   ║
║  I6 ✅  I7 ✅   A1 ✅  A2 ✅  A3 ✅  A4 ✅   ML1 ✅  ML2 ✅  ML3 ✅ ║
║                                                                      ║
║  19/19 PASSED  ███████████████████████ 100%  [📄 Export Report]     ║
╚══════════════════════════════════════════════════════════════════════╝
```

---

# ██ CONFIDENTIALITY AUTOMATED TESTS ██

---

## C1 — Database Breach: No Password Column Exists

**Category**: Confidentiality | **Domain**: Authentication
**CIA Threat**: Stolen database → credential extraction

**What the test does**:
1. Connects to Supabase with the service role key (simulates full DB read access)
2. Queries `information_schema.columns` to list every column in the `users` table
3. Fetches 2 real user rows
4. Checks for absence of `password`, `hash`, `pin` columns
5. Validates that `commitment` is a numeric Poseidon hash (not empty, not null)

**Test Logic**:
```javascript
// tests/auth/c1_db_no_passwords.js
const { createClient } = require('@supabase/supabase-js');

module.exports = {
  id: 'C1', name: 'DB Breach: No Passwords', category: 'CONFIDENTIALITY',
  async run(emit) {
    const supabase = createClient(config.SUPABASE_URL, config.SUPABASE_SERVICE_ROLE_KEY);

    // Simulate attacker reading schema
    emit({ type:'ATTACK', msg:'Querying users table schema (simulated DB breach)...' });
    const { data: cols } = await supabase.rpc('get_user_columns'); // or information_schema query

    const dangerousCols = cols.filter(c => /password|hash|pin|secret/i.test(c.column_name));
    emit({ type:'RESULT', msg:`Columns found: ${cols.map(c => c.column_name).join(', ')}` });
    emit({ type: dangerousCols.length ? 'FAIL' : 'RESULT',
           msg: `Password-like columns: ${dangerousCols.length === 0 ? '❌ NONE' : dangerousCols.join(', ')}` });

    // Sample user row
    const { data: users } = await supabase.from('users').select('username, commitment, status').limit(2);
    emit({ type:'RESULT', msg:`Sample user → commitment: ${users[0]?.commitment?.substring(0,20)}... (254-bit Poseidon hash)` });

    const commitmentLooksLikeHash = /^\d{50,80}$/.test(users[0]?.commitment ?? '');
    emit({ type: 'VERDICT', passed: dangerousCols.length === 0 && commitmentLooksLikeHash,
           msg: 'DB breach yields ZERO usable credentials. Only Poseidon commitments stored.' });
  }
};
```

**Expected Output**:
```
[ATTACK] Querying users table schema (simulated DB breach)...
[RESULT] Columns: username, commitment, registeredAt, lastLogin, status, nonce, nonceTime
[RESULT] Password-like columns: ❌ NONE
[RESULT] Sample → commitment: 18273649182736491... (254-bit Poseidon hash)
[VERDICT] ✅ PASS — DB breach yields ZERO usable credentials.
```

---

## C3 — APK Static Analysis: Three-Tool Chain

**Category**: Confidentiality | **Domain**: APK Reverse Engineering
**CIA Threat**: APK downloaded → secrets extracted → backend impersonated

### C3a — jadx Full Decompilation
```javascript
// Spawns jadx CLI, streams output, checks decompiled Java classes for secrets
const proc = spawn('jadx', [APK_PATH, '-d', './attack_output/jadx', '--show-bad-code']);
// After: scan all .java files for 'password', 'secret', 'supabase_key', 'JWT_SECRET'
// PASS if 0 matches AND no Dart logic visible (only Flutter shell + plugin stubs)
```

**Expected Output**:
```
[ATTACK] jadx sentrizk.apk → ./attack_output/jadx/
[LOG]    INFO - 47 classes decompiled
[RESULT] Dart source files recovered: 0 (Dart is AOT ARM64, not JVM bytecode)
[RESULT] Classes decompiled: 47 (all Java plugin stubs + Flutter shell)
[RESULT] Secret scan across 47 files: 0 matches
[VERDICT] ✅ PASS — jadx cannot decompile Dart logic. Zero secrets found.
```

### C3b — apktool + AndroidManifest Analysis
```javascript
execSync(`apktool d ${APK_PATH} -o ./attack_output/apktool -f`);
const manifest = fs.readFileSync('./attack_output/apktool/AndroidManifest.xml', 'utf8');
const checks = [
  ['debuggable=true', !manifest.includes('android:debuggable="true"')],
  ['cleartext traffic', !manifest.includes('cleartextTrafficPermitted="true"')],
  ['backup allowed', !manifest.includes('android:allowBackup="true"')],
];
```

**Expected Output**:
```
[ATTACK] apktool d sentrizk.apk
[RESULT] ✅ android:debuggable="true"  → NOT FOUND (release build confirmed)
[RESULT] ✅ cleartext traffic permitted → NOT FOUND (HTTPS enforced)
[RESULT] ✅ android:allowBackup       → NOT FOUND (backup disabled)
[VERDICT] ✅ PASS — APK manifest has zero security misconfigurations.
```

### C3c — Binary strings on libapp.so
```javascript
// Extract libapp.so from APK (APK = ZIP archive)
const zip = new AdmZip(APK_PATH);
zip.extractEntryTo('lib/arm64-v8a/libapp.so', './attack_output/', false, true);

// Extract printable ASCII strings ≥ 4 chars
const binary = fs.readFileSync('./attack_output/libapp.so');
const strings = extractPrintableStrings(binary, 4);
const matches = SECRET_PATTERNS.filter(p => strings.some(s => s.toLowerCase().includes(p)));
```

**Expected Output**:
```
[ATTACK] Extracting libapp.so from APK (unzipping native library)...
[RESULT] libapp.so size: 23.4 MB (ARM64 AOT-compiled Dart)
[ATTACK] Extracting printable strings and scanning for secrets...
[RESULT] ✅ 'password'     → 0 matches in 23.4 MB binary
[RESULT] ✅ 'supabase_key' → 0 matches
[RESULT] ✅ 'JWT_SECRET'   → 0 matches
[RESULT] ✅ 'service_role' → 0 matches
[RESULT] ✅ 'firebase_key' → 0 matches
[VERDICT] ✅ PASS — libapp.so is stripped ARM64. Zero readable secrets found.
```

---

## C4 — Firebase E2EE: Messages Are Pure Ciphertext

**Category**: Confidentiality | **Domain**: Chat / E2EE
**CIA Threat**: Firebase breach → messages readable by attacker

```javascript
// Uses firebase-admin to read live Firestore messages
const db = admin.firestore();
const snap = await db.collectionGroup('messages').orderBy('timestamp','desc').limit(5).get();

snap.forEach(doc => {
  const d = doc.data();
  emit({ type:'RESULT', msg:`Doc: senderId=${d.senderId} | signalType=${d.signalType}` });
  emit({ type:'RESULT', msg:`  content (first 50): ${d.content?.substring(0,50)}` });
  
  const isBase64 = /^[A-Za-z0-9+/=]+$/.test(d.content?.substring(0,30));
  const isHumanReadable = /^[a-zA-Z\s]+$/.test(d.content?.substring(0,30));
  const hasSignalType = typeof d.signalType === 'number';
  
  // PASS if content is base64 ciphertext, NOT human readable, AND signalType exists
});
```

**Expected Output**:
```
[ATTACK] Firebase Admin SDK — reading 5 most recent Firestore messages...
[RESULT] Message 1: senderId=alice | signalType=3 (whisperType)
[RESULT]   content: CiUKINk3xpQ8fO2lR0tLm...  (base64 ciphertext, 156 chars)
[CHECK]    Is human-readable text?  ❌ NO
[CHECK]    Has signalType field?    ✅ YES (type 3 = Double Ratchet)
[CHECK]    'plaintext' field exists? ❌ NO — field not in schema

[RESULT] Message 2: senderId=bob | signalType=3
[RESULT]   content: AxAAAjkE7m9pRSzQv...     (different ciphertext)
[CHECK]    Ratchet key changed from msg 1?   ✅ YES (different ciphertext prefix)

[VERDICT] ✅ PASS — All 5 messages are E2EE Signal ciphertext. Zero plaintext in Firestore.
```

---

## C6 — ML Privacy: Inference Is Purely On-Device

**Category**: Confidentiality | **Domain**: ML Threat Detection
**CIA Threat**: ML analysis breaks E2EE by sending plaintext to server

```javascript
// Static code analysis: read message_scan_service.dart
const code = fs.readFileSync(ML_SERVICE_PATH, 'utf8');
const networkCalls = ['http.', 'Uri.parse', 'HttpClient', 'Dio(', 'fetch(', 'request(', 'socket'];
const found = networkCalls.filter(p => code.includes(p));
const loadsFromAsset = code.includes('Interpreter.fromAsset');
const loadsFromNetwork = code.includes('Interpreter.fromUrl') || code.includes('http');
```

**Expected Output**:
```
[AUDIT]  Reading MessageScanService source code...
[SEARCH] Network call patterns in ML service: 0 found
[CHECK]  Model source: Interpreter.fromAsset('assets/ml/sentrizk_model.tflite') ✅
[CHECK]  Any outbound HTTP/socket in ML service: ❌ NONE
[VERIFY] ML inference path: scanMessage(text) → tokenize() → interpreter.run() → score
         All steps local. No network I/O.
[VERDICT] ✅ PASS — ML is 100% on-device. Plaintext never leaves phone for AI analysis.
```

---

# ██ INTEGRITY AUTOMATED TESTS ██

---

## I1 — ZKP Proof Forgery

**Category**: Integrity | **Domain**: Authentication
**CIA Threat**: Attacker forges a zk-SNARK proof to authenticate as any user

```javascript
const { commitment, nonce } = await fetchNonce(TEST_USER);

// Attempt 1: Random field elements (not on BN128 curve)
const fakeProof = {
  pi_a: ["99999999999999999999999999999999", "11111111111111111111111111111111", "1"],
  pi_b: [["222","333"],["444","555"],["1","0"]],
  pi_c: ["666666666666", "777777777777", "1"],
  protocol: "groth16", curve: "bn128"
};

const r1 = await fetch(`${BACKEND}/login`, {
  method:'POST', body: JSON.stringify({ username: TEST_USER, proof: fakeProof, publicSignals: [commitment, "0", "0", nonce] })
});
// PASS if status === 400

// Attempt 2: Take a valid proof, flip one character in pi_a[0]
const { proof: realProof } = await generateRealProof(commitment, nonce);
realProof.pi_a[0] = realProof.pi_a[0].slice(0,-1) + (realProof.pi_a[0].slice(-1) === '0' ? '1' : '0');
const r2 = await fetch(`${BACKEND}/login`, { method:'POST', body: JSON.stringify({...}) });
// PASS if status === 400
```

**Expected Output**:
```
[ATTACK] Attack 1: Random BN128 field elements (not on elliptic curve)
[RESULT] POST /login → HTTP 400 — { "error": "Invalid login proof" } ✅

[ATTACK] Attack 2: Valid proof with 1 bit flipped in pi_a[0]
[RESULT] POST /login → HTTP 400 — { "error": "Invalid login proof" } ✅

[EXPLAIN] Groth16 relies on BN128 pairing: e(A,B) · e(C,vk_delta) = e(vk_alpha, vk_beta)
          Any non-curve point or modified point breaks the pairing equation.
          Forging requires solving the elliptic curve discrete log: 2^128 operations.

[VERDICT] ✅ PASS — ZKP proof forgery is cryptographically infeasible.
```

---

## I2 — Nonce Replay Attack (60-Second Window)

**Category**: Integrity | **Domain**: Authentication
**CIA Threat**: Attacker captures a live proof and replays it

```javascript
// Step 1: Get fresh nonce
// Step 2: Generate REAL valid Groth16 proof with snarkjs (uses test account credentials)
const { proof, publicSignals } = await snarkjs.groth16.fullProve(
  { secret: TEST_SECRET, salt: TEST_SALT, unameHash: TEST_UNAME_HASH, storedCommitment: commitment, nonce },
  LOGIN_WASM, LOGIN_ZKEY
);
// Step 3: Submit once (success)
const r1 = await POST('/login', { username: TEST_USER, proof, publicSignals });
// Step 4: Replay immediately
const r2 = await POST('/login', { username: TEST_USER, proof, publicSignals });
// PASS: r1.status === 200 AND r2.status === 400
```

**Expected Output**:
```
[ATTACK] Generating real Groth16 proof for test account (takes ~2.5s)...
[RESULT] Proof generated in 2.4s ← real ZKP generation cost

[ATTACK] First login (legitimate)...
[RESULT] HTTP 200 ✅ — Session created: { sessionId: "abc123..." }

[ATTACK] REPLAYING identical proof immediately...
[RESULT] HTTP 400 — { "error": "Nonce expired or not issued" } ✅

[EXPLAIN] Server nulled nonce on first use (nonce=null in DB after login)
          Same proof is permanently invalid — cannot be reused ever.

[VERDICT] ✅ PASS — Captured proof replay attack defeated.
```

---

## I3 — Commitment Substitution (Cross-User Impersonation)

**Category**: Integrity | **Domain**: Authentication
**CIA Threat**: Attacker swaps victim's username into their own valid proof

```javascript
// Attacker has a valid proof for test_user, tries to claim they are 'victim_user'
const { commitment: victimCommitment } = await fetchNonce('victim_user');
// Use test_user's valid proof but substitute victim's username
const res = await POST('/login', {
  username: 'victim_user',   // victim's username
  proof: attackerValidProof, // attacker's proof (valid for attacker's commitment)
  publicSignals: [attackerCommitment, ...]
});
// PASS if status === 400 "Commitment mismatch"
```

**Expected Output**:
```
[ATTACK] Using valid proof for 'test_user', submitting under 'victim_user'...
[RESULT] HTTP 400 — { "error": "Commitment mismatch" } ✅

[EXPLAIN] Server checks: publicSignals[0] (commitment in proof) === victim_user.commitment
          Attacker's commitment ≠ victim's commitment → rejected immediately.
          ZKP circuit embeds username hash: unameHash inside proof cannot be changed.

[VERDICT] ✅ PASS — Cross-user impersonation is cryptographically blocked.
```

---

## I4 — MAT Single-Use Enforcement

**Category**: Integrity | **Domain**: Authentication (Mobile Bridge)
**CIA Threat**: Attacker steals deep-link URL and reuses the token

```javascript
const { mobileAccessToken } = await POST('/generate-mobile-access-token', { deviceId:'test', action:'login' });
// Use once
const r1 = await GET(`/register?mat=${mobileAccessToken}`);
// Replay
const r2 = await GET(`/register?mat=${mobileAccessToken}`);
// PASS: r2.status === 403 AND r2.body.error === "Mobile access token already used"
```

**Expected Output**:
```
[ATTACK] Generated MAT: a1b2c3d4e5f6... (5-min expiry, single-use)
[RESULT] First use     → HTTP 200 ✅ (legitimate)
[RESULT] Second use    → HTTP 403 — { "error": "Mobile access token already used" } ✅
[VERDICT] ✅ PASS — Deep-link URL interception yields a useless already-burned token.
```

---

## I5 — JWT Forgery (3-Vector Attack)

**Category**: Integrity | **Domain**: Admin Authentication
**CIA Threat**: Attacker accesses admin dashboard without credentials

```javascript
const attacks = [
  { name:'Fake HMAC key', token: jwt.sign({ username:'hacker', role:'admin' }, 'wrong_secret_123') },
  { name:'alg:none bypass', token: buildNoneAlgToken({ username:'hacker', role:'admin' }) },
  { name:'Valid structure, role:user', token: jwt.sign({ username:'hacker', role:'user' }, 'wrong_key') },
  { name:'Expired valid token', token: jwt.sign({ username:'admin', role:'admin', exp: Math.floor(Date.now()/1000) - 3600 }, JWT_SECRET) },
];

for (const attack of attacks) {
  const r = await GET('/admin/users', { Authorization: `Bearer ${attack.token}` });
  // PASS if all return 401
}
```

**Expected Output**:
```
[ATTACK] Testing 4 JWT attack vectors on GET /admin/users...

  [1] Forged HMAC (wrong key)      → HTTP 401 — Invalid or expired admin token ✅
  [2] alg:none (no signature)      → HTTP 401 — Invalid or expired admin token ✅
  [3] Valid structure, role:user   → HTTP 401 — Not an admin token ✅
  [4] Expired (1 hour ago)         → HTTP 401 — jwt expired ✅

[VERDICT] ✅ PASS — All 4 JWT attack vectors rejected. Admin access requires valid secret + role.
```

---

## I6 — Session Rotation Anti-Replay

**Category**: Integrity | **Domain**: Session Management
**CIA Threat**: Attacker captures a session token and uses it after rotation

```javascript
// Login, get sessionId_A
const { sessionId: oldSession } = await loginTestUser();

// Refresh session (rotates to sessionId_B)
const { sessionId: newSession } = await POST('/refresh-session', { sessionId: oldSession, deviceId: TEST_DEVICE });

// Try to use old session
const r = await POST('/validate-session', { sessionId: oldSession });
// PASS if r.valid === false
```

**Expected Output**:
```
[ATTACK] Login → sessionId_A: abc123...
[ATTACK] Refresh session → sessionId_B: xyz789... (new ID issued)
[ATTACK] Using OLD sessionId_A after rotation...
[RESULT] HTTP 400 — { "valid": false, "error": "Session not found" } ✅
[VERDICT] ✅ PASS — Old session tokens are invalidated on rotation (anti-replay).
```

---

## I7 — Device Binding: Cross-Device Session Hijack

**Category**: Integrity | **Domain**: Session Management
**CIA Threat**: Attacker uses stolen sessionId from a different device

```javascript
// Login on device_A, get sessionId bound to device_A
// Try to refresh on device_B (different deviceId)
const r = await POST('/refresh-session', { sessionId: sessionIdA, deviceId: 'attacker_device_999' });
// PASS if status === 403 "Device mismatch"
```

**Expected Output**:
```
[ATTACK] Login on Device A: deviceId=real_phone_hardware_id
[ATTACK] Attacker tries to refresh session on Device B: deviceId=attacker_device_999
[RESULT] HTTP 403 — { "error": "Device mismatch" } ✅
[VERDICT] ✅ PASS — Stolen session token is useless on any other device.
```

---

## I8 — Input Injection: Username + Threat Score Validation

**Category**: Integrity | **Domain**: Input Security
**CIA Threat**: Attacker injects malformed data to cause server error or SQLi

```javascript
const injections = [
  // Username injection attempts
  { username: "alice'; DROP TABLE users;--", expected: [400] },
  { username: "../../../etc/passwd", expected: [400] },
  { username: "<script>alert(1)</script>", expected: [400] },
  { username: "a".repeat(200), expected: [400] },  // too long
  // Threat score edge cases
  { body: { senderId:'a', receiverId:'b', content:'x', threatScore: 99.9 }, expected: [400] },
  { body: { senderId:'a', receiverId:'b', content:'x', threatScore: -1 }, expected: [400] },
  { body: { senderId:'a', receiverId:'b', content:'x'.repeat(3000), threatScore: 0.5 }, expected: [400] },
];
```

**Expected Output**:
```
[ATTACK] Testing 7 injection vectors...

  [1] SQL injection in username      → HTTP 400 — Invalid username format ✅
  [2] Path traversal username        → HTTP 400 — Invalid username format ✅
  [3] XSS in username                → HTTP 400 — Invalid username format ✅
  [4] 200-char username              → HTTP 400 — Invalid username format ✅
  [5] threatScore=99.9 (out of 0-1)  → HTTP 400 — threatScore must be 0-1 ✅
  [6] threatScore=-1 (negative)      → HTTP 400 — threatScore must be 0-1 ✅
  [7] content > 2000 chars           → HTTP 400 — content under 2000 chars ✅

[VERDICT] ✅ PASS — All 7 injection vectors sanitized. No server error triggered.
```

---

# ██ ML THREAT DETECTION TESTS ██

> These tests run the TFLite model LOCALLY — requires the test runner to load
> the vocab.json and sentrizk_model.tflite from `Frontend/mobile/assets/ml/`
> using TensorFlow.js or the Python inference engine.

---

## ML1 — Phishing Message Detection

**Category**: ML Threat | **Domain**: Insider Threat Detection

**Test messages (known positives)**:
```
"URGENT: Click here to verify your account or it will be DELETED: http://paypa1-secure.tk"
"You have won a $1000 Amazon gift card! Claim now: bit.ly/wxyz123"
"Your password has expired. Update immediately: http://office365-login.ml/reset"
"Send me your login credentials urgently, management audit required"
"Wire transfer $50,000 to account 4891234567 immediately, confidential"
```

**Expected Output**:
```
[ML] Loading TFLite model: sentrizk_model.tflite (vocab: 10,000 words)

[TEST] Message 1: "URGENT: Click here to verify..."
       Score: 0.891 | Threshold: 0.65 | Result: 🚨 THREAT DETECTED ✅

[TEST] Message 2: "You have won $1000 Amazon gift card..."
       Score: 0.834 | Threshold: 0.65 | Result: 🚨 THREAT DETECTED ✅

[TEST] Message 3: "Your password has expired..."
       Score: 0.778 | Threshold: 0.65 | Result: 🚨 THREAT DETECTED ✅

[TEST] Message 4: "Send me your login credentials..."
       Score: 0.712 | Threshold: 0.65 | Result: 🚨 THREAT DETECTED ✅

[VERDICT] ✅ PASS — 5/5 phishing messages correctly detected above threshold (0.65)
```

---

## ML2 — Safe Message Pass-Through

**Expected**: All safe messages score below 0.65

```
"Hey, are we meeting in the conference room at 3pm?"     → score: 0.041 ✅
"Can you review the Q2 report before tomorrow?"          → score: 0.089 ✅
"The server deployment went fine, no issues"             → score: 0.023 ✅
"Happy birthday to the team! Cake in the kitchen"        → score: 0.011 ✅
```

---

## ML3 — Short Message Skip (False Positive Prevention)

**Expected**: Messages < 4 words return score 0.0 (skipped)

```
"Hi"         → score: 0.0 (SKIPPED — 1 word) ✅
"Yes ok"     → score: 0.0 (SKIPPED — 2 words) ✅
"Meeting 3pm now" → score: 0.0 (SKIPPED — 3 words) ✅
```

---

# ██ AVAILABILITY AUTOMATED TESTS ██

---

## A1 — Login Brute Force: Rate Limit at 10 req/min

```javascript
const results = [];
for (let i = 1; i <= 15; i++) {
  const r = await POST('/login', { username: TEST_USER, proof: FAKE_PROOF, publicSignals: [] });
  results.push({ req: i, status: r.status });
  await sleep(100); // 100ms between requests = 10/s = well over 1-min limit
}
const first429 = results.find(r => r.status === 429);
// PASS if first429?.req <= 11
```

**Expected Output**:
```
[ATTACK] 15 rapid POST /login requests (100ms apart)...
  1→400  2→400  3→400  4→400  5→400  6→400  7→400  8→400  9→400  10→400
  11→429 ← RATE LIMIT  12→429  13→429  14→429  15→429

[RESULT] Rate limit triggered at request 11 (window=60s, max=10)
[BONUS]  ZKP cost ~2.5s/proof → attacker maximum 24 guesses/minute even without rate limit
[VERDICT] ✅ PASS — Brute force blocked at request 11. 429 Too Many Requests.
```

---

## A2 — Admin Endpoint Rate Limit (5 req/min)

```javascript
// Admin login endpoint is limited to 5/min (stricter than /login)
for (let i = 1; i <= 8; i++) {
  const r = await POST('/admin/login', { username: 'wrongadmin', password: 'wrongpass' });
  results.push({ req: i, status: r.status });
}
// PASS if 429 appears at or before request 6
```

**Expected Output**:
```
  1→401  2→401  3→401  4→401  5→401
  6→429 ← ADMIN RATE LIMIT  7→429  8→429
[VERDICT] ✅ PASS — Admin brute force blocked after 5 attempts.
```

---

## A3 — Payload Flooding: Body Size Enforcement

```javascript
const sizes = [
  { kb: 50,    expected: [400, 404] },  // valid size, fails on bad proof
  { kb: 100,   expected: [400, 404] },  // exactly at limit
  { kb: 101,   expected: [413] },       // just over limit
  { kb: 10000, expected: [413] },       // 10 MB — should be 413
];
```

**Expected Output**:
```
  50  KB → HTTP 400 ✅ (too small payload, but valid size — proof invalid)
  100 KB → HTTP 400 ✅ (at limit — processed, proof invalid)
  101 KB → HTTP 413 ✅ ← Payload Too Large
  10  MB → HTTP 413 ✅
[VERDICT] ✅ PASS — 100KB limit enforced. Memory exhaustion attack blocked.
```

---

## A4 — Session Expiry Enforcement

```javascript
// Create session, manually expire it in Supabase, then validate
const { sessionId } = await loginTestUser();
// Force-expire the session in Supabase
await supabase.from('sessions').update({ expires: Date.now() - 1000 }).eq('sessionId', sessionId);
// Try to use expired session
const r = await POST('/validate-session', { sessionId });
// PASS if r.valid === false  
// Also try firebase-token with expired session
const r2 = await POST('/firebase-token', { sessionId });
// PASS if r2.status === 401
```

**Expected Output**:
```
[ATTACK] Login → create session (30-min TTL by default)
[ATTACK] Force-expire session in Supabase (set expires = now - 1s)
[ATTACK] POST /validate-session with expired sessionId...
[RESULT] { "valid": false, "error": "Session expired" } ✅
[ATTACK] POST /firebase-token with expired sessionId...
[RESULT] HTTP 401 — { "error": "Session expired" } ✅
[VERDICT] ✅ PASS — Expired sessions cannot access any authenticated endpoints.
```

---

## Running the Dashboard

```bash
cd Doc/Testing/automated
npm install
node server/index.js          # Test runner on :3001
cd client && npm run dev       # React UI on :5173
# Open http://localhost:5173
```

---

## Test Account Setup

Before running, create the test account via the web frontend:
1. Open `https://frontend.sentrizk.me/register`
2. Register with username: `sentrizk_test_user`
3. Record the **secret**, **salt**, and **mnemonic**
4. Add them to `server/config.js`:

```javascript
module.exports = {
  BACKEND_URL: 'https://backend.sentrizk.me',
  SUPABASE_URL: '...',
  SUPABASE_SERVICE_ROLE_KEY: '...',
  FIREBASE_SERVICE_ACCOUNT: '../../Backend/serviceAccountKey.json',
  APK_PATH: '../../Frontend/mobile/sentrizk.apk',
  ML_ASSETS_PATH: '../../Frontend/mobile/assets/ml/',
  LOGIN_WASM: '../../Backend/circuits/login/login.wasm',
  LOGIN_ZKEY: '../../Backend/circuits/key_generation/login_final.zkey',
  TEST_USER: 'sentrizk_test_user',
  TEST_SECRET: '...', // 256-bit bigint string — from registration
  TEST_SALT: '...',   // 128-bit bigint string — from registration
  TEST_DEVICE: 'test_device_001',
};
```
