import './globals.css';
import React, { ReactNode } from 'react';
import Link from 'next/link';

interface LayoutProps {
  children: ReactNode;
}

export default function RootLayout({ children }: LayoutProps) {
  return (
    <html lang="en">
      <body style={{ fontFamily: 'sans-serif', margin: 0, padding: 0 }}>
        <div style={{ maxWidth: 800, margin: '0 auto', padding: 20 }}>
          <header style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 40 }}>
            <h1>SentriZK</h1>
            <nav>
              <Link href="/" style={{ marginRight: 15 }}>Home</Link>
              <Link href="/register" style={{ marginRight: 15 }}>Register</Link>
              <Link href="/login">Login</Link>
            </nav>
          </header>

          <main>{children}</main>

          <footer style={{ marginTop: 40, textAlign: 'center', color: '#888' }}>
            &copy; {new Date().getFullYear()} SentriZK ZKP Demo
          </footer>
        </div>
      </body>
    </html>
  );
}
