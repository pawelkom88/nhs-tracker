'use client';

import React from 'react';
import {
  NATIONS,
  SPECIALTIES_ENGLAND,
  REPORTING_UNITS_ORTHO,
  SNAPSHOT_METADATA,
} from './mock-data';
import type { ReportingUnitFigures, NationItem, SpecialtyItem } from './mock-data';
import {
  WORST_CASE_NATIONS,
  WORST_CASE_SPECIALTIES,
  WORST_CASE_UNITS,
  ALL_SUPPRESSED_UNITS,
  HUGE_UNITS_LIST,
} from './worst-case-data';
import type { DatasetMode } from './worst-case-data';

interface DirectionProps {
  currentStep: number;
  onSelectStep: (step: number) => void;
  datasetMode?: DatasetMode;
}

export function DirectionAEditorial({
  currentStep,
  onSelectStep,
  datasetMode = 'demo',
}: DirectionProps) {
  const nations: NationItem[] = datasetMode === 'worst-case' ? WORST_CASE_NATIONS : NATIONS;
  const specialties: SpecialtyItem[] =
    datasetMode === 'worst-case' ? WORST_CASE_SPECIALTIES : SPECIALTIES_ENGLAND;

  let units: ReportingUnitFigures[] = REPORTING_UNITS_ORTHO;
  if (datasetMode === 'worst-case') {
    units = WORST_CASE_UNITS;
  } else if (datasetMode === 'all-suppressed') {
    units = ALL_SUPPRESSED_UNITS;
  } else if (datasetMode === 'empty') {
    units = [];
  } else if (datasetMode === 'huge') {
    units = HUGE_UNITS_LIST;
  }

  // Extract distinct regions preserving alphabetical order
  const uniqueRegions = Array.from(new Set(units.map((u) => u.region))).sort((a, b) =>
    a.localeCompare(b),
  );

  return (
    <div className="min-h-screen bg-[#faf8f5] text-[#1c1917] font-sans transition-colors duration-200">
      {/* Editorial Header bar */}
      <header className="border-b border-[#e7e5e4] bg-[#faf8f5]">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 py-5 sm:py-6 flex flex-col sm:flex-row sm:items-baseline justify-between gap-2">
          <div className="flex flex-wrap items-baseline gap-y-1">
            <span className="font-serif text-2xl tracking-tight text-[#044e54] font-bold">
              Know Your Wait
            </span>
            <span className="ml-3 text-xs tracking-wider uppercase text-[#78716c] font-mono border-l border-[#d6d3d1] pl-3">
              Official NHS Statistics Guide
            </span>
          </div>
          <div className="text-xs text-[#78716c]">Independent • Free • Official Figures Only</div>
        </div>
      </header>

      {/* Step progression pill */}
      <div className="border-b border-[#e7e5e4] bg-[#f5f2eb]">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3">
          <nav
            aria-label="Journey stages"
            className="flex flex-wrap items-center gap-1 sm:gap-2 text-xs"
          >
            <button
              onClick={() => {
                onSelectStep(1);
              }}
              className={`pressable px-3 py-1.5 rounded transition ${
                currentStep === 1
                  ? 'bg-[#044e54] text-white font-medium shadow-sm'
                  : 'text-[#57534e] hover:bg-[#eae6dd]'
              }`}
            >
              1. Nation
            </button>
            <span className="text-[#a8a29e]">/</span>
            <button
              onClick={() => {
                onSelectStep(2);
              }}
              className={`pressable px-3 py-1.5 rounded transition ${
                currentStep === 2
                  ? 'bg-[#044e54] text-white font-medium shadow-sm'
                  : 'text-[#57534e] hover:bg-[#eae6dd]'
              }`}
            >
              2. Specialty (England)
            </button>
            <span className="text-[#a8a29e]">/</span>
            <button
              onClick={() => {
                onSelectStep(3);
              }}
              className={`pressable px-3 py-1.5 rounded transition ${
                currentStep === 3
                  ? 'bg-[#044e54] text-white font-medium shadow-sm'
                  : 'text-[#57534e] hover:bg-[#eae6dd]'
              }`}
            >
              3. Hospital Figures
            </button>
          </nav>
          <div className="flex items-center gap-2">
            <span className="text-xs text-[#78716c] italic font-serif">
              Direction A: Civic Editorial
            </span>
            {datasetMode !== 'demo' && (
              <span className="text-[11px] font-mono bg-amber-100 text-amber-900 px-2 py-0.5 rounded font-medium border border-amber-300">
                Stress: {datasetMode}
              </span>
            )}
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-5xl px-4 sm:px-6 py-8 sm:py-10">
        {/* STEP 1: NATION SELECTION */}
        {currentStep === 1 && (
          <div key="step-1" className="space-y-8 animate-step-enter">
            <header className="max-w-2xl">
              <span className="text-xs uppercase tracking-widest text-[#78716c] font-mono">
                Step 1 of 3 • Resident Nation
              </span>
              <h1 className="font-serif text-3xl sm:text-4xl text-[#1c1917] mt-2 mb-4 leading-tight font-medium">
                Where are you registered for NHS treatment?
              </h1>
              <p className="text-base text-[#57534e] leading-relaxed">
                NHS waiting time standards and publication rules differ between England, Wales, and
                Scotland. Select your home nation to view official waiting figures for your health
                service.
              </p>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {nations.map((nation) => (
                <div
                  key={nation.id}
                  onClick={() => {
                    onSelectStep(2);
                  }}
                  className="pressable group cursor-pointer rounded-lg border border-[#e7e5e4] bg-white p-6 shadow-sm hover:border-[#044e54] hover:shadow-md transition-all flex flex-col justify-between min-w-0"
                >
                  <div className="min-w-0">
                    <span className="text-xs font-mono text-[#78716c]">Publishing Nation</span>
                    <h2 className="font-serif text-2xl text-[#1c1917] group-hover:text-[#044e54] mt-1 mb-2 font-medium break-words">
                      {nation.name}
                    </h2>
                    <p className="text-xs text-[#044e54] font-medium mb-3 pb-2 border-b border-[#f5f2eb] break-words">
                      {nation.systemName}
                    </p>
                    <p className="text-sm text-[#57534e] leading-relaxed break-words">
                      {nation.standardDescription}
                    </p>
                  </div>
                  <div className="mt-6 pt-4 border-t border-[#f5f2eb] flex items-center justify-between text-xs">
                    <span className="text-[#a8a29e] font-mono">
                      Select {nation.name.split(' ')[0]}
                    </span>
                    <span className="text-[#044e54] font-medium group-hover:translate-x-1 transition-transform shrink-0 ml-2">
                      Continue &rarr;
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <aside className="rounded border border-[#e7e5e4] bg-[#fbf9f6] p-5 text-sm text-[#57534e]">
              <strong className="text-[#1c1917] font-medium">Cross-border notice:</strong> If you
              live in Wales or Scotland and receive treatment in an English hospital, your wait is
              reported under the standards of your home nation. Know Your Wait never blends
              statistics across borders.
            </aside>
          </div>
        )}

        {/* STEP 2: SPECIALTY EXPLORATION */}
        {currentStep === 2 && (
          <div key="step-2" className="space-y-8 animate-step-enter">
            <header className="max-w-2xl">
              <span className="text-xs uppercase tracking-widest text-[#78716c] font-mono">
                Step 2 of 3 • Treatment Area (England)
              </span>
              <h1 className="font-serif text-3xl sm:text-4xl text-[#1c1917] mt-2 mb-3 leading-tight font-medium">
                Choose a clinical specialty
              </h1>
              <p className="text-sm text-[#57534e] leading-relaxed">
                England publishes Referral to Treatment (RTT) figures across official medical
                specialties. Select the area of care matching your referral.
              </p>
            </header>

            <div className="border border-[#e7e5e4] rounded-lg bg-white overflow-hidden shadow-sm">
              <div className="px-6 py-4 bg-[#fbf9f6] border-b border-[#e7e5e4] flex justify-between items-center text-xs font-mono text-[#78716c]">
                <span>SPECIALTY</span>
                <span className="hidden sm:block">TOTAL WAITING IN ENGLAND</span>
              </div>
              <ul className="divide-y divide-[#e7e5e4]">
                {specialties.map((specialty) => (
                  <li
                    key={specialty.slug}
                    onClick={() => {
                      onSelectStep(3);
                    }}
                    className="pressable p-6 hover:bg-[#faf8f5] cursor-pointer transition flex flex-col sm:flex-row sm:items-center justify-between gap-4 group min-w-0"
                  >
                    <div className="min-w-0 pr-2">
                      <h2 className="font-serif text-xl text-[#1c1917] group-hover:text-[#044e54] font-medium break-words">
                        {specialty.name}
                      </h2>
                      <p className="text-sm text-[#57534e] mt-1 break-words leading-relaxed">
                        {specialty.description}
                      </p>
                    </div>
                    <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center shrink-0 border-t sm:border-t-0 pt-3 sm:pt-0 border-stone-100">
                      <span className="text-xs font-mono text-[#78716c] sm:hidden">Waiting:</span>
                      <span className="font-serif text-base text-[#1c1917] tabular-nums font-semibold">
                        {specialty.waitingCountEngland.toLocaleString('en-GB')}
                      </span>
                      <span className="text-xs text-[#044e54] group-hover:underline mt-1 font-medium">
                        View hospitals &rarr;
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* STEP 3: HOSPITAL FIGURES DETAIL */}
        {currentStep === 3 && (
          <div key="step-3" className="space-y-8 animate-step-enter">
            <header className="border-b border-[#e7e5e4] pb-6">
              <div className="flex items-baseline justify-between flex-wrap gap-2">
                <span className="text-xs uppercase tracking-widest text-[#78716c] font-mono">
                  England • Consultant-led RTT • Trauma &amp; Orthopaedics
                </span>
                <span className="text-xs font-mono text-[#78716c]">
                  Reporting Period: {SNAPSHOT_METADATA.reportingPeriod}
                </span>
              </div>
              <h1 className="font-serif text-3xl sm:text-4xl text-[#1c1917] mt-2 mb-2 font-medium">
                Trauma &amp; Orthopaedics waiting times
              </h1>
              <p className="text-sm text-[#57534e] max-w-3xl leading-relaxed">
                Hospital trusts are listed alphabetically within their NHS Region. Figures describe
                people already on the waiting list on {SNAPSHOT_METADATA.reportingPeriod}, not a
                prediction of your personal wait.
              </p>
            </header>

            {/* Legal Right Banner & Methodology Disclosure Accordion */}
            <details
              className="disclosure-group rounded-lg border border-[#e7e5e4] bg-[#f5f2eb]"
              open
            >
              <summary className="p-5 flex items-center justify-between text-[#1c1917] font-medium font-serif text-base hover:bg-[#eae6dd]/50 rounded-lg transition-colors">
                <span>Your Patient Right in England (18-Week Standard)</span>
                <span className="text-xs font-mono text-[#044e54] underline">
                  View details &darr;
                </span>
              </summary>
              <div className="disclosure-content">
                <div className="disclosure-inner px-5 pb-5 text-sm text-[#57534e] space-y-3">
                  <p className="leading-relaxed">{SNAPSHOT_METADATA.legalRightEngland}</p>
                  <div className="pt-3 border-t border-[#e7e5e4] text-xs text-[#78716c]">
                    <strong>Statutory Basis:</strong> NHS Constitution for England (2012). Figures
                    are snapshots of ongoing waits recorded on {SNAPSHOT_METADATA.reportingPeriod}.
                  </div>
                </div>
              </div>
            </details>

            {/* Empty State Fallback */}
            {units.length === 0 ? (
              <div className="rounded-lg border border-dashed border-[#d6d3d1] bg-white p-12 text-center my-8">
                <h3 className="font-serif text-xl text-[#1c1917] font-medium mb-2">
                  No reporting units available
                </h3>
                <p className="text-sm text-[#78716c] max-w-md mx-auto leading-relaxed">
                  No hospital reporting units were published for this specialty in the current
                  release. Please select another specialty or consult the official release notes.
                </p>
              </div>
            ) : (
              /* Hospital cards grouped by Region */
              <div className="space-y-8">
                {uniqueRegions.map((regionName) => {
                  const regionUnits = units.filter((u) => u.region === regionName);
                  return (
                    <section key={regionName} className="space-y-6">
                      <div className="flex items-center justify-between border-b border-[#e7e5e4] pb-2">
                        <h2 className="text-xs uppercase tracking-widest text-[#78716c] font-mono">
                          {regionName} Region
                        </h2>
                        <span className="text-xs font-mono text-[#a8a29e]">
                          {regionUnits.length} {regionUnits.length === 1 ? 'provider' : 'providers'}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 gap-6">
                        {regionUnits.map((unit) => (
                          <article
                            key={unit.code}
                            className="rounded-lg border border-[#e7e5e4] bg-white p-5 sm:p-6 shadow-sm min-w-0"
                          >
                            <div className="border-b border-[#f5f2eb] pb-4 mb-5 flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                              <div className="min-w-0 flex-1">
                                <span className="text-xs font-mono text-[#78716c] block">
                                  ODS Code: {unit.code}
                                </span>
                                <h3 className="font-serif text-xl sm:text-2xl text-[#1c1917] font-medium mt-0.5 break-words leading-snug">
                                  {unit.name}
                                </h3>
                              </div>
                              <span className="text-xs font-mono text-[#57534e] bg-[#fbf9f6] px-2.5 py-1 rounded border border-[#e7e5e4] shrink-0 self-start">
                                {unit.totalWaiting === 'suppressed'
                                  ? 'Total: Not published'
                                  : unit.totalWaiting === 1
                                    ? '1 patient on waiting list'
                                    : `${unit.totalWaiting.toLocaleString('en-GB')} on waiting list`}
                              </span>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
                              {/* Metric 1: Median Ongoing Wait */}
                              <div
                                style={{ '--stagger-delay': '0ms' } as React.CSSProperties}
                                className="animate-card-stagger p-4 rounded bg-[#faf8f5] border border-[#f5f2eb] flex flex-col justify-between"
                              >
                                <span className="text-xs text-[#57534e] block mb-1">
                                  Median Ongoing Wait
                                </span>
                                {unit.medianWeeks === 'suppressed' ? (
                                  <div className="my-auto py-1">
                                    <span className="text-sm font-medium text-[#78716c] italic block">
                                      Not published (small numbers)
                                    </span>
                                  </div>
                                ) : (
                                  <div>
                                    <div className="flex items-baseline">
                                      <span className="font-serif text-3xl text-[#044e54] font-semibold tabular-nums">
                                        {unit.medianWeeks}
                                      </span>
                                      <span className="text-xs text-[#57534e] ml-1.5">
                                        {unit.medianWeeks === 1 ? 'week' : 'weeks'}
                                      </span>
                                    </div>
                                    <span className="text-xs text-[#78716c] block mt-1">
                                      Half waited less, half waited more
                                    </span>
                                  </div>
                                )}
                              </div>

                              {/* Metric 2: Waiting within 18 weeks */}
                              <div
                                style={{ '--stagger-delay': '35ms' } as React.CSSProperties}
                                className="animate-card-stagger p-4 rounded bg-[#faf8f5] border border-[#f5f2eb] flex flex-col justify-between"
                              >
                                <span className="text-xs text-[#57534e] block mb-1">
                                  Waiting within 18 weeks
                                </span>
                                {unit.percentWithinStandard === 'suppressed' ? (
                                  <div className="my-auto py-1">
                                    <span className="text-sm font-medium text-[#78716c] italic block">
                                      Not published (small numbers)
                                    </span>
                                  </div>
                                ) : (
                                  <div>
                                    <div className="flex items-baseline">
                                      <span className="font-serif text-3xl text-[#1c1917] font-semibold tabular-nums">
                                        {unit.percentWithinStandard}%
                                      </span>
                                    </div>
                                    <span className="text-xs text-[#065f46] block mt-1 font-medium">
                                      National standard: 92%
                                    </span>
                                  </div>
                                )}
                              </div>

                              {/* Metric 3: Waiting over 65 weeks */}
                              <div
                                style={{ '--stagger-delay': '70ms' } as React.CSSProperties}
                                className="animate-card-stagger p-4 rounded bg-[#faf8f5] border border-[#f5f2eb] flex flex-col justify-between"
                              >
                                <span className="text-xs text-[#57534e] block mb-1">
                                  Waiting over 65 weeks
                                </span>
                                {unit.longWait65Plus === 'suppressed' ? (
                                  <div className="my-auto py-1">
                                    <span className="text-sm font-medium text-[#78716c] italic block">
                                      Not published (small numbers)
                                    </span>
                                  </div>
                                ) : (
                                  <div>
                                    <div className="flex items-baseline">
                                      <span className="font-mono text-3xl text-[#9a3412] font-semibold tabular-nums">
                                        {unit.longWait65Plus.toLocaleString('en-GB')}
                                      </span>
                                      <span className="text-xs text-[#57534e] ml-1.5">
                                        {unit.longWait65Plus === 1 ? 'patient' : 'patients'}
                                      </span>
                                    </div>
                                    <span className="text-xs text-[#78716c] block mt-1">
                                      Long wait cohort
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>

                            <footer className="mt-5 pt-3 border-t border-[#f5f2eb] text-xs text-[#78716c] font-serif italic break-words">
                              {SNAPSHOT_METADATA.caption}
                            </footer>
                          </article>
                        ))}
                      </div>
                    </section>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
