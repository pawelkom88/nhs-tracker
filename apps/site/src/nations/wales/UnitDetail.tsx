import React from 'react';
import Link from 'next/link';
import type { WalesUnitDetail } from '../../data/wales';
import { FigureStatements } from './FigureStatements';
import { CarriedForwardWarning, NoRecentFigures } from '../../components/figures/StatusLabels';
import { t } from '../../i18n';

export interface UnitDetailProps {
  readonly detail: WalesUnitDetail;
  readonly className?: string;
}

export function UnitDetail({ detail, className }: UnitDetailProps) {
  const { unit, specialty, state, figures, hospitalSites, latestRelease } = detail;

  const specialtyName = specialty.isAllSpecialties
    ? t('wales-pages', 'allSpecialties')
    : specialty.officialName;

  const hasCarriedForward = state.kind === 'carried-forward';
  const hasNoRecentFigures = state.kind === 'no-recent-figures';
  const shouldRenderFigures = !hasNoRecentFigures && figures.length > 0;

  const olderReportingPeriod = figures[0]?.reportingPeriod ?? latestRelease.reportingPeriod;

  return (
    <article className={className ?? 'unit-detail'}>
      <header className="unit-header">
        <div className="unit-title-group">
          <h1>{unit.displayName}</h1>
        </div>

        <p className="specialty-subheading">{specialtyName}</p>

        <div className="unit-metadata">
          <p className="unit-code">
            {t('wales-pages', 'officialCode', { code: unit.officialCode })}
          </p>
        </div>

        <nav aria-label={t('common', 'navigation')} className="explainer-links">
          <ul>
            <li>
              <Link href="/wales/about-the-figures">{t('wales-pages', 'aboutTheFigures')}</Link>
            </li>
            <li>
              <Link href="/wales/your-rights">{t('wales-pages', 'yourRights')}</Link>
            </li>
          </ul>
        </nav>
      </header>

      <section className="figures-section" aria-label={t('common', 'figuresSectionLabel')}>
        {hasCarriedForward && (
          <CarriedForwardWarning
            unitName={unit.displayName}
            reportingPeriod={olderReportingPeriod}
            latestReportingPeriod={latestRelease.reportingPeriod}
            className="carried-forward-warning"
          />
        )}

        {hasNoRecentFigures && (
          <NoRecentFigures
            reportingPeriod={state.lastReportingPeriod}
            className="no-recent-figures-warning"
          />
        )}

        {shouldRenderFigures && (
          <FigureStatements
            entry={{
              reportingUnit: unit.id,
              specialty: specialty.id,
              state,
              figures,
            }}
          />
        )}
      </section>

      <section className="hospital-sites-section" aria-labelledby="hospital-sites-heading">
        <h2 id="hospital-sites-heading">{t('wales-pages', 'hospitalSitesHeading')}</h2>
        {hospitalSites.length > 0 ? (
          <>
            <p>{t('wales-pages', 'hospitalSitesIntro')}</p>
            <ul className="hospital-sites-list">
              {hospitalSites.map((site) => (
                <li key={site.id}>
                  {site.name}
                  {site.town ? ` (${site.town})` : ''}
                </li>
              ))}
            </ul>
          </>
        ) : (
          <p>{t('wales-pages', 'noHospitalSites')}</p>
        )}
      </section>
    </article>
  );
}
