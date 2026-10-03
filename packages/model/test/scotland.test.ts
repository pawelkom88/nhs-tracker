import { describe, expect, test } from 'vitest';
import { nationDefinitionsSchema } from '../src/nation-definitions.js';
import {
  SCOTLAND_STATISTIC_LONG_WAIT_COUNT,
  SCOTLAND_STATISTIC_MEDIAN_ONGOING_WAIT,
  SCOTLAND_STATISTIC_TOTAL_WAITING,
  SCOTLAND_STATISTIC_WITHIN_WAITING_STANDARD_COUNT,
  SCOTLAND_WAIT_STAGE_INPATIENT_DAY_CASE,
  SCOTLAND_WAIT_STAGE_NEW_OUTPATIENT,
  scotlandDefinitions,
  scotlandStages,
} from '../src/scotland/definitions.js';
import { scotlandReleaseFileSchema, scotlandReleaseSchema } from '../src/scotland/schema.js';
import { reportingUnitId, specialtyId, statisticId, waitStageId } from '../src/ids.js';
import { publicationDate, reportingPeriod } from '../src/period.js';
import { exactSum, type Figure } from '../src/figure.js';
import type { Release } from '../src/release.js';
import type { SourceRef } from '../src/source.js';

const mockScotlandSource: SourceRef<'scotland'> = {
  nation: 'scotland',
  publisher: 'Public Health Scotland',
  title: 'Stage of Treatment Waiting Times',
  url: 'https://publichealthscotland.scot/publications/stage-of-treatment-waiting-times/',
  licence: 'OGL-3.0',
  attribution:
    'Source: Public Health Scotland. Contains public sector information licensed under the Open Government Licence v3.0.',
};

