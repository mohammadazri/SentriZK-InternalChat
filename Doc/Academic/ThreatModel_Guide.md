# SentriZK: Advanced Threat Model & Project Architecture Guide

This document provides a comprehensive overview of the SentriZK project, its architectural flows, and a detailed breakdown of information required to construct an Advanced Threat Model Diagram.

---

## 1. Project Overview

**SentriZK** is a secure internal messaging platform designed for SMEs. It eliminates centralized credential storage vulnerabilities using **Zero-Knowledge Proofs (ZKP)** and employs **On-device AI** for continuous authentication and anomaly detection.

### Core Technologies
- **Frontend**: Flutter (Mobile), Next.js (Web for Auth)
- **Backend**: Node.js (Express), Circom (ZKP Circuits), SnarkJS
- **Database**: JSON/File-based (Prototype), Firestore (Chat Storage)
- **AI/ML**: TensorFlow Lite (Isolation Forest for anomaly detection)

---

## 2. System Architecture & Data Flows

To build an accurate Threat Model Diagram, you must map these flows.

### A. Authentication Flow (The "ZKP Handoff")
This is the most critical security boundary.

1.  **Mobile Initiation**: User requests login. Mobile App calls Backend to get a **Mobile Access Token (MAT)**.
2.  **Web Handoff**: Mobile App opens System Browser with `https://web-app/login?mat=...`.
3.  **ZKP Generation (Client-Side)**:
    - Web App fetches `salt` and `nonce` from Backend.
    - User inputs `password`.
    - Web App computes ZKP Proof (using `snarkjs` + `circomlib`).
    - **Crucial**: The `password` never leaves the browser memory.
4.  **Verification**: Web App sends `Proof` + `PublicSignals` to Backend.
5.  **Session Issue**: Backend verifies proof. If valid, issues `SessionToken`.
6.  **Return to Mobile**: Web App redirects to `sentrizk://auth?token=...`.

### B. Messaging Flow
1.  **Composition**: User types message.
2.  **AI Analysis**: Local TFLite model analyzes typing patterns/content.
    - *If Anomaly*: Block action / Flag account.
    - *If Safe*: Proceed.
3.  **Encryption**: Message is encrypted on-device.
4.  **Transmission**: Encrypted payload sent to Firebase/Firestore.

---

## 3. Threat Model Diagram Components

When creating your Advanced Threat Model Diagram (e.g., using Microsoft Threat Modeling Tool or OWASP Dragon), include the following elements:

### 3.1. Trust Boundaries
*Draw these as dotted red lines separating different zones.*

1.  **User Boundary**: Between the Human User and the Device (Mobile/Web).
2.  **Device Boundary**: Between the Mobile App/Browser and the Network (Internet).
3.  **Cloud Boundary**: Between the Internet and the Backend Infrastructure.
4.  **Database Boundary**: Between the Backend Server and the Storage (DB/Firestore).
5.  **Process Boundary (Local)**: Inside the device, between the App Logic and the TFLite Model (conceptually).

### 3.2. Assets (What we are protecting)
- **User Credentials**: The raw password/secret (High Value).
- **ZKP Private Inputs**: The generated witness for the proof.
- **Session Tokens**: JWTs used for API access.
- **Mobile Access Tokens (MAT)**: Temporary tokens for handoff.
- **Chat Messages**: Confidential business communications.
- **AI Model**: The integrity of the anomaly detection logic.

### 3.3. Threat Agents (Attackers)
- **External Attacker**: Man-in-the-Middle (MitM) on public Wi-Fi.
- **Malicious Insider**: Employee with DB access trying to reverse engineer passwords.
- **Compromised Device**: Malware on the user's phone.

---

## 4. Detailed Threat Analysis (STRIDE)

Use this table to populate the "Threats" section of your diagram.

| Category | Threat | Description | Mitigation in SentriZK |
| :--- | :--- | :--- | :--- |
| **Spoofing** | **Identity Theft** | Attacker tries to log in as another user. | **ZKP**: Attacker cannot generate a valid proof without the secret. <br> **Nonce**: Prevents replay attacks of old proofs. |
| **Tampering** | **Message Modification** | Attacker alters a message in transit. | **E2EE**: Messages are encrypted/signed (integrity checks). <br> **TLS**: Transport layer security. |
| **Repudiation** | **Denying Action** | User claims they didn't send a message. | **Digital Signatures**: (If implemented) bind messages to user keys. <br> **Immutable Logs**: Firestore audit trails. |
| **Info Disclosure** | **Credential Dump** | Attacker steals the database. | **ZKP Commitments**: DB only contains hashes (Poseidon). Mathematically impossible to reverse. |
| **Info Disclosure** | **Chat Leak** | Intercepting chat traffic. | **End-to-End Encryption**: Server/Network only sees encrypted blobs. |
| **Denial of Service** | **Proof Flooding** | Attacker spams complex ZKP verifications to exhaust server CPU. | **Rate Limiting**: Strict limits on `/login` and `/register`. <br> **MAT**: Requires valid token to even load the ZKP interface. |
| **Elevation of Privilege** | **Deep Link Hijack** | Malicious app intercepts the `sentrizk://` redirect to steal the session token. | **OS Checks**: Android App Links / iOS Universal Links (verify app ownership). <br> **Short-lived Tokens**: Stolen token has limited window. |

---

## 5. Advanced Threat Scenarios (For "Advanced" Diagram)

To make your diagram "Advanced," include these specific, complex attack vectors:

### A. The "MAT" Interception
- **Attack**: Attacker observes the URL `https://sentrizk.web/login?mat=XYZ`.
- **Vector**: Browser history, proxy logs, or shoulder surfing.
- **Mitigation**: MAT is single-use and has a very short TTL (5 mins).

### B. AI Model Evasion (Adversarial Attack)
- **Attack**: Malicious user slowly changes their typing behavior to "train" the local model to accept malicious patterns (if online learning exists) or mimics "normal" behavior to bypass checks.
- **Mitigation**: Model is pre-trained/frozen (no online learning on device). Anomaly threshold tuning.

### C. Side-Channel Attacks on Client
- **Attack**: Malware on the user's device monitors CPU/Power usage during ZKP generation to guess the secret.
- **Mitigation**: `circomlibjs` and WASM implementations are generally constant-time, but OS-level compromise is a residual risk.

---

## 6. Diagram Construction Steps

1.  **Draw the Entities**:
    - User (Human)
    - Mobile Device (Flutter App + Local DB + TFLite)
    - Web Browser (Next.js App + SnarkJS)
    - Backend Server (Node.js + SnarkJS Verifier)
    - Database (JSON/Firestore)
    - Firebase Services (FCM, Storage)

2.  **Draw the Data Flows**:
    - Connect entities with arrows indicating data movement (e.g., "HTTPS: Submit Proof", "Deep Link: Return Token").

3.  **Overlay Trust Boundaries**:
    - Draw the "Internet" box around the network flows.
    - Draw the "Secure Enclave" box around the Backend.

4.  **Annotate Threats**:
    - Place "MitM" icons on network lines.
    - Place "SQLi/Db Dump" icons on the Database.
    - Place "Malware" icons on the Mobile Device.

5.  **Link Mitigations**:
    - Label the Database with "ZKP Commitments Only".
    - Label the Network with "TLS + MAT".
    - Label the Login Flow with "Nonce + Rate Limit".
