

# ⚡ SentriZK Backend – Setup Guide

## 1️⃣ Prerequisites

* **Node.js** (v18+ recommended)
* **npm** (comes with Node.js)
* **Supabase Account** (for PostgreSQL database)
* **Firebase Project** (for Admin SDK and Firestore)
* **snarkjs** (for Groth16 proving/verification)
* **Circom compiler** (v2.x)

---

## 2️⃣ Install Node.js Dependencies

```bash
cd Backend
npm install
```

---

## 3️⃣ Check Circom Installation

```bash
./circom --help
```

* If Circom is not installed, download a pre-built binary:

  1. Go to [Circom Releases](https://github.com/iden3/circom/releases)
  2. Download the latest binary for your OS (`circom-win.exe` for Windows)
  3. Place it in the `Backend/circuits` folder
  4. Rename it to `circom` (or `circom.exe` on Windows)
  5. On Linux/macOS, make it executable:

```bash
chmod +x circom
```

---

## 4️⃣ Powers of Tau Ceremony (Setup ZKP Trusted Setup)

```bash
cd circuits/build

# Phase 1
snarkjs powersoftau new bn128 12 pot12_0000.ptau
snarkjs powersoftau contribute pot12_0000.ptau pot12_0001.ptau

# Phase 2
snarkjs powersoftau prepare phase2 pot12_0001.ptau pot12_final.ptau
```

---

## 5️⃣ Compile Circuits

### Registration Circuit

```bash
cd ../
./circom registration.circom --r1cs --wasm --sym -o registration
```

✅ Output:

```
registration/registration.r1cs
registration/registration.sym
registration/registration_js/registration.wasm
```

### Login Circuit

```bash
./circom login.circom --r1cs --wasm --sym -o login
```

✅ Output:

```
login/login.r1cs
login/login.sym
login/login_js/login.wasm
```

---

## 6️⃣ Generate Proving & Verification Keys

### Registration

```bash
snarkjs groth16 setup registration/registration.r1cs build/pot12_final.ptau key_generation/registration_0000.zkey
snarkjs zkey contribute key_generation/registration_0000.zkey key_generation/registration_final.zkey
snarkjs zkey export verificationkey key_generation/registration_final.zkey key_generation/registration_verification_key.json
```

### Login

```bash
snarkjs groth16 setup login/login.r1cs build/pot12_final.ptau key_generation/login_0000.zkey
snarkjs zkey contribute key_generation/login_0000.zkey key_generation/login_final.zkey
snarkjs zkey export verificationkey key_generation/login_final.zkey key_generation/login_verification_key.json
```

---

## 7️⃣ Database Setup (Supabase)

SentriZK uses **Supabase PostgreSQL** for its primary data store. Follow these steps to initialize your database:

1.  **Create a Supabase Project**: Go to [supabase.com](https://supabase.com/) and create a new project.
2.  **Run SQL Schema**:
    *   Open the **SQL Editor** in your Supabase dashboard.
    *   Click **"New Query"**.
    *   Open the `Backend/supabase_schema.sql` file from this repository.
    *   Copy its entire contents and paste it into the Supabase SQL Editor.
    *   Click **"Run"**.
3.  **Environment Variables**:
    *   Copy `.env.example` to `.env`.
    *   Fill in your `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` found in **Project Settings** -> **API**.
    *   Fill in your `ADMIN_USERNAME` and `ADMIN_PASSWORD` for the management dashboard.

---

## 8️⃣ Firebase Admin Setup

1.  Go to your **Firebase Console** -> **Project Settings** -> **Service Accounts**.
2.  Click **"Generate New Private Key"**.
3.  Save the downloaded JSON file as `Backend/serviceAccountKey.json`.

---

## ✅ Notes

* Ensure all paths are **relative to the `circuits` folder**.
* After compilation, `.wasm` files are used by the frontend for witness generation.
* `.r1cs` + `.zkey` are used for proof generation and verification.

---


