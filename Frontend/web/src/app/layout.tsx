import './globals.css';
import React, { ReactNode } from 'react';
import { ThemeProvider } from '@/components/theme-provider';

interface LayoutProps {
  children: ReactNode;
}

export const metadata = {
  title: 'SentriZK - Zero-Knowledge Authentication',
  description: 'Next-generation authentication powered by Zero-Knowledge Proofs',
};

export default function RootLayout({ children }: LayoutProps) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <main>{children}</main>
        </ThemeProvider>
      </body>
    </html>
  );
}
