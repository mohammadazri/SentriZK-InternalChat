"use client";
import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import AdminShell from "@/components/admin/AdminShell";
import Link from "next/link";
import { useAdminStream } from "@/hooks/useAdminStream";
import { Users, ShieldAlert, Activity, UserX, ArrowRight } from "lucide-react";

function StatCard({ label, value, sub, color, Icon }: { label: string; value: string | number; sub?: string; color: string, Icon: any }) {
  return (
    <div style={{
      background: "#0F172A", border: `1px solid rgba(255,255,255,0.05)`,
      borderRadius: 16, padding: "24px", flex: 1, minWidth: 200,
      position: "relative", overflow: "hidden", display: "flex", flexDirection: "column"
    }}>
      <div style={{ position: "absolute", top: -20, right: -20, opacity: 0.1, color }}>
         <Icon size={120} strokeWidth={1} />
      </div>
      
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: color, boxShadow: `0 0 10px ${color}80` }} />
          <div style={{ color: "#94a3b8", fontSize: 13, fontWeight: 600, letterSpacing: 0.5 }}>{label.toUpperCase()}</div>
      </div>
      <div style={{ color: "#F8FAFC", fontSize: 42, fontWeight: 700, lineHeight: 1, zIndex: 1 }}>{value}</div>
      {sub && <div style={{ color: "#64748b", fontSize: 13, marginTop: 12, zIndex: 1 }}>{sub}</div>}
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

  useAdminStream(load);

  const activeCount = users.filter(u => u.status === "active").length;
  const heldCount = users.filter(u => u.status === "held").length;

  return (
    <AdminShell>
      <div>
        <h1 style={{ color: "#F8FAFC", fontSize: 28, fontWeight: 700, margin: "0 0 8px", letterSpacing: "-0.5px" }}>Dashboard</h1>
        <p style={{ color: "#94a3b8", marginBottom: 40, fontSize: 15 }}>Real-time overview of the SentriZK authentication and threat ecosystem.</p>

        {/* Stat cards */}
        <div style={{ display: "flex", gap: 20, flexWrap: "wrap", marginBottom: 40 }}>
          <StatCard label="Total Users" value={loading ? "…" : users.length} sub="Registered in system" color="#3B82F6" Icon={Users} />
          <StatCard label="Active Status" value={loading ? "…" : activeCount} sub="Currently allowed" color="#10B981" Icon={Activity} />
          <StatCard label="Suspended" value={loading ? "…" : heldCount} sub="Login suspended" color="#F59E0B" Icon={UserX} />
          <StatCard label="Threat Logs" value={loading ? "…" : threatCount} sub="ML flagged messages" color="#EF4444" Icon={ShieldAlert} />
        </div>

        <div style={{ display: "flex", gap: 24, flexWrap: "wrap", alignItems: "stretch" }}>
            {/* Recent users table */}
            <div style={{ flex: 2, background: "#0F172A", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 16, overflow: "hidden", minWidth: 500 }}>
            <div style={{ padding: "20px 24px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h2 style={{ color: "#F8FAFC", fontSize: 16, fontWeight: 600, margin: 0 }}>Recent Sign Ups</h2>
                <Link href="/admin/users" style={{ display: "flex", alignItems: "center", gap: 6, color: "#3B82F6", fontSize: 13, fontWeight: 600, textDecoration: "none" }}>
                    View Directory <ArrowRight size={14} />
                </Link>
            </div>
            {loading ? (
                <div style={{ padding: 40, textAlign: "center", color: "#64748b" }}>Loading…</div>
            ) : (
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                    <tr style={{ background: "rgba(30,41,59,0.3)", borderTop: "1px solid rgba(255,255,255,0.03)", borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
                    {["User", "Status", "Registered", "Last Login"].map(h => (
                        <th key={h} style={{ padding: "14px 24px", color: "#64748b", fontSize: 12, fontWeight: 600, textAlign: "left", letterSpacing: 0.5 }}>{h.toUpperCase()}</th>
                    ))}
                    </tr>
                </thead>
                <tbody>
                    {users.slice(0, 5).map((u) => (
                    <tr key={u.username} style={{ borderBottom: "1px solid rgba(255,255,255,0.03)", transition: "background 0.2s" }} onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.02)"} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                        <td style={{ padding: "16px 24px", color: "#E2E8F0", fontWeight: 600 }}>{u.username}</td>
                        <td style={{ padding: "16px 24px" }}>
                        <span style={{
                            padding: "4px 10px", borderRadius: 20, fontSize: 12, fontWeight: 700,
                            background: u.status === "active" ? "rgba(16,185,129,0.1)" : "rgba(245,158,11,0.1)",
                            color: u.status === "active" ? "#10B981" : "#F59E0B",
                            border: `1px solid ${u.status === "active" ? "rgba(16,185,129,0.2)" : "rgba(245,158,11,0.2)"}`
                        }}>{u.status.toUpperCase()}</span>
                        </td>
                        <td style={{ padding: "16px 24px", color: "#94a3b8", fontSize: 13 }}>
                        {u.registeredAt ? new Date(u.registeredAt).toLocaleDateString() : "—"}
                        </td>
                        <td style={{ padding: "16px 24px", color: "#94a3b8", fontSize: 13 }}>
                        {u.lastLogin ? new Date(u.lastLogin).toLocaleDateString() : "Never"}
                        </td>
                    </tr>
                    ))}
                </tbody>
                </table>
            )}
            </div>

            {/* Quick Actions Panel */}
            <div style={{ flex: 1, minWidth: 300, display: "flex", flexDirection: "column", gap: 16 }}>
                <Link href="/admin/threats" style={{ textDecoration: "none", flex: 1 }}>
                    <div style={{
                    height: "100%", background: "#0F172A", border: "1px solid rgba(255,255,255,0.05)",
                    borderRadius: 16, padding: "24px", display: "flex", flexDirection: "column", justifyContent: "center",
                    transition: "all 0.2s"
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = "rgba(239,68,68,0.05)"; e.currentTarget.style.borderColor = "rgba(239,68,68,0.2)"; }}
                    onMouseLeave={e => { e.currentTarget.style.background = "#0F172A"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.05)"; }}
                    >
                    <div style={{ width: 48, height: 48, borderRadius: 12, background: "rgba(239,68,68,0.1)", color: "#EF4444", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
                        <ShieldAlert size={24} />
                    </div>
                    <div style={{ color: "#F8FAFC", fontWeight: 600, fontSize: 16, marginBottom: 4 }}>Review Threat Logs</div>
                    <div style={{ color: "#94a3b8", fontSize: 14 }}>{threatCount} flagged messages require attention.</div>
                    </div>
                </Link>

                <Link href="/admin/users" style={{ textDecoration: "none", flex: 1 }}>
                    <div style={{
                    height: "100%", background: "#0F172A", border: "1px solid rgba(255,255,255,0.05)",
                    borderRadius: 16, padding: "24px", display: "flex", flexDirection: "column", justifyContent: "center",
                    transition: "all 0.2s"
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = "rgba(59,130,246,0.05)"; e.currentTarget.style.borderColor = "rgba(59,130,246,0.2)"; }}
                    onMouseLeave={e => { e.currentTarget.style.background = "#0F172A"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.05)"; }}
                    >
                    <div style={{ width: 48, height: 48, borderRadius: 12, background: "rgba(59,130,246,0.1)", color: "#3B82F6", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
                        <Users size={24} />
                    </div>
                    <div style={{ color: "#F8FAFC", fontWeight: 600, fontSize: 16, marginBottom: 4 }}>Manage Users</div>
                    <div style={{ color: "#94a3b8", fontSize: 14 }}>Hold, restore, or revoke network access.</div>
                    </div>
                </Link>
            </div>
        </div>

      </div>
    </AdminShell>
  );
}
