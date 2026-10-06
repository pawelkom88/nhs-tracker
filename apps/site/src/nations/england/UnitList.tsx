import React from 'react';
import Link from 'next/link';
import type { HospitalSite, NhsRegion, Specialty } from '@kyw/model/reference';
import type { EnglandUnitForSpecialty } from '../../data/england';
import { ListFilter } from '../../components/ListFilter';
import { t } from '../../i18n';

export interface UnitListProps {
  readonly specialty: Specialty<'england'>;
  readonly units: readonly EnglandUnitForSpecialty[];
  readonly regions: readonly NhsRegion[];
  readonly hospitalSites: readonly HospitalSite<'england'>[];
  readonly className?: string;
}

export function UnitList({ specialty, units, regions, hospitalSites, className }: UnitListProps) {
  const collator = new Intl.Collator('en-GB', { sensitivity: 'base' });

  // Index hospital sites by reporting unit
  const sitesByUnit = new Map<string, HospitalSite<'england'>[]>();
  for (const site of hospitalSites) {
    const existing = sitesByUnit.get(site.reportingUnit) ?? [];
    existing.push(site);
    sitesByUnit.set(site.reportingUnit, existing);
  }

  // Sort regions alphabetically
  const sortedRegions = [...regions].sort((a, b) => collator.compare(a.name, b.name));

  // Group units by NHS Region
  const unitsByRegion = new Map<string, EnglandUnitForSpecialty[]>();
  for (const unit of units) {
    const existing = unitsByRegion.get(unit.nhsRegion) ?? [];
    existing.push(unit);
    unitsByRegion.set(unit.nhsRegion, existing);
  }

  // Sort units alphabetically within each region
  for (const [regionId, unitList] of unitsByRegion.entries()) {
    unitList.sort((a, b) => {
      const cmp = collator.compare(a.displayName, b.displayName);
      if (cmp !== 0) return cmp;
      return a.officialCode.localeCompare(b.officialCode);
    });
    unitsByRegion.set(regionId, unitList);
  }

  if (units.length === 0) {
    return (
      <div className={className}>
        <p>{t('england-lists', 'emptyUnits')}</p>
      </div>
    );
  }

  return (
    <div className={className}>
      <ListFilter
        label={t('england-lists', 'unitsFilterLabel')}
        placeholder={t('england-lists', 'unitsFilterPlaceholder')}
      >
        <div className="regions-container">
          {sortedRegions.map((region) => {
            const regionUnits = unitsByRegion.get(region.id) ?? [];
            if (regionUnits.length === 0) {
              return null;
            }

            return (
              <section key={region.id} data-filter-group className="region-section">
                <h2>{region.name}</h2>
                <ul className="unit-list">
                  {regionUnits.map((unit) => {
                    const unitSites = sitesByUnit.get(unit.id) ?? [];
                    const siteNames = unitSites.map((s) => s.name);
                    const siteTowns = unitSites
                      .map((s) => s.town)
                      .filter((town): town is string => Boolean(town));

                    const filterTerms = [unit.displayName, ...siteNames, ...siteTowns];
                    const filterText = filterTerms.join(' ').toLowerCase();

                    return (
                      <li key={unit.id} data-filter-text={filterText} className="unit-item">
                        <Link
                          href={`/england/${specialty.slug}/${unit.officialCode.toLowerCase()}`}
                        >
                          {unit.displayName}
                        </Link>
                        {unit.kind === 'independent-sector-provider' && (
                          <span className="isp-badge">{t('england-lists', 'ispBadge')}</span>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </section>
            );
          })}
        </div>
      </ListFilter>
    </div>
  );
}
