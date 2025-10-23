"use client";

import React, { useState } from "react";
import { prepareLogin } from "@/auth/loginLogic";
import { loginUser } from "@/auth/api";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [walletAddress, setWalletAddress] = useState("");
  const [password, setPassword] = useState("");
  const [envelopeFile, setEnvelopeFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setEnvelopeFile(e.target.files[0]);
    }
  };

  const handleLogin = async () => {
    setMessage(null);

    if (!username || !walletAddress || !password || !envelopeFile) {
      setMessage("All fields are required!");
      return;
    }

    setLoading(true);
    try {
      // 1️⃣ Prepare login proof
      const { proofBundle } = await prepareLogin(username, walletAddress, password, envelopeFile);

      // 2️⃣ Call backend login
      const resp = await loginUser(username, proofBundle);

      setMessage(`✅ Login successful! Session: ${resp.session}`);
    } catch (err: any) {
      console.error(err);
      setMessage(`❌ Login failed: ${err.message || err}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 400, margin: "50px auto", padding: 20, border: "1px solid #ccc", borderRadius: 8 }}>
      <h2 style={{ textAlign: "center" }}>ZKP Login</h2>

      <label>Username:</label>
      <input
        type="text"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        style={{ width: "100%", marginBottom: 10 }}
      />

      <label>Wallet Address:</label>
      <input
        type="text"
        value={walletAddress}
        onChange={(e) => setWalletAddress(e.target.value)}
        style={{ width: "100%", marginBottom: 10 }}
      />

      <label>Password:</label>
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        style={{ width: "100%", marginBottom: 10 }}
      />

      <label>Envelope File:</label>
      <input type="file" accept=".json" onChange={handleFileChange} style={{ marginBottom: 20 }} />

      <button onClick={handleLogin} disabled={loading} style={{ width: "100%", padding: 10 }}>
        {loading ? "Logging in..." : "Login"}
      </button>

      {message && <p style={{ marginTop: 20, textAlign: "center" }}>{message}</p>}
    </div>
  );
}
