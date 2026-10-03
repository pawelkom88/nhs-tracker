import { describe, expect, test } from 'vitest';
import type { NationDefinitions } from '../src/nation-definitions.js';
import {
  fromReleaseFile,
  releaseFileSchema,
  releaseSchema,
  toReleaseFile,
  type Release,
} from '../src/release.js';
import { reportingUnitId, specialtyId, statisticId, waitStageId } from '../src/ids.js';
import { publicationDate, reportingPeriod } from '../src/period.js';
import type { Figure } from '../src/figure.js';
import type { SourceRef } from '../src/source.js';

const mockEnglandSource: SourceRef<'england'> = {
  nation: 'england',
  publisher: 'NHS England',
  title: 'Consultant-led Referral to Treatment Waiting Times',
  url: 'https://www.england.nhs.uk/statistics/statistical-work-areas/rtt-waiting-times/',
  licence: 'OGL-3.0',
  attribution: 'Contains NHS England data licensed under the Open Government Licence v3.0.',
};

const mockEnglandDefs: NationDefinitions<'england'> = {
  nation: 'england',
  waitStages: {
    'rtt-incomplete-pathway': {
      id: waitStageId('england', 'rtt-incomplete-pathway'),
      officialName: 'Referral to treatment (incomplete pathways)',
      waitingStandard: {
        weeks: 18,
        officialName: '18 weeks RTT standard',
        sourceUrl: 'https://www.england.nhs.uk/rtt/',
      },
    },
  },
  statistics: {
    'median-ongoing-wait': {
      id: statisticId('england', 'median-ongoing-wait'),
      unit: 'weeks',
      officialName: 'Average (median) waiting time (in weeks)',
      allowedProvenance: 'official',
      range: { min: 0, max: 104 },
    },
    'within-waiting-standard': {
      id: statisticId('england', 'within-waiting-standard'),
      unit: 'proportion',
      officialName: '% within 18 weeks',
      allowedProvenance: 'official',
      range: { min: 0, max: 1 },
    },
    'long-wait-count': {
      id: statisticId('england', 'long-wait-count'),
      unit: 'count',
      officialName: 'Total 52 plus weeks',
      allowedProvenance: 'official',
      range: { min: 0, max: 1000000 },
    },
    'total-waiting': {
      id: statisticId('england', 'total-waiting'),
      unit: 'count',
      officialName: 'Total number of incomplete pathways',
      allowedProvenance: 'official',
      range: { min: 0, max: 10000000 },
    },
  },
};

function createValidRelease(): Release<'england'> {
  const currentPeriod = reportingPeriod('2026-01-31');
  const earlierPeriod = reportingPeriod('2025-01-31');
  const pubDate = publicationDate('2026-03-12');
  const rUnit = reportingUnitId('england', 'RGT');
  const spec = specialtyId('england', '100');
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
      value: { status: 'published', value: 14.2, provisional: false },
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
      value: { status: 'published', value: 0.62, provisional: false },
      provenance: { kind: 'official', sourceField: '% within 18 weeks' },
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
      value: { status: 'published', value: 1500, provisional: false },
      provenance: { kind: 'official', sourceField: 'Total number of incomplete pathways' },
      source: mockEnglandSource,
    },
  ];

  const comparisonFigures: Figure<'england'>[] = [
    {
      nation: 'england',
      reportingUnit: rUnit,
      specialty: spec,
      waitStage: wStage,
      statistic: statisticId('england', 'median-ongoing-wait'),
      reportingPeriod: earlierPeriod,
      publicationDate: pubDate,
      unit: 'weeks',
      value: { status: 'published', value: 13.8, provisional: false },
      provenance: { kind: 'official', sourceField: 'Average (median) waiting time (in weeks)' },
      source: mockEnglandSource,
    },
  ];

  return {
    schemaVersion: 1,
    nation: 'england',
    reportingPeriod: currentPeriod,
    publicationDate: pubDate,
    source: mockEnglandSource,
    retrievedAt: '2026-03-12T09:30:00.000Z',
    sourceFiles: [
      {
        url: 'https://www.england.nhs.uk/statistics/wp-content/uploads/sites/2/2026/03/RTT-Overview-Timeseries-Jan26.xlsx',
        sha256: 'a'.repeat(64),
        revised: false,
      },
    ],
    reportingUnits: [rUnit],
    figures,
    comparisonFigures,
  };
}

