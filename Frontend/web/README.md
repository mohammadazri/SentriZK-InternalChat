# 🌐 SentriZK Web Frontend

Next.js web application for ZKP authentication with mobile app integration.

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Configure environment
cp example.env.local .env.local
# Edit .env.local with your backend URL

# Run development server
npm run dev

# Build for production
npm run build
npm start
```

## 📦 Tech Stack

- **Framework**: Next.js 15.5.6 (App Router)
- **Language**: TypeScript 5.x
- **Styling**: Tailwind CSS 4.x
- **ZKP**: snarkjs 0.7.5, circomlibjs 0.1.7
- **HTTP**: axios 1.12.2
- **Crypto**: bip39 3.1.0, crypto-js 4.2.0, js-sha3 0.9.3

## 🔑 Environment Variables

```env
NEXT_PUBLIC_BACKEND_URL=http://localhost:3000
```

## 📖 Documentation

For comprehensive documentation, see:
- **Complete Guide**: [Doc/Frontend/web_documentation.md](../../Doc/Frontend/web_documentation.md)
- **API Reference**: [Doc/Backend/api_reference.md](../../Doc/Backend/api_reference.md)
- **Main README**: [../../README.md](../../README.md)

## 🔐 Authentication Flow

### Registration Flow
1. User enters desired username
2. Frontend checks availability via `GET /check-username/:username`
3. Generate 24-word recovery mnemonic
4. Derive salt deterministically from mnemonic
5. Encrypt salt → JSON envelope via `encryptEnvelope(secret, salt, password)`
6. User downloads encrypted JSON file
7. Display mnemonic to user (save securely!)
8. Generate zk-SNARK registration proof with input: `{ secret, salt, unameHash }`
9. Submit proofs + publicSignals → backend `POST /register`
10. Backend verifies proofs and stores `{ username, commitment, identityCommitment }`

### Login Flow
1. User selects downloaded JSON file
2. Input password to decrypt → retrieve salt
3. User enters username
4. Frontend fetches nonce via `GET /commitment/:username`
5. Generate zk-SNARK login proof with input: `{ secret, salt, unameHash, nonce }`
6. Submit proof + publicSignals → backend `POST /login`
7. Backend verifies proof and session → login successful ✅

### Mobile Integration Flow
1. Mobile app requests MAT from backend: `POST /generate-mobile-access-token`
2. Backend returns `sessionToken + redirectURL`
3. Mobile opens system browser → `https://webapp.com/register?mat=XYZ`
4. Web validates MAT: `GET /validate-token?token=XYZ`
5. User performs ZKP registration/login flow (same as above)
6. Web submits proof to `/register` or `/login`
7. Backend verifies proof → success ✅
8. Browser redirects to deep link: `sentriapp://auth-callback?token=...`
9. Mobile receives redirect → user logged in

## 📂 Project Structure

```
src/
├── app/               # Next.js App Router pages
│   ├── page.tsx      # Home page
│   ├── register/     # Registration flow
│   └── login/        # Login flow
├── auth/             # ZKP authentication logic
│   ├── crypto.ts     # Encryption utilities
│   ├── mnemonic.ts   # BIP-39 mnemonic
│   ├── registration.ts  # Registration proof
│   └── login.ts      # Login proof
├── components/       # React components
├── lib/              # Utility functions
└── utils/            # Helper functions
```

## 🛠️ Development

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Type checking
npm run type-check

# Linting
npm run lint

# Build production
npm run build

# Start production server
npm start
```

## 🚀 Deployment

### Vercel (Recommended)
```bash
npm install -g vercel
vercel
```

### Static Export
```bash
npm run build
# Output: out/
```

## 🔒 Security Features

- **ZKP Authentication**: No password sent to server
- **MAT Protection**: One-time use tokens with 5-minute expiry
- **Session Management**: 30-minute session with refresh
- **Rate Limiting**: 10 requests/minute on critical endpoints
- **CORS Protection**: Restricted origins
- **Encrypted Storage**: Secure salt encryption

## 📝 License

MIT License - See [LICENSE](../../LICENSE) for details
