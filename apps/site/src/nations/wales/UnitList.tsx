import React from 'react';
import Link from 'next/link';
import type { HospitalSite, Specialty } from '@kyw/model/reference';
import type { WalesUnitForSpecialty } from '../../data/wales';
import { ListFilter } from '../../components/ListFilter';
import { t } from '../../i18n';

export interface UnitListProps {
  readonly specialty: Specialty<'wales'>;
  readonly units: readonly WalesUnitForSpecialty[];
  readonly hospitalSites: readonly HospitalSite<'wales'>[];
  readonly className?: string;
}

export function UnitList({ specialty, units, hospitalSites, className }: UnitListProps) {
  const collator = new Intl.Collator('en-GB', { sensitivity: 'base' });

  // Index hospital sites by reporting unit
  const sitesByUnit = new Map<string, HospitalSite<'wales'>[]>();
  for (const site of hospitalSites) {
    const existing = sitesByUnit.get(site.reportingUnit) ?? [];
    existing.push(site);
    sitesByUnit.set(site.reportingUnit, existing);
  }

  // Sort units alphabetically by displayName
  const sortedUnits = [...units].sort((a, b) => {
    const cmp = collator.compare(a.displayName, b.displayName);
    if (cmp !== 0) return cmp;
    return a.officialCode.localeCompare(b.officialCode);
  });

  return (
    <div className={className}>
      <aside className="board-finder-notice" role="note">
        <p>
          {t('wales-pages', 'boardFinderQuestion')}{' '}
          <a
            href="https://www.gov.wales/nhs-wales-health-boards-and-trusts"
            target="_blank"
            rel="noopener noreferrer"
          >
            {t('wales-pages', 'boardFinderLinkText')}
          </a>
          .
        </p>
      </aside>

      {sortedUnits.length === 0 ? (
        <p>{t('wales-pages', 'emptyUnits')}</p>
      ) : (
        <ListFilter
          label={t('wales-pages', 'unitsFilterLabel')}
          placeholder={t('wales-pages', 'unitsFilterPlaceholder')}
        >
          <ul className="unit-list">
            {sortedUnits.map((unit) => {
              const unitSites = sitesByUnit.get(unit.id) ?? [];
              const siteNames = unitSites.map((s) => s.name);
              const siteTowns = unitSites
                .map((s) => s.town)
                .filter((town): town is string => Boolean(town));

              const filterTerms = [unit.displayName, ...siteNames, ...siteTowns];
              const filterText = filterTerms.join(' ').toLowerCase();

              return (
                <li key={unit.id} data-filter-text={filterText} className="unit-item">
                  <Link href={`/wales/${specialty.slug}/${unit.officialCode.toLowerCase()}`}>
                    {unit.displayName}
                  </Link>
                </li>
              );
            })}
          </ul>
        </ListFilter>
      )}
    </div>
  );
}
