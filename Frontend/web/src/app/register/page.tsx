"use client";

import { useState } from "react";
import { register } from "../../services/auth";

export default function RegisterPage() {
  const [username, setUsername] = useState<string>("");
  const [secret, setSecret] = useState<string>("");
  const [salt, setSalt] = useState<string>("");
  const [status, setStatus] = useState<string>("");

  const handleRegister = async () => {
    try {
      const result = await register({ username, secret, salt });
      setStatus(`✅ Registered! Commitment: ${result.commitment}`);
    } catch (err: any) {
      setStatus(`❌ Error: ${err.response?.data?.error || err.message}`);
    }
  };

  return (
    <div style={{ padding: 40 }}>
      <h1>Registration</h1>
      <input placeholder="Username" value={username} onChange={e => setUsername(e.target.value)} />
      <input placeholder="Secret" value={secret} onChange={e => setSecret(e.target.value)} />
      <input placeholder="Salt" value={salt} onChange={e => setSalt(e.target.value)} />
      <button onClick={handleRegister}>Register</button>
      <p>{status}</p>
    </div>
  );
}
