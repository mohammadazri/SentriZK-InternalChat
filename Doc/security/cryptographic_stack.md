# 🔐 Cryptographic Stack Reference

> Comprehensive reference for all cryptographic protocols, algorithms, and key management used in SentriZK.

---

## 1. Zero-Knowledge Proof Layer

### Proving System: Groth16

| Property | Value |
|----------|-------|
| **Protocol** | Groth16 zk-SNARK (Non-Interactive Zero-Knowledge) |
| **Curve** | BN128 (alt_bn128) — 128-bit security level |
| **Proof Size** | 192 bytes (compressed: 3 group elements) |
| **Verification Time** | < 50 ms (constant — O(1) verifier) |
| **Proof Generation Time** | ~2–3 seconds (browser, via snarkjs WASM) |
| **Trusted Setup** | Powers of Tau ceremony, 2^12 constraints |
| **Library** | snarkjs 0.7.5 (browser + server) |

### Circuit: Registration (`registration.circom`)

```
commitment = Poseidon(secret, salt, unameHash)
```

| Signal | Visibility | Size | Description |
|--------|-----------|------|-------------|
| `secret` | **Private** | 256-bit | Derived from wallet address via `sha3_256` |
| `salt` | **Private** | 128-bit | Derived from BIP-39 mnemonic via HKDF |
| `unameHash` | Public | Field element | `keccak256(username.toLowerCase())` |
| `commitment` | **Output** | Field element | Stored on server — the only value the server sees |

**Constraints**: 1,247

### Circuit: Login (`login.circom`)

```
1. Recompute commitment = Poseidon(secret, salt, unameHash)
2. Assert: commitment == storedCommitment
3. session = Poseidon(storedCommitment, nonce)
```

| Signal | Visibility | Size | Description |
|--------|-----------|------|-------------|
| `secret` | **Private** | 256-bit | User's wallet-derived secret |
| `salt` | **Private** | 128-bit | Mnemonic-derived salt |
| `unameHash` | Public | Field element | `keccak256(username)` |
| `storedCommitment` | Public | Field element | Server's stored commitment |
| `nonce` | Public | 64-bit | Server-issued one-time nonce (60s TTL) |
| `pubCommitment` | **Output** | Field element | Must match `storedCommitment` |
| `pubSession` | **Output** | Field element | `Poseidon(commitment, nonce)` — binds proof to nonce |

**Constraints**: 1,486

### Hash Function: Poseidon

| Property | Value |
|----------|-------|
| **Purpose** | ZK-friendly algebraic hash function |
| **Library** | circomlibjs 0.1.7 |
| **Inputs** | 2 or 3 field elements |
| **Output** | 1 field element (BN128 scalar field) |
| **Security** | 128-bit collision resistance |
| **Advantage** | ~8× fewer constraints than SHA-256 inside a SNARK circuit |

---

## 2. Key Derivation Layer

### BIP-39 Mnemonic

| Property | Value |
|----------|-------|
| **Purpose** | Account recovery phrase |
| **Word Count** | 24 words |
| **Entropy** | 256 bits |
| **Library** | bip39 (npm) / bip39 1.0.6 (pub.dev) |
| **Usage** | Generated once at registration, shown to user one time only |

### Salt Derivation (from Mnemonic)

```
mnemonicSeed = bip39.mnemonicToSeed(mnemonic, passphrase)
salt = HKDF-SHA256(seed, info="app:mnemonic:v1", length=128 bits)
```

| Step | Algorithm | Input | Output |
|------|-----------|-------|--------|
| 1. Seed | BIP-39 `mnemonicToSeed` | 24-word mnemonic | 512-bit seed |
| 2. HKDF | HKDF-SHA256 | seed + info string | 128-bit salt (hex) |

### Secret Derivation (from Wallet)

```
secret = sha3_256(walletAddress.toLowerCase().replace("0x", ""))
```

| Property | Value |
|----------|-------|
| **Input** | Ethereum wallet address (0x-prefixed) |
| **Hash** | SHA3-256 (Keccak-256) via js-sha3 |
| **Output** | 256-bit hex string |
| **Storage** | **Never stored** — re-derived from connected wallet each time |

### Username Hashing

```
unameHash = BigInt("0x" + sha3_256(username.toLowerCase()))
```

---

## 3. Encryption Layer

