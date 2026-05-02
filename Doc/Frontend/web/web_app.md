# 🌐 Web Application — Next.js 15

> SentriZK web portal for ZKP-based registration, login, admin dashboard, and account recovery.  
> Built with Next.js 15 (App Router), React 19, and TypeScript 5.x.

---

## Technology Stack

| Technology | Version | Purpose |
|-----------|---------|---------|
| Next.js (App Router) | 15 | React framework with SSR |
| React | 19 | UI library |
| TypeScript | 5.x | Type safety |
| snarkjs | 0.7.5 | Browser-side Groth16 proof generation |
| bip39 | — | 24-word mnemonic generation |
| js-sha3 | 0.9 | SHA3-256 / Keccak-256 hashing |
| WebCrypto API | Browser-native | AES-256-GCM, PBKDF2, HKDF |

---

## Project Structure

```
Frontend/web/src/
├── app/                        # Next.js App Router pages
│   ├── layout.tsx              # Root layout
│   ├── page.tsx                # Landing page
│   ├── register/               # ZKP registration flow
│   │   └── page.tsx
│   ├── login/                  # ZKP login flow
│   │   └── page.tsx
│   ├── recover/                # Account recovery
│   │   └── page.tsx
│   ├── admin/                  # Admin dashboard
│   │   └── page.tsx
│   └── api/                    # API routes (if any)
│
├── auth/                       # Authentication logic
│   ├── registerLogic.ts        # Registration orchestration
│   ├── loginLogic.ts           # Login orchestration
│   └── api.ts                  # Backend API client
│
├── lib/                        # Core libraries
│   ├── secureCrypto.ts         # Envelope encryption, mnemonic, wallet secret
│   ├── saltEncryption.ts       # AES-256-GCM salt encryption
│   ├── zkp.ts                  # snarkjs Groth16 proof generation
│   ├── walletSimulator.ts      # MetaMask wallet simulation
│   ├── config.ts               # Circuit file paths
│   └── logger.ts               # Structured logging
│
├── components/                 # Reusable UI components
├── hooks/                      # React hooks
└── utils/                      # Helper utilities
```

---

## Authentication Flows

### Registration Flow (`registerLogic.ts`)

```
User enters: username + wallet address + password
     │
     ▼
1. generateRecoveryPhrase()
   → 24-word BIP-39 mnemonic (256-bit entropy)
     │
     ▼
2. recoverSaltFromMnemonic(mnemonic)
   → HKDF-SHA256(mnemonicSeed, info="app:mnemonic:v1") → 128-bit salt hex
     │
     ▼
3. walletSecretFromAddress(walletAddress)
   → sha3_256(address.toLowerCase().replace("0x","")) → 256-bit secret hex
     │
     ▼
4. encryptSaltHex(saltHex, password)
   → PBKDF2(310K iter) → HKDF → AES-256-GCM → encrypted envelope
     │
     ▼
5. sha3_256(username.toLowerCase()) → unameHashDecimal
     │
     ▼
6. snarkjs.groth16.fullProve(
     {secret, salt, unameHash},
     registration.wasm,
     registration.zkey
   ) → {proof, publicSignals: [commitment]}
   ⏱ Takes ~2-3 seconds
     │
     ▼
7. POST /register {username, proof, publicSignals}
   → Server verifies → returns {token}
     │
     ▼
8. Deep link redirect: sentriapp://auth?token=TOKEN
   &username=USER&encryptedSalt=...&mnemonic=base64...
```

**Key Design Decision**: The wallet secret is **never stored**. It's re-derived from the connected wallet each time. Only the encrypted salt travels to the mobile app.

### Login Flow (`loginLogic.ts`)

```
User enters: username + wallet address + password
     │
     ▼
1. Decrypt stored salt using password
   → AES-256-GCM decrypt → saltHex
     │
     ▼
2. walletSecretFromAddress(walletAddress) → secretHex
     │
     ▼
3. GET /commitment/:username
   → {commitment, nonce}  (nonce valid for 60 seconds!)
     │
     ▼
4. snarkjs.groth16.fullProve(
     {secret, salt, unameHash, storedCommitment, nonce},
     login.wasm,
     login.zkey
   ) → {proof, publicSignals: [pubCommitment, pubSession]}
     │
     ▼
5. POST /login {username, proof, publicSignals}
   → Server verifies → returns {token, sessionId}
     │
     ▼
6. Deep link redirect to mobile
```

---

## Cryptographic Library (`secureCrypto.ts`)

### Envelope Encryption (Salt-Only)

The envelope format stores only the salt — the wallet secret is never persisted:

```typescript
interface EnvelopeSaltOnly {
  v: 1;                           // Format version
  kdf: {
    name: "pbkdf2";
    salt: string;                  // base64url - PBKDF2 salt (32 bytes)
    iter: 310000;                  // Iteration count
    hash: "SHA-256";
  };
  hkdfInfo: string;               // base64url - "app:enc:v1"
  iv: string;                     // base64url - AES-GCM IV (12 bytes)
  aad?: string;                   // base64url - Additional authenticated data
  ct: string;                     // base64url - Ciphertext
  meta: {
    envelopeSha3: string;          // SHA3-256 integrity check
  };
}
```

**Decryption verification**: Uses constant-time comparison (`equalConstTime`) to verify the SHA3-256 fingerprint before attempting decryption.

### Wallet Secret Derivation

```typescript
// Secret = SHA3-256(wallet address without 0x prefix, lowercase)
function walletSecretFromAddress(address: string): string {
  const canonical = address.trim().toLowerCase();
  const no0x = canonical.startsWith("0x") ? canonical.slice(2) : canonical;
  return sha3_256(no0x);  // 64 hex chars = 256 bits
}
```

---

## ZKP Proof Generation (`zkp.ts`)

```typescript
async function generateProof(
  input: Record<string, string | number>,
  circuit: "login" | "registration"
): Promise<ProofBundle> {
  const snarkjs = await import("snarkjs");
  const { wasm, zkey } = getCircuitFiles(circuit);
  return snarkjs.groth16.fullProve(input, wasm, zkey);
}
```

Circuit files are loaded from `public/circuits/`:
- `registration.wasm` + `registration.zkey`
- `login.wasm` + `login.zkey`

---

## Admin Dashboard

The admin dashboard (`/admin`) provides:

- **Admin JWT login** with rate limiting (5 req/min)
- **User management**: list all users, hold/restore/revoke accounts
- **Threat log viewer**: see ML-flagged messages with scores
- **Real-time SSE updates**: live notifications when users register, get held, or threats are detected

---

## Environment Variables

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_API_URL` | Backend API URL |
| `NEXT_PUBLIC_REG_WASM` | Path to registration circuit WASM |
| `NEXT_PUBLIC_REG_ZKEY` | Path to registration proving key |
| `NEXT_PUBLIC_LOGIN_WASM` | Path to login circuit WASM |
| `NEXT_PUBLIC_LOGIN_ZKEY` | Path to login proving key |
