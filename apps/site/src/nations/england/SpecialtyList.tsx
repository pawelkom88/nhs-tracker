import React from 'react';
import Link from 'next/link';
import type { Specialty } from '@kyw/model/reference';
import { ListFilter } from '../../components/ListFilter';
import { t } from '../../i18n';

export interface SpecialtyListProps {
  readonly specialties: readonly Specialty<'england'>[];
  readonly className?: string;
}

export function SpecialtyList({ specialties, className }: SpecialtyListProps) {
  const collator = new Intl.Collator('en-GB', { sensitivity: 'base' });

  // Separate "All specialties" from standard specialties
  const standardSpecialties = specialties
    .filter((s) => !s.isAllSpecialties)
    .sort((a, b) => collator.compare(a.officialName, b.officialName));

  const allSpecialtiesEntry = specialties.find((s) => s.isAllSpecialties);

  const orderedSpecialties = allSpecialtiesEntry
    ? [...standardSpecialties, allSpecialtiesEntry]
    : standardSpecialties;

  return (
    <div className={className}>
      <ListFilter
        label={t('england-lists', 'specialtiesFilterLabel')}
        placeholder={t('england-lists', 'specialtiesFilterPlaceholder')}
      >
        <ul className="specialty-list">
          {orderedSpecialties.map((specialty) => {
            const displayName = specialty.isAllSpecialties
              ? t('england-lists', 'allSpecialties')
              : specialty.officialName;

            let description = '';
            try {
              description = t('england-lists', `descriptions.${specialty.slug}`);
            } catch {
              description = '';
            }

            const filterText = `${displayName} ${description}`.trim().toLowerCase();

            return (
              <li key={specialty.id} data-filter-text={filterText} className="specialty-item">
                <Link href={`/england/${specialty.slug}`}>{displayName}</Link>
                {description ? <p className="specialty-description">{description}</p> : null}
              </li>
            );
          })}
        </ul>
      </ListFilter>
    </div>
  );
}
