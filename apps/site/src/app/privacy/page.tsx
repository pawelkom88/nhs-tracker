import React from 'react';
import type { Metadata } from 'next';
import { t } from '../../i18n';
import { siteConfig } from '../../config/site';

export const metadata: Metadata = {
  title: t('pages', 'privacy.title'),
  description: t('pages', 'privacy.intro'),
};

export default function PrivacyPage() {
  return (
    <article className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <h1 className="mb-4 text-3xl font-bold">{t('pages', 'privacy.title')}</h1>
      <p className="mb-8 text-lg text-gray-700">{t('pages', 'privacy.intro')}</p>

      <section className="mb-8">
        <h2 className="mb-3 text-2xl font-semibold">{t('pages', 'privacy.analyticsHeading')}</h2>
        <p className="text-gray-700">{t('pages', 'privacy.analyticsBody')}</p>
      </section>

      <section className="mb-8">
        <h2 className="mb-3 text-2xl font-semibold">{t('pages', 'privacy.noAccountsHeading')}</h2>
        <p className="text-gray-700">{t('pages', 'privacy.noAccountsBody')}</p>
      </section>

      <section>
        <h2 className="mb-3 text-2xl font-semibold">{t('pages', 'privacy.contactHeading')}</h2>
        <p className="text-gray-700">
          {t('pages', 'privacy.contactBody', { email: siteConfig.contactEmail })}
        </p>
      </section>
    </article>
  );
}
