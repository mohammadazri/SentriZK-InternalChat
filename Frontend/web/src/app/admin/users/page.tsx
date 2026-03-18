"use client";
import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import AdminShell from "@/components/admin/AdminShell";
import { useAdminStream } from "@/hooks/useAdminStream";
import { Search, Shield, Zap, CircleAlert, Ban } from "lucide-react";

type User = { username: string; status: string; registeredAt: number | null; lastLogin: number | null };

function ConfirmModal({ message, onConfirm, onCancel, danger }: { message: string; onConfirm: () => void; onCancel: () => void; danger?: boolean }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", backdropFilter: "blur(6px)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ background: "#0F172A", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 16, padding: "32px 36px", maxWidth: 440, width: "100%", boxShadow: "0 20px 40px rgba(0,0,0,0.4)" }}>
        <p style={{ color: "#F8FAFC", fontSize: 17, marginBottom: 32, fontWeight: 500, lineHeight: 1.5 }}>{message}</p>
        <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
          <button onClick={onCancel} style={{ padding: "10px 20px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.1)", background: "transparent", color: "#94a3b8", cursor: "pointer", fontWeight: 600, transition: "background 0.2s" }} onMouseEnter={e=>e.currentTarget.style.background="rgba(255,255,255,0.05)"} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>Cancel</button>
          <button onClick={onConfirm} style={{ padding: "10px 24px", borderRadius: 10, border: "none", background: danger ? "#EF4444" : "#F59E0B", color: "#fff", fontWeight: 600, cursor: "pointer", boxShadow: `0 4px 12px ${danger ? "rgba(239,68,68,0.3)" : "rgba(245,158,11,0.3)"}` }}>Confirm</button>
        </div>
      </div>
    </div>
  );
}

