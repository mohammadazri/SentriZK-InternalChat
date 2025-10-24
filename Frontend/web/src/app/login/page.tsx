"use client";

import React, { useState } from "react";
import { prepareLogin } from "@/auth/loginLogic";
import { loginUser } from "@/auth/api";

export default function LoginPage({ storedEnvelope }: { storedEnvelope: { saltHex: string } | null }) {
  const [username, setUsername] = useState("");
  const [walletAddress, setWalletAddress] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);

  const handleLogin = async () => {
    setMessage(null);

    if (!username || !walletAddress || !storedEnvelope) {
      setMessage("All fields are required and envelope must be loaded from secure storage!");
      return;
    }

    setLoading(true);
    try {
      // 1️⃣ Prepare login proof
      const { proofBundle } = await prepareLogin(username, walletAddress, storedEnvelope);

      // 2️⃣ Call backend login
      const resp = await loginUser(username, proofBundle);

      setToken(resp.token || null); // store token securely
      setMessage(`✅ Login successful! Mobile token: ${resp.token}`);
    }catch (err: unknown) {
    console.error(err);

    // Type guard to safely access error message
    if (err instanceof Error) {
      setMessage(`❌ Login failed: ${err.message}`);
    } else {
      setMessage(`❌ Login failed: ${String(err)}`);
    }
  }finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 400, margin: "50px auto", padding: 20, border: "1px solid #ccc", borderRadius: 8 }}>
      <h2 style={{ textAlign: "center" }}>ZKP Mobile Login</h2>

      <label>Username:</label>
      <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} style={{ width: "100%", marginBottom: 10 }} />

      <label>Wallet Address:</label>
      <input type="text" value={walletAddress} onChange={(e) => setWalletAddress(e.target.value)} style={{ width: "100%", marginBottom: 10 }} />

      <button onClick={handleLogin} disabled={loading || !storedEnvelope} style={{ width: "100%", padding: 10 }}>
        {loading ? "Logging in..." : "Login"}
      </button>

      {message && <p style={{ marginTop: 20, textAlign: "center" }}>{message}</p>}
      {token && <p style={{ marginTop: 10, textAlign: "center" }}>Store this token in secure storage: {token}</p>}
    </div>
  );
}
