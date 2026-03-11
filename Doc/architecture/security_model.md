# 🛡️ Security Model

Threat model, defense strategies, and security properties of SentriZK.

---

## Security Properties

| Property | Guarantee |
|----------|-----------|
| **Zero-Knowledge** | Server learns nothing except proof validity |
| **No Credential Storage** | Server stores only Poseidon commitments (irreversible) |
| **Perfect Forward Secrecy** | Signal Protocol ratchets keys per message — compromised key can't decrypt past messages |
| **E2EE Media** | WebRTC DTLS-SRTP encrypts audio/video peer-to-peer |
| **On-Device Threat Detection** | ML inference runs locally — no data sent to server |

---

## Defense Against Known Attacks

### 1. Credential Theft (e.g. 2023 Slack Breach)

| | Traditional | SentriZK |
|--|------------|----------|
| **Storage** | Hashed passwords with salt | Poseidon commitments only |
| **If DB leaked** | Attacker can attempt rainbow/dictionary attacks | Attacker gains nothing — commitment is irreversible (2¹²⁸ complexity) |

### 2. Replay Attacks

- Every login requires a **fresh nonce** (60-second TTL)
- Nonces are cryptographically random and single-use
- Proof includes the nonce as a public signal — reusing an old proof with a new nonce will fail verification

### 3. Session Hijacking

- Sessions expire in **30 minutes** (vs hours/days for typical JWTs)
- MAT tokens expire in **5 minutes** and are single-use
- Session refresh re-validates before extending

### 4. Brute Force

- Rate limiting: **10 requests/minute** per IP on `/register` and `/login`
- ZKP proof generation takes 2–5 seconds — limits automated attempts

### 5. Man-in-the-Middle

- All API traffic over **HTTPS/TLS**
- Firestore uses **TLS 1.3**
- WebRTC uses **DTLS** for peer-to-peer key negotiation

### 6. Message Interception

- Chat messages encrypted with **Signal Protocol** (X3DH + Double Ratchet)
- Firestore stores only Base64 ciphertext — unreadable to server admins
- Audio/video encrypted with **DTLS-SRTP** — media never passes through server

---

## What Each Attacker Can See

| Attacker Position | Can See | Cannot See |
|-------------------|---------|------------|
| **Network sniffer** | Encrypted TLS packets | Any content |
| **Firebase admin** | Encrypted Base64 message blobs, SDP metadata | Plaintext messages, audio/video |
| **Backend admin** | Commitments, session IDs, nonces | Passwords, secrets, message content |
| **Stolen device** | Encrypted Isar DB, encrypted KeyStore | Plaintext without device PIN/biometric |

---

## Compliance

| Standard | Status |
|----------|--------|
| NIST SP 800-63B (Digital Identity) | ✅ Implemented |
| OWASP Top 10 | ✅ Addressed |
| RFC 5869 (HKDF) | ✅ Used for salt derivation |
| BIP-39 | ✅ Mnemonic generation |
