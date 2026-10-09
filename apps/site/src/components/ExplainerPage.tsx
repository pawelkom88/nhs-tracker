import React from 'react';
import type { LoadedContent } from '../content/load.js';
import type { AboutTheFiguresFrontMatter, YourRightsFrontMatter } from '../content/schema.js';
import { BorderNotice } from './BorderNotice.js';
import { t } from '../i18n/index.js';
import { formatIsoDate } from '../i18n/format.js';

export interface ExplainerPageProps {
  readonly title: string;
  readonly content: LoadedContent<AboutTheFiguresFrontMatter | YourRightsFrontMatter>;
}

export function ExplainerPage({ title, content }: ExplainerPageProps) {
  const { frontMatter, html, isPlaceholder } = content;

  return (
    <article className="explainer-page">
      <header className="page-header">
        <h1>{title}</h1>
      </header>

      {isPlaceholder && (
        <div className="placeholder-banner" role="note">
          <p>{t('explainers', 'placeholderNotice')}</p>
        </div>
      )}

      <div className="editorial-body" dangerouslySetInnerHTML={{ __html: html }} />

      {frontMatter.sources.length > 0 && (
        <section className="sources-section" aria-labelledby="sources-heading">
          <h2 id="sources-heading">{t('explainers', 'sourcesHeading')}</h2>
          <ul>
            {frontMatter.sources.map((src) => (
              <li key={src.id}>
                <a href={src.url}>{src.title}</a>
              </li>
            ))}
          </ul>
        </section>
      )}

      <footer className="editorial-footer">
        {frontMatter.status === 'reviewed' && frontMatter.lastReviewed ? (
          <p className="editorial-last-reviewed">
            {t('explainers', 'lastReviewed', { date: formatIsoDate(frontMatter.lastReviewed) })}
          </p>
        ) : null}
        <p className="editorial-not-advice">{t('explainers', 'notAdvice')}</p>
      </footer>

      <BorderNotice current={frontMatter.nation} />
    </article>
  );
}
