import React from 'react';
import Link from 'next/link';
import { getSpecialties } from '../../data/england';
import { SpecialtyList } from '../../nations/england/SpecialtyList';
import { BorderNotice } from '../../components/BorderNotice';
import { t } from '../../i18n';

export default async function EnglandPage() {
  const specialties = await getSpecialties();

  return (
    <div className="england-page">
      <header className="page-header">
        <h1>{t('england-lists', 'englandTitle')}</h1>
        <p className="page-intro">{t('england-lists', 'englandIntro')}</p>
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

      <div>
        <section aria-labelledby="specialties-heading">
          <h2 id="specialties-heading">{t('england-lists', 'specialtiesHeading')}</h2>
          <SpecialtyList specialties={specialties} />
        </section>
      </div>

      <BorderNotice current="england" />
    </div>
  );
}
