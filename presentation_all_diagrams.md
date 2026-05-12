# 🏛️ SentriZK Technical Architecture & System Diagrams
**Academic Defense Master Reference**

> *This document contains the highly technical, professional-grade diagrams detailing cryptographic flows, database architectures, and zero-knowledge proof implementations for the SentriZK infrastructure.*

---

## 1. Phishing Detection Architecture (WhatsApp Security Parity)
```mermaid
flowchart TD
    %% Styling
    classDef highThreat fill:#ffcccc,stroke:#cc0000,stroke-width:2px;
    classDef medThreat fill:#ffe6cc,stroke:#cc6600,stroke-width:2px;
    classDef lowThreat fill:#ffffcc,stroke:#cccc00,stroke-width:2px;
    classDef safe fill:#ccffcc,stroke:#00cc00,stroke-width:2px;
    classDef process fill:#e6f3ff,stroke:#0066cc,stroke-width:1px;

    Start([User Receives Message]) --> HasURL{Contains URL?}
    HasURL -->|No| EndSafe[Display Normal Message]:::safe
    HasURL -->|Yes| Extractor[URL Extractor Service]:::process
    
    Extractor --> PassiveCheck[Passive Security Checks]:::process
    
    PassiveCheck --> Check1[Homograph Detector]
    PassiveCheck --> Check2[Local Phishing DB]
    PassiveCheck --> Check3[HTTPS Validator]
    
    Check1 --> IsHomograph{Suspicious?}
    Check2 --> IsKnownPhish{Known Phishing?}
    Check3 --> IsHTTP{HTTP Only?}
    
    IsHomograph -->|Yes| Med[Medium Threat]:::medThreat
    IsHomograph -->|No| SafePass1[Pass]
    
    IsKnownPhish -->|Yes| High[High Threat]:::highThreat
    IsKnownPhish -->|No| SafePass2[Pass]
    
    IsHTTP -->|Yes| Low[Low Threat]:::lowThreat
    IsHTTP -->|No| SafePass3[Pass]

    Med --> UI_Med[Display Orange Badge]
    High --> UI_High[Display Red Badge]
    Low --> UI_Low[Display Yellow Badge]
    SafePass1 & SafePass2 & SafePass3 --> UI_Safe[Display Normal Link]
    
    UI_Med & UI_High & UI_Low & UI_Safe --> UserTap[User Taps Link]
    
    UserTap --> AssessLevel{Assess Threat Level}
    
    AssessLevel -->|HIGH| DialogDanger[Show Danger Dialog]:::highThreat
    AssessLevel -->|MEDIUM| DialogSusp[Show Suspicious Dialog]:::medThreat
    AssessLevel -->|LOW / NONE| ActiveCheck[Google Safe Browsing API]:::process
    
    ActiveCheck --> IsMalicious{Malicious?}
    IsMalicious -->|Yes| DialogDanger
    IsMalicious -->|No| OpenBrowser[Open in Browser]:::safe
    
    DialogDanger --> UserChoice1{Proceed?}
    DialogSusp --> UserChoice2{Proceed?}
    
    UserChoice1 & UserChoice2 -->|Cancel| Abort[Block Access]
    UserChoice1 & UserChoice2 -->|Continue| OpenBrowser
```

---

## 2. Full System Architecture Overview

