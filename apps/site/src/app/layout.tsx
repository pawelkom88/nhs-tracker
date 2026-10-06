import React from 'react';
import type { Metadata } from 'next';
import { t } from '../i18n';
import { siteConfig } from '../config/site';
import { SiteHeader } from '../components/SiteHeader';
import { Footer } from '../components/Footer';
import './globals.css';

export const metadata: Metadata = {
  title: siteConfig.siteName,
  description: siteConfig.siteDescription,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en-GB">
      <body className="flex min-h-screen flex-col bg-white text-gray-900 antialiased">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:p-4 focus:bg-white focus:text-black focus:ring-2 focus:ring-blue-600"
        >
          {t('layout', 'skipLink')}
        </a>
        <SiteHeader />
        <main id="main" className="flex-1">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}
