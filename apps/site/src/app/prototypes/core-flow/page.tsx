'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { DirectionAEditorial } from './direction-a-editorial';
import type { DatasetMode } from './worst-case-data';

function CoreFlowHarness() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const rawDataset = searchParams.get('dataset') as DatasetMode | null;
  const initialDataset: DatasetMode =
    rawDataset && ['demo', 'worst-case', 'all-suppressed', 'empty', 'huge'].includes(rawDataset)
      ? rawDataset
      : 'demo';

  const [currentStep, setCurrentStep] = useState(3);
  const [datasetMode, setDatasetMode] = useState<DatasetMode>(initialDataset);

  useEffect(() => {
    if (
      rawDataset &&
      ['demo', 'worst-case', 'all-suppressed', 'empty', 'huge'].includes(rawDataset)
    ) {
      setDatasetMode(rawDataset);
    }
  }, [rawDataset]);

  const handleSelectDataset = (mode: DatasetMode) => {
    setDatasetMode(mode);
    const params = new URLSearchParams(window.location.search);
    params.set('dataset', mode);
    router.replace(`?${params.toString()}`, { scroll: false });
  };

  const modes: { id: DatasetMode; label: string }[] = [
    { id: 'demo', label: 'Demo Data' },
    { id: 'worst-case', label: 'Worst Case' },
    { id: 'all-suppressed', label: 'All Suppressed' },
    { id: 'empty', label: 'Empty (0)' },
    { id: 'huge', label: 'Huge (50+)' },
  ];

  return (
    <div className="relative min-h-screen pb-20">
      <div id="stage" className="w-full">
        <DirectionAEditorial
          currentStep={currentStep}
          onSelectStep={setCurrentStep}
          datasetMode={datasetMode}
        />
      </div>

      {/* Dev-only Stress Testing Switcher (break-ui pattern) */}
      <aside
        aria-label="Stress test controls"
        className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 bg-[#1c1917]/95 text-white px-3 py-2 rounded-full shadow-2xl border border-stone-700 backdrop-blur flex items-center gap-1.5 text-xs max-w-[95vw] overflow-x-auto"
      >
        <span className="text-[11px] font-mono text-stone-400 uppercase tracking-wider px-1.5 hidden sm:inline">
          Data:
        </span>
        {modes.map((mode) => {
          const isActive = datasetMode === mode.id;
          return (
            <button
              key={mode.id}
              onClick={() => {
                handleSelectDataset(mode.id);
              }}
              className={`px-3 py-1 rounded-full font-medium transition-all whitespace-nowrap ${
                isActive
                  ? 'bg-[#044e54] text-white shadow-sm ring-1 ring-teal-400/30'
                  : 'text-stone-300 hover:text-white hover:bg-stone-800'
              }`}
            >
              {mode.label}
            </button>
          );
        })}
      </aside>
    </div>
  );
}

export default function PrototypeCoreFlowPage() {
  return (
    <Suspense
      fallback={
        <div className="p-8 text-center text-stone-500 font-mono">Loading prototype...</div>
      }
    >
      <CoreFlowHarness />
    </Suspense>
  );
}
