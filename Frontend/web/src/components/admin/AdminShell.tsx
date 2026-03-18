"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { LayoutDashboard, Users, ShieldAlert, LogOut, ShieldCheck } from "lucide-react";

const NAV = [
  { href: "/admin/dashboard", label: "Dashboard", Icon: LayoutDashboard },
  { href: "/admin/users", label: "Users", Icon: Users },
  { href: "/admin/threats", label: "Threat Logs", Icon: ShieldAlert },
];

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const token = sessionStorage.getItem("adminToken");
    if (!token) router.replace("/admin");
  }, [router]);

  function handleLogout() {
    sessionStorage.removeItem("adminToken");
    router.replace("/admin");
  }

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#0B0F19", fontFamily: "Inter, sans-serif" }}>
      {/* Sidebar */}
      <aside style={{
        width: 260, background: "#0F172A", borderRight: "1px solid rgba(255,255,255,0.05)",
        display: "flex", flexDirection: "column", flexShrink: 0,
      }}>
        {/* Brand */}
        <div style={{ padding: "32px 24px 24px", display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 12, background: "linear-gradient(135deg, #3B82F6, #8B5CF6)",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 4px 12px rgba(59, 130, 246, 0.3)"
          }}>
             <ShieldCheck color="#fff" size={22} strokeWidth={2.5} />
          </div>
          <div>
            <div style={{ color: "#F8FAFC", fontWeight: 700, fontSize: 18, letterSpacing: "-0.5px" }}>SentriZK</div>
            <div style={{ color: "#64748b", fontSize: 12, fontWeight: 500 }}>Command Center</div>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: "16px 12px", display: "flex", flexDirection: "column", gap: 6 }}>
          <div style={{ padding: "0 12px 8px", color: "#475569", fontSize: 11, fontWeight: 700, letterSpacing: "1px" }}>MENU</div>
          {NAV.map(({ href, label, Icon }) => {
            const active = pathname.startsWith(href);
            return (
              <Link key={href} href={href} style={{ textDecoration: "none" }}>
                <div style={{
                  display: "flex", alignItems: "center", gap: 12, padding: "12px 16px",
                  borderRadius: 10, cursor: "pointer",
                  background: active ? "rgba(59,130,246,0.1)" : "transparent",
                  color: active ? "#F8FAFC" : "#94a3b8",
                  fontWeight: active ? 600 : 500, fontSize: 14,
                  transition: "all 0.2s ease",
                }}
                onMouseEnter={(e) => { if (!active) e.currentTarget.style.color = "#E2E8F0"; }}
                onMouseLeave={(e) => { if (!active) e.currentTarget.style.color = "#94a3b8"; }}
                >
                  <Icon size={20} color={active ? "#60A5FA" : "#64748b"} />
                  {label}
                </div>
              </Link>
            );
          })}
        </nav>

        {/* Logout */}
        <div style={{ padding: "24px", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
          <button onClick={handleLogout} style={{
            width: "100%", padding: "12px", display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            borderRadius: 10, background: "transparent", border: "1px solid rgba(239,68,68,0.3)", 
            color: "#EF4444", cursor: "pointer", fontSize: 14, fontWeight: 600,
            transition: "all 0.2s ease",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(239,68,68,0.1)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
          >
            <LogOut size={18} /> Sign Out
          </button>
        </div>
      </aside>

      {/* Main content Area */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        
        {/* Top Header */}
        <header style={{
            height: 72, background: "rgba(15,23,42,0.6)", backdropFilter: "blur(12px)",
            borderBottom: "1px solid rgba(255,255,255,0.05)", display: "flex", alignItems: "center",
            justifyContent: "space-between", padding: "0 40px", flexShrink: 0
        }}>
            <div style={{ color: "#94a3b8", fontSize: 14, fontWeight: 500 }}>
                Admin Portal <span style={{ color: "#475569", margin: "0 8px" }}>/</span> <span style={{ color: "#F8FAFC" }}>{NAV.find(n => pathname.startsWith(n.href))?.label || "Overview"}</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#10B981", boxShadow: "0 0 10px #10B981" }} />
                <span style={{ color: "#F8FAFC", fontSize: 14, fontWeight: 500 }}>System Live</span>
            </div>
        </header>

        {/* Scrollable Content */}
        <main style={{ flex: 1, overflowY: "auto", padding: "40px 40px 80px" }}>
          <div style={{ maxWidth: 1100, margin: "0 auto" }}>
             {children}
          </div>
        </main>
      </div>
    </div>
  );
}