function createValidScotlandRelease(): Release<'scotland'> {
  const currentPeriod = reportingPeriod('2026-08-31');
  const pubDate = publicationDate('2026-09-29');
  const rUnit = reportingUnitId('scotland', 'S08000031'); // NHS Greater Glasgow and Clyde
  const spec = specialtyId('scotland', 'C1'); // General Surgery
  const outpatientStage = waitStageId('scotland', 'new-outpatient');
  const inpatientStage = waitStageId('scotland', 'inpatient-day-case');

  const figures: Figure<'scotland'>[] = [
    // Outpatient figures
    {
      nation: 'scotland',
      reportingUnit: rUnit,
      specialty: spec,
      waitStage: outpatientStage,
      statistic: statisticId('scotland', 'median-ongoing-wait'),
      reportingPeriod: currentPeriod,
      publicationDate: pubDate,
      unit: 'days',
      value: { status: 'published', value: 72.5, provisional: false },
      provenance: { kind: 'official', sourceField: 'Median' },
      source: mockScotlandSource,
    },
    {
      nation: 'scotland',
      reportingUnit: rUnit,
      specialty: spec,
      waitStage: outpatientStage,
      statistic: statisticId('scotland', 'within-waiting-standard-count'),
      reportingPeriod: currentPeriod,
      publicationDate: pubDate,
      unit: 'count',
      value: { status: 'published', value: 2450, provisional: false },
      provenance: {
        kind: 'derived',
        method: 'exact-sum',
        inputs: ['LessThan4WeekWait', '4To8WeekWait', '8To12WeekWait'],
      },
      source: mockScotlandSource,
    },
    {
      nation: 'scotland',
      reportingUnit: rUnit,
      specialty: spec,
      waitStage: outpatientStage,
      statistic: statisticId('scotland', 'long-wait-count'),
      reportingPeriod: currentPeriod,
      publicationDate: pubDate,
      unit: 'count',
      value: { status: 'published', value: 120, provisional: false },
      provenance: { kind: 'official', sourceField: 'WaitsOver52Weeks' },
      source: mockScotlandSource,
    },
    {
      nation: 'scotland',
      reportingUnit: rUnit,
      specialty: spec,
      waitStage: outpatientStage,
      statistic: statisticId('scotland', 'total-waiting'),
      reportingPeriod: currentPeriod,
      publicationDate: pubDate,
      unit: 'count',
      value: { status: 'published', value: 4500, provisional: false },
      provenance: { kind: 'official', sourceField: 'Waits' },
      source: mockScotlandSource,
    },
    // Inpatient figures
    {
      nation: 'scotland',
      reportingUnit: rUnit,
      specialty: spec,
      waitStage: inpatientStage,
      statistic: statisticId('scotland', 'median-ongoing-wait'),
      reportingPeriod: currentPeriod,
      publicationDate: pubDate,
      unit: 'days',
      value: { status: 'published', value: 95.0, provisional: false },
      provenance: { kind: 'official', sourceField: 'Median' },
      source: mockScotlandSource,
    },
    {
      nation: 'scotland',
      reportingUnit: rUnit,
      specialty: spec,
      waitStage: inpatientStage,
      statistic: statisticId('scotland', 'within-waiting-standard-count'),
      reportingPeriod: currentPeriod,
      publicationDate: pubDate,
      unit: 'count',
      value: { status: 'published', value: 1100, provisional: false },
      provenance: {
        kind: 'derived',
        method: 'exact-sum',
        inputs: ['LessThan4WeekWait', '4To8WeekWait', '8To12WeekWait'],
      },
      source: mockScotlandSource,
    },
    {
      nation: 'scotland',
      reportingUnit: rUnit,
      specialty: spec,
      waitStage: inpatientStage,
      statistic: statisticId('scotland', 'long-wait-count'),
      reportingPeriod: currentPeriod,
      publicationDate: pubDate,
      unit: 'count',
      value: { status: 'published', value: 85, provisional: false },
      provenance: { kind: 'official', sourceField: 'WaitsOver52Weeks' },
      source: mockScotlandSource,
    },
    {
      nation: 'scotland',
      reportingUnit: rUnit,
      specialty: spec,
      waitStage: inpatientStage,
      statistic: statisticId('scotland', 'total-waiting'),
      reportingPeriod: currentPeriod,
      publicationDate: pubDate,
      unit: 'count',
      value: { status: 'published', value: 2100, provisional: false },
      provenance: { kind: 'official', sourceField: 'Waits' },
      source: mockScotlandSource,
    },
  ];

  return {
    schemaVersion: 1,
    nation: 'scotland',
    reportingPeriod: currentPeriod,
    publicationDate: pubDate,
    source: mockScotlandSource,
    retrievedAt: '2026-09-29T10:00:00Z',
    sourceFiles: [
      {
        url: 'https://www.opendata.nhs.scot/dataset/e9dbef36-a343-4b9a-ab7e-b6e6cbcbb38e/resource/ac63b747-fdcc-410c-ae43-de6fe3c46abf/download/monthly.csv',
        sha256: 'd'.repeat(64),
        revised: false,
      },
      {
        url: 'https://www.opendata.nhs.scot/dataset/e9dbef36-a343-4b9a-ab7e-b6e6cbcbb38e/resource/f9232c17-a90e-4d35-a863-11bdb3a748c0/download/bands.csv',
        sha256: 'e'.repeat(64),
        revised: false,
      },
    ],
    reportingUnits: [rUnit],
    figures,
    comparisonFigures: [],
  };
}