describe('releaseSchema', () => {
  const schema = releaseSchema(mockEnglandDefs);

  test('validates a complete, consistent Release', () => {
    const release = createValidRelease();
    expect(schema.parse(release)).toEqual(release);
  });

  test('rejects mismatched reportingPeriod on figure', () => {
    const release = createValidRelease();
    const firstFig = release.figures[0];
    if (!firstFig) throw new Error('Expected at least 1 figure');
    const badFigures = [
      { ...firstFig, reportingPeriod: reportingPeriod('2026-02-28') },
      ...release.figures.slice(1),
    ];
    expect(() => schema.parse({ ...release, figures: badFigures })).toThrow(
      /Figure reportingPeriod .* does not match release reportingPeriod/,
    );
  });

  test('rejects mismatched publicationDate on figure', () => {
    const release = createValidRelease();
    const firstFig = release.figures[0];
    if (!firstFig) throw new Error('Expected at least 1 figure');
    const badFigures = [
      { ...firstFig, publicationDate: publicationDate('2026-04-10') },
      ...release.figures.slice(1),
    ];
    expect(() => schema.parse({ ...release, figures: badFigures })).toThrow(
      /Figure publicationDate .* does not match release publicationDate/,
    );
  });

  test('rejects mismatched source on figure', () => {
    const release = createValidRelease();
    const firstFig = release.figures[0];
    if (!firstFig) throw new Error('Expected at least 1 figure');
    const badFigures = [
      {
        ...firstFig,
        source: { ...mockEnglandSource, url: 'https://different-url.example.com/' },
      },
      ...release.figures.slice(1),
    ];
    expect(() => schema.parse({ ...release, figures: badFigures })).toThrow(
      /Figure source does not match release source/,
    );
  });

  test('rejects figure with reportingUnit not in release reportingUnits list', () => {
    const release = createValidRelease();
    const unlistedUnit = reportingUnitId('england', 'XYZ');
    const firstFig = release.figures[0];
    if (!firstFig) throw new Error('Expected at least 1 figure');
    const badFigures = [{ ...firstFig, reportingUnit: unlistedUnit }, ...release.figures.slice(1)];
    expect(() => schema.parse({ ...release, figures: badFigures })).toThrow(
      /is not listed in release reportingUnits/,
    );
  });

  test('rejects waitStage not defined in nation definitions', () => {
    const release = createValidRelease();
    const firstFig = release.figures[0];
    if (!firstFig) throw new Error('Expected at least 1 figure');
    const badFigures = [
      { ...firstFig, waitStage: waitStageId('england', 'unknown-stage') },
      ...release.figures.slice(1),
    ];
    expect(() => schema.parse({ ...release, figures: badFigures })).toThrow(
      /Wait stage .* is not defined in nation definitions/,
    );
  });

  test('rejects statistic not defined in nation definitions', () => {
    const release = createValidRelease();
    const firstFig = release.figures[0];
    if (!firstFig) throw new Error('Expected at least 1 figure');
    const badFigures = [
      { ...firstFig, statistic: statisticId('england', 'unknown-statistic') },
      ...release.figures.slice(1),
    ];
    expect(() => schema.parse({ ...release, figures: badFigures })).toThrow(
      /Statistic .* is not defined in nation definitions/,
    );
  });

  test('rejects figure unit not matching statistic definition', () => {
    const release = createValidRelease();
    const firstFig = release.figures[0];
    if (!firstFig) throw new Error('Expected at least 1 figure');
    const badFigures = [
      { ...firstFig, unit: 'days' as const }, // expected 'weeks' for england:median-ongoing-wait
      ...release.figures.slice(1),
    ];
    expect(() => schema.parse({ ...release, figures: badFigures })).toThrow(
      /Figure unit .* does not match defined statistic unit/,
    );
  });

  test('rejects disallowed provenance kind', () => {
    const release = createValidRelease();
    const firstFig = release.figures[0];
    if (!firstFig) throw new Error('Expected at least 1 figure');
    const badFigures = [
      {
        ...firstFig,
        provenance: {
          kind: 'derived' as const,
          method: 'exact-sum' as const,
          inputs: ['ColA', 'ColB'] as const,
        },
      },
      ...release.figures.slice(1),
    ];
    expect(() => schema.parse({ ...release, figures: badFigures })).toThrow(
      /requires official provenance/,
    );
  });

  test('rejects figure value outside allowed range', () => {
    const release = createValidRelease();
    const firstFig = release.figures[0];
    if (!firstFig) throw new Error('Expected at least 1 figure');
    const badFigures = [
      {
        ...firstFig,
        value: { status: 'published' as const, value: 150, provisional: false }, // max is 104
      },
      ...release.figures.slice(1),
    ];
    expect(() => schema.parse({ ...release, figures: badFigures })).toThrow(
      /is outside allowed range/,
    );
  });

  test('rejects duplicate figure compound key', () => {
    const release = createValidRelease();
    const firstFig = release.figures[0];
    if (!firstFig) throw new Error('Expected at least 1 figure');
    const badFigures = [...release.figures, firstFig];
    expect(() => schema.parse({ ...release, figures: badFigures })).toThrow(
      /Duplicate figureKey detected in release/,
    );
  });

  test('rejects comparison figure with reportingPeriod not 12 months earlier', () => {
    const release = createValidRelease();
    const firstCompFig = release.comparisonFigures[0];
    if (!firstCompFig) throw new Error('Expected at least 1 comparison figure');
    const badCompFigures = [
      {
        ...firstCompFig,
        reportingPeriod: reportingPeriod('2025-02-28'), // expected 2025-01-31
      },
      ...release.comparisonFigures.slice(1),
    ];
    expect(() => schema.parse({ ...release, comparisonFigures: badCompFigures })).toThrow(
      /must equal 1 year earlier period/,
    );
  });

  test('rejects comparison figure for non-median statistic', () => {
    const release = createValidRelease();
    const firstCompFig = release.comparisonFigures[0];
    if (!firstCompFig) throw new Error('Expected at least 1 comparison figure');
    const badCompFigures = [
      {
        ...firstCompFig,
        statistic: statisticId('england', 'total-waiting'),
      },
      ...release.comparisonFigures.slice(1),
    ];
    expect(() => schema.parse({ ...release, comparisonFigures: badCompFigures })).toThrow(
      /must be median ongoing wait/,
    );
  });

  test('rejects invalid sha256 or non-ISO retrievedAt in release', () => {
    const release = createValidRelease();
    expect(() =>
      schema.parse({
        ...release,
        sourceFiles: [
          { url: 'https://example.com/file.xlsx', sha256: 'short-sha', revised: false },
        ],
      }),
    ).toThrow();

    expect(() =>
      schema.parse({
        ...release,
        retrievedAt: 'not-a-date',
      }),
    ).toThrow();
  });
});

