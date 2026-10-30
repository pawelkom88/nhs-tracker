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
    <div className="editorial-container wales-specialty-page">
      <nav aria-label={t('common', 'navigation')} className="breadcrumb-nav mb-4">
        <Link
          href="/wales"
          className="back-link inline-flex items-center text-xs font-mono text-[#044e54] hover:underline"
        >
          {t('wales-pages', 'backToWales')}
        </Link>
      </nav>

      <header className="page-header mb-8 max-w-3xl">
        <span className="text-xs uppercase tracking-widest text-[#57534e] font-mono">
          Specialty (Wales)
        </span>
        <h1 className="text-3xl sm:text-4xl font-serif font-bold text-[#1c1917] mt-1 mb-3">
          {pageTitle}
        </h1>
        <p className="page-intro text-base text-[#57534e] leading-relaxed mb-4">
          {t('wales-pages', 'specialtyPageIntro', { specialtyName: pageTitle })}
        </p>
        <nav aria-label={t('common', 'navigation')} className="explainer-links">
          <ul className="flex flex-wrap gap-3 list-none p-0 m-0">
            <li>
              <Link
                href="/wales/about-the-figures"
                className="inline-block text-xs font-medium text-[#044e54] bg-[#f5f2eb] hover:bg-[#eae6dd] px-3 py-1.5 rounded transition"
              >
                {t('wales-pages', 'aboutTheFigures')}
              </Link>
            </li>
            <li>
              <Link
                href="/wales/your-rights"
                className="inline-block text-xs font-medium text-[#044e54] bg-[#f5f2eb] hover:bg-[#eae6dd] px-3 py-1.5 rounded transition"
              >
                {t('wales-pages', 'yourRights')}
              </Link>
            </li>
          </ul>
        </nav>
      </header>

      {/* Editorial intro slot (T-9.3) */}
      <div id="editorial-intro-slot" />

      <div className="mb-10">
        <UnitList specialty={specialty} units={units} hospitalSites={reference.hospitalSites} />
      </div>

      <BorderNotice current="wales" />
    </div>
  );
}