```mermaid
flowchart TB
    %% Styling
    classDef client fill:#e6f2ff,stroke:#0066cc,stroke-width:2px;
    classDef backend fill:#f9e6ff,stroke:#9900cc,stroke-width:2px;
    classDef db fill:#e6ffe6,stroke:#009933,stroke-width:2px;
    classDef thirdparty fill:#fff2e6,stroke:#cc6600,stroke-width:2px;

    subgraph MobileApp [Mobile App - Flutter]
        M_Auth[Authentication UI]
        M_Chat[E2EE Chat UI]
        M_Call[WebRTC Call UI]
    end
    
    subgraph WebPortal [Web Portal - Next.js]
        W_Auth[ZKP Auth Gateway]
        W_Admin[Admin Dashboard]
    end

    subgraph BackendAPI [API Gateway - Node.js]
        API_Auth[Auth & Session Service]
        API_Notif[Notification Service]
        API_Admin[Admin Service]
        API_Threat[Threat Logging Service]
    end

    subgraph ZKP_Core [Zero-Knowledge Proof Core]
        ZK_Circuits[Circom Circuits]
        ZK_Verifiers[Groth16 Verifiers]
    end

    subgraph ML_Core [On-Device ML]
        ML_Model[TFLite Conv1D Model]
    end

    subgraph Storage [Supabase - PostgreSQL]
        DB_Users[(Users & Auth)]
        DB_Sessions[(Sessions & MAT)]
        DB_Logs[(Threat Logs)]
    end

    subgraph CloudServices [Firebase Infrastructure]
        FB_Store[(Firestore Data)]
        FB_FCM[Cloud Messaging]
        FB_Auth[Custom Auth]
    end

    %% Connections
    MobileApp <-->|HTTPS REST| BackendAPI
    WebPortal <-->|HTTPS REST| BackendAPI
    
    BackendAPI <-->|Verifies Proofs| ZKP_Core
    MobileApp -->|Inference| ML_Core
    
    BackendAPI <-->|SQL Queries| Storage
    BackendAPI -->|Admin SDK| CloudServices
    
    MobileApp <-->|Real-time Sync| CloudServices
    
    class MobileApp,WebPortal client;
    class BackendAPI backend;
    class Storage db;
    class CloudServices,ZKP_Core,ML_Core thirdparty;
```

---

## 3. ZKP Registration Flow — Complete Technical Detail

```mermaid
sequenceDiagram
    autonumber
    participant MOB as Mobile App
    participant WEB as Web Client (ZKP)
    participant BAK as Auth Server
    participant DB as Database

    %% 1. Pre-Authentication Phase
    Note over MOB,DB: Phase 1: Device Verification & Browser Handoff
    MOB->>BAK: Request Mobile Access Token (MAT)
    BAK->>DB: Store MAT (5 min TTL)
    BAK-->>MOB: Return MAT
    MOB->>WEB: Launch Web Portal with MAT

    %% 2. Cryptographic Phase
    Note over WEB: Phase 2: Cryptographic Identity Generation
    WEB->>BAK: Validate MAT (Single-use)
    WEB->>WEB: Generate BIP-39 Mnemonic & Salt
    WEB->>WEB: Derive Wallet Secret & Username Hash
    WEB->>WEB: Encrypt Salt (AES-256-GCM)

    %% 3. ZKP Proof Generation Phase
    Note over WEB: Phase 3: ZKP Proof Generation (Groth16)
    WEB->>WEB: Generate ZK Proof {secret, salt, hash}
    WEB->>BAK: Submit Registration Payload (Proof + Public Signals)

    %% 4. Backend Verification
    Note over BAK,DB: Phase 4: ZKP Verification & Token Issuance
    BAK->>BAK: Verify Groth16 Proof (snarkjs)
    BAK->>DB: Persist User Identity Commitment
    BAK->>DB: Generate Single-use Handshake Token
    BAK-->>WEB: Registration Success + Token

    %% 5. Secure Callback
    Note over MOB,BAK: Phase 5: Secure Callback & Session Binding
    WEB->>MOB: App Deep-link (Token, Encrypted Salt, Mnemonic)
    MOB->>BAK: Validate Token & Bind Device ID
    BAK->>DB: Confirm & Consume Handshake Token
    BAK-->>MOB: Return Valid Session ID
    MOB->>MOB: Securely Store Credentials Locally
    Note over MOB: ✅ Registration Complete
```

---

## 4. ZKP Login Flow — Complete Technical Detail

