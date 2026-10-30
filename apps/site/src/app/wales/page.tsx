import React from 'react';
import Link from 'next/link';
import { getSpecialties } from '../../data/wales';
import { SpecialtyList } from '../../nations/wales/SpecialtyList';
import { BorderNotice } from '../../components/BorderNotice';
import { t } from '../../i18n';

export default async function WalesPage() {
  const specialties = await getSpecialties();

  return (
    <div className="editorial-container wales-page animate-step-enter">
      <header className="page-header mb-8 max-w-3xl">
        <span className="text-xs uppercase tracking-widest text-[#57534e] font-mono">
          Publishing Nation
        </span>
        <h1 className="text-3xl sm:text-4xl font-serif font-bold text-[#1c1917] mt-1 mb-3">
          {t('wales-pages', 'walesTitle')}
        </h1>
        <p className="page-intro text-base text-[#57534e] leading-relaxed mb-4">
          {t('wales-pages', 'walesIntro')}
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

      <div className="mb-10">
        <section aria-labelledby="specialties-heading">
          <h2 id="specialties-heading" className="text-xl font-serif font-bold text-[#1c1917] mb-4">
            {t('wales-pages', 'specialtiesHeading')}
          </h2>
          <SpecialtyList specialties={specialties} />
        </section>
      </div>

      <BorderNotice current="wales" />
    </div>
  );
}
