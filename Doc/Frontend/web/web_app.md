# 🌐 SentriZK Web Frontend

Next.js 15 web application with Zero-Knowledge Proof authentication.

---

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Installation](#installation)
- [Configuration](#configuration)
- [Project Structure](#project-structure)
- [Authentication Flow](#authentication-flow)
- [Deployment](#deployment)

---

## Overview

The SentriZK web frontend is a modern Next.js application that provides a beautiful, secure interface for Zero-Knowledge Proof authentication. It features glassmorphism design, smooth animations, and a responsive layout.

### Key Features

- ✅ **Modern UI**: Glassmorphism design with blur effects
- ✅ **Zero-Knowledge Proof**: Client-side proof generation
- ✅ **Responsive Design**: Works on desktop, tablet, and mobile
- ✅ **Secure**: Auto-close tabs, MAT one-time use, encrypted storage
- ✅ **Fast**: Server-side rendering with Next.js App Router

---

## Features

### Authentication

- **Registration**
  - Username availability check
  - 24-word mnemonic generation
  - Salt derivation from mnemonic
  - Password encryption of salt
  - ZKP proof generation
  - Downloadable encrypted file

- **Login**
  - File upload for encrypted salt
  - Password decryption
  - Nonce fetching
  - ZKP proof generation
  - Session management

- **Mobile Integration**
  - Mobile Access Token (MAT) validation
  - Deep link redirection
  - Auto-close browser tab
  - One-time use protection

### UI/UX

- **Glassmorphism**: Frosted glass effect with backdrop blur
- **Gradients**: Purple/indigo color scheme
- **Animations**: Smooth transitions and loading states
- **Responsive**: Mobile-first responsive design
- **Error Handling**: User-friendly error messages

---

## Tech Stack

| Category | Technology | Version |
|----------|-----------|---------|
| Framework | Next.js | 15.5.6 |
| UI Library | React | 19.1.0 |
| Language | TypeScript | 5.x |
| Styling | Tailwind CSS | 4.x |
| ZKP | snarkjs | 0.7.5 |
| Crypto | circomlibjs | 0.1.7 |
| Hashing | js-sha3 | 0.9.3 |
| Encryption | crypto-js | 4.2.0 |
| Mnemonic | bip39 | 3.1.0 |
| HTTP | axios | 1.12.2 |

---

## Installation

### Prerequisites

- Node.js 18+ and npm
- Backend server running on `http://localhost:3000`
- Circuit WASM files in `public/circuits/`

### Steps

1. **Install Dependencies**

```bash
cd Frontend/web
npm install
```

2. **Copy Circuit Files**

Copy the compiled WASM files from Backend to Frontend:

```bash
# From Backend/circuits/
cp registration/registration_js/registration.wasm ../../Frontend/web/public/circuits/
cp login/login_js/login.wasm ../../Frontend/web/public/circuits/
```

3. **Configure Environment**

Create `.env.local`:

```bash
NEXT_PUBLIC_API_URL=http://localhost:3000
```

4. **Run Development Server**

```bash
npm run dev
```

App will start on `http://localhost:3001`

---

## Configuration

### Environment Variables

Create `.env.local` in the web directory:

```bash
# Backend API URL
NEXT_PUBLIC_API_URL=http://localhost:3000

# App Configuration
NEXT_PUBLIC_APP_NAME=SentriZK
NEXT_PUBLIC_APP_URL=http://localhost:3001
```

### Next.js Configuration

`next.config.ts`:

```typescript
const nextConfig = {
  reactStrictMode: true,
  
  // Enable WebAssembly
  webpack: (config) => {
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
    };
    return config;
  },
};

export default nextConfig;
```

---

## Project Structure

```
Frontend/web/
├── src/
│   ├── app/                       # Next.js App Router
│   │   ├── page.tsx               # Home page (/)
│   │   ├── layout.tsx             # Root layout
│   │   ├── globals.css            # Global styles
│   │   ├── register/              # Registration flow
│   │   │   └── page.tsx           # /register
│   │   └── login/                 # Login flow
│   │       └── page.tsx           # /login
│   │
│   ├── auth/                      # Authentication logic
│   │   ├── registerLogic.ts      # Registration ZKP
│   │   ├── loginLogic.ts          # Login ZKP
│   │   └── types.ts               # TypeScript types
│   │
│   ├── components/                # React components
│   │   ├── Button.tsx             # Custom button
│   │   ├── Input.tsx              # Custom input
│   │   └── LoadingSpinner.tsx    # Loading indicator
│   │
│   ├── lib/                       # Utility libraries
│   │   ├── crypto.ts              # Encryption utilities
│   │   └── storage.ts             # Browser storage
│   │
│   └── utils/                     # Helper functions
│       ├── validation.ts          # Input validation
│       └── formatting.ts          # Data formatting
│
├── public/
│   ├── circuits/                  # WASM circuit files
│   │   ├── registration.wasm      # Registration circuit
│   │   └── login.wasm             # Login circuit
│   └── favicon.ico
│
├── .env.local                     # Environment variables
├── next.config.ts                 # Next.js configuration
├── tailwind.config.ts             # Tailwind configuration
├── tsconfig.json                  # TypeScript configuration
└── package.json                   # Dependencies
```

---

## Authentication Flow

### Registration Flow

```typescript
// 1. Check username availability
const response = await axios.get(
  `${API_URL}/check-username/${username}`
);

// 2. Generate mnemonic
const mnemonic = generateMnemonic(256); // 24 words

// 3. Derive salt from mnemonic
const salt = recoverSaltFromMnemonic(mnemonic);

// 4. Encrypt salt with password
const envelope = encryptEnvelope(secret, salt, password);
downloadJSON(envelope, `${username}_encrypted.json`);

// 5. Compute username hash
const unameHash = keccak256(username);

// 6. Generate ZKP proof
const { proof, publicSignals } = await snarkjs.groth16.fullProve(
  { secret, salt, unameHash },
  wasmFile,
  zkeyFile
);

// 7. Submit to backend
await axios.post(`${API_URL}/register`, {
  username,
  proof,
  publicSignals
});
```

### Login Flow

```typescript
// 1. Upload and decrypt envelope
const envelope = JSON.parse(fileContent);
const salt = decryptSaltHex(envelope, password);

// 2. Get nonce from server
const { data } = await axios.get(
  `${API_URL}/commitment/${username}`
);
const { nonce } = data;

// 3. Compute username hash
const unameHash = keccak256(username);

// 4. Generate ZKP proof with nonce
const { proof, publicSignals } = await snarkjs.groth16.fullProve(
  { secret, salt, unameHash, nonce },
  wasmFile,
  zkeyFile
);

// 5. Submit to backend
const response = await axios.post(`${API_URL}/login`, {
  username,
  proof,
  publicSignals
});

const { sessionId } = response.data;
```

### Mobile Access Token (MAT) Flow

```typescript
// 1. Validate MAT from query params
const mat = searchParams.get('mat');
const device = searchParams.get('device');

const response = await axios.get(
  `${API_URL}/validate-token`,
  { params: { token: mat, device, action: 'register' } }
);

// 2. Check if MAT already used
const matKey = `mat_used_${mat}`;
if (sessionStorage.getItem(matKey)) {
  showError('This link has already been used');
  return;
}

// 3. Mark MAT as used after successful auth
sessionStorage.setItem(matKey, 'true');

// 4. Add beforeunload handler
window.addEventListener('beforeunload', () => {
  sessionStorage.setItem(matKey, 'true');
});

// 5. Redirect back to mobile app
window.location.href = `sentriapp://auth-callback?token=${sessionId}&username=${username}`;

// 6. Auto-close tab
setTimeout(() => {
  window.close();
}, 2000);
```

---

## Key Files

### 1. Register Page (`src/app/register/page.tsx`)

Handles user registration with:
- Username availability check
- Mnemonic generation and display
- Password encryption
- File download
- ZKP proof generation
- MAT validation
- Auto-close after redirect

### 2. Login Page (`src/app/login/page.tsx`)

Handles user login with:
- File upload
- Password decryption
- Nonce fetching
- ZKP proof generation
- Session management
- MAT validation
- Auto-close after redirect

### 3. Registration Logic (`src/auth/registerLogic.ts`)

```typescript
export async function generateRegistrationProof(
  username: string,
  password: string,
  secret: string,
  mnemonic: string
) {
  // Derive salt from mnemonic
  const salt = recoverSaltFromMnemonic(mnemonic);
  
  // Compute username hash
  const unameHash = keccak256(username);
  
  // Generate proof
  const { proof, publicSignals } = await snarkjs.groth16.fullProve(
    { secret, salt, unameHash },
    '/circuits/registration.wasm',
    '/circuits/registration_final.zkey'
  );
  
  return { proof, publicSignals, salt };
}
```

### 4. Login Logic (`src/auth/loginLogic.ts`)

```typescript
export async function generateLoginProof(
  username: string,
  encryptedSalt: string,
  password: string,
  secret: string,
  nonce: string
) {
  // Decrypt salt
  const salt = decryptSaltHex(encryptedSalt, password);
  
  // Compute username hash
  const unameHash = keccak256(username);
  
  // Generate proof
  const { proof, publicSignals } = await snarkjs.groth16.fullProve(
    { secret, salt, unameHash, nonce },
    '/circuits/login.wasm',
    '/circuits/login_final.zkey'
  );
  
  return { proof, publicSignals };
}
```

---

## Styling

### Tailwind Configuration

```typescript
// tailwind.config.ts
export default {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: '#6366F1',  // Indigo
        secondary: '#8B5CF6', // Purple
      },
      backdropBlur: {
        xs: '2px',
      },
    },
  },
};
```

### Global Styles

```css
/* src/app/globals.css */
.glass {
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.gradient-bg {
  background: linear-gradient(
    135deg,
    #667eea 0%,
    #764ba2 100%
  );
}
```

---

## Deployment

### Vercel Deployment

1. **Push to GitHub**

```bash
git push origin main
```

2. **Import to Vercel**

- Go to [vercel.com](https://vercel.com)
- Import your repository
- Configure environment variables
- Deploy

3. **Environment Variables**

Add in Vercel dashboard:
```
NEXT_PUBLIC_API_URL=https://your-backend-api.com
```

### Build for Production

```bash
npm run build
npm start
```

### Static Export

```bash
# next.config.ts
export default {
  output: 'export',
};

npm run build
# Output in `out/` directory
```

---

## Security Best Practices

1. **Never expose private keys** in client code
2. **Validate all inputs** before processing
3. **Use HTTPS** in production
4. **Implement CSP headers** to prevent XSS
5. **Sanitize user inputs** to prevent injection
6. **Rate limit API calls** on client side
7. **Clear sensitive data** from memory after use

---

## Troubleshooting

### Issue: WebAssembly not loading

**Solution:** Ensure `webpack` config includes:
```typescript
config.experiments = {
  asyncWebAssembly: true,
};
```

### Issue: CORS errors

**Solution:** Backend must allow your frontend origin:
```javascript
app.use(cors({
  origin: 'http://localhost:3001'
}));
```

### Issue: Proof generation fails

**Check:**
1. WASM files are in `public/circuits/`
2. Input signals are correct format
3. Circuit constraints are satisfied

---

## Support

- **Documentation**: [Main README](../../README.md)
- **API Docs**: [Backend API](../../Doc/Backend/api_reference.md)
- **Email**: mohamedazri@protonmail.com

---

## License

MIT License - See [LICENSE](../../LICENSE) for details
