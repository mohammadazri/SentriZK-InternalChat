"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import AdminShell from "@/components/admin/AdminShell";
import Link from "next/link";
import { useSmartPolling } from "@/hooks/useSmartPolling";

function StatCard({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color: string }) {
  return (
    <div style={{
      background: "rgba(15,23,42,0.85)", border: `1px solid ${color}30`,
      borderRadius: 16, padding: "24px 28px", flex: 1, minWidth: 160,
    }}>
      <div style={{ color: "#64748b", fontSize: 12, fontWeight: 600, letterSpacing: 1, marginBottom: 10 }}>{label.toUpperCase()}</div>
      <div style={{ color: color, fontSize: 40, fontWeight: 700, lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ color: "#64748b", fontSize: 13, marginTop: 8 }}>{sub}</div>}
    </div>
  );
}

export default function AdminDashboard() {
  const router = useRouter();
  const [users, setUsers] = useState<{ username: string; status: string; registeredAt: number | null; lastLogin: number | null }[]>([]);
  const [threatCount, setThreatCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const token = sessionStorage.getItem("adminToken");
    if (!token) { router.replace("/admin"); return; }
    try {
      const [uRes, tRes] = await Promise.all([
        fetch("/api/admin/users", { headers: { Authorization: `Bearer ${token}` } }),
        fetch("/api/admin/threat-logs", { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      if (uRes.status === 401) { router.replace("/admin"); return; }
      
      const uData = await uRes.json();
      const tData = await tRes.json();

      setUsers(prev => {
        const newUsers = uData.users || [];
        if (JSON.stringify(prev) === JSON.stringify(newUsers)) return prev;
        return newUsers;
      });
      
      setThreatCount(prev => {
        const newTotal = tData.total || 0;
        if (prev === newTotal) return prev;
        return newTotal;
      });
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [router]);

  useSmartPolling(load, 10000);

  const activeCount = users.filter(u => u.status === "active").length;
  const heldCount = users.filter(u => u.status === "held").length;

  return (
    <AdminShell>
      <div>
        <h1 style={{ color: "#fff", fontSize: 26, fontWeight: 700, margin: "0 0 6px" }}>Dashboard</h1>
        <p style={{ color: "#64748b", marginBottom: 36, fontSize: 14 }}>Overview of your SentriZK system</p>

        {/* Stat cards */}
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 40 }}>
          <StatCard label="Total Users" value={loading ? "…" : users.length} sub="Registered in system" color="#60A5FA" />
          <StatCard label="Active" value={loading ? "…" : activeCount} sub="Currently allowed" color="#10B981" />
          <StatCard label="On Hold" value={loading ? "…" : heldCount} sub="Login suspended" color="#F59E0B" />
          <StatCard label="Threat Logs" value={loading ? "…" : threatCount} sub="ML flagged messages" color="#EF4444" />
        </div>

        {/* Recent users table */}
        <div style={{ background: "rgba(15,23,42,0.85)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, overflow: "hidden", marginBottom: 32 }}>
          <div style={{ padding: "20px 24px", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h2 style={{ color: "#fff", fontSize: 16, fontWeight: 600, margin: 0 }}>Recent Users</h2>
            <Link href="/admin/users" style={{ color: "#60A5FA", fontSize: 13, textDecoration: "none" }}>View All →</Link>
          </div>
          {loading ? (
            <div style={{ padding: 32, textAlign: "center", color: "#64748b" }}>Loading…</div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "rgba(30,41,59,0.5)" }}>
                  {["Username", "Status", "Registered", "Last Login"].map(h => (
                    <th key={h} style={{ padding: "12px 24px", color: "#64748b", fontSize: 12, fontWeight: 600, textAlign: "left", letterSpacing: 0.5 }}>{h.toUpperCase()}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {users.slice(0, 6).map((u, i) => (
                  <tr key={u.username} style={{ borderTop: i > 0 ? "1px solid rgba(255,255,255,0.04)" : undefined }}>
                    <td style={{ padding: "14px 24px", color: "#fff", fontWeight: 500 }}>{u.username}</td>
                    <td style={{ padding: "14px 24px" }}>
                      <span style={{
                        padding: "3px 10px", borderRadius: 20, fontSize: 12, fontWeight: 600,
                        background: u.status === "active" ? "rgba(16,185,129,0.12)" : "rgba(245,158,11,0.12)",
                        color: u.status === "active" ? "#10B981" : "#F59E0B",
                      }}>{u.status}</span>
                    </td>
                    <td style={{ padding: "14px 24px", color: "#94a3b8", fontSize: 13 }}>
                      {u.registeredAt ? new Date(u.registeredAt).toLocaleDateString() : "—"}
                    </td>
                    <td style={{ padding: "14px 24px", color: "#94a3b8", fontSize: 13 }}>
                      {u.lastLogin ? new Date(u.lastLogin).toLocaleDateString() : "Never"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Quick links */}
        <div style={{ display: "flex", gap: 16 }}>
          <Link href="/admin/threats" style={{ textDecoration: "none", flex: 1 }}>
            <div style={{
              background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)",
              borderRadius: 14, padding: "20px 24px", cursor: "pointer",
            }}>
              <div style={{ fontSize: 24, marginBottom: 8 }}>🚨</div>
              <div style={{ color: "#FCA5A5", fontWeight: 600, fontSize: 15 }}>Review Threat Logs</div>
              <div style={{ color: "#64748b", fontSize: 13, marginTop: 4 }}>{threatCount} flagged messages</div>
            </div>
          </Link>
          <Link href="/admin/users" style={{ textDecoration: "none", flex: 1 }}>
            <div style={{
              background: "rgba(37,99,235,0.08)", border: "1px solid rgba(37,99,235,0.2)",
              borderRadius: 14, padding: "20px 24px", cursor: "pointer",
            }}>
              <div style={{ fontSize: 24, marginBottom: 8 }}>👤</div>
              <div style={{ color: "#93C5FD", fontWeight: 600, fontSize: 15 }}>Manage Users</div>
              <div style={{ color: "#64748b", fontSize: 13, marginTop: 4 }}>{heldCount} on hold</div>
            </div>
          </Link>
        </div>
      </div>
    </AdminShell>
  );
}
