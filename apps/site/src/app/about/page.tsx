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
    <article className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <h1 className="mb-4 text-3xl font-bold">{t('pages', 'about.title')}</h1>
      <p className="mb-8 text-lg text-gray-700">{t('pages', 'about.intro')}</p>

      <section className="mb-8">
        <h2 className="mb-3 text-2xl font-semibold">{t('pages', 'about.purposeHeading')}</h2>
        <p className="text-gray-700">{t('pages', 'about.purposeBody')}</p>
      </section>

      <section className="mb-8">
        <h2 className="mb-3 text-2xl font-semibold">{t('pages', 'about.principlesHeading')}</h2>
        <ul className="list-disc space-y-2 pl-6 text-gray-700">
          <li>{t('pages', 'about.principleNeverCompare')}</li>
          <li>{t('pages', 'about.principleSnapshots')}</li>
          <li>{t('pages', 'about.principleExactOnly')}</li>
          <li>{t('pages', 'about.principleNoRanking')}</li>
          <li>{t('pages', 'about.principleIndependent')}</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="mb-3 text-2xl font-semibold">{t('pages', 'about.openSourceHeading')}</h2>
        <p className="mb-4 text-gray-700">{t('pages', 'about.openSourceBody')}</p>
        <ul className="space-y-2">
          <li>
            <a
              href={siteConfig.repoUrl}
              className="text-blue-700 underline hover:text-blue-900"
              target="_blank"
              rel="noreferrer"
            >
              {t('pages', 'about.repoLink')}
            </a>
          </li>
          <li>
            <a
              href={`${siteConfig.repoUrl}/tree/main/data`}
              className="text-blue-700 underline hover:text-blue-900"
              target="_blank"
              rel="noreferrer"
            >
              {t('pages', 'about.dataLink')}
            </a>
          </li>
        </ul>
      </section>

      <section>
        <h2 className="mb-3 text-2xl font-semibold">{t('pages', 'about.contactHeading')}</h2>
        <p className="text-gray-700">
          {t('pages', 'about.contactBody', { email: siteConfig.contactEmail })}
        </p>
      </section>
    </article>
  );
}
