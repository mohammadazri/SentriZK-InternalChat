# 📚 SentriZK Documentation

Welcome to the SentriZK documentation. This index links to every doc in the project organized by component.

---

## 🏗️ Architecture

High-level system design and cross-cutting concerns.

| Document | Description |
|----------|-------------|
| [System Overview](architecture/system_overview.md) | Component diagram, tech stack, data flow between Backend ↔ Web ↔ Mobile ↔ Firebase |
| [Authentication Flow](architecture/authentication_flow.md) | ZKP registration, login, MAT mobile-to-web bridge, nonce lifecycle |
| [Security Model](architecture/security_model.md) | Threat model, cryptographic protocols, defense strategies |

---

## ⚙️ Backend

Node.js server, API endpoints, and ZKP circuits.

| Document | Description |
|----------|-------------|
| [API Reference](backend/api_reference.md) | Complete REST API documentation with request/response examples |
| [Server Setup](backend/server_setup.md) | How to install, configure, and run the backend server |
| [ZKP Circuits](backend/zkp_circuits.md) | Circom circuit compilation, trusted setup, key generation |

---

## 🖥️ Frontend

### Web (Next.js)

| Document | Description |
|----------|-------------|
| [Web Application](frontend/web/web_app.md) | Next.js app structure, ZKP proof generation in-browser, wallet simulator |

### Mobile (Flutter)

| Document | Description |
|----------|-------------|
| [Mobile Application](frontend/mobile/mobile_app.md) | Flutter app architecture, screens, services, deep linking, secure storage |
| [E2EE Chat](frontend/mobile/e2ee_chat.md) | Signal Protocol (X3DH + Double Ratchet), key exchange, message encryption |
| [Audio & Video Calling](frontend/mobile/audio_video_calling.md) | WebRTC P2P calling, DTLS-SRTP encryption, Firestore signaling |

---

## 🛡️ Security

Threat detection and security infrastructure.

| Document | Description |
|----------|-------------|
| [Phishing Detection](security/phishing_detection.md) | On-device ML phishing detection, TFLite model, URL analysis pipeline |
| [Google Safe Browsing](security/google_safe_browsing.md) | Safe Browsing API integration and lookup service |
| [Security Caching](security/security_caching.md) | Isar-based scan result caching for performance |

---

## 🤖 Machine Learning

| Document | Description |
|----------|-------------|
| [Model Training](ml/model_training.md) | Python training pipeline, TFLite conversion, dataset preparation |

---

## 📖 Guides

Developer onboarding and deployment.

| Document | Description |
|----------|-------------|
| [Quick Start](guides/quick_start.md) | Step-by-step setup for Backend, Web, and Mobile |
| [Deployment](guides/deployment.md) | Production builds, APK generation, server deployment |

---

## 🎓 Academic

| Folder | Contents |
|--------|----------|
| [Ideas/](academic/Ideas/) | Brainstorming and feature ideas |
| [Papers/](academic/Papers/) | Referenced academic papers |
| [Proposal/](academic/Proposal/) | FYP proposal documents |
| [Template/](academic/Template/) | Report templates |
| [Report/](academic/report/) | Final report drafts |
| [ThreatModel_Guide.md](academic/ThreatModel_Guide.md) | Threat modeling methodology guide |
