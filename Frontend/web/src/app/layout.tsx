import './globals.css';
import React, { ReactNode } from 'react';

interface LayoutProps {
  children: ReactNode;
}

export const metadata = {
  title: 'SentriZK - Zero-Knowledge Authentication',
  description: 'Next-generation authentication powered by Zero-Knowledge Proofs',
};

export default function RootLayout({ children }: LayoutProps) {
  return (
    <html lang="en">
      <body>
        <main>{children}</main>
      </body>
    </html>
  );
}
