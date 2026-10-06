import React from 'react';
import Link from 'next/link';
import { getSpecialties } from '../../data/scotland';
import { SpecialtyList } from '../../nations/scotland/SpecialtyList';
import { BorderNotice } from '../../components/BorderNotice';
import { t } from '../../i18n';

export default async function ScotlandPage() {
  const specialties = await getSpecialties();

  return (
    <div className="scotland-page">
      <header className="page-header">
        <h1>{t('scotland-pages', 'scotlandTitle')}</h1>
        <p className="page-intro">{t('scotland-pages', 'scotlandIntro')}</p>
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

      <main>
        <section aria-labelledby="specialties-heading">
          <h2 id="specialties-heading">{t('scotland-pages', 'specialtiesHeading')}</h2>
          <SpecialtyList specialties={specialties} />
        </section>
      </main>

      <BorderNotice />
    </div>
  );
}
