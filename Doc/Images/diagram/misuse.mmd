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
    classDef attackerStyle fill:#fee2e2,stroke:#b91c1c,color:#7f1d1d,stroke-width:2px;
    classDef misuseStyle fill:#fef2f2,stroke:#ef4444,color:#b91c1c,stroke-width:2px,stroke-dasharray: 5 5,rx:10,ry:10;
    classDef usecaseStyle fill:#ffffff,stroke:#3b82f6,color:#0f172a,stroke-width:2px,rx:10,ry:10;
    classDef mitStyle fill:#dcfce7,stroke:#15803d,color:#14532d,stroke-width:2px,shape:rect;
    subgraph Threat_Agents [The Threat Landscape]
        direction LR
        Att_Bot("fa:fa-robot Botnet/Script"):::attackerStyle
        Att_Ext("fa:fa-user-secret External Hacker"):::attackerStyle
        Att_Ins("fa:fa-user-tie Malicious Insider"):::attackerStyle
    end
    style Threat_Agents fill:none,stroke:none
    subgraph Conflict_Zone [SentriZK Defense Boundary]
        direction LR
        subgraph Auth_War [Authentication Defense]
            direction TB
            MUC_Replay(["Replay Attack"]):::misuseStyle
            MUC_Cred(["Credential Sniffing"]):::misuseStyle
            LUC_Log(["Login User"]):::usecaseStyle
            MIT_Nonce["Server Nonce + ZKP"]:::mitStyle
        end
        style Auth_War fill:#f8fafc,stroke:#cbd5e1,stroke-dasharray: 5 5
        subgraph Data_War [Data Privacy Defense]
            direction TB
            MUC_DbLeak(["Database Theft<br/>(SQLi)"]):::misuseStyle
            LUC_Store(["Store Identity"]):::usecaseStyle
            MIT_Hash["Poseidon Commitment<br/>(One-way Hash)"]:::mitStyle
        end
        style Data_War fill:#f8fafc,stroke:#cbd5e1,stroke-dasharray: 5 5
        subgraph Content_War [Insider Threat Defense]
            direction TB
            MUC_Phish(["Send Malicious Link<br/>(The 'Blind Spot')"]):::misuseStyle
            LUC_Send(["Send Message"]):::usecaseStyle
            MIT_AI["On-Device AI Scanner<br/>(TensorFlow Lite)"]:::mitStyle
        end
        style Content_War fill:#f8fafc,stroke:#cbd5e1,stroke-dasharray: 5 5

    end
    style Conflict_Zone fill:#ffffff,stroke:#0f172a,stroke-width:3px
    Att_Bot -->|Floods| MUC_Replay
    Att_Ext -->|Sniffs Network| MUC_Cred
    Att_Ext -->|Breaches DB| MUC_DbLeak
    Att_Ins -->|Abuses Trust| MUC_Phish
    MUC_Replay -.->|<< threatens >>| LUC_Log
    MUC_Cred -.->|<< threatens >>| LUC_Log
    MIT_Nonce -->|<< mitigates >>| MUC_Replay
    MIT_Nonce -->|<< mitigates >>| MUC_Cred
    MUC_DbLeak -.->|<< threatens >>| LUC_Store
    MIT_Hash -->|<< mitigates >>| MUC_DbLeak
    MUC_Phish -.->|<< threatens >>| LUC_Send
    MIT_AI -->|<< mitigates >>| MUC_Phish