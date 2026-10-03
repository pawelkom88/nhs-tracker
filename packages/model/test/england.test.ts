import { describe, expect, test } from 'vitest';
import { nationDefinitionsSchema } from '../src/nation-definitions.js';
import {
  ENGLAND_STATISTIC_LONG_WAIT_COUNT,
  ENGLAND_STATISTIC_MEDIAN_ONGOING_WAIT,
  ENGLAND_STATISTIC_TOTAL_WAITING,
  ENGLAND_STATISTIC_WITHIN_WAITING_STANDARD,
  ENGLAND_WAIT_STAGE_RTT_INCOMPLETE_PATHWAY,
  englandDefinitions,
} from '../src/england/definitions.js';
import { englandReleaseFileSchema, englandReleaseSchema } from '../src/england/schema.js';
import { reportingUnitId, specialtyId, statisticId, waitStageId } from '../src/ids.js';
import { publicationDate, reportingPeriod } from '../src/period.js';
import type { Figure } from '../src/figure.js';
import type { Release } from '../src/release.js';
import type { SourceRef } from '../src/source.js';

const mockEnglandSource: SourceRef<'england'> = {
  nation: 'england',
  publisher: 'NHS England',
  title: 'Consultant-led Referral to Treatment Waiting Times',
  url: 'https://www.england.nhs.uk/statistics/statistical-work-areas/rtt-waiting-times/',
  licence: 'OGL-3.0',
  attribution: 'Contains NHS England data licensed under the Open Government Licence v3.0.',
};

function createValidEnglandRelease(): Release<'england'> {
  const currentPeriod = reportingPeriod('2026-07-31');
  const pubDate = publicationDate('2026-09-10');
  const rUnit = reportingUnitId('england', 'R1H');
  const spec = specialtyId('england', 'C_100');
  const wStage = waitStageId('england', 'rtt-incomplete-pathway');

  const figures: Figure<'england'>[] = [
    {
      nation: 'england',
      reportingUnit: rUnit,
      specialty: spec,
      waitStage: wStage,
      statistic: statisticId('england', 'median-ongoing-wait'),
      reportingPeriod: currentPeriod,
      publicationDate: pubDate,
      unit: 'weeks',
      value: { status: 'published', value: 12.52, provisional: false },
      provenance: { kind: 'official', sourceField: 'Average (median) waiting time (in weeks)' },
      source: mockEnglandSource,
    },
    {
      nation: 'england',
      reportingUnit: rUnit,
      specialty: spec,
      waitStage: wStage,
      statistic: statisticId('england', 'within-waiting-standard'),
      reportingPeriod: currentPeriod,
      publicationDate: pubDate,
      unit: 'proportion',
      value: { status: 'published', value: 0.6502, provisional: false },
      provenance: { kind: 'official', sourceField: '% within 18 weeks' },
      source: mockEnglandSource,
    },
    {
      nation: 'england',
      reportingUnit: rUnit,
      specialty: spec,
      waitStage: wStage,
      statistic: statisticId('england', 'long-wait-count'),
      reportingPeriod: currentPeriod,
      publicationDate: pubDate,
      unit: 'count',
      value: { status: 'published', value: 47, provisional: false },
      provenance: { kind: 'official', sourceField: 'Total 52 plus weeks' },
      source: mockEnglandSource,
    },
    {
      nation: 'england',
      reportingUnit: rUnit,
      specialty: spec,
      waitStage: wStage,
      statistic: statisticId('england', 'total-waiting'),
      reportingPeriod: currentPeriod,
      publicationDate: pubDate,
      unit: 'count',
      value: { status: 'published', value: 4483, provisional: false },
      provenance: { kind: 'official', sourceField: 'Total number of incomplete pathways' },
      source: mockEnglandSource,
    },
  ];

  return {
    schemaVersion: 1,
    nation: 'england',
    reportingPeriod: currentPeriod,
    publicationDate: pubDate,
    source: mockEnglandSource,
    retrievedAt: '2026-09-10T10:00:00Z',
    sourceFiles: [
      {
        url: 'https://www.england.nhs.uk/statistics/wp-content/uploads/sites/2/2026/09/Incomplete-Provider-Jul26-XLSX-9M-97ylx5.xlsx',
        sha256: 'a'.repeat(64),
        revised: false,
      },
    ],
    reportingUnits: [rUnit],
    figures,
    comparisonFigures: [],
  };
}

