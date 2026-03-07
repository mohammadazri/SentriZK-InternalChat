"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { recoverSaltFromMnemonic } from "@/lib/secureCrypto";
import { encryptSaltHex } from "@/lib/saltEncryption";
import { KeyRound, Check, FileDown, Shield, Hexagon, Lock } from "lucide-react";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [mnemonic, setMnemonic] = useState("");
  const [bip39Passphrase, setBip39Passphrase] = useState("");
  const [saltHex, setSaltHex] = useState<string>("");
  const [encPassword, setEncPassword] = useState("");
  const [encryptedBundle, setEncryptedBundle] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const validMnemonic = useMemo(() => mnemonic.trim().split(/\s+/).length >= 12, [mnemonic]);

  async function onDeriveSalt(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setBusy(true);
    try {
      if (!validMnemonic) throw new Error("Please enter a valid BIP-39 recovery phrase (12/24 words)");
      const salt = await recoverSaltFromMnemonic(mnemonic.trim(), bip39Passphrase.trim());
      setSaltHex(salt);
      setMessage("Salt recovered successfully. You can now continue to sign in or create a new encrypted file.");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  async function onEncryptDownload() {
    try {
      setError(null);
      setMessage(null);
      if (!saltHex) throw new Error("Please derive the salt first");
      if (!encPassword || encPassword.length < 8) throw new Error("Set a password (min 8 chars) to encrypt the salt file");
      const enc = await encryptSaltHex(saltHex, encPassword);
      setEncryptedBundle(enc);
      const blob = new Blob([enc], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${username ? username + "-" : ""}sentrizk-salt.enc.txt`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setMessage("Encrypted salt file downloaded. Keep it safe.");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  function onContinueSignin() {
    if (!username) {
      setError("Please enter your username to continue");
      return;
    }
    if (!saltHex) {
      setError("Please derive your salt first");
      return;
    }
    try {
      sessionStorage.setItem("recovered_salt_hex", saltHex);
      sessionStorage.setItem("recovered_username", username.trim());
    } catch { }
    router.push("/signin");
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#0b0f19" }}>
      <div style={{ width: "100%", maxWidth: 820, background: "rgba(15,23,42,0.7)", backdropFilter: "blur(20px)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 24, padding: 48, color: "#f8fafc", boxShadow: "0 24px 64px rgba(0,0,0,0.4)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 32 }}>
          <div style={{ width: 56, height: 56, borderRadius: 14, background: "#2563eb", display: "grid", placeItems: "center", boxShadow: "0 4px 16px rgba(37, 99, 235, 0.3)" }}>
            <KeyRound size={28} color="white" />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: 28, fontWeight: 700 }}>Recover Salt via Recovery Phrase</h1>
            <p style={{ margin: "4px 0 0", color: "#94a3b8", fontSize: 15 }}>Use your 12/24-word mnemonic to derive your salt for cross-device sign-in.</p>
          </div>
        </div>

        <form onSubmit={onDeriveSalt} style={{ display: "grid", gap: 20 }}>
          <div style={{ display: "grid", gap: 8 }}>
            <label htmlFor="username" style={{ fontSize: 14, fontWeight: 600, color: "#cbd5e1" }}>Username</label>
            <input id="username" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="your-username" required style={{ background: "rgba(15,23,42,0.5)", border: "1px solid rgba(255,255,255,0.2)", color: "white", padding: "16px 20px", borderRadius: 14, fontSize: 16, outline: "none" }} />
          </div>

          <div style={{ display: "grid", gap: 8 }}>
            <label htmlFor="mnemonic" style={{ fontSize: 14, fontWeight: 600, color: "#cbd5e1" }}>Recovery Phrase (BIP-39)</label>
            <textarea id="mnemonic" value={mnemonic} onChange={(e) => setMnemonic(e.target.value)} placeholder="enter your 12/24-word phrase" rows={4} style={{ background: "rgba(15,23,42,0.5)", border: "1px solid rgba(255,255,255,0.2)", color: "white", padding: "16px 20px", borderRadius: 14, fontSize: 16, outline: "none", fontFamily: "inherit" }} />
            <small style={{ color: "#94a3b8", fontSize: 13 }}>Tip: Paste words separated by single spaces.</small>
          </div>

          <div style={{ display: "grid", gap: 8 }}>
            <label htmlFor="passphrase" style={{ fontSize: 14, fontWeight: 600, color: "#cbd5e1" }}>Optional BIP-39 Passphrase</label>
            <input id="passphrase" value={bip39Passphrase} onChange={(e) => setBip39Passphrase(e.target.value)} placeholder="leave blank if none" style={{ background: "rgba(15,23,42,0.5)", border: "1px solid rgba(255,255,255,0.2)", color: "white", padding: "16px 20px", borderRadius: 14, fontSize: 16, outline: "none" }} />
          </div>

          {error && (
            <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "16px 20px", background: "rgba(220, 38, 38, 0.1)", border: "1px solid rgba(220, 38, 38, 0.5)", borderRadius: 14, color: "#fca5a5", fontSize: 14, fontWeight: 500 }}>{error}</div>
          )}
          {message && (
            <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "16px 20px", background: "rgba(16, 185, 129, 0.1)", border: "1px solid rgba(16, 185, 129, 0.5)", borderRadius: 14, color: "#6ee7b7", fontSize: 14, fontWeight: 500 }}>{message}</div>
          )}

          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 8 }}>
            <button disabled={busy} type="submit" style={{ flex: 1, background: "#2563eb", border: "none", color: "white", padding: "16px 24px", borderRadius: 14, fontSize: 16, fontWeight: 600, cursor: "pointer", boxShadow: "0 4px 16px rgba(37,99,235,0.3)" }}>Derive Salt</button>
            <button type="button" disabled={!saltHex} onClick={onContinueSignin} style={{ flex: 1, background: "rgba(51, 65, 85, 0.5)", border: "1px solid rgba(255, 255, 255, 0.1)", color: "#cbd5e1", padding: "16px 24px", borderRadius: 14, fontSize: 16, fontWeight: 600, cursor: !saltHex ? "not-allowed" : "pointer" }}>Continue to Sign In</button>
          </div>
        </form>

        {saltHex && (
          <div style={{ marginTop: 32, display: "grid", gap: 20, borderTop: "1px solid rgba(255,255,255,0.1)", paddingTop: 32 }}>
            <div>
              <div style={{ color: "#94a3b8", fontSize: 13, fontWeight: 600, marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>Derived Salt (Hex)</div>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <code style={{ flex: 1, background: "rgba(15,23,42,0.5)", border: "1px solid rgba(255,255,255,0.1)", padding: "16px 20px", borderRadius: 14, wordBreak: "break-all", color: "#38bdf8", fontFamily: "Courier New, monospace" }}>{saltHex}</code>
                <button onClick={() => navigator.clipboard.writeText(saltHex)} style={{ background: "rgba(51, 65, 85, 0.5)", border: "1px solid rgba(255, 255, 255, 0.1)", color: "white", padding: "16px 24px", borderRadius: 14, fontWeight: 600, cursor: "pointer" }}>Copy</button>
              </div>
            </div>

            <div style={{ display: "grid", gap: 12, background: "rgba(30,41,59,0.3)", padding: 24, borderRadius: 16, border: "1px solid rgba(255,255,255,0.05)" }}>
              <label htmlFor="encpass" style={{ fontSize: 15, fontWeight: 600, color: "#f8fafc" }}>Create Encrypted Backup (Recommended)</label>
              <input id="encpass" type="password" value={encPassword} onChange={(e) => setEncPassword(e.target.value)} placeholder="Set a strong password for this file" style={{ background: "rgba(15,23,42,0.5)", border: "1px solid rgba(255,255,255,0.2)", color: "white", padding: "16px 20px", borderRadius: 14, fontSize: 16, outline: "none" }} />
              <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
                <button onClick={onEncryptDownload} disabled={!encPassword || encPassword.length < 8} style={{ display: "flex", alignItems: "center", gap: 8, background: "#2563eb", border: "none", color: "white", padding: "16px 24px", borderRadius: 14, fontWeight: 600, cursor: (!encPassword || encPassword.length < 8) ? "not-allowed" : "pointer" }}><FileDown size={18} /> Download Backup File</button>
              </div>
            </div>

            <div style={{ color: "#94a3b8", fontSize: 14, lineHeight: 1.6, marginTop: 8 }}>
              <strong>Security Tips:</strong> Never share your recovery phrase or salt. Prefer using the encrypted file for storage. Always connect the same wallet you used during registration.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
