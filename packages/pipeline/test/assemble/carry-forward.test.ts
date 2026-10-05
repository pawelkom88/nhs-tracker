import { describe, expect, it } from 'vitest';
import type { Figure } from '@kyw/model/figure';
import { reportingUnitId, specialtyId, statisticId, waitStageId } from '@kyw/model/ids';
import { publicationDate, reportingPeriod } from '@kyw/model/period';
import { publishedUnitSpecialtySchema } from '@kyw/model/published';
import type { ReferenceData } from '@kyw/model/reference';
import { nhsRegionId } from '@kyw/model/reference';
import type { Release } from '@kyw/model/release';
import type { SourceRef } from '@kyw/model/source';
import { carryForward } from '../../src/assemble/carry-forward.js';

function makeSource(nation: 'england'): SourceRef<'england'> {
  return {
    nation,
    publisher: 'NHS England',
    title: 'NHS Referral to Treatment (RTT) Waiting Times',
    url: 'https://www.england.nhs.uk/statistics/statistical-work-areas/rtt-waiting-times/',
    licence: 'OGL-3.0',
    attribution:
      'Contains public sector information licensed under the Open Government Licence v3.0.',
  };
}

function makeReference(): ReferenceData<'england'> {
  return {
    nation: 'england',
    retrievedAt: '2026-10-01T00:00:00.000Z',
    sources: [makeSource('england')],
    nhsRegions: [
      {
        id: nhsRegionId('Y56'),
        officialCode: 'Y56',
        name: 'London',
      },
    ],
    hospitalSites: [],
    specialties: [
      {
        id: specialtyId('england', '100'),
        officialCode: '100',
        officialName: 'General Surgery',
        slug: 'general-surgery',
        descriptionKey: 'specialties.general-surgery',
        isAllSpecialties: false,
      },
      {
        id: specialtyId('england', '110'),
        officialCode: '110',
        officialName: 'Trauma & Orthopaedics',
        slug: 'trauma-and-orthopaedics',
        descriptionKey: 'specialties.trauma-and-orthopaedics',
        isAllSpecialties: false,
      },
    ],
    reportingUnits: [
      {
        id: reportingUnitId('england', 'R1A'),
        officialCode: 'R1A',
        officialName: 'Active NHS Trust',
        displayName: 'Active NHS Trust',
        kind: 'nhs-trust',
        nhsRegion: nhsRegionId('Y56'),
        hospitalSites: [],
        operational: { from: '2000-01-01', to: null },
        predecessors: [],
        successors: [],
        notes: [],
      },
      {
        id: reportingUnitId('england', 'R2B'),
        officialCode: 'R2B',
        officialName: 'Absent Unmerged Trust',
        displayName: 'Absent Unmerged Trust',
        kind: 'nhs-trust',
        nhsRegion: nhsRegionId('Y56'),
        hospitalSites: [],
        operational: { from: '2000-01-01', to: null },
        predecessors: [],
        successors: [],
        notes: [],
      },
      {
        id: reportingUnitId('england', 'R3C'),
        officialCode: 'R3C',
        officialName: 'Closed Merged Trust',
        displayName: 'Closed Merged Trust',
        kind: 'nhs-trust',
        nhsRegion: nhsRegionId('Y56'),
        hospitalSites: [],
        operational: { from: '2000-01-01', to: '2026-06-30' },
        predecessors: [],
        successors: [reportingUnitId('england', 'R1A')],
        notes: [],
      },
      {
        id: reportingUnitId('england', 'R4D'),
        officialCode: 'R4D',
        officialName: 'Long Absent Trust',
        displayName: 'Long Absent Trust',
        kind: 'nhs-trust',
        nhsRegion: nhsRegionId('Y56'),
        hospitalSites: [],
        operational: { from: '2000-01-01', to: null },
        predecessors: [],
        successors: [],
        notes: [],
      },
      {
        id: reportingUnitId('england', 'R5E'),
        officialCode: 'R5E',
        officialName: 'Ancient Absent Trust',
        displayName: 'Ancient Absent Trust',
        kind: 'nhs-trust',
        nhsRegion: nhsRegionId('Y56'),
        hospitalSites: [],
        operational: { from: '2000-01-01', to: null },
        predecessors: [],
        successors: [],
        notes: [],
      },
    ],
  };
}

