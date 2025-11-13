"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { recoverSaltFromMnemonic } from "@/lib/secureCrypto";
import { encryptSaltHex } from "@/lib/saltEncryption";

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
    } catch {}
    router.push("/signin");
  }

  return (
    <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background: "linear-gradient(135deg,#0f172a,#111827)"}}>
      <div style={{width:"100%",maxWidth:820,background:"rgba(17,24,39,0.6)",backdropFilter:"blur(10px)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:16,padding:24,color:"#e5e7eb",boxShadow:"0 10px 40px rgba(0,0,0,0.35)"}}>
        <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:16}}>
          <div style={{width:40,height:40,borderRadius:8,background:"linear-gradient(135deg,#06b6d4,#10b981)",display:"grid",placeItems:"center"}}>🔑</div>
          <div>
            <h1 style={{margin:0,fontSize:22,fontWeight:700}}>Recover Salt via Recovery Phrase</h1>
            <p style={{margin:"4px 0 0",opacity:0.8,fontSize:14}}>Use your 12/24-word mnemonic to derive your salt for cross-device sign-in.</p>
          </div>
        </div>

        <form onSubmit={onDeriveSalt} style={{display:"grid",gap:16}}>
          <div style={{display:"grid",gap:8}}>
            <label htmlFor="username">Username</label>
            <input id="username" value={username} onChange={(e)=>setUsername(e.target.value)} placeholder="your-username" required style={{background:"#0b1220",border:"1px solid #23304a",color:"#e5e7eb",padding:"10px 12px",borderRadius:10}}/>
          </div>

          <div style={{display:"grid",gap:8}}>
            <label htmlFor="mnemonic">Recovery Phrase (BIP-39)</label>
            <textarea id="mnemonic" value={mnemonic} onChange={(e)=>setMnemonic(e.target.value)} placeholder="enter your 12/24-word phrase" rows={4} style={{background:"#0b1220",border:"1px solid #23304a",color:"#e5e7eb",padding:"10px 12px",borderRadius:10}}/>
            <small style={{opacity:0.7}}>Tip: Paste words separated by single spaces.</small>
          </div>

          <div style={{display:"grid",gap:8}}>
            <label htmlFor="passphrase">Optional BIP-39 Passphrase</label>
            <input id="passphrase" value={bip39Passphrase} onChange={(e)=>setBip39Passphrase(e.target.value)} placeholder="leave blank if none" style={{background:"#0b1220",border:"1px solid #23304a",color:"#e5e7eb",padding:"10px 12px",borderRadius:10}}/>
          </div>

          {error && (
            <div style={{background:"#3f1d1d",border:"1px solid #7f1d1d",padding:12,borderRadius:10,color:"#fecaca"}}>{error}</div>
          )}
          {message && (
            <div style={{background:"#0f2f28",border:"1px solid #134e4a",padding:12,borderRadius:10,color:"#bbf7d0"}}>{message}</div>
          )}

          <div style={{display:"flex",gap:12,flexWrap:"wrap"}}>
            <button disabled={busy} type="submit" style={{background:"linear-gradient(135deg,#06b6d4,#10b981)",border:"none",color:"white",padding:"10px 16px",borderRadius:10,fontWeight:600}}>Derive Salt</button>
            <button type="button" disabled={!saltHex} onClick={onContinueSignin} style={{background:"#1f2937",border:"1px solid #374151",color:"#e5e7eb",padding:"10px 16px",borderRadius:10}}>Continue to Sign In</button>
          </div>
        </form>

        {saltHex && (
          <div style={{marginTop:18,display:"grid",gap:12,borderTop:"1px solid rgba(255,255,255,0.06)",paddingTop:16}}>
            <div>
              <div style={{opacity:0.8,marginBottom:6}}>Derived Salt (hex)</div>
              <div style={{display:"flex",alignItems:"center",gap:8}}>
                <code style={{background:"#0b1220",border:"1px solid #23304a",padding:"8px 10px",borderRadius:8,wordBreak:"break-all"}}>{saltHex}</code>
                <button onClick={()=>navigator.clipboard.writeText(saltHex)} style={{background:"#111827",border:"1px solid #374151",color:"#e5e7eb",padding:"6px 10px",borderRadius:8}}>Copy</button>
              </div>
            </div>

            <div style={{display:"grid",gap:8}}>
              <label htmlFor="encpass">Create Encrypted Salt File (optional)</label>
              <input id="encpass" type="password" value={encPassword} onChange={(e)=>setEncPassword(e.target.value)} placeholder="Set a new password for the file" style={{background:"#0b1220",border:"1px solid #23304a",color:"#e5e7eb",padding:"10px 12px",borderRadius:10}}/>
              <div style={{display:"flex",gap:10}}>
                <button onClick={onEncryptDownload} disabled={!encPassword || encPassword.length<8} style={{background:"#1f2937",border:"1px solid #374151",color:"#e5e7eb",padding:"10px 16px",borderRadius:10}}>Download Encrypted File</button>
              </div>
              {encryptedBundle && (
                <details style={{opacity:0.8}}>
                  <summary>Show encrypted bundle (base64)</summary>
                  <pre style={{whiteSpace:"pre-wrap",wordBreak:"break-all"}}>{encryptedBundle}</pre>
                </details>
              )}
            </div>

            <div style={{opacity:0.75,fontSize:13}}>
              Security Tips: Never share your recovery phrase or salt. Prefer using the encrypted file for storage. Always connect the same wallet you used during registration.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
