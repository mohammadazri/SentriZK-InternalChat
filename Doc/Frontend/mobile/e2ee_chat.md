# 📱 E2EE Chat — Signal Protocol Implementation

End-to-End Encryption for the SentriZK Flutter mobile chat using the Signal Protocol.

---

## Overview

SentriZK uses the **Signal Protocol** (the same cryptographic protocol used by WhatsApp and Signal) to provide:

- **Perfect Forward Secrecy (PFS)**: Compromised long-term key cannot decrypt past messages
- **Cryptographic Deniability**: Cannot prove a specific person sent a message
- **Key Ratcheting**: Unique encryption key per message

The implementation relies on `libsignal_protocol_dart`.

---

## Core Components

### `SignalManager` (`lib/services/signal/signal_manager.dart`)

Central singleton orchestrating all cryptographic operations:

| Method | Purpose |
|--------|---------|
| `generatePreKeyBundle()` | Generates X25519 Identity Key, Signed Pre-Key, and One-Time Pre-Keys |
| `establishSession()` | Fetches remote user's Pre-Key bundle from Firestore and computes shared secret via X3DH |
| `encryptMessage()` | Encrypts plaintext using the current ratcheted `SessionCipher` |
| `decryptMessage()` | Decrypts Base64 ciphertext and ratchets session state forward |

### `IsarSignalStore` (`lib/services/signal/signal_store_impl.dart`)

The Signal protocol is **stateful** — every message alters the cryptographic state. This state must survive app restarts. Uses **Isar Database** to store:

- `IdentityKeyStore` — long-term identity keys
- `PreKeyStore` — one-time pre-keys
- `SignedPreKeyStore` — signed pre-keys
- `SessionStore` — active session ratchet states

Schemas defined in `lib/models/signal_state.dart`.

---

## Message Flow

### Sending a Message (User A → User B)

```
1. ChatService fetches User B's signalBundle from Firestore
2. SignalManager.establishSession() creates or loads the Double Ratchet session
3. SignalManager.encryptMessage() produces Base64 CiphertextMessage
4. Ciphertext + signalType (3=PreKey, 1=Whisper) saved to Firestore
```

### Receiving a Message

```
1. Firestore stream pushes new message to User B
2. ChatService checks signalType field
3. If Signal message → SignalManager.decryptMessage() decodes ciphertext
4. If decryption fails → UI shows "🔒 [Decryption Failed]"
```

### Key Registration (on login/signup)

```
1. SignalManager generates a fresh Pre-Key Bundle
2. Bundle (public Base64-encoded X25519 keys) is stored in Firestore users/{userId}/signalBundle
3. Firestore acts as the Key Server
```

---

## Firestore Data Structure

```
users/{userId}
  ├── signalBundle          # Public key bundle (identity, signed pre-key, one-time pre-keys)
  ├── displayName, username, etc.

chats/{pairId}/messages/{messageId}
  ├── content               # Base64 ciphertext (unreadable without recipient's private keys)
  ├── signalType            # 3 = PreKeyWhisperMessage, 1 = WhisperMessage
  ├── senderId
  └── timestamp
```

> **Important**: If you open Firebase Console and look at `chats/{pairId}/messages/`, the `content` field is unreadable Base64. Neither the database admin nor Google can decrypt it without physical access to the recipient's Isar database on their device.

---

## Troubleshooting

### Decryption Failures (`[Decryption Failed]`)

**Cause**: Isar local database state was cleared while Firestore still has the old `signalBundle`.

**Fix**:
1. Delete local emulator app storage (clears Isar)
2. Delete the `users/{userId}` document in Firestore
3. Force a fresh registration and Pre-Key generation

### Session Reset

If two users get persistent decryption failures, both must:
1. Clear their local app data
2. Delete their Firestore `signalBundle`
3. Re-login (triggers fresh key generation)
