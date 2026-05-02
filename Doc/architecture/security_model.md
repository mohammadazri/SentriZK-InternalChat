# 🛡️ Security Model

> Threat model, defense strategies, and security properties of SentriZK.  
> All claims in this document are verified by the [18-test adversarial test suite](../testing/testing_overview.md).

---

## Security Properties

| Property | Guarantee |
|----------|-----------:|
| **Zero-Knowledge** | Server learns nothing except proof validity — no password, secret, or salt is transmitted |
| **No Credential Storage** | Server stores only Poseidon commitments (irreversible, 2^128 ops to break) |
| **Perfect Forward Secrecy** | Signal Protocol ratchets keys per message — compromised key can't decrypt past messages |
| **E2EE Media** | WebRTC DTLS-SRTP encrypts audio/video peer-to-peer — media never passes through server |
| **On-Device Threat Detection** | TFLite ML inference runs locally before encryption — server never sees plaintext messages |
| **Device Binding** | Sessions are bound to a specific `deviceId` — refreshing from a different device returns `403` |
| **Session Rotation** | Session refresh issues a new `sessionId` and deletes the old one — prevents replay attacks |
| **Admin Timing-Safe Auth** | Admin password comparison uses `crypto.timingSafeEqual()` — immune to timing attacks |

---

## Defense Against Known Attacks

### 1. Credential Theft (e.g. 2023 Slack Session Token Breach)

| | Traditional | SentriZK |
|---|------------|----------|
| **Storage** | Hashed passwords with salt | Poseidon commitments only |
| **If DB leaked** | Attacker can attempt rainbow/dictionary attacks | Commitment is irreversible (2^128 complexity) — no password to crack |

**Tested by**: C1 (DB Breach: No Passwords Stored)

### 2. Replay Attacks

- Every login requires a **fresh nonce** (64-bit random, 60-second TTL)
- Nonces are cryptographically random and single-use
- ZKP proof includes the nonce as a public signal — `pubSession = Poseidon(commitment, nonce)`
- Reusing an old proof with a new nonce fails Groth16 verification

**Tested by**: I2 (Nonce Replay Attack)

### 3. Session Hijacking

- Sessions expire in **30 minutes**
- Session refresh **rotates the sessionId** — old ID is deleted, new one issued
- Sessions are **device-bound**: `deviceId` must match on refresh (`403 Device mismatch`)
- MAT tokens expire in **5 minutes** and are single-use

**Tested by**: I6 (Session Rotation Anti-Replay), I7 (Device Binding)

### 4. Brute Force

- Rate limiting: **10 requests/minute** per IP on `/register` and `/login`
- Rate limiting: **5 requests/minute** per IP on `/admin/login`
- ZKP proof generation takes ~2–3 seconds per attempt — natural computational cost
- Body size limit: **100 KB** prevents payload flood

**Tested by**: A1, A2 (Rate Limiting), A3 (Payload Flood)

### 5. Man-in-the-Middle

- All API traffic over **HTTPS/TLS**
- Firestore uses **TLS 1.3**
- WebRTC uses **DTLS** for peer-to-peer key negotiation
- Flutter release builds do NOT trust user-installed CA certificates (blocks mitmproxy)

### 6. Message Interception

- Chat messages encrypted with **Signal Protocol** (X3DH + Double Ratchet)
- Firestore stores only Base64 ciphertext — unreadable to server admins or database breaches
- Audio/video encrypted with **DTLS-SRTP** — media never passes through server

**Tested by**: C4 (Firebase E2EE: Messages Ciphertext)

### 7. APK Reverse Engineering

- Flutter compiles Dart → AOT native ARM64 machine code (`libapp.so`)
- **jadx** decompilation recovers only Java plugin stubs — zero Dart logic visible
- **strings** analysis on `libapp.so` finds zero embedded secrets (symbols stripped)
- Release APK has `android:debuggable` absent and no cleartext traffic permitted

**Tested by**: C3a (jadx Decompile), C3c (Binary Secrets in libapp.so)

### 8. ZKP Proof Forgery

- Fabricated Groth16 proofs with random BN128 field elements are rejected by `snarkjs.verify()`
- Commitment substitution (proof from different user) fails the `pubCommitment === storedCommitment` check
- Forging a valid proof requires breaking the BN128 discrete log assumption (2^128 ops)

**Tested by**: I1 (ZKP Proof Forgery), I3 (Commitment Substitution)

### 9. MAT Token Reuse

- MATs are marked `used: true` on first consumption — second use returns `403`
- Expired MATs are rejected and deleted

**Tested by**: I4 (MAT Single-Use Enforcement)

### 10. Admin JWT Forgery

- JWTs signed with `HS256` using `JWT_SECRET` from `.env`
- Wrong secret → `401`
- Missing `role: admin` → `401`
- Expired token → `401`
- `alg: none` bypass → `401`

**Tested by**: I5 (Admin JWT Forgery — 4 vectors)

### 11. Input Injection

- XSS payloads, SQL injection, and oversized content are validated on `POST /threat-log`
- `content` must be a string under 2000 chars
- `threatScore` must be a number between 0.0 and 1.0
- Username validation: `/^[a-z0-9_]{3,20}$/`

**Tested by**: I8 (Input Injection & Validation)

---

## What Each Attacker Can See

| Attacker Position | Can See | Cannot See |
|-------------------|---------|------------|
| **Network sniffer** | Encrypted TLS packets | Any content |
| **Firebase admin** | Encrypted Base64 message blobs, SDP metadata | Plaintext messages, audio/video |
| **Backend admin** | Commitments, session IDs, nonces | Passwords, secrets, message content |
| **Stolen device (locked)** | Encrypted Isar DB, encrypted KeyStore | Plaintext without device PIN/biometric |
| **APK reverse engineer** | Java plugin stubs, architecture tags | Dart source code, function names, secrets |

---

## Session Lifecycle

```
Fresh Install → NO_SESSION
  → User taps Register/Login
  → MAT issued (5-min TTL, single-use)
  → Browser opens with MAT
  → ZKP proof generated (~2-3s)
  → Server verifies → SESSION_CREATED (30-min TTL)
  → One-time token → deep link → Mobile receives sessionId
  → Firebase custom token → signInWithCustomToken
  → FULLY_AUTHENTICATED

During session:
  → Auto-refresh 60s before expiry
  → Refresh rotates sessionId (anti-replay)
  → Device binding enforced on refresh

Session ends:
  → 30-min TTL expires → re-login required
  → Logout → session deleted, Firestore status = "Offline"
  → Admin hold → login returns 403
  → Admin revoke → all data permanently deleted
```

---

## Probabilistic Garbage Collection

Instead of a continuous background timer, SentriZK uses a **10% per-request probability** to trigger cleanup:

```javascript
// Every API request has a 10% chance to trigger GC
if (Math.random() < 0.10) {
  cleanupExpiredTokens(); // fire-and-forget
}
```

Cleanup runs in parallel:
1. Delete expired tokens
2. Delete expired sessions → set users offline in Firestore
3. Delete expired MATs

This approach is CPU-efficient: if the server has no traffic, it sleeps.

---

## Compliance

| Standard | Application |
|----------|-------------|
| NIST SP 800-63B | Digital identity and authentication guidelines |
| OWASP Top 10 | Web application security best practices |
| BIP-39 | Mnemonic code standard for key generation |
| RFC 5869 | HMAC-based Key Derivation Function (HKDF) |
