import React from 'react';
import Link from 'next/link';
import type { Metadata } from 'next';
import { t } from '../i18n';
import { BorderNotice } from '../components/BorderNotice';

export const metadata: Metadata = {
  title: 'Page not found',
};

export default function NotFound() {
  return (
    <div className="not-found-page max-w-3xl mx-auto px-4 py-8">
      <h1>{t('not-found', 'heading')}</h1>
      <p className="mt-4 text-gray-700">{t('not-found', 'intro')}</p>

      <section className="mt-8">
        <h2>{t('not-found', 'nationSelectHeading')}</h2>
        <ul className="mt-4 list-disc pl-6 space-y-2">
          <li>
            <Link href="/england" className="text-blue-700 underline font-medium">
              {t('not-found', 'englandLink')}
            </Link>
          </li>
          <li>
            <Link href="/wales" className="text-blue-700 underline font-medium">
              {t('not-found', 'walesLink')}
            </Link>
          </li>
          <li>
            <Link href="/scotland" className="text-blue-700 underline font-medium">
              {t('not-found', 'scotlandLink')}
            </Link>
          </li>
        </ul>
      </section>

      <p className="mt-6">
        <Link href="/" className="text-blue-700 underline">
          {t('not-found', 'homeLink')}
        </Link>
      </p>

      <BorderNotice />
    </div>
  );
}
