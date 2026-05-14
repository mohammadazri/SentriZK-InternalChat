# SentriZK Release Notes - v1.0.7+8

## 🚀 New Features

### 💬 Chat Management
- **Delete Chat Threads**: You can now long-press on any chat in the main list to delete the entire conversation locally. This also clears any saved drafts for that user.
- **Copy Messages**: Long-press any message within a 1-on-1 chat to copy its content to your clipboard for quick sharing.

### 🛡️ Edge AI Threat Detection
- **Real-time Scanning**: Integrated a local TensorFlow Lite model to scan outgoing messages for potential threats (phishing, social engineering, etc.).
- **Smart Thresholds**: Messages are analyzed with a threat score. If a received message exceeds the safety threshold (65%), the receiver is immediately warned with a security alert.
- **Privacy First**: All scanning happens locally on the device. Your messages are never sent to an external AI for analysis.

### 🔐 Security & Auth
- **Zero-Knowledge Proofs (ZKP)**: Enhanced the login and registration flows using ZK-SNARKs to prove identity without transmitting passwords.
- **Encrypted Local Storage**: Sensitive data like salts are stored using device-level encryption.

## 🛠️ Improvements & Fixes
- **Streamlined Recovery**: Optimized the account recovery process to reduce friction when returning to the app from the web portal.
- **UI/UX Polishing**: Updated the main landing and auth screens with a premium dark-mode aesthetic and smoother animations.
- **Performance**: Reduced main-thread overhead during background message processing.

---
*Built with Flutter & ZK-SNARKs for the SentriZK Internal Chat Project.*