```mermaid
sequenceDiagram
    autonumber
    participant MOB as Mobile App
    participant WEB as Web Client (ZKP)
    participant BAK as Auth Server
    participant DB as Database
    participant FBA as Cloud Auth (Firebase)

    %% 1. Handshake & Pre-Flight
    Note over MOB,DB: Phase 1: Pre-flight & Challenge Initiation
    MOB->>BAK: Request Mobile Access Token (MAT)
    BAK-->>MOB: Return MAT
    MOB->>WEB: Launch Web Portal with MAT
    WEB->>BAK: Fetch User Identity Commitment
    BAK->>DB: Generate & Store Cryptographic Nonce
    BAK-->>WEB: Return Commitment + Nonce Challenge

    %% 2. ZKP Cryptographic Phase
    Note over WEB: Phase 2: Client-side Zero-Knowledge Proof Generation
    WEB->>WEB: Decrypt Local Salt & Derive Secrets
    WEB->>WEB: Compute Poseidon Hash
    WEB->>WEB: Generate Groth16 ZK Proof {secret, salt, hash, nonce}
    WEB->>BAK: Submit Proof + Public Signals

    %% 3. Server Verification
    Note over BAK,DB: Phase 3: Server Proof Verification
    BAK->>DB: Validate Nonce (Prevents Replay Attacks)
    BAK->>BAK: Verify ZK Proof & Commitment (snarkjs)
    BAK->>DB: Invalidate Nonce & Create User Session
    BAK->>DB: Generate Single-use Handshake Token
    BAK-->>WEB: Login Success + Token

    %% 4. App Callback & Service Binding
    Note over MOB,BAK: Phase 4: Device Callback & Cloud Auth Binding
    WEB->>MOB: App Deep-link (Token)
    MOB->>BAK: Validate Token & Bind Device ID
    BAK-->>MOB: Issue Primary Session ID
    MOB->>BAK: Request Cloud Auth Credential
    BAK->>FBA: Exchange Session for Custom Auth Token
    BAK-->>MOB: Return Auth Token
    MOB->>FBA: Authenticate Mobile Client
    Note over MOB: ✅ Authentication Complete (Chat Active)
```

---

## 5. Signal Protocol E2EE Messaging — Complete Technical Detail

```mermaid
sequenceDiagram
    autonumber
    participant ALICE as Alice (Sender)
    participant FS as Cloud Database
    participant BAK as Push Service
    participant BOB as Bob (Receiver)

    %% 1. Key Agreement
    Note over ALICE,BOB: Phase 1: X3DH Key Agreement (Initial Setup)
    ALICE->>FS: Publish Signal PreKey Bundle (Identity & One-Time Keys)
    BOB->>FS: Publish Signal PreKey Bundle (Identity & One-Time Keys)
    ALICE->>FS: Request Bob's PreKey Bundle
    FS-->>ALICE: Return Bob's Public Keys
    ALICE->>ALICE: Compute Master Secret (X3DH Key Derivation)

    %% 2. Outbound Encryption & Security
    Note over ALICE: Phase 2: Local Threat Scan & Message Encryption
    ALICE->>ALICE: On-Device ML Threat Scan (TFLite Conv1D)
    ALICE->>ALICE: Encrypt Message (Double Ratchet Algorithm)
    ALICE->>FS: Dispatch Ciphertext Payload

    %% 3. Push Notification
    Note over ALICE,BOB: Phase 3: Metadata Push Notification
    ALICE->>BAK: Trigger Push Notification
    BAK->>BOB: Send FCM Data Push (Metadata Only, No Content)

    %% 4. Inbound Decryption & Security
    Note over BOB: Phase 4: Synchronization, Decryption & Phishing Check
    BOB->>FS: Sync Incoming Encrypted Payload
    FS-->>BOB: Return Ciphertext
    BOB->>BOB: Establish Signal Session & Decrypt Payload
    BOB->>BOB: Multi-Layer Phishing Scan (Homograph, Local DB, Active Check)
    BOB->>BOB: Render Message & Threat UI Indicators

    %% 5. Forward Secrecy
    Note over ALICE,BOB: Phase 5: Forward Secrecy (Double Ratchet Advance)
    ALICE->>ALICE: Advance Chain Key & Delete Old Keys
    BOB->>BOB: Advance Chain Key & Delete Old Keys
```

