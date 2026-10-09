import React from 'react';
import Link from 'next/link';
import { getSpecialties } from '../../data/wales';
import { SpecialtyList } from '../../nations/wales/SpecialtyList';
import { BorderNotice } from '../../components/BorderNotice';
import { t } from '../../i18n';

export default async function WalesPage() {
  const specialties = await getSpecialties();

  return (
    <div className="wales-page">
      <header className="page-header">
        <h1>{t('wales-pages', 'walesTitle')}</h1>
        <p className="page-intro">{t('wales-pages', 'walesIntro')}</p>
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

      <div>
        <section aria-labelledby="specialties-heading">
          <h2 id="specialties-heading">{t('wales-pages', 'specialtiesHeading')}</h2>
          <SpecialtyList specialties={specialties} />
        </section>
      </div>

      <BorderNotice current="wales" />
    </div>
  );
}
