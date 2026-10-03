import { describe, expect, test } from 'vitest';
import { nationDefinitionsSchema } from '../src/nation-definitions.js';
import {
  WALES_STATISTIC_LONG_WAIT_COUNT,
  WALES_STATISTIC_MEDIAN_ONGOING_WAIT,
  WALES_STATISTIC_TOTAL_WAITING,
  WALES_STATISTIC_WITHIN_WAITING_STANDARD,
  WALES_WAIT_STAGE_RTT_PATHWAY,
  walesDefinitions,
} from '../src/wales/definitions.js';
import { walesReleaseFileSchema, walesReleaseSchema } from '../src/wales/schema.js';
import { reportingUnitId, specialtyId, statisticId, waitStageId } from '../src/ids.js';
import { publicationDate, reportingPeriod } from '../src/period.js';
import type { Figure } from '../src/figure.js';
import type { Release } from '../src/release.js';
import type { SourceRef } from '../src/source.js';

const mockWalesSource: SourceRef<'wales'> = {
  nation: 'wales',
  publisher: 'Welsh Government / StatsWales',
  title: 'NHS Activity and Performance Summary (Referral to Treatment)',
  url: 'https://stats.gov.wales/en-GB/topic/50/performance-and-waiting-times',
  licence: 'OGL-3.0',
  attribution:
    'Source: Welsh Government, StatsWales (data provider: Digital Health and Care Wales). Contains public sector information licensed under the Open Government Licence v3.0.',
};

function createValidWalesRelease(): Release<'wales'> {
  const currentPeriod = reportingPeriod('2026-07-31');
  const pubDate = publicationDate('2026-09-17');
  const rUnit = reportingUnitId('wales', 'W11000029'); // Cardiff and Vale University Health Board
  const spec = specialtyId('wales', '100'); // General Surgery
  const wStage = waitStageId('wales', 'rtt-pathway');

  const figures: Figure<'wales'>[] = [
    {
      nation: 'wales',
      reportingUnit: rUnit,
      specialty: spec,
      waitStage: wStage,
      statistic: statisticId('wales', 'median-ongoing-wait'),
      reportingPeriod: currentPeriod,
      publicationDate: pubDate,
      unit: 'weeks',
      value: { status: 'published', value: 21.4, provisional: false },
      provenance: { kind: 'official', sourceField: 'Median waiting time (in weeks)' },
      source: mockWalesSource,
    },
    {
      nation: 'wales',
      reportingUnit: rUnit,
      specialty: spec,
      waitStage: wStage,
      statistic: statisticId('wales', 'within-waiting-standard'),
      reportingPeriod: currentPeriod,
      publicationDate: pubDate,
      unit: 'percent',
      value: { status: 'published', value: 58.4, provisional: false },
      provenance: { kind: 'official', sourceField: '% waiting under 26 weeks' },
      source: mockWalesSource,
    },
    {
      nation: 'wales',
      reportingUnit: rUnit,
      specialty: spec,
      waitStage: wStage,
      statistic: statisticId('wales', 'long-wait-count'),
      reportingPeriod: currentPeriod,
      publicationDate: pubDate,
      unit: 'count',
      value: { status: 'published', value: 312, provisional: false },
      provenance: { kind: 'official', sourceField: 'Waiting more than 52 weeks' },
      source: mockWalesSource,
    },
    {
      nation: 'wales',
      reportingUnit: rUnit,
      specialty: spec,
      waitStage: wStage,
      statistic: statisticId('wales', 'total-waiting'),
      reportingPeriod: currentPeriod,
      publicationDate: pubDate,
      unit: 'count',
      value: { status: 'published', value: 5410, provisional: false },
      provenance: { kind: 'official', sourceField: 'Total patient pathways waiting' },
      source: mockWalesSource,
    },
  ];

  return {
    schemaVersion: 1,
    nation: 'wales',
    reportingPeriod: currentPeriod,
    publicationDate: pubDate,
    source: mockWalesSource,
    retrievedAt: '2026-09-17T10:00:00Z',
    sourceFiles: [
      {
        url: 'https://api.stats.gov.wales/v2/acd9529c-979a-48ef-a773-870b3ebe4391',
        sha256: 'b'.repeat(64),
        revised: false,
      },
      {
        url: 'https://api.stats.gov.wales/v2/3ef3a1d8-1467-4afe-ad60-4fc3d92228a1',
        sha256: 'c'.repeat(64),
        revised: false,
      },
    ],
    reportingUnits: [rUnit],
    figures,
    comparisonFigures: [],
  };
}

