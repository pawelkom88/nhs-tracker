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
    <div className="editorial-container not-found-page max-w-3xl">
      <header className="page-header mb-8">
        <h1 className="text-3xl sm:text-4xl font-serif font-bold text-[#1c1917] mb-3">
          {t('not-found', 'heading')}
        </h1>
        <p className="page-intro text-base text-[#57534e] leading-relaxed">
          {t('not-found', 'intro')}
        </p>
      </header>

      <section className="mb-8">
        <h2 className="text-xl font-serif font-bold text-[#1c1917] mb-4">
          {t('not-found', 'nationSelectHeading')}
        </h2>
        <ul className="list-disc pl-6 space-y-2 text-[#57534e]">
          <li>
            <Link
              href="/england"
              className="text-[#044e54] hover:text-[#086972] underline font-medium"
            >
              {t('not-found', 'englandLink')}
            </Link>
          </li>
          <li>
            <Link
              href="/wales"
              className="text-[#044e54] hover:text-[#086972] underline font-medium"
            >
              {t('not-found', 'walesLink')}
            </Link>
          </li>
          <li>
            <Link
              href="/scotland"
              className="text-[#044e54] hover:text-[#086972] underline font-medium"
            >
              {t('not-found', 'scotlandLink')}
            </Link>
          </li>
        </ul>
      </section>

      <p className="mt-6">
        <Link href="/" className="text-[#044e54] hover:text-[#086972] underline">
          {t('not-found', 'homeLink')}
        </Link>
      </p>

      <BorderNotice />
    </div>
  );
}
