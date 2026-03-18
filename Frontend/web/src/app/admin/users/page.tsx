"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import AdminShell from "@/components/admin/AdminShell";

type User = { username: string; status: string; registeredAt: number | null; lastLogin: number | null };

function ConfirmModal({ message, onConfirm, onCancel, danger }: { message: string; onConfirm: () => void; onCancel: () => void; danger?: boolean }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ background: "#0F172A", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 16, padding: 32, maxWidth: 420, width: "100%" }}>
        <p style={{ color: "#fff", fontSize: 16, marginBottom: 28 }}>{message}</p>
        <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
          <button onClick={onCancel} style={{ padding: "10px 20px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.1)", background: "transparent", color: "#94a3b8", cursor: "pointer" }}>Cancel</button>
          <button onClick={onConfirm} style={{ padding: "10px 20px", borderRadius: 8, border: "none", background: danger ? "#EF4444" : "#F59E0B", color: "#fff", fontWeight: 700, cursor: "pointer" }}>Confirm</button>
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
    setLoading(true);
    try {
      const res = await fetch("/api/admin/users", { headers: { Authorization: `Bearer ${token}` } });
      if (res.status === 401) { router.replace("/admin"); return; }
      const data = await res.json();
      setUsers(data.users || []);
    } finally { setLoading(false); }
  }, [router]);

  useEffect(() => { load(); }, [load]);

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
          position: "fixed", top: 24, right: 24, zIndex: 200, padding: "12px 20px", borderRadius: 10,
          background: toast.ok ? "rgba(16,185,129,0.15)" : "rgba(239,68,68,0.15)",
          border: `1px solid ${toast.ok ? "rgba(16,185,129,0.4)" : "rgba(239,68,68,0.4)"}`,
          color: toast.ok ? "#10B981" : "#EF4444", fontWeight: 600, fontSize: 14,
        }}>{toast.ok ? "✅" : "❌"} {toast.msg}</div>
      )}

      {/* Confirm Modal */}
      {confirm && (
        <ConfirmModal
          message={confirm.action === "revoke"
            ? `⚠️ Permanently revoke "${confirm.username}"? This cannot be undone.`
            : `Put "${confirm.username}" on hold? They won't be able to log in.`
          }
          danger={confirm.action === "revoke"}
          onConfirm={() => { const c = confirm; setConfirm(null); doAction(c.action, c.username); }}
          onCancel={() => setConfirm(null)}
        />
      )}

      <div>
        <h1 style={{ color: "#fff", fontSize: 26, fontWeight: 700, margin: "0 0 6px" }}>User Management</h1>
        <p style={{ color: "#64748b", marginBottom: 28, fontSize: 14 }}>Hold, restore, or revoke registered users</p>

        {/* Search */}
        <div style={{ display: "flex", gap: 12, marginBottom: 24, alignItems: "center" }}>
          <input
            placeholder="🔍  Search username…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              flex: 1, maxWidth: 340, padding: "10px 16px", background: "rgba(15,23,42,0.8)",
              border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, color: "#fff",
              fontSize: 14, outline: "none",
            }}
          />
          <div style={{ color: "#64748b", fontSize: 13 }}>{filtered.length} user{filtered.length !== 1 ? "s" : ""}</div>
        </div>

        {/* Table */}
        <div style={{ background: "rgba(15,23,42,0.85)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "rgba(30,41,59,0.6)" }}>
                {["Username", "Status", "Registered", "Last Login", "Actions"].map(h => (
                  <th key={h} style={{ padding: "14px 24px", color: "#64748b", fontSize: 12, fontWeight: 600, textAlign: "left", letterSpacing: 0.5 }}>{h.toUpperCase()}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} style={{ padding: 40, textAlign: "center", color: "#64748b" }}>Loading users…</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={5} style={{ padding: 40, textAlign: "center", color: "#64748b" }}>No users found</td></tr>
              ) : (
                filtered.map((u, i) => (
                  <tr key={u.username} style={{ borderTop: i > 0 ? "1px solid rgba(255,255,255,0.04)" : undefined }}>
                    {/* Username */}
                    <td style={{ padding: "16px 24px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <div style={{
                          width: 36, height: 36, borderRadius: "50%", background: "linear-gradient(135deg,#2563EB,#7C3AED)",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          color: "#fff", fontWeight: 700, fontSize: 14,
                        }}>{u.username[0].toUpperCase()}</div>
                        <span style={{ color: "#fff", fontWeight: 500 }}>{u.username}</span>
                      </div>
                    </td>

                    {/* Status badge */}
                    <td style={{ padding: "16px 24px" }}>
                      <span style={{
                        padding: "4px 12px", borderRadius: 20, fontSize: 12, fontWeight: 700,
                        background: u.status === "active" ? "rgba(16,185,129,0.12)" : "rgba(245,158,11,0.12)",
                        color: u.status === "active" ? "#10B981" : "#F59E0B",
                      }}>{u.status.toUpperCase()}</span>
                    </td>

                    {/* Dates */}
                    <td style={{ padding: "16px 24px", color: "#64748b", fontSize: 13 }}>
                      {u.registeredAt ? new Date(u.registeredAt).toLocaleDateString() : "—"}
                    </td>
                    <td style={{ padding: "16px 24px", color: "#64748b", fontSize: 13 }}>
                      {u.lastLogin ? new Date(u.lastLogin).toLocaleString() : "Never"}
                    </td>

                    {/* Actions */}
                    <td style={{ padding: "16px 24px" }}>
                      <div style={{ display: "flex", gap: 8 }}>
                        {u.status === "active" ? (
                          <button
                            disabled={!!actionLoading}
                            onClick={() => setConfirm({ action: "hold", username: u.username })}
                            style={{
                              padding: "6px 14px", borderRadius: 7, border: "1px solid rgba(245,158,11,0.4)",
                              background: "rgba(245,158,11,0.1)", color: "#F59E0B",
                              cursor: "pointer", fontSize: 12, fontWeight: 600,
                            }}>Hold</button>
                        ) : (
                          <button
                            disabled={!!actionLoading}
                            onClick={() => doAction("restore", u.username)}
                            style={{
                              padding: "6px 14px", borderRadius: 7, border: "1px solid rgba(16,185,129,0.4)",
                              background: "rgba(16,185,129,0.1)", color: "#10B981",
                              cursor: "pointer", fontSize: 12, fontWeight: 600,
                            }}>Restore</button>
                        )}
                        <button
                          disabled={!!actionLoading}
                          onClick={() => setConfirm({ action: "revoke", username: u.username })}
                          style={{
                            padding: "6px 14px", borderRadius: 7, border: "1px solid rgba(239,68,68,0.4)",
                            background: "rgba(239,68,68,0.1)", color: "#EF4444",
                            cursor: "pointer", fontSize: 12, fontWeight: 600,
                          }}>Revoke</button>
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
