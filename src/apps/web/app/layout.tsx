import React from 'react';
import './styles.css';
import './extra.css';
import { AppShell } from './components/app-shell';
export const metadata = { title: 'Maanak — Legal Metrology' };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600;9..144,680&family=IBM+Plex+Mono:wght@500;700&display=swap" rel="stylesheet" />
      </head>
      <body><AppShell>{children}</AppShell></body>
    </html>
  );
}