function makeFigure(
  unitCode: string,
  specCode: string,
  stat: 'median-ongoing-wait' | 'total-waiting',
  period: string,
  pubDate: string,
  val: number,
): Figure<'england'> {
  return {
    nation: 'england',
    reportingUnit: reportingUnitId('england', unitCode),
    specialty: specialtyId('england', specCode),
    waitStage: waitStageId('england', 'rtt-incomplete-pathway'),
    statistic: statisticId('england', stat),
    reportingPeriod: reportingPeriod(period),
    publicationDate: publicationDate(pubDate),
    unit: stat === 'median-ongoing-wait' ? 'weeks' : 'count',
    value: { status: 'published', value: val, provisional: false },
    provenance: { kind: 'official', sourceField: stat },
    source: makeSource('england'),
  };
}

describe('carryForward logic (T-7.3)', () => {
  const reference = makeReference();

  const latestRelease: Release<'england'> = {
    schemaVersion: 1,
    nation: 'england',
    reportingPeriod: reportingPeriod('2026-07-31'),
    publicationDate: publicationDate('2026-09-10'),
    retrievedAt: '2026-09-10T09:30:00.000Z',
    source: makeSource('england'),
    sourceFiles: [],
    reportingUnits: [reportingUnitId('england', 'R1A')],
    figures: [
      makeFigure('R1A', '100', 'median-ongoing-wait', '2026-07-31', '2026-09-10', 12.5),
      makeFigure('R1A', '100', 'total-waiting', '2026-07-31', '2026-09-10', 5000),
    ],
    comparisonFigures: [],
  };

  const history3MonthsAgo: Release<'england'> = {
    schemaVersion: 1,
    nation: 'england',
    reportingPeriod: reportingPeriod('2026-04-30'),
    publicationDate: publicationDate('2026-06-11'),
    retrievedAt: '2026-06-11T09:30:00.000Z',
    source: makeSource('england'),
    sourceFiles: [],
    reportingUnits: [
      reportingUnitId('england', 'R1A'),
      reportingUnitId('england', 'R2B'),
      reportingUnitId('england', 'R3C'),
    ],
    figures: [
      makeFigure('R1A', '100', 'median-ongoing-wait', '2026-04-30', '2026-06-11', 11.2),
      makeFigure('R2B', '100', 'median-ongoing-wait', '2026-04-30', '2026-06-11', 14.2),
      makeFigure('R2B', '100', 'total-waiting', '2026-04-30', '2026-06-11', 3200),
      makeFigure('R3C', '100', 'median-ongoing-wait', '2026-04-30', '2026-06-11', 15.0),
    ],
    comparisonFigures: [],
  };

  const history13MonthsAgo: Release<'england'> = {
    schemaVersion: 1,
    nation: 'england',
    reportingPeriod: reportingPeriod('2025-06-30'),
    publicationDate: publicationDate('2025-08-14'),
    retrievedAt: '2025-08-14T09:30:00.000Z',
    source: makeSource('england'),
    sourceFiles: [],
    reportingUnits: [reportingUnitId('england', 'R4D')],
    figures: [
      makeFigure('R4D', '110', 'median-ongoing-wait', '2025-06-30', '2025-08-14', 18.0),
      makeFigure('R4D', '110', 'total-waiting', '2025-06-30', '2025-08-14', 1200),
    ],
    comparisonFigures: [],
  };

  const history26MonthsAgo: Release<'england'> = {
    schemaVersion: 1,
    nation: 'england',
    reportingPeriod: reportingPeriod('2024-05-31'),
    publicationDate: publicationDate('2024-07-11'),
    retrievedAt: '2024-07-11T09:30:00.000Z',
    source: makeSource('england'),
    sourceFiles: [],
    reportingUnits: [reportingUnitId('england', 'R5E')],
    figures: [
      makeFigure('R5E', '100', 'median-ongoing-wait', '2024-05-31', '2024-07-11', 20.0),
      makeFigure('R5E', '100', 'total-waiting', '2024-05-31', '2024-07-11', 400),
    ],
    comparisonFigures: [],
  };

  it('keeps present unit untouched (not included in carryForward output)', () => {
    const result = carryForward({
      latest: latestRelease,
      history: [history3MonthsAgo],
      reference,
    });

    // R1A is in latest, so it must not be in carryForward output
    const r1aEntries = result.filter((e) => e.reportingUnit === reportingUnitId('england', 'R1A'));
    expect(r1aEntries).toHaveLength(0);
  });

  it('marks unit absent for 3 months as carried-forward with historical figures and period', () => {
    const result = carryForward({
      latest: latestRelease,
      history: [history3MonthsAgo],
      reference,
    });

    const r2bEntry = result.find((e) => e.reportingUnit === reportingUnitId('england', 'R2B'));
    expect(r2bEntry).toBeDefined();
    expect(r2bEntry?.state).toEqual({
      kind: 'carried-forward',
      monthsOld: 3,
    });
    expect(r2bEntry?.figures).toHaveLength(2);
    expect(r2bEntry?.figures[0]?.reportingPeriod).toBe('2026-04-30');
    expect(r2bEntry?.figures[0]?.publicationDate).toBe('2026-06-11');
    expect(r2bEntry?.figures[0]?.yearEarlier).toBeDefined();

    // Validates with model schema
    const schema = publishedUnitSpecialtySchema('england');
    expect(() => schema.parse(r2bEntry)).not.toThrow();
  });

  it('marks merged/succeeded unit absent for 3 months as no-recent-figures', () => {
    const result = carryForward({
      latest: latestRelease,
      history: [history3MonthsAgo],
      reference,
    });

    const r3cEntry = result.find((e) => e.reportingUnit === reportingUnitId('england', 'R3C'));
    expect(r3cEntry).toBeDefined();
    expect(r3cEntry?.state).toEqual({
      kind: 'no-recent-figures',
      lastReportingPeriod: '2026-04-30',
    });
    expect(r3cEntry?.figures).toHaveLength(0);

    const schema = publishedUnitSpecialtySchema('england');
    expect(() => schema.parse(r3cEntry)).not.toThrow();
  });

  it('marks unit absent for 13 months as no-recent-figures with empty figures', () => {
    const result = carryForward({
      latest: latestRelease,
      history: [history13MonthsAgo],
      reference,
    });

    const r4dEntry = result.find((e) => e.reportingUnit === reportingUnitId('england', 'R4D'));
    expect(r4dEntry).toBeDefined();
    expect(r4dEntry?.state).toEqual({
      kind: 'no-recent-figures',
      lastReportingPeriod: '2025-06-30',
    });
    expect(r4dEntry?.figures).toHaveLength(0);

    const schema = publishedUnitSpecialtySchema('england');
    expect(() => schema.parse(r4dEntry)).not.toThrow();
  });

  it('drops unit absent for > 24 months completely', () => {
    const result = carryForward({
      latest: latestRelease,
      history: [history26MonthsAgo],
      reference,
    });

    const r5eEntry = result.find((e) => e.reportingUnit === reportingUnitId('england', 'R5E'));
    expect(r5eEntry).toBeUndefined();
  });

  it('orders output deterministically by reportingUnit then specialty', () => {
    const result = carryForward({
      latest: latestRelease,
      history: [history13MonthsAgo, history3MonthsAgo],
      reference,
    });

    const keys = result.map((e) => `${e.reportingUnit}|${e.specialty}`);
    const sortedKeys = [...keys].sort();
    expect(keys).toEqual(sortedKeys);
  });
});
