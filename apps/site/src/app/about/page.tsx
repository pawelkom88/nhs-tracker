import React from 'react';
import type { Metadata } from 'next';
import { t } from '../../i18n';
import { siteConfig } from '../../config/site';

export const metadata: Metadata = {
  title: t('pages', 'about.title'),
  description: t('pages', 'about.intro'),
};

export default function AboutPage() {
  return (
    <article className="editorial-container max-w-3xl">
      <header className="page-header mb-8">
        <h1 className="text-3xl sm:text-4xl font-serif font-bold text-[#1c1917] mb-3">
          {t('pages', 'about.title')}
        </h1>
        <p className="page-intro text-base text-[#57534e] leading-relaxed">
          {t('pages', 'about.intro')}
        </p>
      </header>

      <section className="mb-8">
        <h2 className="text-xl font-serif font-bold text-[#1c1917] mb-3">
          {t('pages', 'about.purposeHeading')}
        </h2>
        <p className="text-base text-[#57534e] leading-relaxed">
          {t('pages', 'about.purposeBody')}
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-serif font-bold text-[#1c1917] mb-3">
          {t('pages', 'about.principlesHeading')}
        </h2>
        <ul className="list-disc space-y-2 pl-6 text-[#57534e]">
          <li>{t('pages', 'about.principleNeverCompare')}</li>
          <li>{t('pages', 'about.principleSnapshots')}</li>
          <li>{t('pages', 'about.principleExactOnly')}</li>
          <li>{t('pages', 'about.principleNoRanking')}</li>
          <li>{t('pages', 'about.principleIndependent')}</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-serif font-bold text-[#1c1917] mb-3">
          {t('pages', 'about.openSourceHeading')}
        </h2>
        <p className="mb-4 text-base text-[#57534e] leading-relaxed">
          {t('pages', 'about.openSourceBody')}
        </p>
        <ul className="space-y-2">
          <li>
            <a
              href={siteConfig.repoUrl}
              className="text-[#044e54] underline hover:text-[#086972]"
              target="_blank"
              rel="noreferrer"
            >
              {t('pages', 'about.repoLink')}
            </a>
          </li>
          <li>
            <a
              href={`${siteConfig.repoUrl}/tree/main/data`}
              className="text-[#044e54] underline hover:text-[#086972]"
              target="_blank"
              rel="noreferrer"
            >
              {t('pages', 'about.dataLink')}
            </a>
          </li>
        </ul>
      </section>

      <section>
        <h2 className="text-xl font-serif font-bold text-[#1c1917] mb-3">
          {t('pages', 'about.contactHeading')}
        </h2>
        <p className="text-base text-[#57534e] leading-relaxed">
          {t('pages', 'about.contactBody', { email: siteConfig.contactEmail })}
        </p>
      </section>
    </article>
  );
}
