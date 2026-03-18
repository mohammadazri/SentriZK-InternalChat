"use client";
import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";

export default function AdminLoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Login failed");
        return;
      }
      sessionStorage.setItem("adminToken", data.token);
      router.push("/admin/dashboard");
    } catch {
      setError("Connection error — is the backend running?");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      minHeight: "100vh", background: "radial-gradient(ellipse at 60% 0%, rgba(37,99,235,0.15) 0%, #0B0F19 60%)",
      display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Inter, sans-serif",
    }}>
      <div style={{ width: "100%", maxWidth: 420, padding: "0 24px" }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <div style={{
            width: 64, height: 64, borderRadius: 18,
            background: "linear-gradient(135deg, #2563EB, #7C3AED)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 32, margin: "0 auto 16px",
          }}>🛡️</div>
          <h1 style={{ color: "#fff", fontSize: 26, fontWeight: 700, margin: 0 }}>SentriZK Admin</h1>
          <p style={{ color: "#64748b", marginTop: 6, fontSize: 14 }}>Secure administrative access</p>
        </div>

        {/* Card */}
        <div style={{
          background: "rgba(15,23,42,0.85)", backdropFilter: "blur(20px)",
          border: "1px solid rgba(255,255,255,0.08)", borderRadius: 20, padding: "36px 32px",
        }}>
          <form onSubmit={handleLogin}>
            {/* Username */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: "block", color: "#94a3b8", fontSize: 13, fontWeight: 600, marginBottom: 8 }}>
                USERNAME
              </label>
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                required
                autoComplete="username"
                placeholder="admin"
                style={{
                  width: "100%", padding: "13px 16px", background: "rgba(30,41,59,0.8)",
                  border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, color: "#fff",
                  fontSize: 15, outline: "none", boxSizing: "border-box",
                }}
              />
            </div>

            {/* Password */}
            <div style={{ marginBottom: 24 }}>
              <label style={{ display: "block", color: "#94a3b8", fontSize: 13, fontWeight: 600, marginBottom: 8 }}>
                PASSWORD
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                placeholder="••••••••"
                style={{
                  width: "100%", padding: "13px 16px", background: "rgba(30,41,59,0.8)",
                  border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, color: "#fff",
                  fontSize: 15, outline: "none", boxSizing: "border-box",
                }}
              />
            </div>

            {/* Error */}
            {error && (
              <div style={{
                background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.3)",
                borderRadius: 8, padding: "10px 14px", marginBottom: 20,
                color: "#FCA5A5", fontSize: 13,
              }}>
                ⚠️ {error}
              </div>
            )}

            {/* Submit */}
            <button type="submit" disabled={loading} style={{
              width: "100%", padding: "14px", borderRadius: 10, border: "none",
              background: loading ? "rgba(37,99,235,0.4)" : "linear-gradient(135deg, #2563EB, #3B82F6)",
              color: "#fff", fontSize: 15, fontWeight: 700, cursor: loading ? "not-allowed" : "pointer",
              letterSpacing: 0.5,
            }}>
              {loading ? "Authenticating..." : "Sign In"}
            </button>
          </form>
        </div>

        <p style={{ textAlign: "center", color: "#334155", marginTop: 24, fontSize: 12 }}>
          SentriZK Admin v1.0 · Restricted Access
        </p>
      </div>
    </div>
  );
}
