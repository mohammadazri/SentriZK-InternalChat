"use client";

import React, { useState } from "react";
import { prepareRegistration, submitRegistration } from "@/auth/registerLogic";
import type { ProofBundle } from "@/lib/zkp";

export default function RegisterPage() {
  const [username, setUsername] = useState("");
  const [wallet, setWallet] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  // Prepare & submit registration automatically
  async function onRegister(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage(null);

    try {
      // 1️⃣ Prepare registration
      const prep = await prepareRegistration(username, wallet, password);

      // 2️⃣ Submit registration
      const resp = await submitRegistration(username, prep.proofBundle);

      if (!resp.token) throw new Error("Registration failed: no token received");

      // 3️⃣ Encrypt mnemonic for safe transport (simple base64)
      const encryptedMnemonic = btoa(prep.mnemonic);

      // 4️⃣ Construct deep link URL
      const redirectUri = "sentriapp://auth-callback";
      const queryParams = new URLSearchParams({
        token: resp.token,
        username,
        salt: prep.envelope.saltHex,
        mnemonic: encryptedMnemonic,
      }).toString();
      const redirectUrl = `${redirectUri}?${queryParams}`;

      // 5️⃣ Redirect automatically
      if (/android/i.test(navigator.userAgent)) {
        const intentUrl = `intent://auth-callback?${queryParams}#Intent;scheme=sentriapp;package=com.example.mobile;end`;
        window.location.href = intentUrl;
      } else {
        window.location.href = redirectUrl; // iOS / fallback
      }
    } catch (err: unknown) {
      setMessage(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main style={{ padding: 20, maxWidth: 720 }}>
      <h1>Register (Headless, Mobile-ready)</h1>

      <form onSubmit={onRegister}>
        <div>
          <label>Username</label>
          <input value={username} onChange={(e) => setUsername(e.target.value)} required />
        </div>

        <div>
          <label>Wallet address</label>
          <input value={wallet} onChange={(e) => setWallet(e.target.value)} required />
        </div>

        <div>
          <label>Password</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </div>

        <div style={{ marginTop: 12 }}>
          <button type="submit" disabled={busy}>
            {busy ? "Registering..." : "Register"}
          </button>
        </div>
      </form>

      {message && (
        <div style={{ marginTop: 12, color: "red" }}>
          <strong>{message}</strong>
        </div>
      )}
    </main>
  );
}
