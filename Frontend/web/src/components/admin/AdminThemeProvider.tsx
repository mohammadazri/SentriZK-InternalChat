"use client";
import React, { createContext, useContext, useEffect, useState } from "react";

type Theme = "dark" | "light";

interface AdminThemeContextProps {
  theme: Theme;
  toggleTheme: () => void;
}

const AdminThemeContext = createContext<AdminThemeContextProps | undefined>(undefined);

export function useAdminTheme() {
  const context = useContext(AdminThemeContext);
  if (!context) throw new Error("useAdminTheme must be used within an AdminThemeProvider");
  return context;
}

export function AdminThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>("dark");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Load preference from localStorage
    const saved = localStorage.getItem("adminTheme") as Theme;
    if (saved === "light" || saved === "dark") {
      setTheme(saved);
    }
    setMounted(true);
  }, []);

  const toggleTheme = () => {
    setTheme(prev => {
      const next = prev === "dark" ? "light" : "dark";
      localStorage.setItem("adminTheme", next);
      return next;
    });
  };

  // If we haven't read localStorage yet, don't render children to avoid flash of incorrect theme
  if (!mounted) return null;

  // We use standard Enterprise palette definitions mapped to CSS variables
  const cssVars = theme === "dark" ? `
    :root {
      --admin-bg: #0B0F19;
      --admin-panel-bg: #0F172A;
      --admin-panel-hover: rgba(255,255,255,0.02);
      --admin-border: rgba(255,255,255,0.05);
      --admin-border-strong: rgba(255,255,255,0.1);
      --admin-text-main: #F8FAFC;
      --admin-text-sub: #94a3b8;
      --admin-text-muted: #64748b;
      --admin-glass: rgba(15,23,42,0.6);
      --admin-input-bg: rgba(15,23,42,0.6);
      --admin-modal-bg: rgba(0,0,0,0.5);
    }
  ` : `
    :root {
      --admin-bg: #F8FAFC;
      --admin-panel-bg: #FFFFFF;
      --admin-panel-hover: rgba(0,0,0,0.02);
      --admin-border: rgba(0,0,0,0.08);
      --admin-border-strong: rgba(0,0,0,0.15);
      --admin-text-main: #0F172A;
      --admin-text-sub: #475569;
      --admin-text-muted: #94a3b8;
      --admin-glass: rgba(255,255,255,0.8);
      --admin-input-bg: #F1F5F9;
      --admin-modal-bg: rgba(15,23,42,0.4);
    }
  `;

  return (
    <AdminThemeContext.Provider value={{ theme, toggleTheme }}>
      {/* Inject variables dynamically to override any external stylesheets securely */}
      <style dangerouslySetInnerHTML={{ __html: cssVars }} />
      {/* Set root body color directly to prevent edge scrolling flash */}
      <div style={{ background: "var(--admin-bg)", minHeight: "100vh", color: "var(--admin-text-main)", transition: "background 0.2s, color 0.2s" }}>
         {children}
      </div>
    </AdminThemeContext.Provider>
  );
}
