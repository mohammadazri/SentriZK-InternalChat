# 🔐 Authentication Flow

Complete documentation of the SentriZK zero-knowledge authentication system.

---

## Overview

SentriZK uses **zk-SNARK (Groth16)** proofs so users can prove their identity **without revealing their password**. The server stores only cryptographic commitments — never credentials.

---

## 1. Registration Protocol

```
User → Client:   Enter username + password
Client:          Generate 24-word BIP-39 mnemonic (256-bit entropy)
Client:          salt = HKDF(mnemonic, "SentriZK-Salt")
Client:          secret = SHA-256(password)
Client:          envelope = AES-256-Encrypt(salt, password)
Client:          unameHash = Keccak-256(username)

Client → Circuit: Prove knowledge of (secret, salt) for unameHash
  Circuit computes:
    commitment = Poseidon(secret, salt)
    identityCommitment = Poseidon(secret, salt, unameHash)

Client → Server:  { proof, publicSignals: [commitment, identityCommitment, unameHash] }
Server:           Verify Groth16 proof using verification_key.json
Server:           Store { username, commitment, identityCommitment }
Server → Client:  { success: true }

Client → User:    Display mnemonic recovery phrase (MUST be saved by user)
```

**What the server stores**: Only `commitment` and `identityCommitment` (irreversible Poseidon hashes).  
**What the server NEVER sees**: Password, salt, secret, or mnemonic.

---

## 2. Login Protocol

```
User → Client:    Enter username + password, upload encrypted salt envelope
Client:           salt = AES-256-Decrypt(envelope, password)
Client:           secret = SHA-256(password)
Client:           unameHash = Keccak-256(username)

Client → Server:  GET /commitment/:username
Server → Client:  { commitment, nonce }   ← nonce is random, valid for 60 seconds

Client → Circuit: Prove knowledge of (secret, salt) matching (commitment, nonce)
  Circuit computes:
    recomputed_commitment = Poseidon(secret, salt)
    nullifier = Poseidon(secret, salt, nonce)

Client → Server:  { proof, publicSignals: [nullifier, nonce] }
Server:           1. Verify Groth16 proof
                  2. Check nonce not expired (60s TTL)
                  3. Check commitment matches stored value
Server → Client:  { sessionId, username }   ← 30-min session
```

---

## 3. Mobile-to-Web Bridge (MAT Protocol)

Since ZKP proof generation requires browser-based WASM execution, mobile users authenticate through a novel **Mobile Access Token (MAT)** handshake:

```
Step 1: Mobile → Backend:   POST /generate-mobile-access-token { deviceId, action }
Step 2: Backend → Mobile:   { mobileAccessToken, expiresIn: 300000 }   ← 5-min one-time token
Step 3: Mobile → Browser:   Open system browser with MAT in URL
Step 4: Browser → Backend:  Validate MAT + perform ZKP auth in browser
Step 5: Backend → Mobile:   Deep link callback: sentriapp://login-success?token=xxx&username=xxx
Step 6: Mobile:             Store session, sign into Firebase Auth, navigate to chat
```

**Security guarantees**:
- MAT tokens are **one-time use** and expire in 5 minutes
- MAT is bound to a specific `deviceId`
- The deep link callback token is also single-use
- Browser tab auto-closes after redirect

---

## 4. Session Lifecycle

```
Registration:  envelope + mnemonic        → Permanent (user responsibility)
Login:         nonce (60s) → session (30min) → refresh (30min)
Mobile:        MAT (5min) → nonce (60s) → session (30min)
```

| Token Type | TTL | Usage |
|-----------|-----|-------|
| Nonce | 60 seconds | One-time, anti-replay |
| MAT | 5 minutes | One-time, mobile-to-web bridge |
| Session | 30 minutes | Renewable via `/refresh-session` |
| Envelope | Permanent | Encrypted salt stored on client device |

---

## 5. Cryptographic Primitives

| Primitive | Usage | Security Level |
|-----------|-------|---------------|
| **Groth16** | ZK proof system | 128-bit |
| **BN128 Curve** | Elliptic curve for pairings | 128-bit |
| **Poseidon Hash** | ZK-friendly hash (commitments, nullifiers) | 128-bit |
| **BIP-39** | 24-word mnemonic generation | 256-bit entropy |
| **AES-256** | Salt envelope encryption | 256-bit |
| **SHA-256** | Password → secret derivation | 256-bit |
| **Keccak-256** | Username hashing | 256-bit |
| **HKDF** | Mnemonic → salt derivation | RFC 5869 |

---

## 6. Circuit Files

| File | Purpose |
|------|---------|
| `circuits/registration.circom` | Registration proof circuit (proves knowledge of secret + salt) |
| `circuits/login.circom` | Login proof circuit (proves knowledge matching commitment + nonce) |
| `circuits/registration/` | Compiled WASM + R1CS for registration |
| `circuits/login/` | Compiled WASM + R1CS for login |
| `circuits/key_generation/` | Proving keys (`.zkey`) and verification keys (`.json`) |

See [ZKP Circuits](../backend/zkp_circuits.md) for compilation instructions.
