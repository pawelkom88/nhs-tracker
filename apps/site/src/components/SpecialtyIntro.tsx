import React from 'react';
import type { LoadedContent } from '../content/load.js';
import type { SpecialtyFrontMatter } from '../content/schema.js';
import { t } from '../i18n/index.js';
import { formatIsoDate } from '../i18n/format.js';

export interface SpecialtyIntroProps {
  readonly content?: LoadedContent<SpecialtyFrontMatter> | null;
}

/**
 * Renders editorial intro and rights context for a specialty.
 * Returns null when content is missing or has status 'placeholder'.
 */
export function SpecialtyIntro({ content }: SpecialtyIntroProps) {
  if (!content || content.isPlaceholder || content.frontMatter.status === 'placeholder') {
    return null;
  }

  return (
    <section className="specialty-intro" aria-label={t('common', 'specialtyIntroLabel')}>
      <div className="editorial-body" dangerouslySetInnerHTML={{ __html: content.html }} />
      <footer className="editorial-footer">
        {content.frontMatter.lastReviewed ? (
          <p className="editorial-last-reviewed">
            {t('common', 'lastReviewed', { date: formatIsoDate(content.frontMatter.lastReviewed) })}
          </p>
        ) : null}
        <p className="editorial-not-advice">{t('common', 'notMedicalAdvice')}</p>
      </footer>
    </section>
  );
}