export default function UsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const [confirm, setConfirm] = useState<{ action: string; username: string } | null>(null);

  const showToast = (msg: string, ok: boolean) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  };

  const load = useCallback(async () => {
    const token = sessionStorage.getItem("adminToken");
    if (!token) { router.replace("/admin"); return; }
    try {
      const res = await fetch("/api/admin/users", { headers: { Authorization: `Bearer ${token}` } });
      if (res.status === 401) { router.replace("/admin"); return; }
      const data = await res.json();
      setUsers(prev => {
        const newUsers = data.users || [];
        if (JSON.stringify(prev) === JSON.stringify(newUsers)) return prev;
        return newUsers;
      });
    } finally { setLoading(false); }
  }, [router]);

  useAdminStream(load);

  async function doAction(action: string, username: string) {
    setActionLoading(username + action);
    const token = sessionStorage.getItem("adminToken");
    try {
      const res = await fetch(`/api/admin/users/${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ username }),
      });
      const data = await res.json();
      if (res.ok) { showToast(data.message, true); await load(); }
      else showToast(data.error || "Error", false);
    } catch { showToast("Network error", false); }
    finally { setActionLoading(null); }
  }

  const filtered = users.filter(u => u.username.toLowerCase().includes(search.toLowerCase()));

  return (
    <AdminShell>
      {/* Toast */}
      {toast && (
        <div style={{
          position: "fixed", top: 24, right: 24, zIndex: 200, padding: "14px 20px", borderRadius: 12, display: "flex", alignItems: "center", gap: 10,
          background: toast.ok ? "#064E3B" : "#7F1D1D",
          border: `1px solid ${toast.ok ? "#10B981" : "#EF4444"}`,
          color: "#F8FAFC", fontWeight: 600, fontSize: 14, boxShadow: "0 10px 25px rgba(0,0,0,0.5)"
        }}>
          {toast.ok ? <Shield size={18} color="#34D399" /> : <CircleAlert size={18} color="#FCA5A5" />} 
          {toast.msg}
        </div>
      )}

      {/* Confirm Modal */}
      {confirm && (
        <ConfirmModal
          message={confirm.action === "revoke"
            ? `Permanently revoke "${confirm.username}"? This deletes all their data across the entire network and cannot be undone.`
            : `Suspend "${confirm.username}"? Their active sessions will be terminated.`
          }
          danger={confirm.action === "revoke"}
          onConfirm={() => { const c = confirm; setConfirm(null); doAction(c.action, c.username); }}
          onCancel={() => setConfirm(null)}
        />
      )}

      <div>
        <h1 style={{ color: "#F8FAFC", fontSize: 28, fontWeight: 700, margin: "0 0 8px", letterSpacing: "-0.5px" }}>User Directory</h1>
        <p style={{ color: "#94a3b8", marginBottom: 36, fontSize: 15 }}>Manage network participants, enforce suspensions, or revoke access entirely.</p>

        {/* Search */}
        <div style={{ display: "flex", gap: 16, marginBottom: 24, alignItems: "center" }}>
          <div style={{ position: "relative", flex: 1, maxWidth: 380 }}>
            <Search size={18} color="#64748b" style={{ position: "absolute", left: 16, top: 11 }} />
            <input
              placeholder="Search by username…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{
                width: "100%", padding: "11px 16px 11px 44px", background: "rgba(15,23,42,0.6)",
                border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, color: "#F8FAFC",
                fontSize: 14, outline: "none", transition: "border 0.2s"
              }}
              onFocus={e => e.currentTarget.style.borderColor = "#3B82F6"}
              onBlur={e => e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"}
            />
          </div>
          <div style={{ color: "#64748b", fontSize: 13, fontWeight: 500 }}>
             {filtered.length} {filtered.length === 1 ? "Result" : "Results"}
          </div>
        </div>

        {/* Table */}
        <div style={{ background: "#0F172A", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 16, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "rgba(30,41,59,0.3)", borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
                {["Identity", "Status", "Joined", "Last Activity", "Actions"].map(h => (
                  <th key={h} style={{ padding: "16px 24px", color: "#64748b", fontSize: 12, fontWeight: 600, textAlign: "left", letterSpacing: 0.5 }}>{h.toUpperCase()}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading && users.length === 0 ? (
                <tr><td colSpan={5} style={{ padding: 60, textAlign: "center", color: "#64748b", fontSize: 15 }}>Fetching directory…</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={5} style={{ padding: 60, textAlign: "center", color: "#64748b", fontSize: 15 }}>No matching identities found.</td></tr>
              ) : (
                filtered.map((u, i) => (
                  <tr key={u.username} style={{ borderBottom: "1px solid rgba(255,255,255,0.03)", transition: "background 0.2s" }} onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.02)"} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                    {/* Username */}
                    <td style={{ padding: "18px 24px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                        <div style={{
                          width: 38, height: 38, borderRadius: 10, background: "linear-gradient(135deg,#2563EB,#7C3AED)",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          color: "#fff", fontWeight: 700, fontSize: 15, boxShadow: "0 2px 8px rgba(37,99,235,0.3)"
                        }}>{u.username[0].toUpperCase()}</div>
                        <span style={{ color: "#F8FAFC", fontWeight: 600 }}>{u.username}</span>
                      </div>
                    </td>

                    {/* Status badge */}
                    <td style={{ padding: "18px 24px" }}>
                      <span style={{
                        padding: "5px 12px", borderRadius: 20, fontSize: 12, fontWeight: 700,
                        background: u.status === "active" ? "rgba(16,185,129,0.1)" : "rgba(245,158,11,0.1)",
                        color: u.status === "active" ? "#10B981" : "#F59E0B",
                        border: `1px solid ${u.status === "active" ? "rgba(16,185,129,0.2)" : "rgba(245,158,11,0.2)"}`
                      }}>{u.status.toUpperCase()}</span>
                    </td>

                    {/* Dates */}
                    <td style={{ padding: "18px 24px", color: "#94a3b8", fontSize: 13, fontWeight: 500 }}>
                      {u.registeredAt ? new Date(u.registeredAt).toLocaleDateString(undefined, { year:'numeric', month:'short', day:'numeric' }) : "—"}
                    </td>
                    <td style={{ padding: "18px 24px", color: "#94a3b8", fontSize: 13, fontWeight: 500 }}>
                      {u.lastLogin ? new Date(u.lastLogin).toLocaleString(undefined, { year:'numeric', month:'short', day:'numeric', hour:'numeric', minute:'2-digit' }) : "Never"}
                    </td>

                    {/* Actions */}
                    <td style={{ padding: "18px 24px" }}>
                      <div style={{ display: "flex", gap: 8 }}>
                        {u.status === "active" ? (
                          <button
                            disabled={!!actionLoading}
                            onClick={() => setConfirm({ action: "hold", username: u.username })}
                            style={{
                              padding: "8px 16px", borderRadius: 8, border: "1px solid rgba(245,158,11,0.4)",
                              background: "rgba(245,158,11,0.08)", color: "#FBBF24",
                              cursor: "pointer", fontSize: 13, fontWeight: 600, transition: "all 0.2s"
                            }}
                            onMouseEnter={e=>e.currentTarget.style.background="rgba(245,158,11,0.15)"}
                            onMouseLeave={e=>e.currentTarget.style.background="rgba(245,158,11,0.08)"}
                            >
                              <div style={{ display: "flex", alignItems: "center", gap: 6 }}><Ban size={14}/> Suspend</div>
                            </button>
                        ) : (
                          <button
                            disabled={!!actionLoading}
                            onClick={() => doAction("restore", u.username)}
                            style={{
                              padding: "8px 16px", borderRadius: 8, border: "1px solid rgba(16,185,129,0.4)",
                              background: "rgba(16,185,129,0.08)", color: "#34D399",
                              cursor: "pointer", fontSize: 13, fontWeight: 600, transition: "all 0.2s"
                            }}
                            onMouseEnter={e=>e.currentTarget.style.background="rgba(16,185,129,0.15)"}
                            onMouseLeave={e=>e.currentTarget.style.background="rgba(16,185,129,0.08)"}
                            >
                              <div style={{ display: "flex", alignItems: "center", gap: 6 }}><Zap size={14}/> Restore</div>
                            </button>
                        )}
                        <button
                          disabled={!!actionLoading}
                          onClick={() => setConfirm({ action: "revoke", username: u.username })}
                          style={{
                            padding: "8px 16px", borderRadius: 8, border: "1px solid rgba(239,68,68,0.4)",
                            background: "rgba(239,68,68,0.08)", color: "#F87171",
                            cursor: "pointer", fontSize: 13, fontWeight: 600, transition: "all 0.2s"
                          }}
                          onMouseEnter={e=>e.currentTarget.style.background="rgba(239,68,68,0.15)"}
                          onMouseLeave={e=>e.currentTarget.style.background="rgba(239,68,68,0.08)"}
                          >Revoke</button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AdminShell>
  );
}