describe('England domain definitions', () => {
  test('conforms to nationDefinitionsSchema', () => {
    const schema = nationDefinitionsSchema('england');
    expect(() => schema.parse(englandDefinitions)).not.toThrow();
  });

  test('defines exactly 1 wait stage with 18-week standard', () => {
    expect(Object.keys(englandDefinitions.waitStages)).toEqual(['rtt-incomplete-pathway']);
    expect(ENGLAND_WAIT_STAGE_RTT_INCOMPLETE_PATHWAY.waitingStandard.weeks).toBe(18);
    expect(ENGLAND_WAIT_STAGE_RTT_INCOMPLETE_PATHWAY.officialName).toBe(
      'Referral to treatment (incomplete pathways)',
    );
  });

  test('defines all 4 official statistics with expected units and ranges', () => {
    expect(Object.keys(englandDefinitions.statistics).sort()).toEqual([
      'long-wait-count',
      'median-ongoing-wait',
      'total-waiting',
      'within-waiting-standard',
    ]);

    expect(ENGLAND_STATISTIC_MEDIAN_ONGOING_WAIT.unit).toBe('weeks');
    expect(ENGLAND_STATISTIC_MEDIAN_ONGOING_WAIT.range).toEqual({ min: 0, max: 104 });
    expect(ENGLAND_STATISTIC_MEDIAN_ONGOING_WAIT.allowedProvenance).toBe('official');

    expect(ENGLAND_STATISTIC_WITHIN_WAITING_STANDARD.unit).toBe('proportion');
    expect(ENGLAND_STATISTIC_WITHIN_WAITING_STANDARD.range).toEqual({ min: 0, max: 1 });
    expect(ENGLAND_STATISTIC_WITHIN_WAITING_STANDARD.allowedProvenance).toBe('official');

    expect(ENGLAND_STATISTIC_LONG_WAIT_COUNT.unit).toBe('count');
    expect(ENGLAND_STATISTIC_LONG_WAIT_COUNT.range).toEqual({ min: 0, max: 1_000_000 });
    expect(ENGLAND_STATISTIC_LONG_WAIT_COUNT.allowedProvenance).toBe('official');

    expect(ENGLAND_STATISTIC_TOTAL_WAITING.unit).toBe('count');
    expect(ENGLAND_STATISTIC_TOTAL_WAITING.range).toEqual({ min: 0, max: 10_000_000 });
    expect(ENGLAND_STATISTIC_TOTAL_WAITING.allowedProvenance).toBe('official');
  });
});

describe('englandReleaseSchema', () => {
  test('parses a valid England release fixture', () => {
    const release = createValidEnglandRelease();
    expect(() => englandReleaseSchema.parse(release)).not.toThrow();
  });

  test('rejects Wales-prefixed waitStage ID in an England release', () => {
    const release = createValidEnglandRelease();
    const firstFigure = release.figures[0];
    if (!firstFigure) throw new Error('Expected at least 1 figure in fixture');

    const badRelease = {
      ...release,
      figures: [
        {
          ...firstFigure,
          waitStage: 'wales:rtt-pathway',
        },
      ],
    };
    expect(() => englandReleaseSchema.parse(badRelease)).toThrow();
  });

  test('rejects Wales-prefixed statistic ID in an England release', () => {
    const release = createValidEnglandRelease();
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
    expect(() => englandReleaseSchema.parse(badRelease)).toThrow();
  });

  test('rejects median with unit "days" on an England release', () => {
    const release = createValidEnglandRelease();
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
    expect(() => englandReleaseSchema.parse(badRelease)).toThrow(
      /does not match defined statistic unit/,
    );
  });

  test('rejects out of range median wait (> 104 weeks)', () => {
    const release = createValidEnglandRelease();
    const firstFigure = release.figures[0];
    if (!firstFigure) throw new Error('Expected at least 1 figure in fixture');

    const badRelease = {
      ...release,
      figures: [
        {
          ...firstFigure,
          value: { status: 'published' as const, value: 105, provisional: false },
        },
      ],
    };
    expect(() => englandReleaseSchema.parse(badRelease)).toThrow(/outside allowed range/);
  });

  test('rejects proportion > 1 for within-waiting-standard', () => {
    const release = createValidEnglandRelease();
    const secondFigure = release.figures[1];
    if (!secondFigure) throw new Error('Expected at least 2 figures in fixture');

    const badRelease = {
      ...release,
      figures: [
        {
          ...secondFigure,
          value: { status: 'published' as const, value: 1.5, provisional: false },
        },
      ],
    };
    expect(() => englandReleaseSchema.parse(badRelease)).toThrow(/outside allowed range/);
  });

  test('rejects derived provenance for official England statistics', () => {
    const release = createValidEnglandRelease();
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
    expect(() => englandReleaseSchema.parse(badRelease)).toThrow(/requires official provenance/);
  });

  test('accepts suppressed figure for median ongoing wait', () => {
    const release = createValidEnglandRelease();
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
    expect(() => englandReleaseSchema.parse(validSuppressed)).not.toThrow();
  });
});

describe('englandReleaseFileSchema', () => {
  test('validates a compact England release file round-trip', () => {
    const release = createValidEnglandRelease();
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

    expect(() => englandReleaseFileSchema.parse(file)).not.toThrow();
  });
});