### Salt Envelope Encryption (AES-256-GCM)

The user's salt is encrypted with their password and stored on the mobile device.

```
PBKDF2(password, randomSalt, 310000 iters, SHA-256) → rootKey
HKDF(rootKey, info="app:enc:v1") → AES-256-GCM key
AES-GCM-Encrypt(key, iv, plaintext={salt: saltHex}) → ciphertext
```

| Parameter | Value |
|-----------|-------|
| **Algorithm** | AES-256-GCM |
| **Key Derivation** | PBKDF2-SHA256 (310,000 iterations) → HKDF-SHA256 |
| **IV** | 12 bytes (96-bit), random |
| **PBKDF2 Salt** | 32 bytes, random |
| **Integrity** | SHA3-256 fingerprint of envelope (constant-time comparison) |
| **Envelope Format** | JSON with version, KDF params, IV, AAD, ciphertext, meta |
| **Library** | WebCrypto API (browser-native) |

### Signal Protocol (E2EE Messaging)

| Component | Description |
|-----------|-------------|
| **Key Agreement** | X3DH (Extended Triple Diffie-Hellman) |
| **Ratchet** | Double Ratchet Algorithm |
| **Curve** | Curve25519 (ECDH key exchange) |
| **Message Encryption** | AES-256-CBC with HMAC-SHA256 |
| **Forward Secrecy** | Per-message key rotation — old keys deleted immediately |
| **Library** | libsignal_protocol_dart 0.7.2 |

**Pre-Key Bundle** (uploaded to Firestore `signals/{username}`):
- 1× Identity Key Pair (long-term)
- 1× Signed Pre-Key (medium-term, signed with identity key)
- 100× One-Time Pre-Keys (consumed on first message)

**Message Types**:
- `type=3` (PREKEY): First message — includes X3DH key material
- `type=1` (WHISPER): Subsequent messages — Double Ratchet only

### WebRTC Media Encryption

| Property | Value |
|----------|-------|
| **Key Exchange** | DTLS (Datagram Transport Layer Security) |
| **Media Encryption** | SRTP (Secure Real-time Transport Protocol) |
| **Combined** | DTLS-SRTP — keys negotiated via DTLS, media encrypted via SRTP |
| **Transport** | Peer-to-peer (media never passes through server) |
| **STUN Servers** | `stun.l.google.com:19302` (×3 servers) |
| **Library** | flutter_webrtc 0.12.1 |

---

## 4. Secure Storage Layer

### Android (Production)

| Storage | Technology | Contents |
|---------|-----------|----------|
| **FlutterSecureStorage** | Android Keystore (hardware-backed HSM) | Encrypted salt, session ID |
| **SharedPreferences** | XML (app sandbox) | Username (non-sensitive) |
| **Isar DB** | Embedded NoSQL | Signal sessions, scan cache |

**Android Keystore Properties**:
- AES-256-GCM keys generated inside the Trusted Execution Environment (TEE)
- Keys are **non-exportable** — cannot be read even with root access
- Requires device PIN/biometric to unlock

### iOS

| Storage | Technology |
|---------|-----------|
| **FlutterSecureStorage** | iOS Keychain (Secure Enclave) |

---

## 5. Admin Authentication

| Component | Algorithm | Purpose |
|-----------|-----------|---------|
| **Password Storage** | bcrypt (or plaintext with `timingSafeEqual`) | Admin login verification |
| **Session Token** | JWT (HS256) | Admin API authorization |
| **Timing Attack Prevention** | `crypto.timingSafeEqual()` | Constant-time password comparison |

---

## 6. Security Properties Summary

| Property | Mechanism | Guarantee |
|----------|-----------|-----------|
| **Zero-Knowledge** | Groth16 proof | Server learns nothing except valid/invalid |
| **No Credential Storage** | Poseidon commitments | Database breach reveals no passwords |
| **Replay Protection** | 64-bit nonce (60s TTL) | Each proof is cryptographically bound to a unique nonce |
| **Forward Secrecy** | Signal Double Ratchet | Compromised key cannot decrypt past messages |
| **Device Binding** | Session `deviceId` | Session hijacking requires physical device |
| **On-Device Privacy** | TFLite inference | ML scanning happens before encryption — server never sees plaintext |
| **Brute Force Resistance** | Rate limiting + ~3s proof cost | 10 req/min + computational cost per attempt |
