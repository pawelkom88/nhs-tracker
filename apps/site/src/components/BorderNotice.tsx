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
    <aside aria-labelledby="border-notice-title" className="border-notice-card">
      <h2 id="border-notice-title" className="font-serif text-xl font-bold text-[#1c1917] mb-2">
        {t('border', 'title')}
      </h2>
      <p className="text-sm text-[#57534e] mb-3 leading-relaxed">{t('border', 'body')}</p>
      <p className="text-xs font-medium uppercase tracking-wider text-[#78716c] mb-2">
        {t('border', 'linksIntro')}
      </p>
      <ul className="flex flex-wrap gap-3 list-none p-0 m-0">
        {targetNations.map((nation) => (
          <li key={nation}>
            <Link
              href={`/${nation}`}
              className="inline-block text-xs font-medium text-[#044e54] bg-[#f5f2eb] hover:bg-[#eae6dd] px-3 py-1.5 rounded transition"
            >
              {getBorderLinkLabel(nation)}
            </Link>
          </li>
        ))}
      </ul>
    </aside>
  );
}
