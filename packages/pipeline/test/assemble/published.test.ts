import { describe, expect, it } from 'vitest';
import type { Figure } from '@kyw/model/figure';
import {
  hospitalSiteId,
  reportingUnitId,
  specialtyId,
  statisticId,
  waitStageId,
} from '@kyw/model/ids';
import { publicationDate, reportingPeriod } from '@kyw/model/period';
import { publishedNationSchema, toPublishedFile } from '@kyw/model/published';
import { nhsRegionId, type ReferenceData } from '@kyw/model/reference';
import type { Release } from '@kyw/model/release';
import type { SourceRef } from '@kyw/model/source';
import { assemblePublished } from '../../src/assemble/published.js';
import { buildEnglandSuccessionIndex } from '../../src/reference/england/succession.js';

describe('Published Snapshot Assembly (T-7.4)', () => {
  const dummyEnglandSource: SourceRef<'england'> = {
    nation: 'england',
    publisher: 'NHS England',
    title: 'Consultant-led Referral to Treatment Waiting Times',
    url: 'https://www.england.nhs.uk/statistics/statistical-work-areas/rtt-waiting-times/',
    licence: 'OGL-3.0',
    attribution: 'Source: NHS England',
  };

  const dummyWalesSource: SourceRef<'wales'> = {
    nation: 'wales',
    publisher: 'Welsh Government',
    title: 'StatsWales NHS Referral to Treatment Waiting Times',
    url: 'https://stats.gov.wales/',
    licence: 'OGL-3.0',
    attribution: 'Source: StatsWales',
  };

  const dummyScotlandSource: SourceRef<'scotland'> = {
    nation: 'scotland',
    publisher: 'Public Health Scotland',
    title: 'Stage of Treatment Waiting Times',
    url: 'https://www.opendata.nhs.scot/dataset/stage-of-treatment-waiting-times',
    licence: 'OGL-3.0',
    attribution: 'Source: Public Health Scotland',
  };

  const englandReference: ReferenceData<'england'> = {
    nation: 'england',
    retrievedAt: '2026-10-01T00:00:00.000Z',
    sources: [dummyEnglandSource],
    nhsRegions: [
      {
        id: nhsRegionId('Y56'),
        officialCode: 'Y56',
        name: 'London',
      },
      {
        id: nhsRegionId('Y59'),
        officialCode: 'Y59',
        name: 'South East',
      },
    ],
    reportingUnits: [
      {
        id: reportingUnitId('england', 'RRK'),
        officialCode: 'RRK',
        officialName: 'University Hospital Birmingham NHS Foundation Trust',
        displayName: 'University Hospital Birmingham',
        kind: 'nhs-trust',
        nhsRegion: nhsRegionId('Y56'),
        hospitalSites: [hospitalSiteId('england', 'RRK01')],
        operational: { from: '2000-01-01', to: null },
        predecessors: [],
        successors: [],
        notes: [],
      },
      {
        id: reportingUnitId('england', 'R1H'),
        officialCode: 'R1H',
        officialName: 'Barts Health NHS Trust',
        displayName: 'Barts Health',
        kind: 'nhs-trust',
        nhsRegion: nhsRegionId('Y56'),
        hospitalSites: [hospitalSiteId('england', 'R1H01')],
        operational: { from: '2000-01-01', to: null },
        predecessors: [],
        successors: [],
        notes: [],
      },
      {
        id: reportingUnitId('england', 'RAL'),
        officialCode: 'RAL',
        officialName: 'Royal Free London NHS Foundation Trust',
        displayName: 'Royal Free London',
        kind: 'nhs-trust',
        nhsRegion: nhsRegionId('Y56'),
        hospitalSites: [hospitalSiteId('england', 'RAL01')],
        operational: { from: '2000-01-01', to: '2025-01-01' },
        predecessors: [],
        successors: [reportingUnitId('england', 'RRK')],
        notes: [],
      },
      {
        id: reportingUnitId('england', 'NT401'),
        officialCode: 'NT401',
        officialName: 'Spire Healthcare Independent Hospital',
        displayName: 'Spire Healthcare',
        kind: 'independent-sector-provider',
        nhsRegion: nhsRegionId('Y59'),
        hospitalSites: [],
        operational: { from: '2010-01-01', to: null },
        predecessors: [],
        successors: [],
        notes: [],
      },
    ],
    hospitalSites: [
      {
        id: hospitalSiteId('england', 'RRK01'),
        officialCode: 'RRK01',
        name: 'Queen Elizabeth Hospital',
        town: 'Birmingham',
        reportingUnit: reportingUnitId('england', 'RRK'),
      },
      {
        id: hospitalSiteId('england', 'R1H01'),
        officialCode: 'R1H01',
        name: 'The Royal London Hospital',
        town: 'London',
        reportingUnit: reportingUnitId('england', 'R1H'),
      },
      {
        id: hospitalSiteId('england', 'RAL01'),
        officialCode: 'RAL01',
        name: 'Royal Free Hospital',
        town: 'London',
        reportingUnit: reportingUnitId('england', 'RAL'),
      },
    ],
    specialties: [
      {
        id: specialtyId('england', 'C_100'),
        officialCode: '100',
        officialName: 'General Surgery',
        slug: 'general-surgery',
        descriptionKey: 'specialty.england.100',
        isAllSpecialties: false,
      },
      {
        id: specialtyId('england', 'C_110'),
        officialCode: '110',
        officialName: 'Trauma & Orthopaedics',
        slug: 'trauma-and-orthopaedics',
        descriptionKey: 'specialty.england.110',
        isAllSpecialties: false,
      },
      {
        id: specialtyId('england', 'total'),
        officialCode: 'Total',
        officialName: 'Total',
        slug: 'total',
        descriptionKey: 'specialty.england.total',
        isAllSpecialties: true,
      },
    ],
  };

  const walesReference: ReferenceData<'wales'> = {
    nation: 'wales',
    retrievedAt: '2026-10-01T00:00:00.000Z',
    sources: [dummyWalesSource],
    reportingUnits: [
      {
        id: reportingUnitId('wales', '7A1'),
        officialCode: '7A1',
        officialName: 'Betsi Cadwaladr University Health Board',
        displayName: 'Betsi Cadwaladr',
        kind: 'health-board',
        hospitalSites: [],
        operational: { from: '2009-10-01', to: null },
        predecessors: [],
        successors: [],
        notes: [],
      },
      {
        id: reportingUnitId('wales', '7A2'),
        officialCode: '7A2',
        officialName: 'Hywel Dda University Health Board',
        displayName: 'Hywel Dda',
        kind: 'health-board',
        hospitalSites: [],
        operational: { from: '2009-10-01', to: null },
        predecessors: [],
        successors: [],
        notes: [],
      },
    ],
    hospitalSites: [],
    specialties: [
      {
        id: specialtyId('wales', 'X01'),
        officialCode: 'X01',
        officialName: 'General Surgery',
        slug: 'general-surgery',
        descriptionKey: 'specialty.wales.X01',
        isAllSpecialties: false,
      },
      {
        id: specialtyId('wales', 'total'),
        officialCode: 'Total',
        officialName: 'Total',
        slug: 'total',
        descriptionKey: 'specialty.wales.total',
        isAllSpecialties: true,
      },
    ],
  };

  const scotlandReference: ReferenceData<'scotland'> = {
    nation: 'scotland',
    retrievedAt: '2026-10-01T00:00:00.000Z',
    sources: [dummyScotlandSource],
    reportingUnits: [
      {
        id: reportingUnitId('scotland', 'S08000015'),
        officialCode: 'S08000015',
        officialName: 'NHS Ayrshire and Arran',
        displayName: 'Ayrshire and Arran',
        kind: 'health-board',
        hospitalSites: [],
        operational: { from: '2000-01-01', to: null },
        predecessors: [],
        successors: [],
        notes: [],
      },
    ],
    hospitalSites: [],
    specialties: [
      {
        id: specialtyId('scotland', 'C1'),
        officialCode: 'C1',
        officialName: 'General Surgery',
        slug: 'general-surgery',
        descriptionKey: 'specialty.scotland.C1',
        isAllSpecialties: false,
      },
    ],
  };

  it('assembles valid England PublishedNation snapshot passing schema', () => {
    const latestEngland: Release<'england'> = {
      schemaVersion: 1,
      nation: 'england',
      reportingPeriod: reportingPeriod('2026-07-01'),
      publicationDate: publicationDate('2026-09-10'),
      source: dummyEnglandSource,
      retrievedAt: '2026-09-10T10:00:00.000Z',
      sourceFiles: [],
      reportingUnits: [reportingUnitId('england', 'RRK'), reportingUnitId('england', 'R1H')],
      figures: [
        {
          nation: 'england',
          reportingUnit: reportingUnitId('england', 'RRK'),
          specialty: specialtyId('england', 'C_100'),
          waitStage: waitStageId('england', 'incomplete'),
          statistic: statisticId('england', 'median-ongoing-wait'),
          reportingPeriod: reportingPeriod('2026-07-01'),
          publicationDate: publicationDate('2026-09-10'),
          unit: 'weeks',
          value: { status: 'published', value: 14.8, provisional: false },
          provenance: { kind: 'official', sourceField: 'Median wait' },
          source: dummyEnglandSource,
        },
        {
          nation: 'england',
          reportingUnit: reportingUnitId('england', 'RRK'),
          specialty: specialtyId('england', 'C_100'),
          waitStage: waitStageId('england', 'incomplete'),
          statistic: statisticId('england', 'total-waiting'),
          reportingPeriod: reportingPeriod('2026-07-01'),
          publicationDate: publicationDate('2026-09-10'),
          unit: 'count',
          value: { status: 'published', value: 3500, provisional: false },
          provenance: { kind: 'official', sourceField: 'Total waiting' },
          source: dummyEnglandSource,
        },
        {
          nation: 'england',
          reportingUnit: reportingUnitId('england', 'R1H'),
          specialty: specialtyId('england', 'C_100'),
          waitStage: waitStageId('england', 'incomplete'),
          statistic: statisticId('england', 'median-ongoing-wait'),
          reportingPeriod: reportingPeriod('2026-07-01'),
          publicationDate: publicationDate('2026-09-10'),
          unit: 'weeks',
          value: { status: 'published', value: 16.2, provisional: false },
          provenance: { kind: 'official', sourceField: 'Median wait' },
          source: dummyEnglandSource,
        },
      ],
      comparisonFigures: [],
    };

    const yearEarlierRelease: Release<'england'> = {
      schemaVersion: 1,
      nation: 'england',
      reportingPeriod: reportingPeriod('2025-07-01'),
      publicationDate: publicationDate('2025-09-11'),
      source: dummyEnglandSource,
      retrievedAt: '2025-09-11T10:00:00.000Z',
      sourceFiles: [],
      reportingUnits: [reportingUnitId('england', 'RRK')],
      figures: [
        {
          nation: 'england',
          reportingUnit: reportingUnitId('england', 'RRK'),
          specialty: specialtyId('england', 'C_100'),
          waitStage: waitStageId('england', 'incomplete'),
          statistic: statisticId('england', 'median-ongoing-wait'),
          reportingPeriod: reportingPeriod('2025-07-01'),
          publicationDate: publicationDate('2025-09-11'),
          unit: 'weeks',
          value: { status: 'published', value: 12.4, provisional: false },
          provenance: { kind: 'official', sourceField: 'Median wait' },
          source: dummyEnglandSource,
        },
      ],
      comparisonFigures: [],
    };

    const published = assemblePublished(latestEngland, [yearEarlierRelease], englandReference, {
      generatedAt: '2026-10-04T12:00:00.000Z',
    });

    expect(published.schemaVersion).toBe(1);
    expect(published.nation).toBe('england');
    expect(published.latestRelease.reportingPeriod).toBe('2026-07-01');
    expect(published.entries).toHaveLength(2);

    // Schema validation succeeds
    const validated = publishedNationSchema('england').parse(published);
    expect(validated).toEqual(published);

    const firstEntry = published.entries[0];
    const secondEntry = published.entries[1];
    expect(firstEntry).toBeDefined();
    expect(secondEntry).toBeDefined();

    if (firstEntry && secondEntry) {
      // Verify ordering: R1H before RRK (alphabetical by reportingUnit)
      expect(firstEntry.reportingUnit).toBe('england:R1H');
      expect(secondEntry.reportingUnit).toBe('england:RRK');

      // Verify figures within RRK: incomplete:median-ongoing-wait before incomplete:total-waiting
      const fig0 = secondEntry.figures[0];
      const fig1 = secondEntry.figures[1];
      expect(fig0).toBeDefined();
      expect(fig1).toBeDefined();
      if (fig0 && fig1) {
        expect(fig0.statistic).toBe('england:median-ongoing-wait');
        expect(fig1.statistic).toBe('england:total-waiting');

        // Verify Year-Earlier Comparison
        expect(fig0.yearEarlier).toEqual({
          status: 'shown',
          value: { status: 'published', value: 12.4, provisional: false },
          reportingPeriod: '2025-07-01',
          publicationDate: '2025-09-11',
        });

        expect(fig1.yearEarlier).toEqual({
          status: 'omitted',
          reason: 'not-median',
        });
      }

      // R1H had no year-earlier data in 2025-07
      const r1hFig0 = firstEntry.figures[0];
      expect(r1hFig0).toBeDefined();
      if (r1hFig0) {
        expect(r1hFig0.yearEarlier).toEqual({
          status: 'omitted',
          reason: 'not-in-release',
        });
      }
    }
  });

  it('incorporates carried-forward entries from history when unit is absent in latest release', () => {
    const latestEngland: Release<'england'> = {
      schemaVersion: 1,
      nation: 'england',
      reportingPeriod: reportingPeriod('2026-07-01'),
      publicationDate: publicationDate('2026-09-10'),
      source: dummyEnglandSource,
      retrievedAt: '2026-09-10T10:00:00.000Z',
      sourceFiles: [],
      reportingUnits: [reportingUnitId('england', 'RRK')],
      figures: [
        {
          nation: 'england',
          reportingUnit: reportingUnitId('england', 'RRK'),
          specialty: specialtyId('england', 'C_100'),
          waitStage: waitStageId('england', 'incomplete'),
          statistic: statisticId('england', 'median-ongoing-wait'),
          reportingPeriod: reportingPeriod('2026-07-01'),
          publicationDate: publicationDate('2026-09-10'),
          unit: 'weeks',
          value: { status: 'published', value: 14.8, provisional: false },
          provenance: { kind: 'official', sourceField: 'Median wait' },
          source: dummyEnglandSource,
        },
      ],
      comparisonFigures: [],
    };

    // NT401 submitted in 2026-04-01 (3 months prior) but not 2026-07-01
    const pastEngland: Release<'england'> = {
      schemaVersion: 1,
      nation: 'england',
      reportingPeriod: reportingPeriod('2026-04-01'),
      publicationDate: publicationDate('2026-06-11'),
      source: dummyEnglandSource,
      retrievedAt: '2026-06-11T10:00:00.000Z',
      sourceFiles: [],
      reportingUnits: [reportingUnitId('england', 'NT401')],
      figures: [
        {
          nation: 'england',
          reportingUnit: reportingUnitId('england', 'NT401'),
          specialty: specialtyId('england', 'C_100'),
          waitStage: waitStageId('england', 'incomplete'),
          statistic: statisticId('england', 'median-ongoing-wait'),
          reportingPeriod: reportingPeriod('2026-04-01'),
          publicationDate: publicationDate('2026-06-11'),
          unit: 'weeks',
          value: { status: 'published', value: 11.5, provisional: false },
          provenance: { kind: 'official', sourceField: 'Median wait' },
          source: dummyEnglandSource,
        },
      ],
      comparisonFigures: [],
    };

    const published = assemblePublished(latestEngland, [pastEngland], englandReference, {
      generatedAt: '2026-10-04T12:00:00.000Z',
    });

    expect(published.entries).toHaveLength(2);
    const firstEntry = published.entries[0];
    const secondEntry = published.entries[1];
    expect(firstEntry).toBeDefined();
    expect(secondEntry).toBeDefined();

    if (firstEntry && secondEntry) {
      // Alphabetical: NT401 before RRK
      expect(firstEntry.reportingUnit).toBe('england:NT401');
      expect(firstEntry.state).toEqual({
        kind: 'carried-forward',
        monthsOld: 3,
      });
      expect(firstEntry.figures).toHaveLength(1);
      const carriedFig = firstEntry.figures[0];
      expect(carriedFig).toBeDefined();
      if (carriedFig) {
        expect(carriedFig.reportingPeriod).toBe('2026-04-01');
      }

      expect(secondEntry.reportingUnit).toBe('england:RRK');
      expect(secondEntry.state).toEqual({ kind: 'current' });
    }

    // Schema validation passes
    expect(() => publishedNationSchema('england').parse(published)).not.toThrow();
  });

  it('assembles valid Wales snapshot using same-release comparison figures', () => {
    const latestWales: Release<'wales'> = {
      schemaVersion: 1,
      nation: 'wales',
      reportingPeriod: reportingPeriod('2026-07-01'),
      publicationDate: publicationDate('2026-09-18'),
      source: dummyWalesSource,
      retrievedAt: '2026-09-18T10:00:00.000Z',
      sourceFiles: [],
      reportingUnits: [reportingUnitId('wales', '7A1')],
      figures: [
        {
          nation: 'wales',
          reportingUnit: reportingUnitId('wales', '7A1'),
          specialty: specialtyId('wales', 'X01'),
          waitStage: waitStageId('wales', 'all-pathways'),
          statistic: statisticId('wales', 'median-ongoing-wait'),
          reportingPeriod: reportingPeriod('2026-07-01'),
          publicationDate: publicationDate('2026-09-18'),
          unit: 'weeks',
          value: { status: 'published', value: 22.4, provisional: false },
          provenance: { kind: 'official', sourceField: 'Median' },
          source: dummyWalesSource,
        },
      ],
      comparisonFigures: [
        {
          nation: 'wales',
          reportingUnit: reportingUnitId('wales', '7A1'),
          specialty: specialtyId('wales', 'X01'),
          waitStage: waitStageId('wales', 'all-pathways'),
          statistic: statisticId('wales', 'median-ongoing-wait'),
          reportingPeriod: reportingPeriod('2025-07-01'),
          publicationDate: publicationDate('2026-09-18'),
          unit: 'weeks',
          value: { status: 'published', value: 25.1, provisional: false },
          provenance: { kind: 'official', sourceField: 'Median' },
          source: dummyWalesSource,
        },
      ],
    };

    const published = assemblePublished(latestWales, [], walesReference, {
      generatedAt: '2026-10-04T12:00:00.000Z',
    });

    expect(published.nation).toBe('wales');
    expect(published.entries).toHaveLength(1);
    const entry = published.entries[0];
    expect(entry).toBeDefined();
    if (entry) {
      const fig0 = entry.figures[0];
      expect(fig0).toBeDefined();
      if (fig0) {
        expect(fig0.yearEarlier).toEqual({
          status: 'shown',
          value: { status: 'published', value: 25.1, provisional: false },
          reportingPeriod: '2025-07-01',
          publicationDate: '2026-09-18',
        });
      }
    }

    expect(() => publishedNationSchema('wales').parse(published)).not.toThrow();
  });

  it('assembles valid Scotland snapshot with separate wait stages', () => {
    const latestScotland: Release<'scotland'> = {
      schemaVersion: 1,
      nation: 'scotland',
      reportingPeriod: reportingPeriod('2026-07-01'),
      publicationDate: publicationDate('2026-09-01'),
      source: dummyScotlandSource,
      retrievedAt: '2026-09-01T10:00:00.000Z',
      sourceFiles: [],
      reportingUnits: [reportingUnitId('scotland', 'S08000015')],
      figures: [
        {
          nation: 'scotland',
          reportingUnit: reportingUnitId('scotland', 'S08000015'),
          specialty: specialtyId('scotland', 'C1'),
          waitStage: waitStageId('scotland', 'stage-1-first-contact'),
          statistic: statisticId('scotland', 'median-ongoing-wait'),
          reportingPeriod: reportingPeriod('2026-07-01'),
          publicationDate: publicationDate('2026-09-01'),
          unit: 'weeks',
          value: { status: 'published', value: 9.5, provisional: false },
          provenance: { kind: 'official', sourceField: 'Median' },
          source: dummyScotlandSource,
        },
        {
          nation: 'scotland',
          reportingUnit: reportingUnitId('scotland', 'S08000015'),
          specialty: specialtyId('scotland', 'C1'),
          waitStage: waitStageId('scotland', 'stage-2-treatment'),
          statistic: statisticId('scotland', 'median-ongoing-wait'),
          reportingPeriod: reportingPeriod('2026-07-01'),
          publicationDate: publicationDate('2026-09-01'),
          unit: 'weeks',
          value: { status: 'published', value: 18.0, provisional: false },
          provenance: { kind: 'official', sourceField: 'Median' },
          source: dummyScotlandSource,
        },
      ],
      comparisonFigures: [
        {
          nation: 'scotland',
          reportingUnit: reportingUnitId('scotland', 'S08000015'),
          specialty: specialtyId('scotland', 'C1'),
          waitStage: waitStageId('scotland', 'stage-1-first-contact'),
          statistic: statisticId('scotland', 'median-ongoing-wait'),
          reportingPeriod: reportingPeriod('2025-07-01'),
          publicationDate: publicationDate('2026-09-01'),
          unit: 'weeks',
          value: { status: 'published', value: 10.2, provisional: false },
          provenance: { kind: 'official', sourceField: 'Median' },
          source: dummyScotlandSource,
        },
      ],
    };

    const published = assemblePublished(latestScotland, [], scotlandReference, {
      generatedAt: '2026-10-04T12:00:00.000Z',
    });

    expect(published.nation).toBe('scotland');
    expect(published.entries).toHaveLength(1);
    const entry = published.entries[0];
    expect(entry).toBeDefined();
    if (entry) {
      expect(entry.figures).toHaveLength(2);

      // Ordered by waitStage: stage-1 before stage-2
      const fig0 = entry.figures[0];
      const fig1 = entry.figures[1];
      expect(fig0).toBeDefined();
      expect(fig1).toBeDefined();
      if (fig0 && fig1) {
        expect(fig0.waitStage).toBe('scotland:stage-1-first-contact');
        expect(fig0.yearEarlier).toEqual({
          status: 'shown',
          value: { status: 'published', value: 10.2, provisional: false },
          reportingPeriod: '2025-07-01',
          publicationDate: '2026-09-01',
        });

        expect(fig1.waitStage).toBe('scotland:stage-2-treatment');
        expect(fig1.yearEarlier).toEqual({
          status: 'omitted',
          reason: 'not-in-release',
        });
      }
    }

    expect(() => publishedNationSchema('scotland').parse(published)).not.toThrow();
  });

  it('guarantees deterministic byte output regardless of figure input order', () => {
    const f1: Figure<'england'> = {
      nation: 'england',
      reportingUnit: reportingUnitId('england', 'RRK'),
      specialty: specialtyId('england', 'C_110'),
      waitStage: waitStageId('england', 'incomplete'),
      statistic: statisticId('england', 'total-waiting'),
      reportingPeriod: reportingPeriod('2026-07-01'),
      publicationDate: publicationDate('2026-09-10'),
      unit: 'count',
      value: { status: 'published', value: 1200, provisional: false },
      provenance: { kind: 'official', sourceField: 'Total waiting' },
      source: dummyEnglandSource,
    };

    const f2: Figure<'england'> = {
      nation: 'england',
      reportingUnit: reportingUnitId('england', 'RRK'),
      specialty: specialtyId('england', 'C_100'),
      waitStage: waitStageId('england', 'incomplete'),
      statistic: statisticId('england', 'median-ongoing-wait'),
      reportingPeriod: reportingPeriod('2026-07-01'),
      publicationDate: publicationDate('2026-09-10'),
      unit: 'weeks',
      value: { status: 'published', value: 14.8, provisional: false },
      provenance: { kind: 'official', sourceField: 'Median wait' },
      source: dummyEnglandSource,
    };

    const f3: Figure<'england'> = {
      nation: 'england',
      reportingUnit: reportingUnitId('england', 'R1H'),
      specialty: specialtyId('england', 'C_100'),
      waitStage: waitStageId('england', 'incomplete'),
      statistic: statisticId('england', 'median-ongoing-wait'),
      reportingPeriod: reportingPeriod('2026-07-01'),
      publicationDate: publicationDate('2026-09-10'),
      unit: 'weeks',
      value: { status: 'published', value: 16.2, provisional: false },
      provenance: { kind: 'official', sourceField: 'Median wait' },
      source: dummyEnglandSource,
    };

    const releaseOrderA: Release<'england'> = {
      schemaVersion: 1,
      nation: 'england',
      reportingPeriod: reportingPeriod('2026-07-01'),
      publicationDate: publicationDate('2026-09-10'),
      source: dummyEnglandSource,
      retrievedAt: '2026-09-10T10:00:00.000Z',
      sourceFiles: [],
      reportingUnits: [reportingUnitId('england', 'RRK'), reportingUnitId('england', 'R1H')],
      figures: [f1, f2, f3],
      comparisonFigures: [],
    };

    const releaseOrderB: Release<'england'> = {
      schemaVersion: 1,
      nation: 'england',
      reportingPeriod: reportingPeriod('2026-07-01'),
      publicationDate: publicationDate('2026-09-10'),
      source: dummyEnglandSource,
      retrievedAt: '2026-09-10T10:00:00.000Z',
      sourceFiles: [],
      reportingUnits: [reportingUnitId('england', 'R1H'), reportingUnitId('england', 'RRK')],
      figures: [f3, f1, f2],
      comparisonFigures: [],
    };

    const pubA = assemblePublished(releaseOrderA, [], englandReference, {
      generatedAt: '2026-10-04T12:00:00.000Z',
    });
    const pubB = assemblePublished(releaseOrderB, [], englandReference, {
      generatedAt: '2026-10-04T12:00:00.000Z',
    });

    const fileA = toPublishedFile(pubA);
    const fileB = toPublishedFile(pubB);

    expect(JSON.stringify(pubA)).toBe(JSON.stringify(pubB));
    expect(JSON.stringify(fileA)).toBe(JSON.stringify(fileB));
  });

  it('respects custom successionIndex when provided in options', () => {
    const customIndex = buildEnglandSuccessionIndex([
      {
        predecessor: 'RRK',
        successor: 'R1H',
        effectiveDate: '2026-01-01',
      },
    ]);

    const latestEngland: Release<'england'> = {
      schemaVersion: 1,
      nation: 'england',
      reportingPeriod: reportingPeriod('2026-07-01'),
      publicationDate: publicationDate('2026-09-10'),
      source: dummyEnglandSource,
      retrievedAt: '2026-09-10T10:00:00.000Z',
      sourceFiles: [],
      reportingUnits: [reportingUnitId('england', 'RRK')],
      figures: [
        {
          nation: 'england',
          reportingUnit: reportingUnitId('england', 'RRK'),
          specialty: specialtyId('england', 'C_100'),
          waitStage: waitStageId('england', 'incomplete'),
          statistic: statisticId('england', 'median-ongoing-wait'),
          reportingPeriod: reportingPeriod('2026-07-01'),
          publicationDate: publicationDate('2026-09-10'),
          unit: 'weeks',
          value: { status: 'published', value: 14.8, provisional: false },
          provenance: { kind: 'official', sourceField: 'Median wait' },
          source: dummyEnglandSource,
        },
      ],
      comparisonFigures: [],
    };

    const pastEngland: Release<'england'> = {
      schemaVersion: 1,
      nation: 'england',
      reportingPeriod: reportingPeriod('2025-07-01'),
      publicationDate: publicationDate('2025-09-11'),
      source: dummyEnglandSource,
      retrievedAt: '2025-09-11T10:00:00.000Z',
      sourceFiles: [],
      reportingUnits: [reportingUnitId('england', 'RRK')],
      figures: [
        {
          nation: 'england',
          reportingUnit: reportingUnitId('england', 'RRK'),
          specialty: specialtyId('england', 'C_100'),
          waitStage: waitStageId('england', 'incomplete'),
          statistic: statisticId('england', 'median-ongoing-wait'),
          reportingPeriod: reportingPeriod('2025-07-01'),
          publicationDate: publicationDate('2025-09-11'),
          unit: 'weeks',
          value: { status: 'published', value: 12.0, provisional: false },
          provenance: { kind: 'official', sourceField: 'Median wait' },
          source: dummyEnglandSource,
        },
      ],
      comparisonFigures: [],
    };

    const published = assemblePublished({
      latest: latestEngland,
      history: [pastEngland],
      reference: englandReference,
      successionIndex: customIndex,
      generatedAt: '2026-10-04T12:00:00.000Z',
    });

    // RRK succeeded on 2026-01-01 -> unit-changed
    const rrkEntry = published.entries[0];
    expect(rrkEntry).toBeDefined();
    if (rrkEntry) {
      const fig0 = rrkEntry.figures[0];
      expect(fig0).toBeDefined();
      if (fig0) {
        expect(fig0.yearEarlier).toEqual({
          status: 'omitted',
          reason: 'unit-changed',
        });
      }
    }
  });
});