describe('Release compact format and round-trip', () => {
  test('toReleaseFile and fromReleaseFile perform lossless round-trip', () => {
    const original = createValidRelease();
    const compactFile = toReleaseFile(original);

    // Verify compact format stripped redundant dimensions from figures
    expect(compactFile.figures[0]).not.toHaveProperty('nation');
    expect(compactFile.figures[0]).not.toHaveProperty('reportingPeriod');
    expect(compactFile.figures[0]).not.toHaveProperty('publicationDate');
    expect(compactFile.figures[0]).not.toHaveProperty('source');

    // Comparison figures retain their specific 1-year-earlier reportingPeriod
    expect(compactFile.comparisonFigures[0]).toHaveProperty('reportingPeriod', '2025-01-31');
    expect(compactFile.comparisonFigures[0]).not.toHaveProperty('nation');
    expect(compactFile.comparisonFigures[0]).not.toHaveProperty('publicationDate');
    expect(compactFile.comparisonFigures[0]).not.toHaveProperty('source');

    const hydrated = fromReleaseFile(compactFile);
    expect(hydrated).toEqual(original);
  });

  test('releaseFileSchema validates valid compact ReleaseFile', () => {
    const original = createValidRelease();
    const compactFile = toReleaseFile(original);
    const fileSchema = releaseFileSchema(mockEnglandDefs);

    expect(fileSchema.parse(compactFile)).toEqual(compactFile);
  });
});
