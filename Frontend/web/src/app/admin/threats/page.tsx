"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import AdminShell from "@/components/admin/AdminShell";
import { useSmartPolling } from "@/hooks/useSmartPolling";

type ThreatLog = {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  threatScore: number;
  timestamp: number;
  reportedAt: number;
};

function ScoreBar({ score }: { score: number }) {
  const pct = Math.round(score * 100);
  const color = score >= 0.8 ? "#EF4444" : score >= 0.65 ? "#F59E0B" : "#10B981";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <div style={{ width: 80, height: 6, background: "rgba(255,255,255,0.08)", borderRadius: 3, overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: 3 }} />
      </div>
      <span style={{ color, fontSize: 13, fontWeight: 700, minWidth: 38 }}>{pct}%</span>
    </div>
  );
}

export default function ThreatsPage() {
  const router = useRouter();
  const [logs, setLogs] = useState<ThreatLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    const token = sessionStorage.getItem("adminToken");
    if (!token) { router.replace("/admin"); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/admin/threat-logs", { headers: { Authorization: `Bearer ${token}` } });
      if (res.status === 401) { router.replace("/admin"); return; }
      const data = await res.json();
      setLogs(prev => {
        const newLogs = data.logs || [];
        if (JSON.stringify(prev) === JSON.stringify(newLogs)) return prev;
        return newLogs;
      });
    } finally { setLoading(false); }
  }, [router]);

  useSmartPolling(load, 10000);

  const filtered = logs.filter(l =>
    l.senderId.toLowerCase().includes(search.toLowerCase()) ||
    l.receiverId.toLowerCase().includes(search.toLowerCase()) ||
    l.content.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AdminShell>
      <div>
        <h1 style={{ color: "#fff", fontSize: 26, fontWeight: 700, margin: "0 0 6px" }}>Threat Logs</h1>
        <p style={{ color: "#64748b", marginBottom: 28, fontSize: 14 }}>ML-flagged messages reported from mobile devices</p>

        {/* Controls */}
        <div style={{ display: "flex", gap: 12, marginBottom: 24, alignItems: "center", flexWrap: "wrap" }}>
          <input
            placeholder="🔍  Search sender, receiver, or content…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              flex: 1, maxWidth: 400, padding: "10px 16px", background: "rgba(15,23,42,0.8)",
              border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, color: "#fff",
              fontSize: 14, outline: "none",
            }}
          />
          <button onClick={load} style={{
            padding: "10px 18px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.1)",
            background: "rgba(30,41,59,0.6)", color: "#94a3b8", cursor: "pointer", fontSize: 13,
          }}>↻ Refresh</button>
          <div style={{ color: "#64748b", fontSize: 13 }}>{filtered.length} log{filtered.length !== 1 ? "s" : ""}</div>
        </div>

        {/* Legend */}
        <div style={{ display: "flex", gap: 20, marginBottom: 20 }}>
          {[["#EF4444", "≥ 80% Critical"], ["#F59E0B", "65–79% High"], ["#10B981", "< 65% Medium"]].map(([c, l]) => (
            <div key={l} style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div style={{ width: 10, height: 10, borderRadius: "50%", background: c }} />
              <span style={{ color: "#64748b", fontSize: 12 }}>{l}</span>
            </div>
          ))}
        </div>

        {/* Logs */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {loading ? (
            <div style={{ padding: 40, textAlign: "center", color: "#64748b", background: "rgba(15,23,42,0.85)", borderRadius: 16 }}>Loading threat logs…</div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: 40, textAlign: "center", color: "#64748b", background: "rgba(15,23,42,0.85)", borderRadius: 16 }}>
              {search ? "No matching logs" : "🎉 No threat logs yet — the system is clean!"}
            </div>
          ) : (
            filtered.map(log => {
              const isOpen = expanded === log.id;
              const score = log.threatScore;
              const borderColor = score >= 0.8 ? "rgba(239,68,68,0.25)" : "rgba(245,158,11,0.2)";
              return (
                <div key={log.id} style={{
                  background: "rgba(15,23,42,0.85)", border: `1px solid ${borderColor}`,
                  borderRadius: 14, overflow: "hidden", cursor: "pointer",
                }} onClick={() => setExpanded(isOpen ? null : log.id)}>
                  {/* Row */}
                  <div style={{ display: "flex", alignItems: "center", gap: 16, padding: "16px 24px", flexWrap: "wrap" }}>
                    <ScoreBar score={score} />
                    <div style={{ flex: 1, minWidth: 140 }}>
                      <span style={{ color: "#60A5FA", fontWeight: 600 }}>{log.senderId}</span>
                      <span style={{ color: "#64748b", margin: "0 8px" }}>→</span>
                      <span style={{ color: "#94a3b8" }}>{log.receiverId}</span>
                    </div>
                    <div style={{ color: "#64748b", fontSize: 13, flex: 2, minWidth: 100, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {log.content.substring(0, 80)}{log.content.length > 80 ? "…" : ""}
                    </div>
                    <div style={{ color: "#475569", fontSize: 12, whiteSpace: "nowrap" }}>
                      {new Date(log.timestamp).toLocaleString()}
                    </div>
                    <div style={{ color: "#64748b", fontSize: 16 }}>{isOpen ? "▲" : "▼"}</div>
                  </div>
                  {/* Expanded */}
                  {isOpen && (
                    <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", padding: "16px 24px", background: "rgba(30,41,59,0.3)" }}>
                      <div style={{ marginBottom: 8 }}>
                        <span style={{ color: "#64748b", fontSize: 12, fontWeight: 600 }}>FULL MESSAGE</span>
                      </div>
                      <p style={{ color: "#E2E8F0", fontSize: 14, lineHeight: 1.7, margin: "0 0 16px", wordBreak: "break-word" }}>{log.content}</p>
                      <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
                        {[
                          ["Threat Score", `${Math.round(log.threatScore * 100)}%`],
                          ["Sender", log.senderId],
                          ["Receiver", log.receiverId],
                          ["Sent At", new Date(log.timestamp).toLocaleString()],
                          ["Reported At", new Date(log.reportedAt).toLocaleString()],
                          ["Log ID", log.id.substring(0, 12) + "…"],
                        ].map(([k, v]) => (
                          <div key={k}>
                            <div style={{ color: "#64748b", fontSize: 11, marginBottom: 2 }}>{k}</div>
                            <div style={{ color: "#94a3b8", fontSize: 13 }}>{v}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </AdminShell>
  );
}
