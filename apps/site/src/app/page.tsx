import React from 'react';
import Link from 'next/link';
import { t } from '../i18n';
import { BorderNotice } from '../components/BorderNotice';

export default function HomePage() {
  return (
    <div>
      <h1>{t('home', 'title')}</h1>
      <p>{t('home', 'description')}</p>
      <nav aria-label={t('common', 'navigation')}>
        <p>{t('home', 'selectNation')}</p>
        <ul>
          <li>
            <Link href="/england">{t('common', 'england')}</Link>
          </li>
          <li>
            <Link href="/wales">{t('common', 'wales')}</Link>
          </li>
          <li>
            <Link href="/scotland">{t('common', 'scotland')}</Link>
          </li>
        </ul>
      </nav>
      <p>{t('home', 'notCovered')}</p>
      <BorderNotice />
    </div>
  );
}
