# SentriZK Encryption Architecture: Technical Defense

This document details the cryptographic security models implemented in the SentriZK mobile application. The system guarantees **End-to-End Encryption (E2EE)** for both text messaging and real-time audio/video calls.

Crucially, the architecture uses different, specialized cryptographic protocols for text versus media streaming.

---

## Part 1: Text Messaging Encryption (Signal Protocol)
**Implementation Location:** [Frontend/mobile/lib/services/signal/signal_manager.dart](file:///c:/FYP_BCSS/SentriZK-InternalChat/Frontend/mobile/lib/services/signal/signal_manager.dart)

To secure internal corporate chats, SentriZK operates on the **Signal Protocol** (the exact same cryptographic protocol powering WhatsApp and Signal). 

### 1.1 Core Cryptographic Properties
By implementing `libsignal_protocol_dart`, the system achieves three major security milestones:
1.  **Perfect Forward Secrecy (PFS):** Keys are rotated constantly. If an attacker somehow compromises a user's device and steals their long-term identity key, the attacker *still cannot decrypt past messages* that were intercepted on the network.
2.  **Cryptographic Deniability:** The mathematics guarantee that a message was sent by a specific user to the recipient, but it is mathematically impossible to prove to a third-party judge that the specific user authored the message.
3.  **The Double Ratchet Algorithm:** Every single message sent generates a completely unique encryption key. 

### 1.2 Key Management & Storage
The Signal protocol is highly stateful. 
*   **Local Storage:** The cryptographic state machine (Identity Keys, Pre-Keys, Session Ratchets) is saved strictly on the physical device utilizing the **Isar Database** (`lib/models/signal_state.dart`).
*   **The Key Server:** Firebase Firestore acts purely as a public key distribution center (`users/{userId}/signalBundle`). It holds the public X25519 keys but never the private keys.

### 1.3 How a Message is Encrypted Intentionally
1.  User A wants to message User B.
2.  User A's device downloads User B's public `signalBundle` from Firestore.
3.  User A's device mathematically computes a Shared Secret using **X3DH (Extended Triple Diffie-Hellman)**.
4.  User A's `SignalManager` encrypts the plaintext using the current Session Cipher.
5.  What gets uploaded to the `chats/` collection in Firebase is a completely unreadable Base64 ciphertext. Neither Google (Firebase host) nor the sysadmin can read it.

---

## Part 2: Audio/Video Calling Encryption (WebRTC DTLS-SRTP)
**Implementation Location:** [Frontend/mobile/lib/services/call_service.dart](file:///c:/FYP_BCSS/SentriZK-InternalChat/Frontend/mobile/lib/services/call_service.dart)

While the Signal Protocol secures text, video and audio streams require an entirely different approach due to latency and data volume. SentriZK utilizes **WebRTC** with **DTLS-SRTP** for Peer-to-Peer (P2P) calling.

### 2.1 The Architectural Decision (Why not Signal?)
An important FYP defense point: *Why doesn't the app use the Signal Double Ratchet to encrypt the call?*
*   **Ratchet Desync:** A single call setup requires sending 15–25 network metadata packets (SDP and ICE Candidates). If these were encrypted using the Chat Ratchet, and a single packet dropped over a weak 4G connection, the entire cryptographic state would desynchronize, permanently breaking future text messages.
*   **Industry Standard:** This split-architecture perfectly mirrors WhatsApp and Signal, which also use WebRTC for calls without wrapping network metadata in the text ratchet.

### 2.2 How Calls are Secured (DTLS-SRTP)
WebRTC intrinsically guarantees End-to-End Encryption at the network layer:

1.  **Signaling Phase (TLS 1.3):** The two mobile phones use Firestore as a signaling server merely to find each other on the internet. They exchange SDP (Session Description Protocol) and ICE Candidates. This data contains public IP addresses and codec specs, but *no media payload*.
2.  **DTLS Handshake:** Once the phones find each other, they execute a **Datagram Transport Layer Security (DTLS)** handshake directly with each other (Peer-to-Peer). They negotiate a symmetric encryption key. The server is completely bypassed in this step.
3.  **SRTP Encryption:** All audio and video frames are encrypted using the **Secure Real-time Transport Protocol (SRTP)** using the key negotiated in step 2. 

### 2.3 The Security Guarantee
Because the DTLS exchange happens exclusively between the two mobile clients, the Firebase intermediate server has absolutely zero access to the cryptographic keys. Even if the backend server was completely compromised by a malicious insider, they could only see that a call occurred (metadata/duration), but intercepting the audio/video payload is mathematically impossible.
