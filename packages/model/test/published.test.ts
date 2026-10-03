import { describe, expect, test } from 'vitest';
import type { NationDefinitions } from '../src/nation-definitions.js';
import {
  fromPublishedFile,
  publishedFileSchema,
  publishedFigureSchema,
  publishedNationSchema,
  publishedUnitSpecialtySchema,
  publishedUnitSpecialtyStateSchema,
  toPublishedFile,
  YEAR_EARLIER_OMITTED_REASONS,
  type PublishedFigure,
  type PublishedNation,
} from '../src/published.js';
import { reportingUnitId, specialtyId, statisticId, waitStageId } from '../src/ids.js';
import { publicationDate, reportingPeriod } from '../src/period.js';
import type { SourceRef } from '../src/source.js';

const mockEnglandSource: SourceRef<'england'> = {
  nation: 'england',
  publisher: 'NHS England',
  title: 'Consultant-led Referral to Treatment Waiting Times',
  url: 'https://www.england.nhs.uk/statistics/statistical-work-areas/rtt-waiting-times/',
  licence: 'OGL-3.0',
  attribution: 'Contains NHS England data licensed under the Open Government Licence v3.0.',
};

const mockOlderEnglandSource: SourceRef<'england'> = {
  nation: 'england',
  publisher: 'NHS England',
  title: 'Consultant-led Referral to Treatment Waiting Times (Archived)',
  url: 'https://www.england.nhs.uk/statistics/statistical-work-areas/rtt-waiting-times/2025-archive',
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

function createValidPublishedNation(): PublishedNation<'england'> {
  const currentPeriod = reportingPeriod('2026-01-31');
  const earlierPeriod = reportingPeriod('2025-01-31');
  const pubDate = publicationDate('2026-03-12');
  const olderPeriod = reportingPeriod('2025-11-30');
  const olderPubDate = publicationDate('2026-01-15');

  const rUnit1 = reportingUnitId('england', 'RGT');
  const rUnit2 = reportingUnitId('england', 'RRK');
  const spec = specialtyId('england', '100');
  const wStage = waitStageId('england', 'rtt-incomplete-pathway');

  const figures1: PublishedFigure<'england'>[] = [
    {
      nation: 'england',
      reportingUnit: rUnit1,
      specialty: spec,
      waitStage: wStage,
      statistic: statisticId('england', 'median-ongoing-wait'),
      reportingPeriod: currentPeriod,
      publicationDate: pubDate,
      unit: 'weeks',
      value: { status: 'published', value: 14.2, provisional: false },
      provenance: { kind: 'official', sourceField: 'Average (median) waiting time (in weeks)' },
      source: mockEnglandSource,
      yearEarlier: {
        status: 'shown',
        value: { status: 'published', value: 13.5, provisional: false },
        reportingPeriod: earlierPeriod,
        publicationDate: pubDate,
      },
    },
    {
      nation: 'england',
      reportingUnit: rUnit1,
      specialty: spec,
      waitStage: wStage,
      statistic: statisticId('england', 'within-waiting-standard'),
      reportingPeriod: currentPeriod,
      publicationDate: pubDate,
      unit: 'proportion',
      value: { status: 'published', value: 0.62, provisional: false },
      provenance: { kind: 'official', sourceField: '% within 18 weeks' },
      source: mockEnglandSource,
      yearEarlier: {
        status: 'omitted',
        reason: 'not-median',
      },
    },
    {
      nation: 'england',
      reportingUnit: rUnit1,
      specialty: spec,
      waitStage: wStage,
      statistic: statisticId('england', 'long-wait-count'),
      reportingPeriod: currentPeriod,
      publicationDate: pubDate,
      unit: 'count',
      value: { status: 'published', value: 25, provisional: false },
      provenance: { kind: 'official', sourceField: 'Total 52 plus weeks' },
      source: mockEnglandSource,
      yearEarlier: {
        status: 'omitted',
        reason: 'not-median',
      },
    },
  ];

  const figuresCarriedForward: PublishedFigure<'england'>[] = [
    {
      nation: 'england',
      reportingUnit: rUnit2,
      specialty: spec,
      waitStage: wStage,
      statistic: statisticId('england', 'median-ongoing-wait'),
      reportingPeriod: olderPeriod,
      publicationDate: olderPubDate,
      unit: 'weeks',
      value: { status: 'published', value: 16.0, provisional: false },
      provenance: { kind: 'official', sourceField: 'Average (median) waiting time (in weeks)' },
      source: mockOlderEnglandSource,
      yearEarlier: {
        status: 'omitted',
        reason: 'unit-changed',
      },
    },
  ];

  return {
    schemaVersion: 1,
    nation: 'england',
    latestRelease: {
      reportingPeriod: currentPeriod,
      publicationDate: pubDate,
      source: mockEnglandSource,
    },
    generatedAt: '2026-03-12T10:00:00.000Z',
    entries: [
      {
        reportingUnit: rUnit1,
        specialty: spec,
        state: { kind: 'current' },
        figures: figures1,
      },
      {
        reportingUnit: rUnit2,
        specialty: spec,
        state: { kind: 'carried-forward', monthsOld: 2 },
        figures: figuresCarriedForward,
      },
      {
        reportingUnit: rUnit1,
        specialty: specialtyId('england', '110'),
        state: { kind: 'no-recent-figures', lastReportingPeriod: reportingPeriod('2024-01-31') },
        figures: [],
      },
    ],
  };
}

describe('Published View Model & Schemas', () => {
  test('valid PublishedNation passes schema validation', () => {
    const published = createValidPublishedNation();
    const schema = publishedNationSchema('england', mockEnglandDefs);
    const parsed = schema.parse(published);
    expect(parsed.entries).toHaveLength(3);
    expect(parsed.entries[0]?.state.kind).toBe('current');
    expect(parsed.entries[1]?.state.kind).toBe('carried-forward');
    expect(parsed.entries[2]?.state.kind).toBe('no-recent-figures');
  });

  test('year-earlier status "shown" is rejected on non-median statistic', () => {
    const figSchema = publishedFigureSchema('england');
    const invalidFig = {
      nation: 'england',
      reportingUnit: reportingUnitId('england', 'RGT'),
      specialty: specialtyId('england', '100'),
      waitStage: waitStageId('england', 'rtt-incomplete-pathway'),
      statistic: statisticId('england', 'long-wait-count'),
      reportingPeriod: reportingPeriod('2026-01-31'),
      publicationDate: publicationDate('2026-03-12'),
      unit: 'count',
      value: { status: 'published', value: 25, provisional: false },
      provenance: { kind: 'official', sourceField: 'Total 52 plus weeks' },
      source: mockEnglandSource,
      yearEarlier: {
        status: 'shown',
        value: { status: 'published', value: 20, provisional: false },
        reportingPeriod: reportingPeriod('2025-01-31'),
        publicationDate: publicationDate('2026-03-12'),
      },
    };

    expect(() => figSchema.parse(invalidFig)).toThrow(
      /Year-earlier comparison status .* is only permitted on median ongoing wait/,
    );
  });

  test('year-earlier status "shown" requires exact 12-month earlier reporting period', () => {
    const figSchema = publishedFigureSchema('england');
    const invalidFig = {
      nation: 'england',
      reportingUnit: reportingUnitId('england', 'RGT'),
      specialty: specialtyId('england', '100'),
      waitStage: waitStageId('england', 'rtt-incomplete-pathway'),
      statistic: statisticId('england', 'median-ongoing-wait'),
      reportingPeriod: reportingPeriod('2026-01-31'),
      publicationDate: publicationDate('2026-03-12'),
      unit: 'weeks',
      value: { status: 'published', value: 14.2, provisional: false },
      provenance: { kind: 'official', sourceField: 'Average (median) waiting time (in weeks)' },
      source: mockEnglandSource,
      yearEarlier: {
        status: 'shown',
        value: { status: 'published', value: 13.5, provisional: false },
        reportingPeriod: reportingPeriod('2025-02-28'), // Not 1 year earlier
        publicationDate: publicationDate('2026-03-12'),
      },
    };

    expect(() => figSchema.parse(invalidFig)).toThrow(
      /Year-earlier comparison reportingPeriod .* must equal 1 year earlier period/,
    );
  });

  test('year-earlier status "omitted" accepts all valid reasons', () => {
    const figSchema = publishedFigureSchema('england');
    for (const reason of YEAR_EARLIER_OMITTED_REASONS) {
      const fig = {
        nation: 'england',
        reportingUnit: reportingUnitId('england', 'RGT'),
        specialty: specialtyId('england', '100'),
        waitStage: waitStageId('england', 'rtt-incomplete-pathway'),
        statistic: statisticId('england', 'median-ongoing-wait'),
        reportingPeriod: reportingPeriod('2026-01-31'),
        publicationDate: publicationDate('2026-03-12'),
        unit: 'weeks',
        value: { status: 'published', value: 14.2, provisional: false },
        provenance: { kind: 'official', sourceField: 'Average (median) waiting time (in weeks)' },
        source: mockEnglandSource,
        yearEarlier: {
          status: 'omitted',
          reason,
        },
      };
      expect(() => figSchema.parse(fig)).not.toThrow();
    }
  });

  test('carried-forward validates monthsOld range (1 to 12)', () => {
    expect(() =>
      publishedUnitSpecialtyStateSchema.parse({ kind: 'carried-forward', monthsOld: 1 }),
    ).not.toThrow();
    expect(() =>
      publishedUnitSpecialtyStateSchema.parse({ kind: 'carried-forward', monthsOld: 12 }),
    ).not.toThrow();
    expect(() =>
      publishedUnitSpecialtyStateSchema.parse({ kind: 'carried-forward', monthsOld: 0 }),
    ).toThrow(/Carried-forward figures must be at least 1 month old/);
    expect(() =>
      publishedUnitSpecialtyStateSchema.parse({ kind: 'carried-forward', monthsOld: 13 }),
    ).toThrow(/Carried-forward figures cannot exceed 12 months old/);
    expect(() =>
      publishedUnitSpecialtyStateSchema.parse({ kind: 'carried-forward', monthsOld: 2.5 }),
    ).toThrow(/monthsOld must be an integer/);
  });

  test('no-recent-figures requires empty figures array', () => {
    const unitSpecSchema = publishedUnitSpecialtySchema('england');
    const valid = {
      reportingUnit: reportingUnitId('england', 'RGT'),
      specialty: specialtyId('england', '100'),
      state: { kind: 'no-recent-figures', lastReportingPeriod: reportingPeriod('2024-01-31') },
      figures: [],
    };
    expect(() => unitSpecSchema.parse(valid)).not.toThrow();

    const invalid = {
      ...valid,
      figures: [
        {
          nation: 'england',
          reportingUnit: reportingUnitId('england', 'RGT'),
          specialty: specialtyId('england', '100'),
          waitStage: waitStageId('england', 'rtt-incomplete-pathway'),
          statistic: statisticId('england', 'median-ongoing-wait'),
          reportingPeriod: reportingPeriod('2024-01-31'),
          publicationDate: publicationDate('2024-03-12'),
          unit: 'weeks',
          value: { status: 'published', value: 14.2, provisional: false },
          provenance: { kind: 'official', sourceField: 'Average (median) waiting time (in weeks)' },
          source: mockEnglandSource,
          yearEarlier: { status: 'omitted', reason: 'not-in-release' },
        },
      ],
    };
    expect(() => unitSpecSchema.parse(invalid)).toThrow(
      /PublishedUnitSpecialty with state .* must have empty figures array/,
    );
  });

  test('unit-specialty rejects figures with mismatched reportingUnit or specialty', () => {
    const unitSpecSchema = publishedUnitSpecialtySchema('england');
    const mismatchedUnit = {
      reportingUnit: reportingUnitId('england', 'RGT'),
      specialty: specialtyId('england', '100'),
      state: { kind: 'current' },
      figures: [
        {
          nation: 'england',
          reportingUnit: reportingUnitId('england', 'RRK'), // Mismatched unit
          specialty: specialtyId('england', '100'),
          waitStage: waitStageId('england', 'rtt-incomplete-pathway'),
          statistic: statisticId('england', 'median-ongoing-wait'),
          reportingPeriod: reportingPeriod('2026-01-31'),
          publicationDate: publicationDate('2026-03-12'),
          unit: 'weeks',
          value: { status: 'published', value: 14.2, provisional: false },
          provenance: { kind: 'official', sourceField: 'Average (median) waiting time (in weeks)' },
          source: mockEnglandSource,
          yearEarlier: { status: 'omitted', reason: 'not-in-release' },
        },
      ],
    };
    expect(() => unitSpecSchema.parse(mismatchedUnit)).toThrow(
      /Figure reportingUnit .* does not match entry reportingUnit/,
    );

    const mismatchedSpecialty = {
      reportingUnit: reportingUnitId('england', 'RGT'),
      specialty: specialtyId('england', '100'),
      state: { kind: 'current' },
      figures: [
        {
          nation: 'england',
          reportingUnit: reportingUnitId('england', 'RGT'),
          specialty: specialtyId('england', '110'), // Mismatched specialty
          waitStage: waitStageId('england', 'rtt-incomplete-pathway'),
          statistic: statisticId('england', 'median-ongoing-wait'),
          reportingPeriod: reportingPeriod('2026-01-31'),
          publicationDate: publicationDate('2026-03-12'),
          unit: 'weeks',
          value: { status: 'published', value: 14.2, provisional: false },
          provenance: { kind: 'official', sourceField: 'Average (median) waiting time (in weeks)' },
          source: mockEnglandSource,
          yearEarlier: { status: 'omitted', reason: 'not-in-release' },
        },
      ],
    };
    expect(() => unitSpecSchema.parse(mismatchedSpecialty)).toThrow(
      /Figure specialty .* does not match entry specialty/,
    );
  });

  test('toPublishedFile and fromPublishedFile perform lossless roundtrip conversion', () => {
    const published = createValidPublishedNation();
    const compactFile = toPublishedFile(published);

    expect(compactFile.schemaVersion).toBe(1);
    expect(compactFile.nation).toBe('england');
    expect(compactFile.sources).toBeDefined();
    expect(compactFile.sources.latest).toEqual(mockEnglandSource);

    // Schema validation of compact file
    const fileValidator = publishedFileSchema('england', mockEnglandDefs);
    const validatedFile = fileValidator.parse(compactFile);
    expect(validatedFile.entries).toHaveLength(3);

    // Hydration
    const reconstituted = fromPublishedFile(compactFile);
    expect(reconstituted).toEqual(published);
  });
});
