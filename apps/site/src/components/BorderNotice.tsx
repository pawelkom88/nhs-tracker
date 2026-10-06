import React from 'react';
import Link from 'next/link';
import type { HomeNation } from '@kyw/model/nation';
import { PUBLISHING_NATIONS } from '@kyw/model/nation';
import { t } from '../i18n';

export interface BorderNoticeProps {
  current?: HomeNation;
}

function getBorderLinkLabel(nation: HomeNation): string {
  switch (nation) {
    case 'england':
      return t('border', 'linkEngland');
    case 'wales':
      return t('border', 'linkWales');
    case 'scotland':
      return t('border', 'linkScotland');
  }
}

export function BorderNotice({ current }: BorderNoticeProps) {
  const targetNations = current
    ? PUBLISHING_NATIONS.filter((nation) => nation !== current)
    : PUBLISHING_NATIONS;

  return (
    <aside aria-labelledby="border-notice-title">
      <h2 id="border-notice-title">{t('border', 'title')}</h2>
      <p>{t('border', 'body')}</p>
      <p>{t('border', 'linksIntro')}</p>
      <ul>
        {targetNations.map((nation) => (
          <li key={nation}>
            <Link href={`/${nation}`}>{getBorderLinkLabel(nation)}</Link>
          </li>
        ))}
      </ul>
    </aside>
  );
}