describe('Wales domain definitions', () => {
  test('conforms to nationDefinitionsSchema', () => {
    const schema = nationDefinitionsSchema('wales');
    expect(() => schema.parse(walesDefinitions)).not.toThrow();
  });

  test('defines exactly 1 wait stage with 26-week standard', () => {
    expect(Object.keys(walesDefinitions.waitStages)).toEqual(['rtt-pathway']);
    expect(WALES_WAIT_STAGE_RTT_PATHWAY.waitingStandard.weeks).toBe(26);
    expect(WALES_WAIT_STAGE_RTT_PATHWAY.officialName).toBe(
      'Patient pathways waiting to start treatment',
    );
  });

  test('defines all 4 official statistics with expected units and ranges', () => {
    expect(Object.keys(walesDefinitions.statistics).sort()).toEqual([
      'long-wait-count',
      'median-ongoing-wait',
      'total-waiting',
      'within-waiting-standard',
    ]);

    expect(WALES_STATISTIC_MEDIAN_ONGOING_WAIT.unit).toBe('weeks');
    expect(WALES_STATISTIC_MEDIAN_ONGOING_WAIT.range).toEqual({ min: 0, max: 260 });
    expect(WALES_STATISTIC_MEDIAN_ONGOING_WAIT.allowedProvenance).toBe('official');

    expect(WALES_STATISTIC_WITHIN_WAITING_STANDARD.unit).toBe('percent');
    expect(WALES_STATISTIC_WITHIN_WAITING_STANDARD.range).toEqual({ min: 0, max: 100 });
    expect(WALES_STATISTIC_WITHIN_WAITING_STANDARD.allowedProvenance).toBe('official');

    expect(WALES_STATISTIC_LONG_WAIT_COUNT.unit).toBe('count');
    expect(WALES_STATISTIC_LONG_WAIT_COUNT.range).toEqual({ min: 0, max: 1_000_000 });
    expect(WALES_STATISTIC_LONG_WAIT_COUNT.allowedProvenance).toBe('official');

    expect(WALES_STATISTIC_TOTAL_WAITING.unit).toBe('count');
    expect(WALES_STATISTIC_TOTAL_WAITING.range).toEqual({ min: 0, max: 2_000_000 });
    expect(WALES_STATISTIC_TOTAL_WAITING.allowedProvenance).toBe('official');
  });

  test('asserts all statistics have allowedProvenance equal to official only', () => {
    for (const stat of Object.values(walesDefinitions.statistics)) {
      expect(stat.allowedProvenance).toBe('official');
    }
  });
});

describe('walesReleaseSchema', () => {
  test('parses a valid Wales release fixture', () => {
    const release = createValidWalesRelease();
    expect(() => walesReleaseSchema.parse(release)).not.toThrow();
  });

  test('rejects England-prefixed waitStage ID in a Wales release', () => {
    const release = createValidWalesRelease();
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
    expect(() => walesReleaseSchema.parse(badRelease)).toThrow();
  });

  test('rejects England-prefixed statistic ID in a Wales release', () => {
    const release = createValidWalesRelease();
    const firstFigure = release.figures[0];
    if (!firstFigure) throw new Error('Expected at least 1 figure in fixture');

    const badRelease = {
      ...release,
      figures: [
        {
          ...firstFigure,
          statistic: 'england:median-ongoing-wait',
        },
      ],
    };
    expect(() => walesReleaseSchema.parse(badRelease)).toThrow();
  });

  test('rejects Scotland-prefixed statistic ID in a Wales release', () => {
    const release = createValidWalesRelease();
    const firstFigure = release.figures[0];
    if (!firstFigure) throw new Error('Expected at least 1 figure in fixture');

    const badRelease = {
      ...release,
      figures: [
        {
          ...firstFigure,
          statistic: 'scotland:median-ongoing-wait',
        },
      ],
    };
    expect(() => walesReleaseSchema.parse(badRelease)).toThrow();
  });

  test('rejects median with unit "days" on a Wales release', () => {
    const release = createValidWalesRelease();
    const firstFigure = release.figures[0];
    if (!firstFigure) throw new Error('Expected at least 1 figure in fixture');

    const badRelease = {
      ...release,
      figures: [
        {
          ...firstFigure,
          unit: 'days' as const,
        },
      ],
    };
    expect(() => walesReleaseSchema.parse(badRelease)).toThrow(
      /does not match defined statistic unit/,
    );
  });

  test('rejects within-waiting-standard with unit "proportion" on a Wales release', () => {
    const release = createValidWalesRelease();
    const secondFigure = release.figures[1];
    if (!secondFigure) throw new Error('Expected at least 2 figures in fixture');

    const badRelease = {
      ...release,
      figures: [
        {
          ...secondFigure,
          unit: 'proportion' as const,
        },
      ],
    };
    expect(() => walesReleaseSchema.parse(badRelease)).toThrow(
      /does not match defined statistic unit/,
    );
  });

  test('rejects out of range median wait (> 260 weeks)', () => {
    const release = createValidWalesRelease();
    const firstFigure = release.figures[0];
    if (!firstFigure) throw new Error('Expected at least 1 figure in fixture');

    const badRelease = {
      ...release,
      figures: [
        {
          ...firstFigure,
          value: { status: 'published' as const, value: 261, provisional: false },
        },
      ],
    };
    expect(() => walesReleaseSchema.parse(badRelease)).toThrow(/outside allowed range/);
  });

  test('rejects percent > 100 for within-waiting-standard', () => {
    const release = createValidWalesRelease();
    const secondFigure = release.figures[1];
    if (!secondFigure) throw new Error('Expected at least 2 figures in fixture');

    const badRelease = {
      ...release,
      figures: [
        {
          ...secondFigure,
          value: { status: 'published' as const, value: 101, provisional: false },
        },
      ],
    };
    expect(() => walesReleaseSchema.parse(badRelease)).toThrow(/outside allowed range/);
  });

  test('rejects derived provenance for official Wales statistics', () => {
    const release = createValidWalesRelease();
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
            inputs: ['input-1', 'input-2'],
          },
        },
      ],
    };
    expect(() => walesReleaseSchema.parse(badRelease)).toThrow(/requires official provenance/);
  });

  test('accepts suppressed figure for median ongoing wait', () => {
    const release = createValidWalesRelease();
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
    expect(() => walesReleaseSchema.parse(validSuppressed)).not.toThrow();
  });
});

describe('walesReleaseFileSchema', () => {
  test('validates a compact Wales release file round-trip', () => {
    const release = createValidWalesRelease();
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

    expect(() => walesReleaseFileSchema.parse(file)).not.toThrow();
  });
});
