"use client";

import { useState } from "react";
import { generateProof } from "../../lib/zkp";
import {
  generateRecoveryPhrase,
  recoverSaltFromMnemonic,
  encryptEnvelope,
  walletSecretFromAddress,
} from "../../lib/secureCrypto";
import { checkUsername, registerUser } from "../../lib/api";
import { keccak256 } from "js-sha3";

// Generate random 20-byte wallet address
function randomWalletAddress() {
  const arr = new Uint8Array(20);
  crypto.getRandomValues(arr);
  return "0x" + Array.from(arr).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export default function Register() {
  const [username, setUsername] = useState("");
  const [walletAddr, setWalletAddr] = useState("");
  const [password, setPassword] = useState("");
  const [mnemonic, setMnemonic] = useState("");
  const [status, setStatus] = useState("");

  async function handleRegister() {
    try {
      if (!password) {
        setStatus("Please enter a password to encrypt your envelope");
        return;
      }

      setStatus("Checking username...");
      if (!(await checkUsername(username))) {
        setStatus("Username already taken");
        return;
      }

      setStatus("Generating mnemonic...");
      const phrase = generateRecoveryPhrase();
      const saltHex = await recoverSaltFromMnemonic(phrase);

      const addr = walletAddr || randomWalletAddress();
      setWalletAddr(addr);
      const secretHex = walletSecretFromAddress(addr);

      setStatus("Encrypting JSON envelope...");
      const envelope = await encryptEnvelope(saltHex, password); // encrypt using user password

      // Trigger download so user can save JSON file
      const blob = new Blob([envelope], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${username}_envelope.json`;
      a.click();
      URL.revokeObjectURL(url);

      setMnemonic(phrase);

      setStatus("Generating registration proof...");
      const inputSignals = {
        secret: BigInt("0x" + secretHex).toString(),
        salt: BigInt("0x" + saltHex).toString(),
        unameHash: BigInt("0x" + keccak256(username)).toString(),
      };

      const { proof, publicSignals } = await generateProof(inputSignals, "registration");

      setStatus("Submitting registration...");
      const resp = await registerUser({
        username,
        proof,
        publicSignals,
        uniqProof: proof,
        uniqSignals: publicSignals,
      });

      setStatus("Registration complete ✅");
      console.log(resp);
    } catch (err: any) {
      console.error(err);
      setStatus("Error: " + err.message);
    }
  }

  return (
    <div style={{ maxWidth: 600, margin: "auto" }}>
      <h1>Register</h1>

      <input
        placeholder="Username"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        style={{ width: "100%", marginBottom: "8px", padding: "8px" }}
      />

      <input
        placeholder="Wallet Address (optional)"
        value={walletAddr}
        onChange={(e) => setWalletAddr(e.target.value)}
        style={{ width: "100%", marginBottom: "8px", padding: "8px" }}
      />
      <button
        onClick={() => setWalletAddr(randomWalletAddress())}
        style={{ marginBottom: "10px" }}
      >
        Generate Random Wallet
      </button>

      <input
        type="password"
        placeholder="Password for envelope encryption"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        style={{ width: "100%", marginBottom: "10px", padding: "8px" }}
      />

      <button onClick={handleRegister} style={{ padding: "8px 16px" }}>
        Register
      </button>

      {mnemonic && (
        <>
          <h3>Recovery Mnemonic</h3>
          <p>{mnemonic}</p>
        </>
      )}

      {status && <p><strong>Status:</strong> {status}</p>}
    </div>
  );
}
