import React from 'react';
import type { Metadata } from 'next';
import { t } from '../../i18n';
import { siteConfig } from '../../config/site';

export const metadata: Metadata = {
  title: t('pages', 'accessibility.title'),
  description: t('pages', 'accessibility.intro'),
};

export default function AccessibilityPage() {
  return (
    <article className="editorial-container max-w-3xl">
      <header className="page-header mb-8">
        <h1 className="text-3xl sm:text-4xl font-serif font-bold text-[#1c1917] mb-3">
          {t('pages', 'accessibility.title')}
        </h1>
        <p className="page-intro text-base text-[#57534e] leading-relaxed">
          {t('pages', 'accessibility.intro')}
        </p>
      </header>

      <section className="mb-8">
        <h2 className="text-xl font-serif font-bold text-[#1c1917] mb-3">
          {t('pages', 'accessibility.standardsHeading')}
        </h2>
        <ul className="list-disc space-y-2 pl-6 text-[#57534e]">
          <li>{t('pages', 'accessibility.standardsListSemantic')}</li>
          <li>{t('pages', 'accessibility.standardsListNoJs')}</li>
          <li>{t('pages', 'accessibility.standardsListKeyboard')}</li>
          <li>{t('pages', 'accessibility.standardsListContrast')}</li>
        </ul>
      </section>

      <section>
        <h2 className="text-xl font-serif font-bold text-[#1c1917] mb-3">
          {t('pages', 'accessibility.feedbackHeading')}
        </h2>
        <p className="mb-4 text-base text-[#57534e] leading-relaxed">
          {t('pages', 'accessibility.feedbackBody', { email: siteConfig.contactEmail })}
        </p>
        <p>
          <a
            href={`${siteConfig.repoUrl}/issues`}
            className="text-[#044e54] underline hover:text-[#086972]"
            target="_blank"
            rel="noreferrer"
          >
            {t('pages', 'accessibility.feedbackLink')}
          </a>
        </p>
      </section>
    </article>
  );
}
