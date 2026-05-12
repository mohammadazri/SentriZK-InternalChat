INTRODUCTION
Overview of the Project
SentriZK is a secure communication framework designed for Small and Medium Enterprises (SMEs). It enhances workplace messaging security by combining Zero-Knowledge Proofs (ZKP) for password-less authentication and on-device Artificial Intelligence (AI) for local threat detection, fully preserving user privacy and End-to-End Encryption (E2EE).

Problem Statement
Centralized Storage Vulnerability: Storing login credentials or hashes on central servers creates a single point of failure, leaving organizations vulnerable to devastating database breaches and session hijacking.
The E2EE "Blind Spot": While End-to-End Encryption secures data in transit, it prevents traditional server-side threat scanning. This allows malicious content and insider threats to spread completely undetected within private chats.

Objectives
To study existing authentication and anomaly detection methods in encrypted messaging systems to identify their security limitations.
To develop a secure internal chat application that integrates Zero-Knowledge Proof (ZKP) authentication and an on-device AI model for anomaly detection without breaking encryption.
To test and evaluate the system's functionality and security level, focusing on authentication latency, AI detection accuracy, and overall data privacy against simulated breaches.

Scope
Target User: Employees and IT Administrators in Small and Medium Enterprises (SMEs).
Application Platforms: Android mobile app (Flutter) and Web Admin Portal (Next.js).
Functional System:
- Password-less authentication via Groth16 Zero-Knowledge Proofs (ZKP) and Mobile Access Tokens (MAT).
- End-to-End Encrypted (E2EE) real-time messaging and WebRTC calling.
- Real-time, on-device AI threat detection using TensorFlow Lite.
Non-Functional System:
- Security & Privacy: No centralized passwords (Poseidon hashes), local AI inference preserving E2EE, and cryptographic nonces preventing replay attacks.
- Performance: ZKP proof generation in ~2s, server verification <50ms, and AI inference <100ms per message.
- Reliability: High-availability real-time sync via Firebase Firestore and Supabase PostgreSQL.


### Literature Review & System Comparison

| Focus Area | Cited References | Method / Technique Used | Existing System Limitations | SentriZK Implementation |
| :--- | :--- | :--- | :--- | :--- |
| **Secure Messaging** | Alatawi (2023);<br>Ilesanmi (2025) | Manual Key Ceremonies, Standard E2EE | Relies heavily on users for manual verification; endpoints remain completely blind to insider threats. | Integrates AI scanning locally *before* encryption, removing the E2EE "blind spot" automatically. |
| **Authentication** | Bhattacharya (2024);<br>Chen (2023) | zk-STARKs, Centralized Password Hashes | Centralized databases are single points of failure; STARKs are computationally too heavy for mobile. | Uses **Groth16 (zk-SNARKs)** for lightweight, password-less client-side proof generation to verify identity without transmitting secrets. |
| **Threat Detection** | Srinivasan (2025);<br>Natha (2022) | Cloud-based Deep Learning (Bi-LSTM) | High network latency; requires decrypting messages on external servers, violating user privacy. | **Edge AI Framework:** Analyzes data entirely on-device, ensuring raw messages never leave the phone. |
| **Mobile Security** | Gaurav (2025);<br>Bispo (2025) | Heavy Transformers (TinyBERT), URL Scanners | High battery drain on mobile; limited scope (often only scans URLs, missing behavioral context). | Employs optimized **TensorFlow Lite** for efficient, real-time behavioral and textual analysis. |

***




That is an excellent choice. "Scenario-Based Testing" sounds highly professional and perfectly describes the real-world attack simulations (like the database breach and MitM attacks) that you ran against SentriZK.

Here is the finalized text block with that updated approach, ready to be dropped into your poster:

---

### Results & Discussion

**Testing Methodology:** Scenario-Based Testing utilizing structured **Test Case Templates** to systematically validate system requirements.

| Testing Phase | Scope / Method | Key Results & Outcome |
| :--- | :--- | :--- |
| **Functional** | ZKP Auth, E2EE Messaging, AI Scans | **100% Pass Rate.** Core user journeys executed flawlessly. Edge AI inference < 100ms. |
| **Integration** | Mobile App ↔ Node Backend ↔ DB | **Seamless Data Flow.** MAT bridging and real-time signaling synchronization verified. |
| **Security (Static)**| Manual & Auto Code Review (Circom) | **Zero Critical Flaws.** Circuit constraints verified; cryptographic implementations sound. |
| **Security (Pen-Test)**| Manual/Auto Attack-based (MitM, DB Breach) | **0 Credentials Compromised.** 60s nonces blocked replays. Only irreversible hashes exposed. |

#### Summary of Results
Rigorous testing validates that SentriZK successfully resolves the conflict between user privacy and enterprise security. The **ZKP implementation** entirely eliminates server-side password vulnerabilities, while the **On-Device Edge AI** proactively mitigates insider threats (phishing/data exfiltration) without ever exposing plaintext. The system proves that high-grade, password-less security is highly performant and viable for SMEs on consumer-grade mobile devices.


***

### Conclusion
SentriZK successfully addresses the critical vulnerabilities found in modern enterprise messaging. By replacing centralized credential storage with **Zero-Knowledge Proofs (ZKP)**, the system mathematically eliminates the risk of password theft during database breaches. Furthermore, the integration of an **on-device AI framework** provides real-time insider threat detection without compromising End-to-End Encryption (E2EE) or violating user privacy laws. Ultimately, this project proves that enterprise-grade security and uncompromising data privacy can co-exist efficiently on standard mobile hardware.

### Recommendations & Future Enhancements
1. **Federated Learning Integration:** Implement a Federated Learning pipeline, allowing the local AI models on each device to collaboratively learn from new phishing trends and update the global model without ever transmitting private chat data to the server.
2. **Multimedia Threat Analysis:** Expand the TensorFlow Lite capabilities to scan incoming file attachments, malicious PDFs, and QR codes for embedded payloads, extending the security beyond text-based analysis.
3. **Biometric ZKP Binding:** Integrate mobile hardware biometrics (Fingerprint/FaceID) directly into the Groth16 proof generation circuit, creating a seamless, invisible layer of Multi-Factor Authentication (MFA) that requires no extra effort from the user.




Viewed temp_poster.md:63-79
Edited temp_poster.md

Here is the **Commercialization** section for your poster. Examiners love to see a clear target market, how the project saves money, and how it can make money.

***

### Commercialization Potential

**Target Market:** Small and Medium Enterprises (SMEs) in high-compliance sectors (e.g., Legal, Finance, Healthcare) that require enterprise-grade security without the budget for large IT security teams.

1. **Drastic Risk Mitigation (Value Protection):** By eliminating server-side passwords and actively blocking insider threats via Edge AI, SentriZK protects organizations from catastrophic data breaches and costly regulatory fines (e.g., PDPA, GDPR compliance).
2. **Reduced IT Overhead (Cost Savings):** The password-less Zero-Knowledge Proof (ZKP) architecture significantly reduces IT support costs by eliminating password resets, credential management, and the need for complex, centralized security audits.
3. **B2B SaaS Viability (Revenue Generation):** The platform is structurally primed for a Business-to-Business (B2B) Software-as-a-Service model. It can be commercialized through tiered monthly subscription plans based on organizational user count and access to advanced threat analytics on the Admin Dashboard.

