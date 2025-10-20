"use client";

import { useState } from "react";
import { generateProof } from "../../lib/zkp";
import { decryptEnvelope, walletSecretFromAddress } from "../../lib/secureCrypto";
import { getCommitment, loginUser } from "../../lib/api";
import { keccak256 } from "js-sha3";

export default function Login() {
  const [username, setUsername] = useState("");
  const [jsonFileContent, setJsonFileContent] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState("");

  // Read uploaded JSON file
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    setJsonFileContent(text);
  };

  async function handleLogin() {
    try {
      if (!jsonFileContent || !password || !username) {
        setStatus("Please provide all inputs");
        return;
      }

      setStatus("Decrypting envelope...");
      const { salt } = await decryptEnvelope(jsonFileContent, password);

      setStatus("Fetching nonce...");
      const { commitment, nonce } = await getCommitment(username);

      setStatus("Generating login proof...");
      const secretHex = walletSecretFromAddress("0xYourWalletAddress"); // TODO: replace with actual wallet address

      const inputSignals = {
        secret: BigInt("0x" + secretHex).toString(),
        salt: BigInt("0x" + salt).toString(),
        unameHash: BigInt("0x" + keccak256(username)).toString(),
        nonce: BigInt(nonce).toString(),
        storedCommitment: BigInt(commitment).toString(),
      };

      const { proof, publicSignals } = await generateProof(inputSignals, "login");

      setStatus("Submitting login...");
      const resp = await loginUser({ username, proof, publicSignals });

      setStatus("Login successful ✅");
      console.log(resp);
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
        style={{ width: "100%", marginBottom: "10px", padding: "8px" }}
      />

      <input
        type="file"
        accept=".json"
        onChange={handleFileUpload}
        style={{ marginBottom: "10px" }}
      />

      <input
        placeholder="Password"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        style={{ width: "100%", marginBottom: "10px", padding: "8px" }}
      />

      <button onClick={handleLogin} style={{ padding: "8px 16px" }}>
        Login
      </button>

      {status && <p><strong>Status:</strong> {status}</p>}
    </div>
  );
}
