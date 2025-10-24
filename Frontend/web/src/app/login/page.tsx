"use client";

import React, { useEffect, useState } from "react";
import { prepareLogin } from "@/auth/loginLogic";
import { loginUser } from "@/auth/api";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [walletAddress, setWalletAddress] = useState("");
  const [saltHex, setSaltHex] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);

  // ✅ Auto-fill username & salt from mobile deep link
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const userParam = params.get("username");
    const saltParam = params.get("salt");

    if (userParam) setUsername(userParam);
    if (saltParam) setSaltHex(saltParam);
  }, []);

  const handleLogin = async () => {
    setMessage(null);

    if (!saltHex) {
      setMessage("❌ Missing salt — please open this page from the app!");
      return;
    }

    if (!walletAddress) {
      setMessage("Please enter your wallet address.");
      return;
    }

    setLoading(true);
    try {
      // 1️⃣ Prepare login proof using username + salt from app
      const { proofBundle } = await prepareLogin(username, walletAddress, { saltHex });

      // 2️⃣ Send proof to backend
      const resp = await loginUser(username, proofBundle);

      if (!resp.token) throw new Error("Login failed: no token received");

      setToken(resp.token);
      setMessage("✅ Login successful! Returning to the app...");

      // 3️⃣ Construct query params
      const queryParams = new URLSearchParams({
        token: resp.token,
        username,
      }).toString();

      // 4️⃣ Redirect back to mobile app
      if (/android/i.test(navigator.userAgent)) {
        // Android: use intent URL for reliable app launch
        const intentUrl = `intent://login-success?${queryParams}#Intent;scheme=sentriapp;package=com.example.mobile;end`;
        window.location.href = intentUrl;
      } else {
        // iOS / fallback
        const redirectUrl = `sentriapp://login-success?${queryParams}`;
        window.location.href = redirectUrl;
      }

    } catch (err: unknown) {
      console.error(err);
      if (err instanceof Error) setMessage(`❌ Login failed: ${err.message}`);
      else setMessage(`❌ Login failed: ${String(err)}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 400, margin: "50px auto", padding: 20, border: "1px solid #ccc", borderRadius: 8 }}>
      <h2 style={{ textAlign: "center" }}>ZKP Mobile Login</h2>

      <label>Username:</label>
      <input type="text" value={username} disabled style={{ width: "100%", marginBottom: 10 }} />

      <label>Salt (from app):</label>
      <input type="text" value={saltHex} disabled style={{ width: "100%", marginBottom: 10 }} />

      <label>Wallet Address:</label>
      <input
        type="text"
        value={walletAddress}
        onChange={(e) => setWalletAddress(e.target.value)}
        placeholder="Enter wallet address"
        style={{ width: "100%", marginBottom: 10 }}
      />

      <button onClick={handleLogin} disabled={loading} style={{ width: "100%", padding: 10 }}>
        {loading ? "Logging in..." : "Login"}
      </button>

      {message && <p style={{ marginTop: 20, textAlign: "center" }}>{message}</p>}
      {token && <p style={{ marginTop: 10, textAlign: "center" }}>Token: {token}</p>}
    </div>
  );
}
