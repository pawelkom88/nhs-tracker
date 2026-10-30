import React from 'react';
import Link from 'next/link';
import { t } from '../i18n';
import { BorderNotice } from '../components/BorderNotice';

export default function HomePage() {
  return (
    <div className="editorial-container animate-step-enter">
      <header className="mb-8 max-w-2xl">
        <span className="text-xs uppercase tracking-widest text-[#57534e] font-mono">
          Official NHS Statistics Guide
        </span>
        <h1 className="text-3xl sm:text-4xl font-serif font-bold text-[#1c1917] mt-2 mb-4 leading-tight">
          {t('home', 'title')}
        </h1>
        <p className="text-base text-[#57534e] leading-relaxed">{t('home', 'description')}</p>
      </header>

      <nav aria-label={t('common', 'navigation')} className="mb-8">
        <p className="text-sm font-medium text-[#57534e] mb-4">{t('home', 'selectNation')}</p>
        <ul className="grid grid-cols-1 md:grid-cols-3 gap-6 list-none p-0 m-0">
          <li className="nation-card pressable">
            <div>
              <span className="text-xs font-mono text-[#57534e]">Publishing Nation</span>
              <h2 className="font-serif text-2xl text-[#1c1917] mt-1 mb-2 font-medium">
                <Link
                  href="/england"
                  className="text-[#1c1917] hover:text-[#044e54] no-underline hover:underline"
                >
                  {t('common', 'england')}
                </Link>
              </h2>
              <p className="text-xs text-[#044e54] font-medium mb-3 pb-2 border-b border-[#f5f2eb]">
                NHS England (RTT)
              </p>
              <p className="text-xs text-[#57534e] leading-relaxed">
                Consultant-led Referral to Treatment pathways and trust-level figures.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-[#f5f2eb] flex items-center justify-between text-xs text-[#57534e]">
              <span>Monthly release</span>
              <span aria-hidden="true">→</span>
            </div>
          </li>
          <li className="nation-card pressable">
            <div>
              <span className="text-xs font-mono text-[#57534e]">Publishing Nation</span>
              <h2 className="font-serif text-2xl text-[#1c1917] mt-1 mb-2 font-medium">
                <Link
                  href="/wales"
                  className="text-[#1c1917] hover:text-[#044e54] no-underline hover:underline"
                >
                  {t('common', 'wales')}
                </Link>
              </h2>
              <p className="text-xs text-[#044e54] font-medium mb-3 pb-2 border-b border-[#f5f2eb]">
                NHS Wales (StatsWales)
              </p>
              <p className="text-xs text-[#57534e] leading-relaxed">
                Open Referral to Treatment pathways and Local Health Board figures.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-[#f5f2eb] flex items-center justify-between text-xs text-[#57534e]">
              <span>Monthly release</span>
              <span aria-hidden="true">→</span>
            </div>
          </li>
          <li className="nation-card pressable">
            <div>
              <span className="text-xs font-mono text-[#57534e]">Publishing Nation</span>
              <h2 className="font-serif text-2xl text-[#1c1917] mt-1 mb-2 font-medium">
                <Link
                  href="/scotland"
                  className="text-[#1c1917] hover:text-[#044e54] no-underline hover:underline"
                >
                  {t('common', 'scotland')}
                </Link>
              </h2>
              <p className="text-xs text-[#044e54] font-medium mb-3 pb-2 border-b border-[#f5f2eb]">
                Public Health Scotland (PHS)
              </p>
              <p className="text-xs text-[#57534e] leading-relaxed">
                Stage of Treatment figures: Outpatient Stage and Inpatient / Day-case Stage.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-[#f5f2eb] flex items-center justify-between text-xs text-[#57534e]">
              <span>Quarterly release</span>
              <span aria-hidden="true">→</span>
            </div>
          </li>
        </ul>
      </nav>

      <p className="text-xs text-[#57534e] mb-6">{t('home', 'notCovered')}</p>

      <BorderNotice />
    </div>
  );
}
