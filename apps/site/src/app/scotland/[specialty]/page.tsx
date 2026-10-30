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
    <div className="editorial-container scotland-specialty-page">
      <nav aria-label={t('common', 'navigation')} className="breadcrumb-nav mb-4">
        <Link
          href="/scotland"
          className="back-link inline-flex items-center text-xs font-mono text-[#044e54] hover:underline"
        >
          {t('scotland-pages', 'backToScotland')}
        </Link>
      </nav>

      <header className="page-header mb-8 max-w-3xl">
        <span className="text-xs uppercase tracking-widest text-[#57534e] font-mono">
          Specialty (Scotland)
        </span>
        <h1 className="text-3xl sm:text-4xl font-serif font-bold text-[#1c1917] mt-1 mb-3">
          {pageTitle}
        </h1>
        <p className="page-intro text-base text-[#57534e] leading-relaxed mb-4">
          {t('scotland-pages', 'specialtyPageIntro', { specialtyName: pageTitle })}
        </p>
        <nav aria-label={t('common', 'navigation')} className="explainer-links">
          <ul className="flex flex-wrap gap-3 list-none p-0 m-0">
            <li>
              <Link
                href="/scotland/about-the-figures"
                className="inline-block text-xs font-medium text-[#044e54] bg-[#f5f2eb] hover:bg-[#eae6dd] px-3 py-1.5 rounded transition"
              >
                {t('scotland-pages', 'aboutTheFigures')}
              </Link>
            </li>
            <li>
              <Link
                href="/scotland/your-rights"
                className="inline-block text-xs font-medium text-[#044e54] bg-[#f5f2eb] hover:bg-[#eae6dd] px-3 py-1.5 rounded transition"
              >
                {t('scotland-pages', 'yourRights')}
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

      <BorderNotice current="scotland" />
    </div>
  );
}