---

## 6. WebRTC Audio/Video Call Flow — Complete Technical Detail

```mermaid
sequenceDiagram
    autonumber
    participant CALLER as Caller (Alice)
    participant FS as Signaling Server (Firestore)
    participant BAK as Push Notification (FCM)
    participant BOB as Receiver (Bob)

    %% 1. Call Initiation
    Note over CALLER,BOB: Phase 1: Call Initiation & Signaling
    CALLER->>CALLER: Access Local Media (Mic/Camera)
    CALLER->>CALLER: Create WebRTC PeerConnection & Offer
    CALLER->>FS: Publish Call Offer (SDP)
    
    %% 2. Notification
    CALLER->>BAK: Trigger Incoming Call Push
    BAK->>BOB: High-Priority FCM Wakeup (Ringing)
    
    %% 3. Acceptance
    Note over BOB: Phase 2: Call Acceptance
    BOB->>FS: Subscribe to Call Updates
    BOB->>BOB: Access Local Media (Mic/Camera)
    BOB->>BOB: Create PeerConnection & Generate Answer
    BOB->>FS: Publish Call Answer (SDP)
    
    %% 4. ICE Candidates
    Note over CALLER,BOB: Phase 3: ICE Candidate Exchange (P2P Routing)
    CALLER->>FS: Publish Caller ICE Candidates
    BOB->>FS: Publish Receiver ICE Candidates
    FS-->>BOB: Sync Caller Candidates
    FS-->>CALLER: Sync Receiver Candidates & Answer
    
    %% 5. Connection
    Note over CALLER,BOB: Phase 4: Direct P2P Media Stream
    CALLER->>CALLER: Establish P2P Connection
    BOB->>BOB: Establish P2P Connection
    CALLER<-->BOB: Encrypted Audio/Video Stream (SRTP)
    
    %% 6. Termination
    CALLER->>FS: Update Call Status to Ended
    FS-->>BOB: Sync Termination Event
    CALLER->>CALLER: Close PeerConnection
    BOB->>BOB: Close PeerConnection
```

---

## 7. Firebase Architecture — Complete Data Model

```mermaid
erDiagram
    USERS ||--o{ CHATS : "participates in"
    USERS ||--o{ SIGNALS : "owns prekeys"
    USERS ||--o{ FCM_TOKENS : "registers"
    CHATS ||--o{ MESSAGES : "contains"
    USERS ||--o{ CALLS : "initiates/receives"
    CALLS ||--o{ ICE_CANDIDATES : "exchanges"

    USERS {
        string username PK
        string displayName
        string accountStatus
        timestamp updatedAt
    }
    
    SIGNALS {
        string username PK
        int registrationId
        string identityKey
        array preKeys
    }
    
    CHATS {
        string chatId PK
        array participants
        timestamp lastMessageTime
    }
    
    MESSAGES {
        string msgId PK
        string senderId
        int type
        string ciphertext
        timestamp timestamp
    }
    
    CALLS {
        string callId PK
        string callerId
        string receiverId
        string status
    }
    
    ICE_CANDIDATES {
        string candidateId PK
        string senderId
        object candidate
    }
```

---

## 8. TFLite ML Threat Detection Pipeline

```mermaid
flowchart TD
    classDef process fill:#e6f3ff,stroke:#0066cc,stroke-width:1px;
    classDef decision fill:#fff2e6,stroke:#cc6600,stroke-width:1px;
    classDef danger fill:#ffcccc,stroke:#cc0000,stroke-width:2px;
    classDef safe fill:#ccffcc,stroke:#00cc00,stroke-width:2px;

    Start([User Types Message]) --> LengthCheck{Length >= 4 words?}:::decision
    
    LengthCheck -->|No| Skip[Skip Scan & Send Normally]:::safe
    LengthCheck -->|Yes| Tokenize[Text Tokenization & Padding]:::process
    
    Tokenize --> Inference[TFLite Conv1D Inference]:::process
    
    Inference --> Score[Threat Score: 0.0 to 1.0]
    
    Score --> ThresholdCheck{Score > 0.65?}:::decision
    
    ThresholdCheck -->|No| SafeUI[Display Normal UI]:::safe
    ThresholdCheck -->|Yes| ThreatUI[Display Threat Indicator UI]:::danger
    
    ThreatUI --> ReportAPI[Report to Backend API]:::process
    ReportAPI --> StoreDB[(Store in Threat Logs DB)]
    
    StoreDB --> AdminSSE[Broadcast via SSE to Admin]:::process
    
    AdminSSE --> AdminReview{Admin Review Action}:::decision
    
    AdminReview -->|False Positive| Dismiss[Dismiss Alert]:::safe
    AdminReview -->|True Positive| MarkTP[Flag User Account]:::danger
    AdminReview -->|Severe| Suspend[Suspend User Access]:::danger
```

