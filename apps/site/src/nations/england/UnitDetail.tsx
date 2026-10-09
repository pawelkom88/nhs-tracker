import React from 'react';
import Link from 'next/link';
import type { EnglandUnitDetail } from '../../data/england';
import { FigureStatements } from './FigureStatements';
import { CarriedForwardWarning, NoRecentFigures } from '../../components/figures/StatusLabels';
import { t } from '../../i18n';

export interface UnitDetailProps {
  readonly detail: EnglandUnitDetail;
  readonly className?: string;
}

export function UnitDetail({ detail, className }: UnitDetailProps) {
  const { unit, specialty, state, figures, hospitalSites, latestRelease, nhsRegion } = detail;

  const specialtyName = specialty.isAllSpecialties
    ? t('england-lists', 'allSpecialties')
    : specialty.officialName;

  const isIsp = unit.kind === 'independent-sector-provider';
  const hasCarriedForward = state.kind === 'carried-forward';
  const hasNoRecentFigures = state.kind === 'no-recent-figures';
  const shouldRenderFigures = !hasNoRecentFigures && figures.length > 0;

  const olderReportingPeriod = figures[0]?.reportingPeriod ?? latestRelease.reportingPeriod;

  return (
    <article className={className ?? 'unit-detail'}>
      <header className="unit-header">
        <div className="unit-title-group">
          <h1>{unit.displayName}</h1>
          {isIsp && <span className="isp-badge">{t('england-detail', 'ispBadge')}</span>}
        </div>

        <p className="specialty-subheading">{specialtyName}</p>

        <div className="unit-metadata">
          <p className="unit-region">
            {t('england-detail', 'region', { regionName: nhsRegion.name })}
          </p>
          <p className="unit-code">
            {t('england-detail', 'officialCode', { code: unit.officialCode })}
          </p>
        </div>

        {isIsp && (
          <div className="isp-notice" role="note">
            <p>{t('england-detail', 'ispNotice')}</p>
          </div>
        )}

        <nav aria-label={t('common', 'navigation')} className="explainer-links">
          <ul>
            <li>
              <Link href="/england/about-the-figures">
                {t('england-detail', 'aboutTheFigures')}
              </Link>
            </li>
            <li>
              <Link href="/england/your-rights">{t('england-detail', 'yourRights')}</Link>
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
        <h2 id="hospital-sites-heading">{t('england-detail', 'hospitalSitesHeading')}</h2>
        {hospitalSites.length > 0 ? (
          <>
            <p>{t('england-detail', 'hospitalSitesIntro')}</p>
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
          <p>{t('england-detail', 'noHospitalSites')}</p>
        )}
      </section>
    </article>
  );
}