describe('Scotland domain definitions', () => {
  test('conforms to nationDefinitionsSchema', () => {
    const schema = nationDefinitionsSchema('scotland');
    expect(() => schema.parse(scotlandDefinitions)).not.toThrow();
  });

  test('defines exactly 2 wait stages with 12-week standards', () => {
    expect(Object.keys(scotlandDefinitions.waitStages).sort()).toEqual([
      'inpatient-day-case',
      'new-outpatient',
    ]);
    expect(SCOTLAND_WAIT_STAGE_NEW_OUTPATIENT.waitingStandard.weeks).toBe(12);
    expect(SCOTLAND_WAIT_STAGE_NEW_OUTPATIENT.officialName).toBe('New Outpatient');
    expect(SCOTLAND_WAIT_STAGE_INPATIENT_DAY_CASE.waitingStandard.weeks).toBe(12);
    expect(SCOTLAND_WAIT_STAGE_INPATIENT_DAY_CASE.officialName).toBe('Inpatient/Day case');
    expect(SCOTLAND_WAIT_STAGE_INPATIENT_DAY_CASE.waitingStandard.officialName).toBe(
      'Treatment Time Guarantee',
    );
  });

  test('scotlandStages tuple exports both wait stages', () => {
    expect(scotlandStages).toHaveLength(2);
    expect(scotlandStages[0].id).toBe('scotland:new-outpatient');
    expect(scotlandStages[1].id).toBe('scotland:inpatient-day-case');
  });

  test('defines all 4 statistics with expected units, ranges and provenances', () => {
    expect(Object.keys(scotlandDefinitions.statistics).sort()).toEqual([
      'long-wait-count',
      'median-ongoing-wait',
      'total-waiting',
      'within-waiting-standard-count',
    ]);

    expect(SCOTLAND_STATISTIC_MEDIAN_ONGOING_WAIT.unit).toBe('days');
    expect(SCOTLAND_STATISTIC_MEDIAN_ONGOING_WAIT.range).toEqual({ min: 0, max: 1100 });
    expect(SCOTLAND_STATISTIC_MEDIAN_ONGOING_WAIT.allowedProvenance).toBe('official');

    expect(SCOTLAND_STATISTIC_WITHIN_WAITING_STANDARD_COUNT.unit).toBe('count');
    expect(SCOTLAND_STATISTIC_WITHIN_WAITING_STANDARD_COUNT.range).toEqual({
      min: 0,
      max: 1_000_000,
    });
    expect(SCOTLAND_STATISTIC_WITHIN_WAITING_STANDARD_COUNT.allowedProvenance).toBe('derived');

    expect(SCOTLAND_STATISTIC_LONG_WAIT_COUNT.unit).toBe('count');
    expect(SCOTLAND_STATISTIC_LONG_WAIT_COUNT.range).toEqual({ min: 0, max: 500_000 });
    expect(SCOTLAND_STATISTIC_LONG_WAIT_COUNT.allowedProvenance).toBe('official');

    expect(SCOTLAND_STATISTIC_TOTAL_WAITING.unit).toBe('count');
    expect(SCOTLAND_STATISTIC_TOTAL_WAITING.range).toEqual({ min: 0, max: 1_000_000 });
    expect(SCOTLAND_STATISTIC_TOTAL_WAITING.allowedProvenance).toBe('official');
  });

  test('asserts no percent statistic exists for Scotland (Blocking finding B-1)', () => {
    for (const stat of Object.values(scotlandDefinitions.statistics)) {
      expect(stat.unit).not.toBe('percent');
      expect(stat.unit).not.toBe('proportion');
    }
  });
});