---

## 9. Admin Panel — Complete Feature Map

```mermaid
flowchart LR
    classDef process fill:#e6f3ff,stroke:#0066cc,stroke-width:1px;
    classDef db fill:#e6ffe6,stroke:#009933,stroke-width:1px;

    Admin([Admin User]) --> Login[Secure Login Gateway]
    Login -->|JWT Issued| Dashboard[Admin Dashboard]
    
    Dashboard --> SSE[Live SSE Stream]:::process
    SSE -.->|Real-time Events| Dashboard
    
    Dashboard --> UserMgmt[User Management Module]
    Dashboard --> ThreatMgmt[Threat Operations Module]
    
    UserMgmt --> QueryUsers[(Fetch Users)]:::db
    UserMgmt --> ActionHold[Hold Account]:::process
    UserMgmt --> ActionRestore[Restore Account]:::process
    UserMgmt --> ActionRevoke[Revoke Account / Wipe Data]:::process
    
    ThreatMgmt --> QueryThreats[(Fetch Threat Logs)]:::db
    ThreatMgmt --> UpdateThreat[Update Threat Status]:::process
    ThreatMgmt --> DeleteThreat[Delete Threat Log]:::process
    
    ActionHold & ActionRestore & ActionRevoke --> SyncFirebase[(Sync to Cloud Auth)]:::db
```

---

## 10. Session Lifecycle & Security

```mermaid
stateDiagram-v2
    [*] --> Unauthenticated
    
    Unauthenticated --> HandshakeInitiated : Request Login/Registration
    HandshakeInitiated --> ZKP_Validation : Browser Launched (MAT)
    ZKP_Validation --> ProofVerified : Groth16 Proof Submitted
    ProofVerified --> ActiveSession : Token Binding
    
    state ActiveSession {
        [*] --> Validated
        Validated --> FirebaseLinked : Link Auth Token
        FirebaseLinked --> Rotated : Pre-Expiry Refresh
        Rotated --> Validated
    }
    
    ActiveSession --> Expired : TTL > 30 mins
    Expired --> Unauthenticated : GC Collection
    
    ActiveSession --> Terminated : Explicit Logout
    ActiveSession --> Suspended : Admin Hold
    ActiveSession --> Revoked : Admin Revoke
    
    Suspended --> ActiveSession : Admin Restore
    Terminated --> Unauthenticated
    Revoked --> [*] : Permanent Deletion
```

---

## 11. Detailed Cryptographic Stack Flow

