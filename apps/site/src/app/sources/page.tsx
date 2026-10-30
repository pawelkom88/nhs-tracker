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
    <article className="editorial-container max-w-3xl">
      <header className="page-header mb-8">
        <h1 className="text-3xl sm:text-4xl font-serif font-bold text-[#1c1917] mb-3">
          {t('pages', 'sources.title')}
        </h1>
        <p className="page-intro text-base text-[#57534e] leading-relaxed">
          {t('pages', 'sources.intro')}
        </p>
      </header>

      <section className="mb-8">
        <h2 className="text-xl font-serif font-bold text-[#1c1917] mb-3">
          {t('pages', 'sources.figuresHeading')}
        </h2>
        <div className="space-y-4 text-base text-[#57534e] leading-relaxed">
          <p>
            <strong className="text-[#1c1917]">{t('pages', 'sources.officialFiguresLabel')}</strong>{' '}
            {t('pages', 'sources.officialFiguresDef')}
          </p>
          <p>
            <strong className="text-[#1c1917]">{t('pages', 'sources.derivedFiguresLabel')}</strong>{' '}
            {t('pages', 'sources.derivedFiguresDef')}
          </p>
        </div>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-serif font-bold text-[#1c1917] mb-3">
          {t('pages', 'sources.englandHeading')}
        </h2>
        <p className="mb-1 text-base text-[#57534e]">
          <strong className="text-[#1c1917]">{t('pages', 'sources.publisherLabel')}</strong>{' '}
          {t('pages', 'sources.englandPublisher')}
        </p>
        <p className="mb-2 text-base text-[#57534e]">
          <strong className="text-[#1c1917]">{t('pages', 'sources.datasetLabel')}</strong>{' '}
          {t('pages', 'sources.englandDataset')}
        </p>
        <blockquote className="mb-3 border-l-4 border-[#e7e5e4] pl-4 italic text-[#57534e]">
          {t('pages', 'sources.englandAttribution')}
        </blockquote>
        <p>
          <a
            href="https://www.england.nhs.uk/statistics/statistical-work-areas/rtt-waiting-times/"
            className="text-[#044e54] underline hover:text-[#086972]"
            target="_blank"
            rel="noreferrer"
          >
            {t('pages', 'sources.englandSourceLink')}
          </a>
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-serif font-bold text-[#1c1917] mb-3">
          {t('pages', 'sources.walesHeading')}
        </h2>
        <p className="mb-1 text-base text-[#57534e]">
          <strong className="text-[#1c1917]">{t('pages', 'sources.publisherLabel')}</strong>{' '}
          {t('pages', 'sources.walesPublisher')}
        </p>
        <p className="mb-2 text-base text-[#57534e]">
          <strong className="text-[#1c1917]">{t('pages', 'sources.datasetLabel')}</strong>{' '}
          {t('pages', 'sources.walesDataset')}
        </p>
        <blockquote className="mb-3 border-l-4 border-[#e7e5e4] pl-4 italic text-[#57534e]">
          {t('pages', 'sources.walesAttribution')}
        </blockquote>
        <p>
          <a
            href="https://stats.gov.wales"
            className="text-[#044e54] underline hover:text-[#086972]"
            target="_blank"
            rel="noreferrer"
          >
            {t('pages', 'sources.walesSourceLink')}
          </a>
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-serif font-bold text-[#1c1917] mb-3">
          {t('pages', 'sources.scotlandHeading')}
        </h2>
        <p className="mb-1 text-base text-[#57534e]">
          <strong className="text-[#1c1917]">{t('pages', 'sources.publisherLabel')}</strong>{' '}
          {t('pages', 'sources.scotlandPublisher')}
        </p>
        <p className="mb-2 text-base text-[#57534e]">
          <strong className="text-[#1c1917]">{t('pages', 'sources.datasetLabel')}</strong>{' '}
          {t('pages', 'sources.scotlandDataset')}
        </p>
        <blockquote className="mb-3 border-l-4 border-[#e7e5e4] pl-4 italic text-[#57534e]">
          {t('pages', 'sources.scotlandAttribution')}
        </blockquote>
        <p>
          <a
            href="https://www.opendata.nhs.scot/dataset/stage-of-treatment-waiting-times"
            className="text-[#044e54] underline hover:text-[#086972]"
            target="_blank"
            rel="noreferrer"
          >
            {t('pages', 'sources.scotlandSourceLink')}
          </a>
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-serif font-bold text-[#1c1917] mb-3">
          {t('pages', 'sources.odsHeading')}
        </h2>
        <p className="mb-1 text-base text-[#57534e]">
          <strong className="text-[#1c1917]">{t('pages', 'sources.publisherLabel')}</strong>{' '}
          {t('pages', 'sources.odsPublisher')}
        </p>
        <p className="mb-2 text-base text-[#57534e]">
          <strong className="text-[#1c1917]">{t('pages', 'sources.datasetLabel')}</strong>{' '}
          {t('pages', 'sources.odsDataset')}
        </p>
        <blockquote className="mb-3 border-l-4 border-[#e7e5e4] pl-4 italic text-[#57534e]">
          {t('pages', 'sources.odsAttribution')}
        </blockquote>
        <p>
          <a
            href="https://digital.nhs.uk/services/organisation-data-service"
            className="text-[#044e54] underline hover:text-[#086972]"
            target="_blank"
            rel="noreferrer"
          >
            {t('pages', 'sources.odsSourceLink')}
          </a>
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-serif font-bold text-[#1c1917] mb-3">
          {t('pages', 'sources.oglHeading')}
        </h2>
        <p className="mb-3 text-base text-[#57534e] leading-relaxed">
          {t('pages', 'sources.oglBody')}
        </p>
        <p>
          <a
            href="https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/"
            className="text-[#044e54] underline hover:text-[#086972]"
            target="_blank"
            rel="noreferrer"
          >
            {t('pages', 'sources.oglLink')}
          </a>
        </p>
      </section>

      <section>
        <h2 className="text-xl font-serif font-bold text-[#1c1917] mb-3">
          {t('pages', 'sources.dataRepoHeading')}
        </h2>
        <p className="mb-3 text-base text-[#57534e] leading-relaxed">
          {t('pages', 'sources.dataRepoBody')}
        </p>
        <p>
          <a
            href={`${siteConfig.repoUrl}/tree/main/data`}
            className="text-[#044e54] underline hover:text-[#086972]"
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
