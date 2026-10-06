import React from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  getReference,
  getSpecialties,
  getSpecialtyBySlug,
  getUnitsForSpecialty,
} from '../../../data/scotland';
import { UnitList } from '../../../nations/scotland/UnitList';
import { BorderNotice } from '../../../components/BorderNotice';
import { t } from '../../../i18n';

export interface ScotlandSpecialtyPageProps {
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

export default async function ScotlandSpecialtyPage({ params }: ScotlandSpecialtyPageProps) {
  const { specialty: specialtySlug } = await params;
  const specialty = await getSpecialtyBySlug(specialtySlug);

  if (!specialty) {
    notFound();
  }

  const [units, reference] = await Promise.all([
    getUnitsForSpecialty(specialty.id),
    getReference(),
  ]);

  const pageTitle = specialty.isAllSpecialties
    ? t('scotland-pages', 'allSpecialties')
    : specialty.officialName;

  return (
    <div className="scotland-specialty-page">
      <nav aria-label={t('common', 'navigation')} className="breadcrumb-nav">
        <Link href="/scotland" className="back-link">
          ← {t('scotland-pages', 'backToScotland')}
        </Link>
      </nav>

      <header className="page-header">
        <h1>{pageTitle}</h1>
        <p className="page-intro">
          {t('scotland-pages', 'specialtyPageIntro', { specialtyName: pageTitle })}
        </p>
        <nav aria-label={t('common', 'navigation')} className="explainer-links">
          <ul>
            <li>
              <Link href="/scotland/about-the-figures">
                {t('scotland-pages', 'aboutTheFigures')}
              </Link>
            </li>
            <li>
              <Link href="/scotland/your-rights">{t('scotland-pages', 'yourRights')}</Link>
            </li>
          </ul>
        </nav>
      </header>

      {/* Editorial intro slot (T-9.3) */}
      <div id="editorial-intro-slot" />

      <main>
        <UnitList specialty={specialty} units={units} hospitalSites={reference.hospitalSites} />
      </main>

      <BorderNotice />
    </div>
  );
}