```mermaid
flowchart TD
    classDef input fill:#e6f2ff,stroke:#0066cc,stroke-width:2px;
    classDef process fill:#f9e6ff,stroke:#9900cc,stroke-width:2px;
    classDef key fill:#e6ffe6,stroke:#009933,stroke-width:2px;
    classDef storage fill:#fff2e6,stroke:#cc6600,stroke-width:2px;

    subgraph Key_Derivation [Identity & Key Derivation]
        PW([User Password]):::input
        BIP39([24-Word Mnemonic]):::input
        
        BIP39 -->|PBKDF2 HMAC-SHA512| Seed[512-bit Seed]:::process
        Seed -->|HKDF| Salt[128-bit ZKP Salt]:::key
        Seed -->|HKDF| WalletSecret[256-bit Wallet Secret]:::key
        
        PW -->|Scrypt / PBKDF2| AESKey[AES-256-GCM Key]:::key
    end

    subgraph ZKP_Auth [ZKP Commitment Generation]
        Uname([Username]):::input
        Uname -->|Keccak-256| UnameHash[Username Hash]:::process
        
        Salt & WalletSecret & UnameHash -->|Poseidon Hash| Commitment[Cryptographic Commitment]:::key
        Salt & WalletSecret & UnameHash & Nonce([Server Nonce]):::input --> Groth16[Groth16 Prover]:::process
        Groth16 --> ZKProof[zk-SNARK Proof]:::key
    end

    subgraph Transport_Encryption [E2EE Messaging - Signal Protocol]
        PreKeys([Pre-Key Bundle]):::input
        PreKeys -->|X3DH Agreement| MasterSecret[Master Shared Secret]:::key
        MasterSecret --> KDF_Ratchet[Double Ratchet HKDF]:::process
        KDF_Ratchet --> MsgKey[Message Key AES-256-GCM]:::key
    end

    subgraph Secure_Storage [Local Persistence]
        AESKey -->|Encrypts| SaltEncrypted[(Encrypted Salt)]:::storage
        AESKey -->|Encrypts| IsarDB[(Isar E2EE Message DB)]:::storage
        SaltEncrypted --> AndroidKS[(Android Keystore)]:::storage
    end
```

---
---

## 12. Activity Diagram: Secure User Onboarding & Key Generation

```mermaid
flowchart TD
    classDef mobile fill:#e6f2ff,stroke:#0066cc,stroke-width:2px;
    classDef web fill:#f9e6ff,stroke:#9900cc,stroke-width:2px;
    classDef server fill:#e6ffe6,stroke:#009933,stroke-width:2px;
    classDef db fill:#fff2e6,stroke:#cc6600,stroke-width:2px;

    Start([Open App]) --> ReqMAT[Request Mobile Access Token]:::mobile
    ReqMAT --> GenMAT[Backend Generates MAT]:::server
    GenMAT --> LaunchWeb[Launch Web Portal via URL]:::mobile
    
    LaunchWeb --> EnterCreds[User Enters Credentials]:::web
    EnterCreds --> GenMnemonic[Generate BIP-39 Mnemonic]:::web
    GenMnemonic --> DeriveKeys[Derive Wallet Secret & Salt]:::web
    DeriveKeys --> GenZKP[Generate ZK Proof in Browser]:::web
    
    GenZKP --> Submit[Submit Proof to Backend]:::web
    Submit --> Verify[Verify Proof]:::server
    
    Verify -->|Invalid| Error[Show Error]:::web
    Verify -->|Valid| StoreDB[(Store Commitment in DB)]:::db
    
    StoreDB --> GenHandshake[Generate Handshake Token]:::server
    GenHandshake --> DeepLink[Trigger App Deep-link]:::web
    
    DeepLink --> Intercept[Mobile Intercepts Link]:::mobile
    Intercept --> ValidateToken[Validate Token w/ Backend]:::mobile
    ValidateToken --> CreateSession[Issue Primary Session ID]:::server
    
    CreateSession --> StoreLocal[(Store AES Salt in Keystore)]:::mobile
    StoreLocal --> DisplayMnemonic[Display 24-word Mnemonic Once]:::mobile
    DisplayMnemonic --> Finish([Registration Complete])
```

---

## 13. Activity Diagram: Real-Time Chat & Offline Synchronization

