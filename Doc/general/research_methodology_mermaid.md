flowchart TD
    %% Top Methodology Box
    M["fa:fa-project-diagram Hybrid Project Management Approach"]
    style M fill:#fde68a,stroke:#f59e0b,color:#000,stroke-width:3px,stroke-dasharray: 5 3

    %% Phases (vertical layout)
    M --> P1
    M --> P2
    M --> P3
    linkStyle 0,1,2 stroke:#ffffff,stroke-width:2px,stroke-dasharray: 3 2

    %% Phase 1: Research & Analysis (Waterfall)
    P1["fa:fa-search Phase 1: Research & Analysis (Waterfall)"]
    style P1 fill:#38bdf8,stroke:#1e40af,color:#000,stroke-width:2px
    P1A["fa:fa-book Literature review: ZKP & AI anomaly detection"]
    P1B["fa:fa-shield-alt Security assessment: Slack, Teams, Signal"]
    P1C["fa:fa-chart-line Comparative analysis & algorithm evaluation"]
    P1 --> P1A --> P1B --> P1C
    linkStyle 3,4,5 stroke:#ffffff,stroke-width:2px

    %% Phase 2: System Development (Agile)
    P2["fa:fa-cogs Phase 2: System Development (Agile)"]
    style P2 fill:#0ea5e9,stroke:#1e3a8a,color:#000,stroke-width:2px
    P2A["fa:fa-lock ZKP auth system (Circom + Groth16)"]
    P2B["fa:fa-mobile-alt MAT protocol: mobile-to-web auth"]
    P2C["fa:fa-robot Integrate AI anomaly detection (TensorFlow Lite)"]
    P2D["fa:fa-sync-alt Iterative improvements & testing"]
    P2 --> P2A --> P2B --> P2C --> P2D
    linkStyle 6,7,8,9 stroke:#ffffff,stroke-width:2px

    %% Phase 3: Testing & Validation (Iterative)
    P3["fa:fa-vials Phase 3: Testing & Validation (Iterative)"]
    style P3 fill:#22d3ee,stroke:#0e7490,color:#000,stroke-width:2px
    P3A["fa:fa-shield-alt Security & penetration testing"]
    P3B["fa:fa-tachometer-alt Performance benchmarking: Proof gen & AI detection"]
    P3C["fa:fa-user-check SME user testing & feedback"]
    P3 --> P3A --> P3B --> P3C
    linkStyle 10,11,12 stroke:#ffffff,stroke-width:2px
