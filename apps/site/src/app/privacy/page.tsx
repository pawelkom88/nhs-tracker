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
    <article className="editorial-container max-w-3xl">
      <header className="page-header mb-8">
        <h1 className="text-3xl sm:text-4xl font-serif font-bold text-[#1c1917] mb-3">
          {t('pages', 'privacy.title')}
        </h1>
        <p className="page-intro text-base text-[#57534e] leading-relaxed">
          {t('pages', 'privacy.intro')}
        </p>
      </header>

      <section className="mb-8">
        <h2 className="text-xl font-serif font-bold text-[#1c1917] mb-3">
          {t('pages', 'privacy.analyticsHeading')}
        </h2>
        <p className="text-base text-[#57534e] leading-relaxed">
          {t('pages', 'privacy.analyticsBody')}
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-serif font-bold text-[#1c1917] mb-3">
          {t('pages', 'privacy.noAccountsHeading')}
        </h2>
        <p className="text-base text-[#57534e] leading-relaxed">
          {t('pages', 'privacy.noAccountsBody')}
        </p>
      </section>

      <section>
        <h2 className="text-xl font-serif font-bold text-[#1c1917] mb-3">
          {t('pages', 'privacy.contactHeading')}
        </h2>
        <p className="text-base text-[#57534e] leading-relaxed">
          {t('pages', 'privacy.contactBody', { email: siteConfig.contactEmail })}
        </p>
      </section>
    </article>
  );
}
