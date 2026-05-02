# 📚 SentriZK Documentation

> **Project**: SentriZK — Zero-Knowledge Authenticated Internal Chat with On-Device AI Threat Detection  
> **Author**: Mohammad Azri Bin Aziz · BCSS · 2024/2025  
> **Last Updated**: May 2026

---

## Documentation Map

### 🏗️ Architecture

| Document | Description |
|----------|-------------|
| [System Overview](./architecture/system_overview.md) | High-level architecture, component responsibilities, technology stack, and data flow summary |
| [Authentication Flow](./architecture/authentication_flow.md) | Detailed ZKP registration and login flow with sequence diagrams |
| [Security Model](./architecture/security_model.md) | Threat model, defense matrix, session lifecycle, and compliance |
| [Advanced Diagrams](./architecture/SentriZK_Advanced_Diagrams.md) | Complete Mermaid diagram suite — architecture, auth flows, Signal Protocol, WebRTC, Firebase, ML pipeline, admin panel |

### 🔌 API

| Document | Description |
|----------|-------------|
| [API Reference](./api/api_reference.md) | Complete REST API reference — 20 endpoints with request/response schemas, auth requirements, and error codes |

### 🔐 Security

| Document | Description |
|----------|-------------|
| [Cryptographic Stack](./security/cryptographic_stack.md) | Consolidated reference for all cryptographic protocols — ZKP, key derivation, encryption, secure storage |
| [Phishing Detection](./security/phishing_detection.md) | Multi-layer phishing and malicious URL detection architecture |
| [Google Safe Browsing](./security/google_safe_browsing.md) | Safe Browsing API integration for real-time URL scanning |
| [Security Caching](./security/security_caching.md) | URL scan result caching strategy (7-day TTL) |

### 🤖 Machine Learning

| Document | Description |
|----------|-------------|
| [Model Training Guide](./ml/model_training.md) | Dual-model training pipeline (Bi-LSTM + Conv1D), TFLite export, Flutter integration |

### 🧪 Testing

| Document | Description |
|----------|-------------|
| [Testing Overview](./testing/testing_overview.md) | CIA triad adversarial test suite — 18 tests across 4 categories |
| [Adversarial Testing Plan](./testing/Testing_plan.md) | Real-world attack scenarios using actual offensive tools |
| [Automated Testing Plan](./testing/automated_testing_plan.md) | Automated test execution via SSE-streaming dashboard |
| [Manual Testing Plan](./testing/manual_testing_plan.md) | Manual test procedures for device-dependent scenarios |

### 🗄️ Database

| Document | Description |
|----------|-------------|
| [Schema Reference](./database/schema_reference.md) | Supabase PostgreSQL tables + Firebase Firestore collections |

### 🚀 Deployment

| Document | Description |
|----------|-------------|
| [Deployment Guide](./deployment/deployment_guide.md) | Backend, web, and mobile deployment steps with environment variable reference |

### 📱 Frontend

| Document | Description |
|----------|-------------|
| [Web Application](./Frontend/web/web_app.md) | Next.js 15 web portal — registration, login, admin dashboard |
| [Mobile Application](./Frontend/mobile/mobile_app.md) | Flutter 3.8 mobile app — E2EE chat, calling, ML threat detection |

### 📊 Project Management

| Document | Description |
|----------|-------------|
| [Quick Setup Guide](../QUICK_SETUP_GUIDE.md) | Fast-track installation and configuration |
| [Troubleshooting](../error_fix/) | Common errors and fixes |

---

## Quick Links

| Resource | Location |
|----------|----------|
| Backend source | [`Backend/server.js`](../Backend/server.js) |
| ZKP circuits | [`Backend/circuits/`](../Backend/circuits/) |
| SQL schema | [`Backend/supabase_schema.sql`](../Backend/supabase_schema.sql) |
| Web frontend | [`Frontend/web/`](../Frontend/web/) |
| Mobile app | [`Frontend/mobile/`](../Frontend/mobile/) |
| ML pipeline | [`ML/sentrizk_master_trainer.py`](../ML/sentrizk_master_trainer.py) |
| Test runner | [`Testing/`](../Testing/) |
