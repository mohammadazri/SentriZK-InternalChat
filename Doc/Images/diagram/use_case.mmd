---
config:
  theme: base
  themeVariables:
    primaryColor: '#ffffff'
    primaryTextColor: '#0f172a'
    primaryBorderColor: '#0f172a'
    lineColor: '#334155'
    secondaryColor: '#f1f5f9'
    tertiaryColor: '#e2e8f0'
  layout: elk
---
graph TB
    classDef actorStyle fill:#ffffff,stroke:#0f172a,stroke-width:2px,color:#0f172a;
    classDef sysStyle fill:#e2e8f0,stroke:#0f172a,stroke-width:2px,stroke-dasharray: 5 5,color:#0f172a;
    classDef ucStyle fill:#ffffff,stroke:#3b82f6,stroke-width:2px,color:#0f172a,rx:10,ry:10;
    subgraph Local_Context [Local Environment]
        direction LR
        UserM("fa:fa-mobile Mobile User"):::actorStyle
        LocalStorage("Local Device DB<br/>(Hive/KeyStore)"):::sysStyle
    end
    style Local_Context fill:none,stroke:none
    subgraph System_Boundary [SentriZK Application Scope]
        direction LR
        subgraph Pkg_Auth [Authentication]
            direction TB
            UC_Reg(["Register Identity"]):::ucStyle
            UC_Log(["Login (ZKP)"]):::ucStyle
            UC_GenProof(["Generate ZK Proof"]):::ucStyle
        end
        style Pkg_Auth fill:#f1f5f9,stroke:#cbd5e1,stroke-dasharray: 5 5
        subgraph Pkg_AI [Threat Intelligence]
            direction TB
            UC_Scan(["Scan Content (AI)"]):::ucStyle
            UC_Anom(["Monitor Behavior"]):::ucStyle
        end
        style Pkg_AI fill:#f1f5f9,stroke:#cbd5e1,stroke-dasharray: 5 5
        subgraph Pkg_Msg [Secure Messaging]
            direction TB
            UC_Send(["Send Message"]):::ucStyle
            UC_Sync(["Sync/Receive Msg"]):::ucStyle
            UC_Encrypt(["Encrypt/Decrypt"]):::ucStyle
        end
        style Pkg_Msg fill:#f1f5f9,stroke:#cbd5e1,stroke-dasharray: 5 5

    end
    style System_Boundary fill:#ffffff,stroke:#0f172a,stroke-width:3px
    subgraph Remote_Context [Remote Infrastructure]
        direction LR
        Verifier("Backend API<br/>(Verifier Only)"):::sysStyle
        Firebase("Firebase<br/>(Temp Signaling)"):::sysStyle
    end
    style Remote_Context fill:none,stroke:none
    UserM --> UC_Log
    UserM --> UC_Reg
    UserM --> UC_Send
    UserM --> UC_Sync
    UserM -.->|Triggers| UC_Anom
    UC_Log -.->|<< include >>| UC_GenProof
    UC_Send -.->|<< include >>| UC_Scan
    UC_Send -.->|<< include >>| UC_Encrypt
    UC_Sync -.->|<< include >>| UC_Encrypt
    UC_Sync -->|Save History| LocalStorage
    UC_GenProof -->|Verify Math| Verifier
    UC_Reg -->|Commit Identity| Verifier
    UC_Anom -->|Report Threats| Verifier
    
    UC_Send -->|Push Encrypted Blob| Firebase
    UC_Sync -->|Fetch New Msgs| Firebase