```mermaid
flowchart TD
    classDef ui fill:#e6f2ff,stroke:#0066cc,stroke-width:2px;
    classDef process fill:#f9e6ff,stroke:#9900cc,stroke-width:2px;
    classDef security fill:#fff2e6,stroke:#cc6600,stroke-width:2px;
    classDef remote fill:#e6ffe6,stroke:#009933,stroke-width:2px;

    Start([User Taps Send]) --> Valid{Text > 0?}
    Valid -->|No| End([Ignore])
    Valid -->|Yes| LocalSave[(Save Pending to Isar DB)]:::ui
    
    LocalSave --> TFLite[ML Threat Scan]:::security
    TFLite --> Threat{Score > 0.65?}
    
    Threat -->|Yes| Flag[Flag Message & Alert Admin]:::process
    Threat -->|No| Encrypt[Double Ratchet Encryption]:::security
    Flag --> Encrypt
    
    Encrypt --> Network{Online?}
    
    Network -->|No| Queue[(Queue in Local Isar Sync Pool)]:::ui
    Network -->|Yes| PushFirestore[Upload to Firestore]:::remote
    
    Queue --> AwaitNetwork[Wait for Network Restore]:::process
    AwaitNetwork --> PushFirestore
    
    PushFirestore --> UpdateUI[Mark as Sent in UI]:::ui
    PushFirestore --> TriggerFCM[Trigger FCM Push to Receiver]:::remote
    UpdateUI --> EndSent([Message Delivered])
```

---

## 14. Component Diagram: Flutter Mobile Application

```mermaid
flowchart TB
    classDef ui fill:#e6f2ff,stroke:#0066cc,stroke-width:2px;
    classDef provider fill:#f9e6ff,stroke:#9900cc,stroke-width:2px;
    classDef service fill:#e6ffe6,stroke:#009933,stroke-width:2px;
    classDef storage fill:#fff2e6,stroke:#cc6600,stroke-width:2px;

    subgraph UI_Layer [Presentation Layer - Widgets & Screens]
        AuthScreen:::ui
        ChatScreen:::ui
        CallScreen:::ui
    end

    subgraph State_Layer [State Management - Providers]
        AuthProvider:::provider
        ChatProvider:::provider
        CallProvider:::provider
    end

    subgraph Service_Layer [Business Logic - Services]
        AuthService:::service
        SignalManager:::service
        CallService:::service
        MLThreatService:::service
    end

    subgraph Storage_Layer [Data & Persistence]
        IsarDB[(Isar Local DB)]:::storage
        SecureStore[(Secure Keystore)]:::storage
        FirebaseSDK[Firebase/Firestore SDK]:::storage
        HttpClients[HTTP / REST API]:::storage
    end

    AuthScreen --> AuthProvider
    ChatScreen --> ChatProvider
    CallScreen --> CallProvider

    AuthProvider --> AuthService
    ChatProvider --> SignalManager
    ChatProvider --> MLThreatService
    CallProvider --> CallService

    AuthService --> HttpClients
    AuthService --> SecureStore
    SignalManager --> IsarDB
    SignalManager --> FirebaseSDK
    CallService --> FirebaseSDK
```

---

## 15. Deployment & Infrastructure Architecture

```mermaid
flowchart LR
    classDef client fill:#e6f2ff,stroke:#0066cc,stroke-width:2px;
    classDef web fill:#f9e6ff,stroke:#9900cc,stroke-width:2px;
    classDef backend fill:#e6ffe6,stroke:#009933,stroke-width:2px;
    classDef db fill:#fff2e6,stroke:#cc6600,stroke-width:2px;

    subgraph End_Users [Client Devices]
        Android[Android Devices]:::client
    end

    subgraph Edge_Hosting [Vercel Edge Network]
        NextJS[Next.js Web Portal]:::web
        AdminUI[Admin Dashboard]:::web
    end

    subgraph Cloud_Backend [Node.js Environment]
        API[Express API Gateway]:::backend
        SnarkJS[ZKP Verification Engine]:::backend
    end

    subgraph DB_Infrastructure [Database Layer]
        Supabase[(Supabase PostgreSQL)]:::db
        Firestore[(Firebase Firestore)]:::db
    end

    Android -->|ZKP Setup| NextJS
    Android -->|Auth REST| API
    Android -->|Real-time Sync| Firestore
    
    NextJS -->|REST Auth/Admin| API
    
    API -->|Verify Proof| SnarkJS
    API -->|SQL Queries| Supabase
    API -->|FCM / Auth Config| Firestore
```

---
