"use client";

import React, { useEffect, useState } from "react";
import { prepareLogin } from "@/auth/loginLogic";
import { decryptSaltHex } from "@/lib/saltEncryption";
import { loginUser } from "@/auth/api";
import WalletConnector from "@/components/WalletConnector";
import { ThemeToggle } from "@/components/theme-toggle";

export default function SignInPage() {
  const [username, setUsername] = useState("");
  const [walletAddress, setWalletAddress] = useState("");
  const [mode, setMode] = useState<"file" | "recovered" | "paste">("recovered");
  const [password, setPassword] = useState("");
  const [fileContent, setFileContent] = useState<string>("");
  const [pastedSalt, setPastedSalt] = useState<string>("");
  const [saltHex, setSaltHex] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Prefill from recovery flow
    try {
      const recSalt = sessionStorage.getItem("recovered_salt_hex") || "";
      const recUser = sessionStorage.getItem("recovered_username") || "";
      if (recUser) setUsername(recUser);
      if (recSalt) {
        setSaltHex(recSalt);
        setMode("recovered");
      } else {
        setMode("file");
      }
    } catch {
      setMode("file");
    }
  }, []);

  const handleWalletConnected = (addr: string) => setWalletAddress(addr);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => setFileContent(String(reader.result || ""));
    reader.readAsText(f, "utf-8");
  }

  async function onSignIn(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);
    try {
      if (!username) throw new Error("Enter your username");
      if (!walletAddress) throw new Error("Connect your wallet");

      let finalSaltHex = saltHex;
      if (mode === "file") {
        if (!fileContent) throw new Error("Upload your encrypted salt file");
        if (!password || password.length < 8) throw new Error("Enter your file password (min 8 chars)");
        finalSaltHex = await decryptSaltHex(fileContent.trim(), password);
        setSaltHex(finalSaltHex);
      } else if (mode === "paste") {
        if (!pastedSalt || !/^[0-9a-fA-F]{2,}$/.test(pastedSalt.trim())) throw new Error("Enter a valid hex salt");
        finalSaltHex = pastedSalt.trim().toLowerCase();
        setSaltHex(finalSaltHex);
      } else {
        if (!finalSaltHex) throw new Error("No recovered salt found. Use 'Forgot Password' to derive it.");
      }

      setMessage("Generating zero-knowledge proof...");
      const { proofBundle } = await prepareLogin(username, walletAddress, { saltHex: finalSaltHex });

      setMessage("Authenticating with server...");
      const resp = await loginUser(username, proofBundle);
      if (!resp.token) throw new Error("Login failed: no token received");

      setMessage("✅ Login successful. You may now close this tab.");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg-primary)", transition: "background 0.3s" }}>
      <ThemeToggle />
      <div style={{ width: "100%", maxWidth: 880, background: "var(--surface)", backdropFilter: "blur(10px)", border: "1px solid var(--border-subtle)", borderRadius: 16, padding: 24, color: "var(--text-primary)", boxShadow: "0 10px 40px rgba(0,0,0,0.1)", transition: "background 0.3s, color 0.3s" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
          <div style={{ width: 40, height: 40, borderRadius: 8, background: "linear-gradient(135deg,#06b6d4,#10b981)", display: "grid", placeItems: "center" }}>🔐</div>
          <div>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>Sign In (Cross-Device)</h1>
            <p style={{ margin: "4px 0 0", opacity: 0.8, fontSize: 14 }}>Use your encrypted salt file or recovered salt to authenticate on this device.</p>
          </div>
        </div>

        <form onSubmit={onSignIn} style={{ display: "grid", gap: 16 }}>
          <div style={{ display: "grid", gap: 8 }}>
            <label htmlFor="username">Username</label>
            <input id="username" value={username} onChange={(e) => setUsername(e.target.value.toLowerCase())} placeholder="your-username" required style={{ background: "transparent", border: "1px solid var(--border-subtle)", color: "var(--text-primary)", padding: "10px 12px", borderRadius: 10 }} />
          </div>

          <div style={{ display: "grid", gap: 8 }}>
            <label>Connect Wallet</label>
            <WalletConnector onWalletConnected={handleWalletConnected} />
            {walletAddress && <div style={{ fontSize: 13, opacity: 0.8 }}>Connected: {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}</div>}
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button type="button" onClick={() => setMode("recovered")} style={{ background: mode === "recovered" ? "var(--accent)" : "transparent", border: "1px solid var(--border-subtle)", color: mode === "recovered" ? "#fff" : "var(--text-primary)", padding: "8px 12px", borderRadius: 8, transition: "all 0.2s" }}>Recovered Salt</button>
            <button type="button" onClick={() => setMode("file")} style={{ background: mode === "file" ? "var(--accent)" : "transparent", border: "1px solid var(--border-subtle)", color: mode === "file" ? "#fff" : "var(--text-primary)", padding: "8px 12px", borderRadius: 8, transition: "all 0.2s" }}>Encrypted File</button>
            <button type="button" onClick={() => setMode("paste")} style={{ background: mode === "paste" ? "var(--accent)" : "transparent", border: "1px solid var(--border-subtle)", color: mode === "paste" ? "#fff" : "var(--text-primary)", padding: "8px 12px", borderRadius: 8, transition: "all 0.2s" }}>Paste Salt</button>
          </div>

          {mode === "recovered" && (
            <div style={{ display: "grid", gap: 8 }}>
              <label>Recovered Salt</label>
              <code style={{ background: "var(--bg-primary)", border: "1px solid var(--border-subtle)", padding: "8px 10px", borderRadius: 8, wordBreak: "break-all", color: "var(--text-primary)" }}>{saltHex || "(none) - go to Forgot Password to derive"}</code>
              <div style={{ display: "flex", gap: 8 }}>
                <a href="/forgot-password" style={{ color: "var(--accent)" }}>Forgot Password (derive salt)</a>
                {saltHex && <button type="button" onClick={() => navigator.clipboard.writeText(saltHex)} style={{ background: "transparent", border: "1px solid var(--border-subtle)", color: "var(--text-primary)", padding: "6px 10px", borderRadius: 8 }}>Copy</button>}
              </div>
            </div>
          )}

          {mode === "file" && (
            <div style={{ display: "grid", gap: 12 }}>
              <div style={{ display: "grid", gap: 8 }}>
                <label>Upload Encrypted Salt File</label>
                <input type="file" accept=".txt,.enc,.json" onChange={handleFileChange} style={{ background: "transparent", border: "1px solid var(--border-subtle)", color: "var(--text-primary)", padding: "10px 12px", borderRadius: 10 }} />
                <small style={{ opacity: 0.75, color: "var(--text-secondary)" }}>Tip: This is the file you downloaded during registration or from recovery.</small>
              </div>
              <div style={{ display: "grid", gap: 8 }}>
                <label>File Password</label>
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter file password" style={{ background: "transparent", border: "1px solid var(--border-subtle)", color: "var(--text-primary)", padding: "10px 12px", borderRadius: 10 }} />
              </div>
            </div>
          )}

          {mode === "paste" && (
            <div style={{ display: "grid", gap: 8 }}>
              <label>Salt (hex)</label>
              <input value={pastedSalt} onChange={(e) => setPastedSalt(e.target.value)} placeholder="e.g. 9fa2..." style={{ background: "transparent", border: "1px solid var(--border-subtle)", color: "var(--text-primary)", padding: "10px 12px", borderRadius: 10 }} />
              <small style={{ opacity: 0.75, color: "var(--text-secondary)" }}>Only paste if you fully trust this device and environment.</small>
            </div>
          )}

          {error && (
            <div style={{ background: "rgba(239, 68, 68, 0.1)", border: "1px solid var(--danger)", padding: 12, borderRadius: 10, color: "var(--danger)" }}>{error}</div>
          )}
          {message && (
            <div style={{ background: "rgba(16, 185, 129, 0.1)", border: "1px solid var(--success)", padding: 12, borderRadius: 10, color: "var(--success)" }}>{message}</div>
          )}

          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <button disabled={loading} type="submit" style={{ background: "var(--accent)", border: "none", color: "white", padding: "10px 16px", borderRadius: 10, fontWeight: 600 }}>
              {loading ? "Signing in..." : "Sign In Securely"}
            </button>
            <a href="/forgot-password" style={{ color: "var(--accent)" }}>Forgot Password?</a>
          </div>
        </form>
      </div>
    </div>
  );
}
