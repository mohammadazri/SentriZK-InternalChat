"use client";

// ---------------------------------------------
// File: src/app/auth/page.tsx
// A minimal Next.js page (React) implementing the registration UI.
// The UI:
//  - collects username, wallet address (text input for demo), password
//  - calls prepareRegistration()
//  - shows mnemonic & a "I saved it" checkbox
//  - lets user download envelope (.json)
//  - on user confirmation, calls submitRegistration()

import React, { useState } from "react";
import { prepareRegistration, submitRegistration } from "@/auth/registerLogic";

export default function RegisterPage() {
  const [username, setUsername] = useState("");
  const [wallet, setWallet] = useState("");
  const [password, setPassword] = useState("");

  const [busy, setBusy] = useState(false);
  const [mnemonic, setMnemonic] = useState<string | null>(null);
  const [envelopeJson, setEnvelopeJson] = useState<string | null>(null);
  const [proofBundle, setProofBundle] = useState<any | null>(null);
  const [savedConfirmed, setSavedConfirmed] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function onPrepare(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    setBusy(true);
    try {
      const prep = await prepareRegistration(username, wallet, password);
      setMnemonic(prep.mnemonic);
      setEnvelopeJson(prep.envelopeJson);
      setProofBundle(prep.proofBundle);
      setMessage(`Prepared registration — commitment: ${prep.commitment}`);
    } catch (err: any) {
      setMessage(`Error: ${String(err.message || err)}`);
    } finally {
      setBusy(false);
    }
  }

  function downloadEnvelope() {
    if (!envelopeJson) return;
    const blob = new Blob([envelopeJson], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${username || "recovery"}_envelope.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function onSubmitRegistration() {
    if (!proofBundle) return setMessage("No proof available");
    if (!savedConfirmed) return setMessage("Please confirm you've saved the mnemonic before continuing");

    setBusy(true);
    setMessage(null);
    try {
      const resp = await submitRegistration(username, proofBundle);
      setMessage(`Server response: ${JSON.stringify(resp)}`);
    } catch (err: any) {
      setMessage(`Registration failed: ${String(err.message || err)}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main style={{ padding: 20, maxWidth: 720 }}>
      <h1>Register (ZKP demo)</h1>
      <form onSubmit={onPrepare}>
        <div>
          <label>Username</label>
          <input value={username} onChange={(e) => setUsername(e.target.value)} />
        </div>
        <div>
          <label>Wallet address (demo)</label>
          <input value={wallet} onChange={(e) => setWallet(e.target.value)} />
        </div>
        <div>
          <label>Password (encrypts recovery file)</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        <div style={{ marginTop: 12 }}>
          <button type="submit" disabled={busy}>Prepare registration</button>
        </div>
      </form>

      {mnemonic && (
        <section style={{ marginTop: 20, border: "1px solid #ddd", padding: 12 }}>
          <h3>Recovery phrase (save this now)</h3>
          <p style={{ whiteSpace: "pre-wrap" }}>{mnemonic}</p>
          <div>
            <button onClick={downloadEnvelope}>Download encrypted envelope (.json)</button>
          </div>
          <div style={{ marginTop: 8 }}>
            <label>
              <input type="checkbox" checked={savedConfirmed} onChange={(e) => setSavedConfirmed(e.target.checked)} /> I have saved the mnemonic and downloaded the envelope
            </label>
          </div>
          <div style={{ marginTop: 8 }}>
            <button onClick={onSubmitRegistration} disabled={!savedConfirmed || busy}>Submit registration to server</button>
          </div>
        </section>
      )}

      {message && (
        <div style={{ marginTop: 12 }}>
          <strong>{message}</strong>
        </div>
      )}
    </main>
  );
}
