"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

const NAV = [
  { href: "/admin/dashboard", label: "Dashboard", icon: "⬛" },
  { href: "/admin/users", label: "Users", icon: "👤" },
  { href: "/admin/threats", label: "Threat Logs", icon: "🚨" },
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
        width: 220, background: "rgba(15,23,42,0.95)", borderRight: "1px solid rgba(255,255,255,0.07)",
        display: "flex", flexDirection: "column", padding: "0", flexShrink: 0,
      }}>
        {/* Brand */}
        <div style={{ padding: "28px 20px 20px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10, background: "linear-gradient(135deg, #2563EB, #7C3AED)",
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18,
            }}>🛡️</div>
            <div>
              <div style={{ color: "#fff", fontWeight: 700, fontSize: 15 }}>SentriZK</div>
              <div style={{ color: "#64748b", fontSize: 11 }}>Admin Panel</div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: "12px 0" }}>
          {NAV.map(({ href, label, icon }) => {
            const active = pathname.startsWith(href);
            return (
              <Link key={href} href={href} style={{ textDecoration: "none" }}>
                <div style={{
                  display: "flex", alignItems: "center", gap: 10, padding: "10px 20px",
                  margin: "2px 8px", borderRadius: 8, cursor: "pointer",
                  background: active ? "rgba(37,99,235,0.15)" : "transparent",
                  borderLeft: active ? "3px solid #2563EB" : "3px solid transparent",
                  color: active ? "#60A5FA" : "#94a3b8",
                  fontWeight: active ? 600 : 400, fontSize: 14,
                  transition: "all 0.15s ease",
                }}>
                  <span style={{ fontSize: 16 }}>{icon}</span>
                  {label}
                </div>
              </Link>
            );
          })}
        </nav>

        {/* Logout */}
        <div style={{ padding: "16px 16px 24px" }}>
          <button onClick={handleLogout} style={{
            width: "100%", padding: "10px", border: "1px solid rgba(239,68,68,0.3)",
            borderRadius: 8, background: "rgba(239,68,68,0.08)", color: "#EF4444",
            cursor: "pointer", fontSize: 14, fontWeight: 600,
          }}>
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main style={{ flex: 1, overflowY: "auto", padding: "36px 40px" }}>
        {children}
      </main>
    </div>
  );
}
