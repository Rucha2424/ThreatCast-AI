import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'UniHack — Product Data Enrichment Pipeline',
  description: 'AI-powered product data enrichment pipeline for Unilog (252 Delivery Format columns)',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-950 text-slate-100 antialiased">
        {children}
      </body>
    </html>
  );
}
