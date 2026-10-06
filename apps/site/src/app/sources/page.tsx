import React from 'react';
import type { Metadata } from 'next';
import { t } from '../../i18n';
import { siteConfig } from '../../config/site';

export const metadata: Metadata = {
  title: t('pages', 'sources.title'),
  description: t('pages', 'sources.intro'),
};

export default function SourcesPage() {
  return (
    <article className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <h1 className="mb-4 text-3xl font-bold">{t('pages', 'sources.title')}</h1>
      <p className="mb-8 text-lg text-gray-700">{t('pages', 'sources.intro')}</p>

      <section className="mb-8">
        <h2 className="mb-3 text-2xl font-semibold">{t('pages', 'sources.figuresHeading')}</h2>
        <div className="space-y-4 text-gray-700">
          <p>
            <strong>Official Figures:</strong> {t('pages', 'sources.officialFiguresDef')}
          </p>
          <p>
            <strong>Derived Figures:</strong> {t('pages', 'sources.derivedFiguresDef')}
          </p>
        </div>
      </section>

      <section className="mb-8">
        <h2 className="mb-3 text-2xl font-semibold">{t('pages', 'sources.englandHeading')}</h2>
        <p className="mb-1 text-gray-700">
          <strong>Publisher:</strong> {t('pages', 'sources.englandPublisher')}
        </p>
        <p className="mb-2 text-gray-700">
          <strong>Dataset:</strong> {t('pages', 'sources.englandDataset')}
        </p>
        <blockquote className="mb-3 border-l-4 border-gray-300 pl-4 italic text-gray-700">
          {t('pages', 'sources.englandAttribution')}
        </blockquote>
        <p>
          <a
            href="https://www.england.nhs.uk/statistics/statistical-work-areas/rtt-waiting-times/"
            className="text-blue-700 underline hover:text-blue-900"
            target="_blank"
            rel="noreferrer"
          >
            {t('pages', 'sources.englandSourceLink')}
          </a>
        </p>
      </section>

      <section className="mb-8">
        <h2 className="mb-3 text-2xl font-semibold">{t('pages', 'sources.walesHeading')}</h2>
        <p className="mb-1 text-gray-700">
          <strong>Publisher:</strong> {t('pages', 'sources.walesPublisher')}
        </p>
        <p className="mb-2 text-gray-700">
          <strong>Dataset:</strong> {t('pages', 'sources.walesDataset')}
        </p>
        <blockquote className="mb-3 border-l-4 border-gray-300 pl-4 italic text-gray-700">
          {t('pages', 'sources.walesAttribution')}
        </blockquote>
        <p>
          <a
            href="https://stats.gov.wales"
            className="text-blue-700 underline hover:text-blue-900"
            target="_blank"
            rel="noreferrer"
          >
            {t('pages', 'sources.walesSourceLink')}
          </a>
        </p>
      </section>

      <section className="mb-8">
        <h2 className="mb-3 text-2xl font-semibold">{t('pages', 'sources.scotlandHeading')}</h2>
        <p className="mb-1 text-gray-700">
          <strong>Publisher:</strong> {t('pages', 'sources.scotlandPublisher')}
        </p>
        <p className="mb-2 text-gray-700">
          <strong>Dataset:</strong> {t('pages', 'sources.scotlandDataset')}
        </p>
        <blockquote className="mb-3 border-l-4 border-gray-300 pl-4 italic text-gray-700">
          {t('pages', 'sources.scotlandAttribution')}
        </blockquote>
        <p>
          <a
            href="https://www.opendata.nhs.scot/dataset/stage-of-treatment-waiting-times"
            className="text-blue-700 underline hover:text-blue-900"
            target="_blank"
            rel="noreferrer"
          >
            {t('pages', 'sources.scotlandSourceLink')}
          </a>
        </p>
      </section>

      <section className="mb-8">
        <h2 className="mb-3 text-2xl font-semibold">{t('pages', 'sources.odsHeading')}</h2>
        <p className="mb-1 text-gray-700">
          <strong>Publisher:</strong> {t('pages', 'sources.odsPublisher')}
        </p>
        <p className="mb-2 text-gray-700">
          <strong>Dataset:</strong> {t('pages', 'sources.odsDataset')}
        </p>
        <blockquote className="mb-3 border-l-4 border-gray-300 pl-4 italic text-gray-700">
          {t('pages', 'sources.odsAttribution')}
        </blockquote>
        <p>
          <a
            href="https://digital.nhs.uk/services/organisation-data-service"
            className="text-blue-700 underline hover:text-blue-900"
            target="_blank"
            rel="noreferrer"
          >
            {t('pages', 'sources.odsSourceLink')}
          </a>
        </p>
      </section>

      <section className="mb-8">
        <h2 className="mb-3 text-2xl font-semibold">{t('pages', 'sources.oglHeading')}</h2>
        <p className="mb-3 text-gray-700">{t('pages', 'sources.oglBody')}</p>
        <p>
          <a
            href="https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/"
            className="text-blue-700 underline hover:text-blue-900"
            target="_blank"
            rel="noreferrer"
          >
            {t('pages', 'sources.oglLink')}
          </a>
        </p>
      </section>

      <section>
        <h2 className="mb-3 text-2xl font-semibold">{t('pages', 'sources.dataRepoHeading')}</h2>
        <p className="mb-3 text-gray-700">{t('pages', 'sources.dataRepoBody')}</p>
        <p>
          <a
            href={`${siteConfig.repoUrl}/tree/main/data`}
            className="text-blue-700 underline hover:text-blue-900"
            target="_blank"
            rel="noreferrer"
          >
            {t('pages', 'sources.dataRepoLink')}
          </a>
        </p>
      </section>
    </article>
  );
}
