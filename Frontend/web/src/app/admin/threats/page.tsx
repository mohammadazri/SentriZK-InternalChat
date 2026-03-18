"use client";
import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import AdminShell from "@/components/admin/AdminShell";
import { useAdminStream } from "@/hooks/useAdminStream";
import { Search, ShieldAlert, CheckCircle, XCircle, Trash2, Ban, ShieldCheck, ChevronDown, ChevronUp } from "lucide-react";

type ThreatLog = {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  threatScore: number;
  timestamp: number;
  reportedAt: number;
  resolutionStatus?: "pending" | "false-positive" | "true-positive";
  resolvedBy?: string;
  resolvedAt?: number;
};

function ConfirmModal({ message, actionText, onConfirm, onCancel, danger }: { message: string, actionText: string, onConfirm: () => void; onCancel: () => void; danger?: boolean }) {
    return (
      <div style={{ position: "fixed", inset: 0, background: "var(--admin-modal-bg)", backdropFilter: "blur(6px)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ background: "var(--admin-panel-bg)", border: "1px solid var(--admin-border-strong)", borderRadius: 16, padding: "32px 36px", maxWidth: 440, width: "100%", boxShadow: "0 20px 40px rgba(0,0,0,0.4)" }}>
          <p style={{ color: "var(--admin-text-main)", fontSize: 17, marginBottom: 32, fontWeight: 500, lineHeight: 1.5 }}>{message}</p>
          <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
            <button onClick={onCancel} style={{ padding: "10px 20px", borderRadius: 10, border: "1px solid var(--admin-border-strong)", background: "transparent", color: "var(--admin-text-muted)", cursor: "pointer", fontWeight: 600, transition: "background 0.2s" }} onMouseEnter={e=>e.currentTarget.style.background="var(--admin-panel-hover)"} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>Cancel</button>
            <button onClick={onConfirm} style={{ padding: "10px 24px", borderRadius: 10, border: "none", background: danger ? "#EF4444" : "#3B82F6", color: "#fff", fontWeight: 600, cursor: "pointer", boxShadow: `0 4px 12px ${danger ? "rgba(239,68,68,0.3)" : "rgba(59,130,246,0.3)"}` }}>{actionText}</button>
          </div>
        </div>
      </div>
    );
}

export default function ThreatsPage() {
  const router = useRouter();
  const [logs, setLogs] = useState<ThreatLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [expandedLog, setExpandedLog] = useState<string | null>(null);
  
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [confirmHold, setConfirmHold] = useState<string | null>(null);

  const showToast = (msg: string, ok: boolean) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 4000);
  };

  const load = useCallback(async () => {
    const token = sessionStorage.getItem("adminToken");
    if (!token) { router.replace("/admin"); return; }
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

  useAdminStream(load);

  const updateStatus = async (id: string, status: "false-positive" | "true-positive") => {
    setActionLoading(id);
    const token = sessionStorage.getItem("adminToken");
    try {
        const res = await fetch(`/api/admin/threat-logs/${id}/status`, {
            method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify({ status })
        });
        const data = await res.json();
        if (res.ok) { showToast(data.message, true); await load(); }
        else showToast(data.error || "Failed to update status", false);
    } catch { showToast("Network error", false); }
    finally { setActionLoading(null); }
  };

  const deleteLog = async (id: string) => {
    setActionLoading(id);
    const token = sessionStorage.getItem("adminToken");
    try {
        const res = await fetch(`/api/admin/threat-logs/${id}`, {
            method: "DELETE", headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (res.ok) { showToast("Threat log permanently deleted", true); await load(); setExpandedLog(null); }
        else showToast(data.error || "Failed to delete log", false);
    } catch { showToast("Network error", false); }
    finally { setActionLoading(null); }
  };

  const holdSender = async (username: string) => {
    setActionLoading(username);
    const token = sessionStorage.getItem("adminToken");
    try {
      const res = await fetch(`/api/admin/users/hold`, {
        method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ username }),
      });
      const data = await res.json();
      if (res.ok) showToast(`${username} has been suspended`, true);
      else showToast(data.error || "Error suspending user", false);
    } catch { showToast("Network error", false); }
    finally { setActionLoading(null); }
  }

  const filtered = logs.filter(l =>
    l.senderId.toLowerCase().includes(search.toLowerCase()) ||
    l.receiverId.toLowerCase().includes(search.toLowerCase()) ||
    l.content.toLowerCase().includes(search.toLowerCase())
  );

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
            {toast.ok ? <ShieldCheck size={18} color="#34D399" /> : <ShieldAlert size={18} color="#FCA5A5" />} 
            {toast.msg}
            </div>
        )}

        {/* Modals */}
        {confirmDelete && (
            <ConfirmModal 
                message="Are you sure you want to permanently delete this threat log? This action cannot be undone."
                actionText="Delete Log" danger onConfirm={() => { deleteLog(confirmDelete); setConfirmDelete(null); }} onCancel={() => setConfirmDelete(null)}
            />
        )}
        {confirmHold && (
            <ConfirmModal 
                message={`Suspend user "${confirmHold}"? This will immediately terminate their active sessions and prevent future logins.`}
                actionText="Suspend User" danger onConfirm={() => { holdSender(confirmHold); setConfirmHold(null); }} onCancel={() => setConfirmHold(null)}
            />
        )}

      <div>
        <h1 style={{ color: "var(--admin-text-main)", fontSize: 28, fontWeight: 700, margin: "0 0 8px", letterSpacing: "-0.5px" }}>Threat Logs</h1>
        <p style={{ color: "var(--admin-text-sub)", marginBottom: 36, fontSize: 15 }}>Triage and manage automated alerts from the SentriZK ML Moderation Engine.</p>

        {/* Search */}
        <div style={{ display: "flex", gap: 16, marginBottom: 24, alignItems: "center" }}>
          <div style={{ position: "relative", flex: 1, maxWidth: 440 }}>
            <Search size={18} color="var(--admin-text-muted)" style={{ position: "absolute", left: 16, top: 11 }} />
            <input
              placeholder="Search by username or message content…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{
                width: "100%", padding: "11px 16px 11px 44px", background: "var(--admin-input-bg)",
                border: "1px solid var(--admin-border)", borderRadius: 12, color: "var(--admin-text-main)",
                fontSize: 14, outline: "none", transition: "border 0.2s"
              }}
              onFocus={e => e.currentTarget.style.borderColor = "#3B82F6"}
              onBlur={e => e.currentTarget.style.borderColor = "var(--admin-border)"}
            />
          </div>
          <div style={{ color: "var(--admin-text-muted)", fontSize: 13, fontWeight: 500 }}>
             {filtered.length} {filtered.length === 1 ? "Alert" : "Alerts"} Found
          </div>
        </div>

        {/* Logs List */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {loading && logs.length === 0 ? (
            <div style={{ padding: 60, textAlign: "center", color: "var(--admin-text-muted)", background: "var(--admin-panel-bg)", borderRadius: 16, border: "1px solid var(--admin-border)", transition: "background 0.2s, border-color 0.2s" }}>Fetching threat models…</div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: 60, textAlign: "center", color: "var(--admin-text-muted)", background: "var(--admin-panel-bg)", borderRadius: 16, border: "1px solid var(--admin-border)", transition: "background 0.2s, border-color 0.2s" }}>Looks clean! No threats found.</div>
          ) : (
            filtered.map((log) => {
              const isExpanded = expandedLog === log.id;
              const isResolved = log.resolutionStatus === "true-positive" || log.resolutionStatus === "false-positive";
              let statusColor = "var(--admin-panel-bg)";
              let statusBorder = "var(--admin-border)";
              if (log.resolutionStatus === "true-positive") { statusColor = "rgba(239,68,68,0.05)"; statusBorder = "rgba(239,68,68,0.3)"; }
              else if (log.resolutionStatus === "false-positive") { statusColor = "rgba(16,185,129,0.05)"; statusBorder = "rgba(16,185,129,0.3)"; }
              else if (isExpanded) { statusBorder = "rgba(59,130,246,0.3)"; }


              return (
                <div key={log.id} style={{ 
                    background: statusColor, border: `1px solid ${statusBorder}`, borderRadius: 16, 
                    overflow: "hidden", transition: "all 0.2s ease" 
                }}>
                  {/* Closed Summary Header */}
                  <div 
                    onClick={() => setExpandedLog(isExpanded ? null : log.id)}
                    style={{ 
                        padding: "20px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", 
                        cursor: "pointer", background: isExpanded ? "var(--admin-panel-hover)" : "transparent"
                    }}
                    onMouseEnter={e => { if(!isExpanded) e.currentTarget.style.background = "var(--admin-panel-hover)"; }}
                    onMouseLeave={e => { if(!isExpanded) e.currentTarget.style.background = "transparent"; }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
                      
                      <div style={{ 
                          width: 44, height: 44, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center",
                          background: log.resolutionStatus === "false-positive" ? "rgba(16,185,129,0.15)" : "rgba(239,68,68,0.15)",
                          color: log.resolutionStatus === "false-positive" ? "#10B981" : "#EF4444"
                      }}>
                        <ShieldAlert size={22} />
                      </div>

                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                          <span style={{ color: "var(--admin-text-main)", fontWeight: 700, fontSize: 16 }}>{log.senderId}</span>
                          <span style={{ color: "var(--admin-text-muted)", fontSize: 13 }}>→</span>
                          <span style={{ color: "var(--admin-text-sub)", fontWeight: 500, fontSize: 15 }}>{log.receiverId}</span>
                          <span style={{ color: "var(--admin-text-muted)", fontSize: 12, marginLeft: 8 }}>{new Date(log.timestamp).toLocaleString(undefined, { month:'short', day:'numeric', hour:'numeric', minute:'2-digit'})}</span>
                        </div>
                        <div style={{ color: "var(--admin-text-muted)", fontSize: 14, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 600 }}>
                           "{log.content}"
                        </div>
                      </div>

                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
                        {log.resolutionStatus && log.resolutionStatus !== "pending" && (
                            <span style={{
                                padding: "6px 14px", borderRadius: 20, fontSize: 12, fontWeight: 700,
                                background: log.resolutionStatus === "true-positive" ? "rgba(239,68,68,0.15)" : "rgba(16,185,129,0.15)",
                                color: log.resolutionStatus === "true-positive" ? "#EF4444" : "#10B981", border: `1px solid ${log.resolutionStatus === "true-positive" ? "rgba(239,68,68,0.3)" : "rgba(16,185,129,0.3)"}`
                            }}>
                                {log.resolutionStatus === "true-positive" ? "CONFIRMED" : "FALSE ALARM"}
                            </span>
                        )}
                        {!log.resolutionStatus || log.resolutionStatus === "pending" ? (
                             <div style={{ textAlign: "right" }}>
                                <div style={{ color: "#EF4444", fontWeight: 700, fontSize: 18 }}>{(log.threatScore * 100).toFixed(1)}%</div>
                                <div style={{ color: "var(--admin-text-muted)", fontSize: 11, fontWeight: 600, letterSpacing: 0.5 }}>SEVERITY</div>
                             </div>
                        ) : null}
                         {isExpanded ? <ChevronUp size={20} color="var(--admin-text-muted)"/> : <ChevronDown size={20} color="var(--admin-text-muted)"/>}
                    </div>
                  </div>

                  {/* Expanded Content View */}
                  {isExpanded && (
                    <div style={{ borderTop: `1px solid ${statusBorder}`, background: "var(--admin-panel-hover)", padding: "24px 24px 24px 88px" }}>
                       <div style={{ color: "var(--admin-text-main)", fontSize: 15, lineHeight: 1.6, marginBottom: 24, padding: "16px", background: "var(--admin-bg)", borderRadius: 10, border: "1px solid var(--admin-border)", transition: "background 0.2s, border-color 0.2s" }}>
                          {log.content}
                       </div>
                       
                       {/* Action Buttons Container */}
                       <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
                          
                          {/* Only show Resolution and Suspend buttons if NOT already resolved */}
                          {!isResolved && (
                              <>
                                <button 
                                    disabled={!!actionLoading} 
                                    onClick={() => updateStatus(log.id, "true-positive")}
                                    style={{ padding: "10px 18px", borderRadius: 10, border: "none", background: "#EF4444", color: "#fff", cursor: "pointer", fontWeight: 600, fontSize: 14, display: "flex", alignItems: "center", gap: 8, boxShadow: "0 4px 12px rgba(239,68,68,0.2)" }}
                                ><CheckCircle size={16}/> Confirm True Positive</button>
                                
                                <button 
                                    disabled={!!actionLoading} 
                                    onClick={() => updateStatus(log.id, "false-positive")}
                                    style={{ padding: "10px 18px", borderRadius: 10, border: "1px solid rgba(16,185,129,0.5)", background: "rgba(16,185,129,0.1)", color: "#10B981", cursor: "pointer", fontWeight: 600, fontSize: 14, display: "flex", alignItems: "center", gap: 8 }}
                                ><XCircle size={16}/> Mark False Positive</button>

                                <div style={{ width: 1, height: 24, background: "var(--admin-border-strong)", margin: "0 8px" }} />
                                
                                <button 
                                    disabled={!!actionLoading} 
                                    onClick={() => setConfirmHold(log.senderId)}
                                    style={{ padding: "10px 18px", borderRadius: 10, border: "1px solid rgba(245,158,11,0.5)", background: "rgba(245,158,11,0.1)", color: "#FBBF24", cursor: "pointer", fontWeight: 600, fontSize: 14, display: "flex", alignItems: "center", gap: 8 }}
                                ><Ban size={16}/> Suspend Sender</button>
                              </>
                          )}

                          {/* Delete Data always shown */}
                          {isResolved && <div style={{ flex: 1 }} />}
                          <button 
                                disabled={!!actionLoading} 
                                onClick={() => setConfirmDelete(log.id)}
                                style={{ padding: "10px 18px", borderRadius: 10, border: "1px solid rgba(239,68,68,0.3)", background: "transparent", color: "#F87171", cursor: "pointer", fontWeight: 600, fontSize: 14, display: "flex", alignItems: "center", gap: 8, marginLeft: isResolved ? 0 : "auto", transition: "all 0.2s" }}
                                onMouseEnter={e=>e.currentTarget.style.background="rgba(239,68,68,0.1)"}
                                onMouseLeave={e=>e.currentTarget.style.background="transparent"}
                            ><Trash2 size={16}/> Delete Log</button>

                       </div>

                       {/* Resolution Meta Data */}
                       {isResolved && log.resolvedBy && (
                           <div style={{ marginTop: 20, color: "var(--admin-text-sub)", fontSize: 13, borderTop: "1px solid var(--admin-border)", paddingTop: 16 }}>
                               Resolved by <strong style={{ color: "var(--admin-text-main)" }}>{log.resolvedBy}</strong> on {new Date(log.resolvedAt!).toLocaleString()}
                           </div>
                       )}

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
