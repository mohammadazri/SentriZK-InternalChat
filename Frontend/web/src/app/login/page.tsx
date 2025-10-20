"use client";

import { useState } from "react";
import { generateProof } from "../../lib/zkp";
import { decryptEnvelope, walletSecretFromAddress } from "../../lib/secureCrypto";
import { keccak256 } from "js-sha3";

const SERVER = "http://localhost:5000";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [walletAddr, setWalletAddr] = useState("");
  const [status, setStatus] = useState("");
  const [session, setSession] = useState("");

  async function handleLogin() {
    if (!username || !password || !file || !walletAddr) {
      setStatus("Provide username, wallet address, password, and envelope file");
      return;
    }

    try {
      setStatus("Reading envelope file...");
      const text = await file.text();
      const decrypted = await decryptEnvelope(text, password);
      const saltHex = decrypted.salt;

      setStatus("Fetching commitment + nonce from server...");
      const res = await fetch(`${SERVER}/commitment/${username}`);
      if (!res.ok) throw new Error("Failed to fetch commitment/nonce");
      const { commitment, nonce } = await res.json();

      setStatus("Generating login proof...");
      const secretHex = walletSecretFromAddress(walletAddr);

      const inputSignals = {
        secret: BigInt("0x" + secretHex).toString(),
        salt: BigInt("0x" + saltHex).toString(),
        unameHash: BigInt("0x" + keccak256(username)).toString(),
        storedCommitment: BigInt(commitment).toString(),
        nonce: BigInt(nonce).toString(),
      };

      const { proof, publicSignals } = await generateProof(inputSignals, "login");

      setStatus("Submitting login proof...");
      const loginRes = await fetch(`${SERVER}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, proof, publicSignals }),
      });

      const data = await loginRes.json();
      if (!loginRes.ok) throw new Error(data.error || "Login failed");

      setSession(data.session);
      setStatus("Login successful ✅");
    } catch (err: any) {
      console.error(err);
      setStatus("Error: " + err.message);
    }
  }

  return (
    <div style={{ maxWidth: 600, margin: "auto" }}>
      <h1>Login</h1>

      <input
        placeholder="Username"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        style={{ width: "100%", marginBottom: "8px", padding: "8px" }}
      />

      <input
        placeholder="Wallet Address"
        value={walletAddr}
        onChange={(e) => setWalletAddr(e.target.value)}
        style={{ width: "100%", marginBottom: "8px", padding: "8px" }}
      />

      <input
        type="password"
        placeholder="Password to decrypt envelope"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        style={{ width: "100%", marginBottom: "8px", padding: "8px" }}
      />

      <input
        type="file"
        accept=".json"
        onChange={(e) => setFile(e.target.files?.[0] || null)}
        style={{ marginBottom: "10px" }}
      />

      <button onClick={handleLogin} style={{ padding: "8px 16px" }}>
        Login
      </button>

      {status && <p><strong>Status:</strong> {status}</p>}
      {session && <p><strong>Session:</strong> {session}</p>}
    </div>
  );
}
