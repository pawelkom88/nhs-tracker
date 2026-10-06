import React from 'react';
import Link from 'next/link';
import type { HospitalSite, Specialty } from '@kyw/model/reference';
import type { ScotlandUnitForSpecialty } from '../../data/scotland';
import { ListFilter } from '../../components/ListFilter';
import { t } from '../../i18n';

export interface UnitListProps {
  readonly specialty: Specialty<'scotland'>;
  readonly units: readonly ScotlandUnitForSpecialty[];
  readonly hospitalSites: readonly HospitalSite<'scotland'>[];
  readonly className?: string;
}

export function UnitList({ specialty, units, hospitalSites, className }: UnitListProps) {
  const collator = new Intl.Collator('en-GB', { sensitivity: 'base' });

  // Index hospital sites by reporting unit
  const sitesByUnit = new Map<string, HospitalSite<'scotland'>[]>();
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
          {t('scotland-pages', 'boardFinderQuestion')}{' '}
          <a
            href="https://www.scot.nhs.uk/organisations/"
            target="_blank"
            rel="noopener noreferrer"
          >
            {t('scotland-pages', 'boardFinderLinkText')}
          </a>
          .
        </p>
      </aside>

      {sortedUnits.length === 0 ? (
        <p>{t('scotland-pages', 'emptyUnits')}</p>
      ) : (
        <ListFilter
          label={t('scotland-pages', 'unitsFilterLabel')}
          placeholder={t('scotland-pages', 'unitsFilterPlaceholder')}
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
                  <Link href={`/scotland/${specialty.slug}/${unit.officialCode.toLowerCase()}`}>
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
