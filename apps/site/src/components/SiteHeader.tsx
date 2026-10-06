import React from 'react';
import Link from 'next/link';
import { t } from '../i18n';

export function SiteHeader() {
  return (
    <header className="border-b border-gray-200 bg-white">
      <div className="mx-auto max-w-5xl px-4 py-4 sm:px-6">
        <Link href="/" className="text-xl font-bold text-gray-900 no-underline hover:underline">
          {t('layout', 'header.title')}
        </Link>
      </div>
    </header>
  );
}
