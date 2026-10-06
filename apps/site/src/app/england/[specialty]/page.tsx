import React from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  getNhsRegions,
  getReference,
  getSpecialties,
  getSpecialtyBySlug,
  getUnitsForSpecialty,
} from '../../../data/england';
import { UnitList } from '../../../nations/england/UnitList';
import { BorderNotice } from '../../../components/BorderNotice';
import { t } from '../../../i18n';

export interface EnglandSpecialtyPageProps {
  readonly params: Promise<{
    specialty: string;
  }>;
}

export async function generateStaticParams() {
  const specialties = await getSpecialties();
  return specialties.map((specialty) => ({
    specialty: specialty.slug,
  }));
}

export default async function EnglandSpecialtyPage({ params }: EnglandSpecialtyPageProps) {
  const { specialty: specialtySlug } = await params;
  const specialty = await getSpecialtyBySlug(specialtySlug);

  if (!specialty) {
    notFound();
  }

  const [units, regions, reference] = await Promise.all([
    getUnitsForSpecialty(specialty.id),
    getNhsRegions(),
    getReference(),
  ]);

  const pageTitle = specialty.isAllSpecialties
    ? t('england-lists', 'allSpecialties')
    : specialty.officialName;

  return (
    <div className="england-specialty-page">
      <nav aria-label={t('common', 'navigation')} className="breadcrumb-nav">
        <Link href="/england" className="back-link">
          ← {t('england-lists', 'backToEngland')}
        </Link>
      </nav>

      <header className="page-header">
        <h1>{pageTitle}</h1>
        <p className="page-intro">
          {t('england-lists', 'specialtyPageIntro', { specialtyName: pageTitle })}
        </p>
        <nav aria-label={t('common', 'navigation')} className="explainer-links">
          <ul>
            <li>
              <Link href="/england/about-the-figures">{t('england-lists', 'aboutTheFigures')}</Link>
            </li>
            <li>
              <Link href="/england/your-rights">{t('england-lists', 'yourRights')}</Link>
            </li>
          </ul>
        </nav>
      </header>

      {/* Editorial intro slot (T-9.3) */}
      <div id="editorial-intro-slot" />

      <main>
        <UnitList
          specialty={specialty}
          units={units}
          regions={regions}
          hospitalSites={reference.hospitalSites}
        />
      </main>

      <BorderNotice />
    </div>
  );
}
