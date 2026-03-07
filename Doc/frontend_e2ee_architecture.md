# SentriZK Frontend E2EE Architecture (WhatsApp-Style)

This document outlines the architecture and implementation details for the End-to-End Encryption (E2EE) messaging system in the SentriZK Flutter application.

## Overview
SentriZK uses the **Signal Protocol** (specifically the **Double Ratchet Algorithm** and **Extended Triple Diffie-Hellman (X3DH)**) to provide state-of-the-art E2EE. This is the exact same cryptographic protocol used by WhatsApp and Signal.

By using this protocol, we guarantee **Perfect Forward Secrecy (PFS)** and **Cryptographic Deniability**. If a device's long-term private key is ever compromised, past messages remain securely encrypted.

The core implementation relies on the `libsignal_protocol_dart` package.

---

## 1. Core Components

### `SignalManager` (`lib/services/signal/signal_manager.dart`)
This is the central singleton orchestrating all cryptographic operations.
- **`generatePreKeyBundle()`**: Generates the X25519 Identity Key, Signed Pre-Key, and One-Time Pre-Keys for a new device registration.
- **`establishSession()`**: Fetches a remote user's Pre-Key bundle from Firestore and computes the initial shared secret using X3DH.
- **`encryptMessage()`**: Takes plaintext and encrypts it using the current ratcheted `SessionCipher`.
- **`decryptMessage()`**: Takes Base64 ciphertext, decrypts it, and automatically ratchets the session state forward.

### `IsarSignalStore` (`lib/services/signal/signal_store_impl.dart`)
The Signal protocol is inherently **stateful**. Every sent or received message alters the cryptographic state (ratcheting the keys forward).
This state *must* survive app restarts. We use the **Isar Database** to persistently store:
- `IdentityKeyStore`
- `PreKeyStore`
- `SignedPreKeyStore`
- `SessionStore`

The Isar schemas are defined in `lib/models/signal_state.dart`.

---

## 2. Integration Flow

### A. User Registration & Key Upload (`UserService`)
When a user registers or logs in (`createOrUpdateUser`):
1. `SignalManager` generates a fresh Pre-Key Bundle.
2. The bundle (containing public Base64-encoded X25519 keys) is merged into the user's Firestore document (`users/{userId}`) under the `signalBundle` field.
3. Firestore acts as the **Key Server**.

### B. Sending a Message (`ChatService.sendMessage`)
When User A sends a message to User B:
1. `ChatService` fetches User B's `signalBundle` from Firestore.
2. `SignalManager.establishSession` establishes or loads the local Double Ratchet session for User B.
3. `SignalManager.encryptMessage` transforms the plaintext into a highly secure Base64 `CiphertextMessage`.
4. The ciphertext and a `signalType` (either `3` for PreKey messages or `1` for standard whisper messages) are saved to Firestore.

### C. Receiving a Message (`ChatService.getMessages`)
When the Firestore stream pushes a new message to User B:
1. `ChatService` inspects the `signalType` field.
2. If it is a Signal message, it passes the Base64 ciphertext to `SignalManager.decryptMessage()`.
3. The Decryption engine uses User B's local private keys mathematically derived by the Ratchet to decode the plaintext.
4. If decryption fails (e.g., Session states are out of sync between devices), the UI displays `🔒 [Decryption Failed]`.

### D. UI Indicators (`ChatScreen`)
The `ChatScreen` prominently displays a banner at the top of the conversation:
> 🔒 **Messages are End-to-End Encrypted. No one outside of this chat, not even SentriZK, can read them.**

This reassures users that their direct communications are secure.

---

## 3. How to Troubleshoot / Test

- **Decryption Failures (`[Decryption Failed]`)**: If you frequently encounter decryption failures during testing, it is likely because the Isar local database state was cleared while the remote Firestore still has the old `signalBundle`. 
  - To fix: Delete your local emulator app storage (clearing Isar) AND delete your corresponding `users/{userId}` document in Firestore to force a fresh Registration and Pre-Key generation.
- **Firestore Visibility**: If you open the Firebase Console and look at `chats/{userId}/messages`, the `content` field should be unreadable Base64 strings. Neither the Database Administrator nor Google can decrypt these without physical access to the user's mobile device Isar database.
