Core logic flow
Registration

User enters:

username

wallet address

password (used to encrypt the salt)

App:

Generates mnemonic + salt

Encrypts the salt using the user’s password → creates the envelope file

Generates ZKP proof (secret = wallet secret, salt = from mnemonic)

show mnemonic words and ask your to save it somewhere safely for recovery if they lost file 

Sends proof + public signals + username to backend

Allows user to download the encrypted file (for recovery)

Login

User enters:

username

wallet address

password (to decrypt the file)

App:

Decrypts the encrypted salt file using password

Recreates proof (same inputs)

Sends proof + public signals to backend

Backend verifies against stored commitment

















# 🔐 ZKP Authentication Flow

## 1️⃣ Registration Flow

```mermaid
flowchart TD
    A[User enters desired username] --> B[Frontend checks availability via GET /check-username/:username]
    B --> |Available| C[Generate 24-word recovery mnemonic]
    C --> D[Derive salt deterministically from mnemonic using recoverSaltFromMnemonic]
    D --> E[Encrypt salt → JSON envelope via encryptEnvelope(secret, salt, password)]
    E --> F[User downloads encrypted JSON file]
    F --> G[Display mnemonic to user]
    G --> H[Compute username hash unameHash = keccak256(username)]
    H --> I[Generate zk-SNARK registration proof with input: { secret, salt, unameHash }]
    I --> J[Submit proofs + publicSignals → backend POST /register]
    J --> K[Backend verifies proofs and stores { username, commitment, identityCommitment }]
    K --> L[Registration complete ✅]
```

### Steps:

1. **Choose Username**

   * User types a desired username.
   * Frontend verifies availability via `GET /check-username/:username`.

2. **Generate Recovery Mnemonic**

   * Create a **24-word BIP-39 mnemonic** first.
   * Deterministically derive **salt** from mnemonic using `recoverSaltFromMnemonic`.

3. **Encrypt Salt → JSON File**

   * Use `encryptEnvelope(secret, salt, password)` to generate **encrypted JSON envelope**.
   * **User must download the JSON file** before proceeding.

4. **Display Recovery Mnemonic**

   * After JSON download, show the **mnemonic**.
   * Instruct user to store it **securely**.

5. **Generate Registration Proof**

   * Compute `unameHash = keccak256(username)`.
   * Input signals: `{ secret, salt, unameHash }`.
   * Generate zk-SNARK registration proof.

6. **Submit Proofs**

   * Send `{ username, proof, publicSignals, uniqProof, uniqSignals }` → backend `/register`.
   * Backend verifies proofs and stores `{ username, commitment, identityCommitment }`.

---

## 2️⃣ Login Flow

```mermaid
flowchart TD
    A[User selects downloaded JSON file] --> B[Input password to decrypt → retrieve salt]
    B --> C[User enters username]
    C --> D[Frontend fetches nonce via GET /commitment/:username]
    D --> E[Compute unameHash = keccak256(username)]
    E --> F[Generate zk-SNARK login proof with input: { secret, salt, unameHash, nonce }]
    F --> G[Submit proof + publicSignals → backend POST /login]
    G --> H[Backend verifies proof and session → login successful ✅]
```

### Steps:

1. **Select Encrypted JSON File**

   * User selects previously downloaded JSON envelope.
   * Enter **password** to decrypt and retrieve **salt**.

2. **Get Username & Nonce**

   * User types username.
   * Frontend requests **nonce** from server: `GET /commitment/:username`.

3. **Generate Login Proof**

   * Compute `unameHash = keccak256(username)`.
   * Input signals: `{ secret, salt, unameHash, nonce }`.
   * Generate zk-SNARK login proof.

4. **Submit Proof**

   * Send `{ username, proof, publicSignals }` → backend `/login`.
   * Backend verifies proof and session.
   * Login successful if valid.

---

### ✅ Notes

* **JSON envelope** stores only the salt, never the wallet secret.
* **Mnemonic** is the master recovery key; losing it means losing the ability to recover the account.
* **Nonce** is server-generated per login to prevent replay attacks.
* ZKP ensures that the **server never sees the secret or salt** in plaintext.

---


sequenceDiagram
    participant M as Mobile App
    participant W as Web (Browser)
    participant B as Backend

    M->>B: Request one-time session token (POST /init-auth)
    B-->>M: Return sessionToken + redirectURL (https://webapp.com/auth?token=XYZ)

    M->>W: Open system browser → redirectURL
    W->>B: Validate token (GET /validate?token=XYZ)
    W->>W: User performs ZKP Registration/Login flow (same as your web flow)
    W->>B: Submit proof to /register or /login
    B->>W: Verify proof → success ✅
    B->>M: Notify via redirect (deep link): myapp://auth-success?session=XYZ
    W->>M: Browser redirects to deep link → returns control to app
    M->>B: Exchange session=XYZ for JWT / user info
    B-->>M: JWT returned → user logged in securely
