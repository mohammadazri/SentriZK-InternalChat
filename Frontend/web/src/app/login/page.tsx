"use client";

import { useState } from "react";
import { getCommitment, login } from "../../services/auth";

export default function LoginPage() {
  const [username, setUsername] = useState<string>("");
  const [secret, setSecret] = useState<string>("");
  const [salt, setSalt] = useState<string>("");
  const [status, setStatus] = useState<string>("");

  const handleLogin = async () => {
    try {
      const { commitment, nonce } = await getCommitment(username);
      const result = await login({ username, secret, salt, nonce, storedCommitment: commitment });
      setStatus(`✅ Login successful! Session: ${result.session}`);
    } catch (err: any) {
      setStatus(`❌ Error: ${err.response?.data?.error || err.message}`);
    }
  };

  return (
    <div style={{ padding: 40 }}>
      <h1>Login</h1>
      <input placeholder="Username" value={username} onChange={e => setUsername(e.target.value)} />
      <input placeholder="Secret" value={secret} onChange={e => setSecret(e.target.value)} />
      <input placeholder="Salt" value={salt} onChange={e => setSalt(e.target.value)} />
      <button onClick={handleLogin}>Login</button>
      <p>{status}</p>
    </div>
  );
}
