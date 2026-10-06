import React from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  getReference,
  getSpecialties,
  getSpecialtyBySlug,
  getUnitsForSpecialty,
} from '../../../data/wales';
import { UnitList } from '../../../nations/wales/UnitList';
import { BorderNotice } from '../../../components/BorderNotice';
import { t } from '../../../i18n';

export interface WalesSpecialtyPageProps {
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

export default async function WalesSpecialtyPage({ params }: WalesSpecialtyPageProps) {
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
    ? t('wales-pages', 'allSpecialties')
    : specialty.officialName;

  return (
    <div className="wales-specialty-page">
      <nav aria-label={t('common', 'navigation')} className="breadcrumb-nav">
        <Link href="/wales" className="back-link">
          ← {t('wales-pages', 'backToWales')}
        </Link>
      </nav>

      <header className="page-header">
        <h1>{pageTitle}</h1>
        <p className="page-intro">
          {t('wales-pages', 'specialtyPageIntro', { specialtyName: pageTitle })}
        </p>
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

      {/* Editorial intro slot (T-9.3) */}
      <div id="editorial-intro-slot" />

      <main>
        <UnitList specialty={specialty} units={units} hospitalSites={reference.hospitalSites} />
      </main>

      <BorderNotice />
    </div>
  );
}
