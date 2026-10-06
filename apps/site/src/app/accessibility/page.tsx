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
    <article className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <h1 className="mb-4 text-3xl font-bold">{t('pages', 'accessibility.title')}</h1>
      <p className="mb-8 text-lg text-gray-700">{t('pages', 'accessibility.intro')}</p>

      <section className="mb-8">
        <h2 className="mb-3 text-2xl font-semibold">
          {t('pages', 'accessibility.standardsHeading')}
        </h2>
        <ul className="list-disc space-y-2 pl-6 text-gray-700">
          <li>{t('pages', 'accessibility.standardsListSemantic')}</li>
          <li>{t('pages', 'accessibility.standardsListNoJs')}</li>
          <li>{t('pages', 'accessibility.standardsListKeyboard')}</li>
          <li>{t('pages', 'accessibility.standardsListContrast')}</li>
        </ul>
      </section>

      <section>
        <h2 className="mb-3 text-2xl font-semibold">
          {t('pages', 'accessibility.feedbackHeading')}
        </h2>
        <p className="mb-4 text-gray-700">
          {t('pages', 'accessibility.feedbackBody', { email: siteConfig.contactEmail })}
        </p>
        <p>
          <a
            href={`${siteConfig.repoUrl}/issues`}
            className="text-blue-700 underline hover:text-blue-900"
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
