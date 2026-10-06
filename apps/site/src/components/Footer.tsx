import React from 'react';
import Link from 'next/link';
import { t } from '../i18n';
import { siteConfig } from '../config/site';
import { MistakeLink } from './MistakeLink';

export function Footer() {
  return (
    <footer className="border-t border-gray-200 bg-gray-50 py-8 text-sm text-gray-700">
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <p className="mb-4">
          <strong>{t('layout', 'footer.independenceStatement')}</strong>{' '}
          {t('layout', 'footer.disclaimer')}
        </p>
        <nav aria-label="Footer" className="flex flex-wrap gap-x-6 gap-y-2">
          <Link href="/about" className="underline hover:text-gray-900">
            {t('layout', 'footer.about')}
          </Link>
          <Link href="/sources" className="underline hover:text-gray-900">
            {t('layout', 'footer.sources')}
          </Link>
          <Link href="/privacy" className="underline hover:text-gray-900">
            {t('layout', 'footer.privacy')}
          </Link>
          <Link href="/accessibility" className="underline hover:text-gray-900">
            {t('layout', 'footer.accessibility')}
          </Link>
          <MistakeLink className="underline hover:text-gray-900" />
          <a href={`mailto:${siteConfig.contactEmail}`} className="underline hover:text-gray-900">
            {t('layout', 'footer.contact')}
          </a>
        </nav>
      </div>
    </footer>
  );
}
