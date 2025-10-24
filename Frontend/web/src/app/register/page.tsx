"use client";

import React, { useState } from "react";
import { prepareRegistration, submitRegistration } from "@/auth/registerLogic";
import type { ProofBundle } from "@/lib/zkp";

export default function RegisterPage() {
  const [username, setUsername] = useState("");
  const [wallet, setWallet] = useState("");
  const [password, setPassword] = useState("");

  const [busy, setBusy] = useState(false);
  const [mnemonic, setMnemonic] = useState<string | null>(null);
  const [proofBundle, setProofBundle] = useState<ProofBundle | null>(null);
  const [envelope, setEnvelope] = useState<{ saltHex: string } | null>(null);
  const [savedConfirmed, setSavedConfirmed] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);

  // Prepare ZKP registration
  async function onPrepare(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    setBusy(true);

    try {
      const prep = await prepareRegistration(username, wallet, password);
      setMnemonic(prep.mnemonic);
      setProofBundle(prep.proofBundle);
      setEnvelope(prep.envelope);
      setMessage(`Prepared registration — commitment: ${prep.commitment}`);
    } catch (err: unknown) {
      setMessage(err instanceof Error ? `Error: ${err.message}` : `Error: ${String(err)}`);
    } finally {
      setBusy(false);
    }
  }

  // Submit registration and redirect to mobile app
  async function onSubmitRegistration() {
    if (!proofBundle) return setMessage("No proof available");
    if (!savedConfirmed) return setMessage("Please confirm you've saved the mnemonic");

    setBusy(true);
    setMessage(null);

    try {
      const resp = await submitRegistration(username, proofBundle);
      setToken(resp.token || null);
      setMessage(`Registration successful!`);

      // ✅ Redirect to mobile app
      if (resp.token && envelope?.saltHex) {
        const redirectUrl = `sentriapp://auth-callback?token=${encodeURIComponent(
          resp.token
        )}&username=${encodeURIComponent(username)}&salt=${encodeURIComponent(envelope.saltHex)}`;

        if (/android/i.test(navigator.userAgent)) {
          // Android: use intent: scheme for reliable app open
          const intentUrl = `intent://auth-callback?token=${encodeURIComponent(
            resp.token
          )}&username=${encodeURIComponent(username)}&salt=${encodeURIComponent(
            envelope.saltHex
          )}#Intent;scheme=sentriapp;package=com.example.mobile;end`;
          window.location.href = intentUrl;
        } else {
          // iOS / fallback
          window.location.href = redirectUrl;
        }
      }
    } catch (err: unknown) {
      setMessage(
        err instanceof Error ? `Registration failed: ${err.message}` : `Registration failed: ${String(err)}`
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <main style={{ padding: 20, maxWidth: 720 }}>
      <h1>Register (ZKP mobile-ready)</h1>

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
          <label>Password (encrypts recovery)</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        <div style={{ marginTop: 12 }}>
          <button type="submit" disabled={busy}>
            Prepare registration
          </button>
        </div>
      </form>

      {mnemonic && (
        <section style={{ marginTop: 20, border: "1px solid #ddd", padding: 12 }}>
          <h3>Recovery phrase (save securely)</h3>
          <p style={{ whiteSpace: "pre-wrap" }}>{mnemonic}</p>

          <div style={{ marginTop: 8 }}>
            <label>
              <input
                type="checkbox"
                checked={savedConfirmed}
                onChange={(e) => setSavedConfirmed(e.target.checked)}
              />{" "}
              I have saved the mnemonic
            </label>
          </div>

          <div style={{ marginTop: 8 }}>
            <button onClick={onSubmitRegistration} disabled={!savedConfirmed || busy}>
              Submit registration to server
            </button>
          </div>
        </section>
      )}

      {message && (
        <div style={{ marginTop: 12 }}>
          <strong>{message}</strong>
        </div>
      )}

      {token && (
        <div style={{ marginTop: 12 }}>
          <strong>Mobile token (store in secure storage): {token}</strong>
        </div>
      )}
    </main>
  );
}
