"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { LayoutDashboard, Users, ShieldAlert, LogOut, ShieldCheck, Sun, Moon } from "lucide-react";
import { AdminThemeProvider, useAdminTheme } from "./AdminThemeProvider";

const NAV = [
  { href: "/admin/dashboard", label: "Dashboard", Icon: LayoutDashboard },
  { href: "/admin/users", label: "Users", Icon: Users },
  { href: "/admin/threats", label: "Threat Logs", Icon: ShieldAlert },
];

function InnerAdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { theme, toggleTheme } = useAdminTheme();

  useEffect(() => {
    const token = sessionStorage.getItem("adminToken");
    if (!token) router.replace("/admin");
  }, [router]);

  function handleLogout() {
    sessionStorage.removeItem("adminToken");
    router.replace("/admin");
  }

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "var(--admin-bg)", fontFamily: "Inter, sans-serif", color: "var(--admin-text-main)", transition: "background 0.2s, color 0.2s" }}>
      {/* Sidebar */}
      <aside style={{
        width: 260, background: "var(--admin-panel-bg)", borderRight: "1px solid var(--admin-border)",
        display: "flex", flexDirection: "column", flexShrink: 0, transition: "background 0.2s, border-color 0.2s"
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
            <div style={{ color: "var(--admin-text-main)", fontWeight: 700, fontSize: 18, letterSpacing: "-0.5px" }}>SentriZK</div>
            <div style={{ color: "var(--admin-text-muted)", fontSize: 12, fontWeight: 500 }}>Command Center</div>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: "16px 12px", display: "flex", flexDirection: "column", gap: 6 }}>
          <div style={{ padding: "0 12px 8px", color: "var(--admin-text-sub)", fontSize: 11, fontWeight: 700, letterSpacing: "1px" }}>MENU</div>
          {NAV.map(({ href, label, Icon }) => {
            const active = pathname.startsWith(href);
            return (
              <Link key={href} href={href} style={{ textDecoration: "none" }}>
                <div style={{
                  display: "flex", alignItems: "center", gap: 12, padding: "12px 16px",
                  borderRadius: 10, cursor: "pointer",
                  background: active ? "rgba(59,130,246,0.1)" : "transparent",
                  color: active ? "var(--admin-text-main)" : "var(--admin-text-muted)",
                  fontWeight: active ? 600 : 500, fontSize: 14,
                  transition: "all 0.2s ease",
                }}
                onMouseEnter={(e) => { if (!active) e.currentTarget.style.color = "var(--admin-text-main)"; e.currentTarget.style.background = "var(--admin-panel-hover)"; }}
                onMouseLeave={(e) => { if (!active) e.currentTarget.style.color = "var(--admin-text-muted)"; e.currentTarget.style.background = "transparent"; }}
                >
                  <Icon size={20} color={active ? "#3B82F6" : "var(--admin-text-muted)"} />
                  {label}
                </div>
              </Link>
            );
          })}
        </nav>

        {/* Bottom Actions (Theme Toggle & Logout) */}
        <div style={{ padding: "20px 24px", borderTop: "1px solid var(--admin-border)" }}>
           
          {/* Theme Toggle */}
          <button onClick={toggleTheme} style={{
            width: "100%", padding: "12px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8,
            borderRadius: 10, background: "transparent", border: "1px solid var(--admin-border)", 
            color: "var(--admin-text-main)", cursor: "pointer", fontSize: 14, fontWeight: 600,
            transition: "all 0.2s ease", marginBottom: 12
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = "var(--admin-panel-hover)"; e.currentTarget.style.borderColor = "var(--admin-border-strong)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.borderColor = "var(--admin-border)"; }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                {theme === "dark" ? <Sun size={18} color="var(--admin-text-sub)" /> : <Moon size={18} color="var(--admin-text-sub)" />} 
                {theme === "dark" ? "Light Mode" : "Dark Mode"}
            </div>
            <div style={{ 
                width: 32, height: 18, borderRadius: 20, background: theme === "dark" ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)",
                position: "relative", display: "flex", alignItems: "center", padding: 2
            }}>
                <div style={{
                    width: 14, height: 14, borderRadius: "50%", background: theme === "dark" ? "#F8FAFC" : "#FFFFFF",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
                    transform: theme === "dark" ? "translateX(0)" : "translateX(14px)", transition: "transform 0.2s"
                }}/>
            </div>
          </button>

          {/* Logout Button */}
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
            height: 72, background: "var(--admin-glass)", backdropFilter: "blur(12px)",
            borderBottom: "1px solid var(--admin-border)", display: "flex", alignItems: "center",
            justifyContent: "space-between", padding: "0 40px", flexShrink: 0, transition: "background 0.2s, border-color 0.2s"
        }}>
            <div style={{ color: "var(--admin-text-muted)", fontSize: 14, fontWeight: 500 }}>
                Admin Portal <span style={{ color: "var(--admin-text-sub)", margin: "0 8px" }}>/</span> <span style={{ color: "var(--admin-text-main)" }}>{NAV.find(n => pathname.startsWith(n.href))?.label || "Overview"}</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#10B981", boxShadow: "0 0 10px #10B981" }} />
                <span style={{ color: "var(--admin-text-main)", fontSize: 14, fontWeight: 500 }}>System Live</span>
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

export default function AdminShell({ children }: { children: React.ReactNode }) {
  return (
    <AdminThemeProvider>
       <InnerAdminShell>{children}</InnerAdminShell>
    </AdminThemeProvider>
  );
}