describe('scotlandReleaseSchema', () => {
  test('parses a valid Scotland release fixture', () => {
    const release = createValidScotlandRelease();
    expect(() => scotlandReleaseSchema.parse(release)).not.toThrow();
  });

  test('rejects England-prefixed waitStage ID in a Scotland release', () => {
    const release = createValidScotlandRelease();
    const firstFigure = release.figures[0];
    if (!firstFigure) throw new Error('Expected at least 1 figure in fixture');

    const badRelease = {
      ...release,
      figures: [
        {
          ...firstFigure,
          waitStage: 'england:rtt-incomplete-pathway',
        },
      ],
    };
    expect(() => scotlandReleaseSchema.parse(badRelease)).toThrow();
  });

  test('rejects Wales-prefixed statistic ID in a Scotland release', () => {
    const release = createValidScotlandRelease();
    const firstFigure = release.figures[0];
    if (!firstFigure) throw new Error('Expected at least 1 figure in fixture');

    const badRelease = {
      ...release,
      figures: [
        {
          ...firstFigure,
          statistic: 'wales:median-ongoing-wait',
        },
      ],
    };
    expect(() => scotlandReleaseSchema.parse(badRelease)).toThrow();
  });

  test('rejects median with unit "weeks" on a Scotland release', () => {
    const release = createValidScotlandRelease();
    const firstFigure = release.figures[0];
    if (!firstFigure) throw new Error('Expected at least 1 figure in fixture');

    const badRelease = {
      ...release,
      figures: [
        {
          ...firstFigure,
          unit: 'weeks' as const,
        },
      ],
    };
    expect(() => scotlandReleaseSchema.parse(badRelease)).toThrow(
      /does not match defined statistic unit/,
    );
  });

  test('rejects within-waiting-standard-count with official provenance', () => {
    const release = createValidScotlandRelease();
    const derivedFigure = release.figures[1];
    if (!derivedFigure) throw new Error('Expected at least 2 figures in fixture');

    const badRelease = {
      ...release,
      figures: [
        {
          ...derivedFigure,
          provenance: {
            kind: 'official' as const,
            sourceField: 'WaitsUnder12Weeks',
          },
        },
      ],
    };
    expect(() => scotlandReleaseSchema.parse(badRelease)).toThrow(/requires derived provenance/);
  });

  test('accepts within-waiting-standard-count with derived provenance listing 3 band inputs', () => {
    const release = createValidScotlandRelease();
    const derivedFigure = release.figures[1];
    if (!derivedFigure) throw new Error('Expected at least 2 figures in fixture');

    const validRelease = {
      ...release,
      figures: [derivedFigure],
    };
    expect(() => scotlandReleaseSchema.parse(validRelease)).not.toThrow();
  });

  test('rejects derived provenance for median ongoing wait', () => {
    const release = createValidScotlandRelease();
    const firstFigure = release.figures[0];
    if (!firstFigure) throw new Error('Expected at least 1 figure in fixture');

    const badRelease = {
      ...release,
      figures: [
        {
          ...firstFigure,
          provenance: {
            kind: 'derived' as const,
            method: 'exact-sum' as const,
            inputs: ['Band1', 'Band2'],
          },
        },
      ],
    };
    expect(() => scotlandReleaseSchema.parse(badRelease)).toThrow(/requires official provenance/);
  });

  test('rejects out of range median wait (> 1100 days)', () => {
    const release = createValidScotlandRelease();
    const firstFigure = release.figures[0];
    if (!firstFigure) throw new Error('Expected at least 1 figure in fixture');

    const badRelease = {
      ...release,
      figures: [
        {
          ...firstFigure,
          value: { status: 'published' as const, value: 1101, provisional: false },
        },
      ],
    };
    expect(() => scotlandReleaseSchema.parse(badRelease)).toThrow(/outside allowed range/);
  });

  test('rejects out of range long wait count (> 500,000)', () => {
    const release = createValidScotlandRelease();
    const longWaitFigure = release.figures[2];
    if (!longWaitFigure) throw new Error('Expected at least 3 figures in fixture');

    const badRelease = {
      ...release,
      figures: [
        {
          ...longWaitFigure,
          value: { status: 'published' as const, value: 500_001, provisional: false },
        },
      ],
    };
    expect(() => scotlandReleaseSchema.parse(badRelease)).toThrow(/outside allowed range/);
  });

  test('accepts suppressed figure for median ongoing wait', () => {
    const release = createValidScotlandRelease();
    const firstFigure = release.figures[0];
    if (!firstFigure) throw new Error('Expected at least 1 figure in fixture');

    const validSuppressed = {
      ...release,
      figures: [
        {
          ...firstFigure,
          value: { status: 'suppressed' as const, provisional: false },
        },
      ],
    };
    expect(() => scotlandReleaseSchema.parse(validSuppressed)).not.toThrow();
  });
});

describe('scotlandReleaseFileSchema', () => {
  test('validates a compact Scotland release file round-trip', () => {
    const release = createValidScotlandRelease();
    const compactFigures = release.figures.map((f) => ({
      reportingUnit: f.reportingUnit,
      specialty: f.specialty,
      waitStage: f.waitStage,
      statistic: f.statistic,
      unit: f.unit,
      value: f.value,
      provenance: f.provenance,
    }));

    const file = {
      schemaVersion: release.schemaVersion,
      nation: release.nation,
      reportingPeriod: release.reportingPeriod,
      publicationDate: release.publicationDate,
      source: release.source,
      retrievedAt: release.retrievedAt,
      sourceFiles: [...release.sourceFiles],
      reportingUnits: [...release.reportingUnits],
      figures: compactFigures,
      comparisonFigures: [],
    };

    expect(() => scotlandReleaseFileSchema.parse(file)).not.toThrow();
  });
});

describe('Scotland Wait Stages separation (ADR-0002)', () => {
  test('exactSum returns null when passed figures from different wait stages', () => {
    const release = createValidScotlandRelease();
    const outpatientTotal = release.figures[3];
    const inpatientTotal = release.figures[7];

    if (!outpatientTotal || !inpatientTotal) {
      throw new Error('Expected total-waiting figures for both stages in fixture');
    }

    expect(outpatientTotal.waitStage).toBe('scotland:new-outpatient');
    expect(inpatientTotal.waitStage).toBe('scotland:inpatient-day-case');

    // Attempting to sum across stages must return null at runtime
    const result = exactSum([outpatientTotal, inpatientTotal]);
    expect(result).toBeNull();
  });
});
