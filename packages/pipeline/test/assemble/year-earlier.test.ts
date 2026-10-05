import { describe, expect, it } from 'vitest';
import type { Figure } from '@kyw/model/figure';
import { reportingUnitId, specialtyId, statisticId, waitStageId } from '@kyw/model/ids';
import { publicationDate, reportingPeriod } from '@kyw/model/period';
import { publishedFigureSchema } from '@kyw/model/published';
import type { Release } from '@kyw/model/release';
import type { SourceRef } from '@kyw/model/source';
import {
  createEnglandYearEarlierContext,
  createScotlandYearEarlierContext,
  createWalesYearEarlierContext,
  yearEarlierFor,
  type YearEarlierContext,
} from '../../src/assemble/year-earlier.js';
import { buildEnglandSuccessionIndex } from '../../src/reference/england/succession.js';

describe('Year-Earlier Comparison Logic (T-7.2)', () => {
  const dummyEnglandSource: SourceRef<'england'> = {
    nation: 'england',
    publisher: 'NHS England',
    title: 'Consultant-led Referral to Treatment Waiting Times',
    url: 'https://www.england.nhs.uk/statistics/statistical-work-areas/rtt-waiting-times/',
    licence: 'OGL-3.0',
    attribution: 'Source: NHS England',
  };

  const dummyScotlandSource: SourceRef<'scotland'> = {
    nation: 'scotland',
    publisher: 'Public Health Scotland',
    title: 'Stage of Treatment Waiting Times',
    url: 'https://www.opendata.nhs.scot/dataset/stage-of-treatment-waiting-times',
    licence: 'OGL-3.0',
    attribution: 'Source: Public Health Scotland',
  };

  const dummyWalesSource: SourceRef<'wales'> = {
    nation: 'wales',
    publisher: 'Welsh Government',
    title: 'StatsWales NHS Referral to Treatment Waiting Times',
    url: 'https://stats.gov.wales/',
    licence: 'OGL-3.0',
    attribution: 'Source: StatsWales',
  };

  it('omits comparison with "not-median" for non-median statistics', () => {
    const totalWaitingFigure: Figure<'england'> = {
      nation: 'england',
      reportingUnit: reportingUnitId('england', 'RRK'),
      specialty: specialtyId('england', 'C_100'),
      waitStage: waitStageId('england', 'incomplete'),
      statistic: statisticId('england', 'total-waiting'),
      reportingPeriod: reportingPeriod('2025-07-01'),
      publicationDate: publicationDate('2025-09-11'),
      unit: 'count',
      value: { status: 'published', value: 4500, provisional: false },
      provenance: { kind: 'official', sourceField: 'Total number of incomplete pathways' },
      source: dummyEnglandSource,
    };

    const ctx: YearEarlierContext<'england'> = {
      isSameEntity: () => true,
    };

    const result = yearEarlierFor(totalWaitingFigure, ctx);
    expect(result).toEqual({
      status: 'omitted',
      reason: 'not-median',
    });
  });

  it('omits comparison with "not-in-release" when no comparison figure exists', () => {
    const medianFigure: Figure<'england'> = {
      nation: 'england',
      reportingUnit: reportingUnitId('england', 'RRK'),
      specialty: specialtyId('england', 'C_100'),
      waitStage: waitStageId('england', 'incomplete'),
      statistic: statisticId('england', 'median-ongoing-wait'),
      reportingPeriod: reportingPeriod('2025-07-01'),
      publicationDate: publicationDate('2025-09-11'),
      unit: 'weeks',
      value: { status: 'published', value: 14.2, provisional: false },
      provenance: {
        kind: 'official',
        sourceField: 'Average (median) waiting time (in weeks)',
      },
      source: dummyEnglandSource,
    };

    const ctx: YearEarlierContext<'england'> = {
      isSameEntity: () => true,
      olderRelease: null,
    };

    const result = yearEarlierFor(medianFigure, ctx);
    expect(result).toEqual({
      status: 'omitted',
      reason: 'not-in-release',
    });
  });

  it('omits comparison with "unit-changed" for RAL when predecessor RAP was absorbed in window', () => {
    // RAP -> RAL absorbed on 2025-01-01
    const successionIndex = buildEnglandSuccessionIndex([
      { predecessor: 'RAP', successor: 'RAL', effectiveDate: '2025-01-01' },
    ]);

    const ralCurrentMedian: Figure<'england'> = {
      nation: 'england',
      reportingUnit: reportingUnitId('england', 'RAL'),
      specialty: specialtyId('england', 'C_100'),
      waitStage: waitStageId('england', 'incomplete'),
      statistic: statisticId('england', 'median-ongoing-wait'),
      reportingPeriod: reportingPeriod('2025-07-01'),
      publicationDate: publicationDate('2025-09-11'),
      unit: 'weeks',
      value: { status: 'published', value: 13.5, provisional: false },
      provenance: { kind: 'official', sourceField: 'Average (median) waiting time (in weeks)' },
      source: dummyEnglandSource,
    };

    const olderFigure: Figure<'england'> = {
      nation: 'england',
      reportingUnit: reportingUnitId('england', 'RAL'),
      specialty: specialtyId('england', 'C_100'),
      waitStage: waitStageId('england', 'incomplete'),
      statistic: statisticId('england', 'median-ongoing-wait'),
      reportingPeriod: reportingPeriod('2024-07-01'),
      publicationDate: publicationDate('2024-09-12'),
      unit: 'weeks',
      value: { status: 'published', value: 12.1, provisional: false },
      provenance: { kind: 'official', sourceField: 'Average (median) waiting time (in weeks)' },
      source: dummyEnglandSource,
    };

    const olderRelease: Release<'england'> = {
      schemaVersion: 1,
      nation: 'england',
      reportingPeriod: reportingPeriod('2024-07-01'),
      publicationDate: publicationDate('2024-09-12'),
      source: dummyEnglandSource,
      retrievedAt: '2024-09-12T10:00:00.000Z',
      sourceFiles: [
        {
          url: 'https://www.england.nhs.uk/statistics/Incomplete-Provider-Jul24.xlsx',
          sha256: 'a'.repeat(64),
          revised: false,
        },
      ],
      reportingUnits: [reportingUnitId('england', 'RAL')],
      figures: [olderFigure],
      comparisonFigures: [],
    };

    const ctx = createEnglandYearEarlierContext({
      olderRelease,
      successionIndex,
    });

    const result = yearEarlierFor(ralCurrentMedian, ctx);
    expect(result).toEqual({
      status: 'omitted',
      reason: 'unit-changed',
    });
  });

  it('shows comparison for continuous entity RRK in England', () => {
    const successionIndex = buildEnglandSuccessionIndex([
      { predecessor: 'RAP', successor: 'RAL', effectiveDate: '2025-01-01' },
    ]);

    const rrkCurrentMedian: Figure<'england'> = {
      nation: 'england',
      reportingUnit: reportingUnitId('england', 'RRK'),
      specialty: specialtyId('england', 'C_100'),
      waitStage: waitStageId('england', 'incomplete'),
      statistic: statisticId('england', 'median-ongoing-wait'),
      reportingPeriod: reportingPeriod('2025-07-01'),
      publicationDate: publicationDate('2025-09-11'),
      unit: 'weeks',
      value: { status: 'published', value: 14.5, provisional: false },
      provenance: { kind: 'official', sourceField: 'Average (median) waiting time (in weeks)' },
      source: dummyEnglandSource,
    };

    const rrkOlderFigure: Figure<'england'> = {
      nation: 'england',
      reportingUnit: reportingUnitId('england', 'RRK'),
      specialty: specialtyId('england', 'C_100'),
      waitStage: waitStageId('england', 'incomplete'),
      statistic: statisticId('england', 'median-ongoing-wait'),
      reportingPeriod: reportingPeriod('2024-07-01'),
      publicationDate: publicationDate('2024-09-12'),
      unit: 'weeks',
      value: { status: 'published', value: 15.0, provisional: false },
      provenance: { kind: 'official', sourceField: 'Average (median) waiting time (in weeks)' },
      source: dummyEnglandSource,
    };

    const olderRelease: Release<'england'> = {
      schemaVersion: 1,
      nation: 'england',
      reportingPeriod: reportingPeriod('2024-07-01'),
      publicationDate: publicationDate('2024-09-12'),
      source: dummyEnglandSource,
      retrievedAt: '2024-09-12T10:00:00.000Z',
      sourceFiles: [
        {
          url: 'https://www.england.nhs.uk/statistics/Incomplete-Provider-Jul24.xlsx',
          sha256: 'b'.repeat(64),
          revised: false,
        },
      ],
      reportingUnits: [reportingUnitId('england', 'RRK')],
      figures: [rrkOlderFigure],
      comparisonFigures: [],
    };

    const ctx = createEnglandYearEarlierContext({
      olderRelease,
      successionIndex,
    });

    const result = yearEarlierFor(rrkCurrentMedian, ctx);
    expect(result).toEqual({
      status: 'shown',
      value: { status: 'published', value: 15.0, provisional: false },
      reportingPeriod: reportingPeriod('2024-07-01'),
      publicationDate: publicationDate('2024-09-12'),
    });

    // Validates with PublishedFigure schema
    const publishedFigure = {
      ...rrkCurrentMedian,
      yearEarlier: result,
    };
    expect(() => publishedFigureSchema('england').parse(publishedFigure)).not.toThrow();
  });

  it('omits comparison with "suppressed" if current median is suppressed', () => {
    const suppressedCurrent: Figure<'england'> = {
      nation: 'england',
      reportingUnit: reportingUnitId('england', 'RRK'),
      specialty: specialtyId('england', 'C_100'),
      waitStage: waitStageId('england', 'incomplete'),
      statistic: statisticId('england', 'median-ongoing-wait'),
      reportingPeriod: reportingPeriod('2025-07-01'),
      publicationDate: publicationDate('2025-09-11'),
      unit: 'weeks',
      value: { status: 'suppressed', provisional: false },
      provenance: { kind: 'official', sourceField: 'Average (median) waiting time (in weeks)' },
      source: dummyEnglandSource,
    };

    const olderFigure: Figure<'england'> = {
      nation: 'england',
      reportingUnit: reportingUnitId('england', 'RRK'),
      specialty: specialtyId('england', 'C_100'),
      waitStage: waitStageId('england', 'incomplete'),
      statistic: statisticId('england', 'median-ongoing-wait'),
      reportingPeriod: reportingPeriod('2024-07-01'),
      publicationDate: publicationDate('2024-09-12'),
      unit: 'weeks',
      value: { status: 'published', value: 10.5, provisional: false },
      provenance: { kind: 'official', sourceField: 'Average (median) waiting time (in weeks)' },
      source: dummyEnglandSource,
    };

    const ctx: YearEarlierContext<'england'> = {
      olderRelease: {
        schemaVersion: 1,
        nation: 'england',
        reportingPeriod: reportingPeriod('2024-07-01'),
        publicationDate: publicationDate('2024-09-12'),
        source: dummyEnglandSource,
        retrievedAt: '2024-09-12T10:00:00.000Z',
        sourceFiles: [],
        reportingUnits: [reportingUnitId('england', 'RRK')],
        figures: [olderFigure],
        comparisonFigures: [],
      },
      isSameEntity: () => true,
    };

    const result = yearEarlierFor(suppressedCurrent, ctx);
    expect(result).toEqual({
      status: 'omitted',
      reason: 'suppressed',
    });
  });

  it('omits comparison with "suppressed" if comparison median is suppressed', () => {
    const currentFigure: Figure<'england'> = {
      nation: 'england',
      reportingUnit: reportingUnitId('england', 'RRK'),
      specialty: specialtyId('england', 'C_100'),
      waitStage: waitStageId('england', 'incomplete'),
      statistic: statisticId('england', 'median-ongoing-wait'),
      reportingPeriod: reportingPeriod('2025-07-01'),
      publicationDate: publicationDate('2025-09-11'),
      unit: 'weeks',
      value: { status: 'published', value: 12.4, provisional: false },
      provenance: { kind: 'official', sourceField: 'Average (median) waiting time (in weeks)' },
      source: dummyEnglandSource,
    };

    const suppressedOlderFigure: Figure<'england'> = {
      nation: 'england',
      reportingUnit: reportingUnitId('england', 'RRK'),
      specialty: specialtyId('england', 'C_100'),
      waitStage: waitStageId('england', 'incomplete'),
      statistic: statisticId('england', 'median-ongoing-wait'),
      reportingPeriod: reportingPeriod('2024-07-01'),
      publicationDate: publicationDate('2024-09-12'),
      unit: 'weeks',
      value: { status: 'suppressed', provisional: false },
      provenance: { kind: 'official', sourceField: 'Average (median) waiting time (in weeks)' },
      source: dummyEnglandSource,
    };

    const ctx: YearEarlierContext<'england'> = {
      olderRelease: {
        schemaVersion: 1,
        nation: 'england',
        reportingPeriod: reportingPeriod('2024-07-01'),
        publicationDate: publicationDate('2024-09-12'),
        source: dummyEnglandSource,
        retrievedAt: '2024-09-12T10:00:00.000Z',
        sourceFiles: [],
        reportingUnits: [reportingUnitId('england', 'RRK')],
        figures: [suppressedOlderFigure],
        comparisonFigures: [],
      },
      isSameEntity: () => true,
    };

    const result = yearEarlierFor(currentFigure, ctx);
    expect(result).toEqual({
      status: 'omitted',
      reason: 'suppressed',
    });
  });

  it('Scotland prefers same-release comparisonFigures over olderRelease file', () => {
    const currentScotlandFigure: Figure<'scotland'> = {
      nation: 'scotland',
      reportingUnit: reportingUnitId('scotland', 'S08000031'), // NHS Greater Glasgow and Clyde
      specialty: specialtyId('scotland', 'C1'),
      waitStage: waitStageId('scotland', 'new-outpatient'),
      statistic: statisticId('scotland', 'median-ongoing-wait'),
      reportingPeriod: reportingPeriod('2026-08-01'),
      publicationDate: publicationDate('2026-09-29'),
      unit: 'days',
      value: { status: 'published', value: 84, provisional: false },
      provenance: { kind: 'official', sourceField: 'Median' },
      source: dummyScotlandSource,
    };

    // Same-release revised comparison figure (80 days)
    const comparisonFigure: Figure<'scotland'> = {
      nation: 'scotland',
      reportingUnit: reportingUnitId('scotland', 'S08000031'),
      specialty: specialtyId('scotland', 'C1'),
      waitStage: waitStageId('scotland', 'new-outpatient'),
      statistic: statisticId('scotland', 'median-ongoing-wait'),
      reportingPeriod: reportingPeriod('2025-08-01'),
      publicationDate: publicationDate('2026-09-29'),
      unit: 'days',
      value: { status: 'published', value: 80, provisional: false },
      provenance: { kind: 'official', sourceField: 'Median' },
      source: dummyScotlandSource,
    };

    // Older release unrevised figure (75 days)
    const olderReleaseFigure: Figure<'scotland'> = {
      nation: 'scotland',
      reportingUnit: reportingUnitId('scotland', 'S08000031'),
      specialty: specialtyId('scotland', 'C1'),
      waitStage: waitStageId('scotland', 'new-outpatient'),
      statistic: statisticId('scotland', 'median-ongoing-wait'),
      reportingPeriod: reportingPeriod('2025-08-01'),
      publicationDate: publicationDate('2025-09-30'),
      unit: 'days',
      value: { status: 'published', value: 75, provisional: false },
      provenance: { kind: 'official', sourceField: 'Median' },
      source: dummyScotlandSource,
    };

    const olderRelease: Release<'scotland'> = {
      schemaVersion: 1,
      nation: 'scotland',
      reportingPeriod: reportingPeriod('2025-08-01'),
      publicationDate: publicationDate('2025-09-30'),
      source: dummyScotlandSource,
      retrievedAt: '2025-09-30T10:00:00.000Z',
      sourceFiles: [],
      reportingUnits: [reportingUnitId('scotland', 'S08000031')],
      figures: [olderReleaseFigure],
      comparisonFigures: [],
    };

    const ctx = createScotlandYearEarlierContext({
      comparisonFigures: [comparisonFigure],
      olderRelease,
    });

    const result = yearEarlierFor(currentScotlandFigure, ctx);

    // Verifies same-release comparison figure (80 days) was chosen over olderRelease (75 days)
    expect(result).toEqual({
      status: 'shown',
      value: { status: 'published', value: 80, provisional: false },
      reportingPeriod: reportingPeriod('2025-08-01'),
      publicationDate: publicationDate('2026-09-29'),
    });
  });

  it('Wales resolves year-earlier medians from comparison figures', () => {
    const currentWalesFigure: Figure<'wales'> = {
      nation: 'wales',
      reportingUnit: reportingUnitId('wales', '7A1'), // Betsi Cadwaladr
      specialty: specialtyId('wales', '100'),
      waitStage: waitStageId('wales', 'incomplete'),
      statistic: statisticId('wales', 'median-ongoing-wait'),
      reportingPeriod: reportingPeriod('2026-07-01'),
      publicationDate: publicationDate('2026-09-17'),
      unit: 'weeks',
      value: { status: 'published', value: 16.4, provisional: false },
      provenance: { kind: 'official', sourceField: 'Data values' },
      source: dummyWalesSource,
    };

    const comparisonFigure: Figure<'wales'> = {
      nation: 'wales',
      reportingUnit: reportingUnitId('wales', '7A1'),
      specialty: specialtyId('wales', '100'),
      waitStage: waitStageId('wales', 'incomplete'),
      statistic: statisticId('wales', 'median-ongoing-wait'),
      reportingPeriod: reportingPeriod('2025-07-01'),
      publicationDate: publicationDate('2026-09-17'),
      unit: 'weeks',
      value: { status: 'published', value: 17.8, provisional: false },
      provenance: { kind: 'official', sourceField: 'Data values' },
      source: dummyWalesSource,
    };

    const ctx = createWalesYearEarlierContext({
      comparisonFigures: [comparisonFigure],
    });

    const result = yearEarlierFor(currentWalesFigure, ctx);
    expect(result).toEqual({
      status: 'shown',
      value: { status: 'published', value: 17.8, provisional: false },
      reportingPeriod: reportingPeriod('2025-07-01'),
      publicationDate: publicationDate('2026-09-17'),
    });
  });

  it('omits comparison with "specialty-changed" when specialty was not present then', () => {
    const medianFigure: Figure<'england'> = {
      nation: 'england',
      reportingUnit: reportingUnitId('england', 'RRK'),
      specialty: specialtyId('england', 'C_100'),
      waitStage: waitStageId('england', 'incomplete'),
      statistic: statisticId('england', 'median-ongoing-wait'),
      reportingPeriod: reportingPeriod('2025-07-01'),
      publicationDate: publicationDate('2025-09-11'),
      unit: 'weeks',
      value: { status: 'published', value: 14.2, provisional: false },
      provenance: { kind: 'official', sourceField: 'Average (median) waiting time (in weeks)' },
      source: dummyEnglandSource,
    };

    const olderFigure: Figure<'england'> = {
      nation: 'england',
      reportingUnit: reportingUnitId('england', 'RRK'),
      specialty: specialtyId('england', 'C_100'),
      waitStage: waitStageId('england', 'incomplete'),
      statistic: statisticId('england', 'median-ongoing-wait'),
      reportingPeriod: reportingPeriod('2024-07-01'),
      publicationDate: publicationDate('2024-09-12'),
      unit: 'weeks',
      value: { status: 'published', value: 13.9, provisional: false },
      provenance: { kind: 'official', sourceField: 'Average (median) waiting time (in weeks)' },
      source: dummyEnglandSource,
    };

    const ctx: YearEarlierContext<'england'> = {
      comparisonFigures: [olderFigure],
      isSameEntity: () => true,
      specialtyExistedThen: () => false,
    };

    const result = yearEarlierFor(medianFigure, ctx);
    expect(result).toEqual({
      status: 'omitted',
      reason: 'specialty-changed',
    });
  });
});
