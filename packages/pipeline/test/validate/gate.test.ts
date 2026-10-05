import { describe, expect, it } from 'vitest';
import type { Figure } from '@kyw/model/figure';
import type { ReferenceData, ReportingUnit, Specialty } from '@kyw/model/reference';
import type { Release } from '@kyw/model/release';
import type { SourceRef } from '@kyw/model/source';
import { publicationDate, reportingPeriod } from '@kyw/model/period';
import { reportingUnitId, specialtyId, statisticId, waitStageId } from '@kyw/model/ids';
import { nhsRegionId } from '@kyw/model/reference';
import {
  checkDates,
  checkFigureCount,
  checkInternalConsistency,
  checkNationTotalSwing,
  checkNoEstimates,
  checkPeriodOrder,
  checkReference,
  checkSchema,
  checkUnitCount,
  validateRelease,
} from '../../src/validate/gate.js';
import { DEFAULT_VALIDATION_THRESHOLDS } from '../../src/validate/thresholds.js';
import { renderValidationReport } from '../../src/validate/report.js';

function createMockEnglandReference(): ReferenceData<'england'> {
  const r1h = reportingUnitId('england', 'R1H');
  const raj = reportingUnitId('england', 'RAJ');
  const regionY56 = nhsRegionId('Y56');

  const unitR1H: ReportingUnit<'england'> = {
    id: r1h,
    officialCode: 'R1H',
    officialName: 'Barts Health NHS Trust',
    displayName: 'Barts Health',
    kind: 'nhs-trust',
    nhsRegion: regionY56,
    hospitalSites: [],
    operational: { from: '2012-04-01', to: null },
    predecessors: [],
    successors: [],
    notes: [],
  };

  const unitRAJ: ReportingUnit<'england'> = {
    id: raj,
    officialCode: 'RAJ',
    officialName: 'Mid and South Essex NHS Foundation Trust',
    displayName: 'Mid and South Essex',
    kind: 'nhs-trust',
    nhsRegion: regionY56,
    hospitalSites: [],
    operational: { from: '2020-04-01', to: null },
    predecessors: [],
    successors: [],
    notes: [],
  };

  const specAll: Specialty<'england'> = {
    id: specialtyId('england', 'all'),
    officialCode: 'C_999',
    officialName: 'Total',
    slug: 'all',
    descriptionKey: 'specialty.all.description',
    isAllSpecialties: true,
  };

  const spec110: Specialty<'england'> = {
    id: specialtyId('england', 'C_110'),
    officialCode: 'C_110',
    officialName: 'Trauma & Orthopaedics',
    slug: 'trauma-and-orthopaedics',
    descriptionKey: 'specialty.trauma-and-orthopaedics.description',
    isAllSpecialties: false,
  };

  const source: SourceRef<'england'> = {
    nation: 'england',
    publisher: 'NHS England',
    title: 'NHS England Consultant-led Referral to Treatment Waiting Times',
    url: 'https://www.england.nhs.uk/statistics/statistical-work-areas/rtt-waiting-times/',
    licence: 'OGL-3.0',
    attribution:
      'Contains public sector information licensed under the Open Government Licence v3.0.',
  };

  return {
    nation: 'england',
    retrievedAt: '2026-10-01T00:00:00.000Z',
    sources: [source],
    nhsRegions: [{ id: regionY56, officialCode: 'Y56', name: 'London' }],
    reportingUnits: [unitR1H, unitRAJ],
    hospitalSites: [],
    specialties: [specAll, spec110],
  };
}

function createMockEnglandRelease(overrides?: Partial<Release<'england'>>): Release<'england'> {
  const r1h = reportingUnitId('england', 'R1H');
  const raj = reportingUnitId('england', 'RAJ');
  const specAll = specialtyId('england', 'all');
  const spec110 = specialtyId('england', 'C_110');
  const waitStage = waitStageId('england', 'rtt-incomplete-pathway');
  const period = reportingPeriod('2026-07-31');
  const pubDate = publicationDate('2026-09-10');

  const source: SourceRef<'england'> = {
    nation: 'england',
    publisher: 'NHS England',
    title: 'NHS England Consultant-led Referral to Treatment Waiting Times',
    url: 'https://www.england.nhs.uk/statistics/statistical-work-areas/rtt-waiting-times/',
    licence: 'OGL-3.0',
    attribution:
      'Contains public sector information licensed under the Open Government Licence v3.0.',
  };

  const figures: Figure<'england'>[] = [
    // R1H Total
    {
      nation: 'england',
      reportingUnit: r1h,
      specialty: specAll,
      waitStage,
      statistic: statisticId('england', 'total-waiting'),
      reportingPeriod: period,
      publicationDate: pubDate,
      unit: 'count',
      value: { status: 'published', value: 10000, provisional: false },
      provenance: { kind: 'official', sourceField: 'Total number of incomplete pathways' },
      source,
    },
    {
      nation: 'england',
      reportingUnit: r1h,
      specialty: specAll,
      waitStage,
      statistic: statisticId('england', 'long-wait-count'),
      reportingPeriod: period,
      publicationDate: pubDate,
      unit: 'count',
      value: { status: 'published', value: 200, provisional: false },
      provenance: { kind: 'official', sourceField: 'Total 52 plus weeks' },
      source,
    },
    {
      nation: 'england',
      reportingUnit: r1h,
      specialty: specAll,
      waitStage,
      statistic: statisticId('england', 'median-ongoing-wait'),
      reportingPeriod: period,
      publicationDate: pubDate,
      unit: 'weeks',
      value: { status: 'published', value: 14.5, provisional: false },
      provenance: { kind: 'official', sourceField: 'Average (median) waiting time (in weeks)' },
      source,
    },
    {
      nation: 'england',
      reportingUnit: r1h,
      specialty: specAll,
      waitStage,
      statistic: statisticId('england', 'within-waiting-standard'),
      reportingPeriod: period,
      publicationDate: pubDate,
      unit: 'proportion',
      value: { status: 'published', value: 0.65, provisional: false },
      provenance: { kind: 'official', sourceField: '% within 18 weeks' },
      source,
    },
    // R1H Specialty C_110
    {
      nation: 'england',
      reportingUnit: r1h,
      specialty: spec110,
      waitStage,
      statistic: statisticId('england', 'total-waiting'),
      reportingPeriod: period,
      publicationDate: pubDate,
      unit: 'count',
      value: { status: 'published', value: 1500, provisional: false },
      provenance: { kind: 'official', sourceField: 'Total number of incomplete pathways' },
      source,
    },
    {
      nation: 'england',
      reportingUnit: r1h,
      specialty: spec110,
      waitStage,
      statistic: statisticId('england', 'long-wait-count'),
      reportingPeriod: period,
      publicationDate: pubDate,
      unit: 'count',
      value: { status: 'published', value: 30, provisional: false },
      provenance: { kind: 'official', sourceField: 'Total 52 plus weeks' },
      source,
    },
    {
      nation: 'england',
      reportingUnit: r1h,
      specialty: spec110,
      waitStage,
      statistic: statisticId('england', 'median-ongoing-wait'),
      reportingPeriod: period,
      publicationDate: pubDate,
      unit: 'weeks',
      value: { status: 'published', value: 15.2, provisional: false },
      provenance: { kind: 'official', sourceField: 'Average (median) waiting time (in weeks)' },
      source,
    },
    {
      nation: 'england',
      reportingUnit: r1h,
      specialty: spec110,
      waitStage,
      statistic: statisticId('england', 'within-waiting-standard'),
      reportingPeriod: period,
      publicationDate: pubDate,
      unit: 'proportion',
      value: { status: 'published', value: 0.61, provisional: false },
      provenance: { kind: 'official', sourceField: '% within 18 weeks' },
      source,
    },
    // RAJ Total
    {
      nation: 'england',
      reportingUnit: raj,
      specialty: specAll,
      waitStage,
      statistic: statisticId('england', 'total-waiting'),
      reportingPeriod: period,
      publicationDate: pubDate,
      unit: 'count',
      value: { status: 'published', value: 12000, provisional: false },
      provenance: { kind: 'official', sourceField: 'Total number of incomplete pathways' },
      source,
    },
    {
      nation: 'england',
      reportingUnit: raj,
      specialty: specAll,
      waitStage,
      statistic: statisticId('england', 'long-wait-count'),
      reportingPeriod: period,
      publicationDate: pubDate,
      unit: 'count',
      value: { status: 'published', value: 350, provisional: false },
      provenance: { kind: 'official', sourceField: 'Total 52 plus weeks' },
      source,
    },
    {
      nation: 'england',
      reportingUnit: raj,
      specialty: specAll,
      waitStage,
      statistic: statisticId('england', 'median-ongoing-wait'),
      reportingPeriod: period,
      publicationDate: pubDate,
      unit: 'weeks',
      value: { status: 'published', value: 16.1, provisional: false },
      provenance: { kind: 'official', sourceField: 'Average (median) waiting time (in weeks)' },
      source,
    },
    {
      nation: 'england',
      reportingUnit: raj,
      specialty: specAll,
      waitStage,
      statistic: statisticId('england', 'within-waiting-standard'),
      reportingPeriod: period,
      publicationDate: pubDate,
      unit: 'proportion',
      value: { status: 'published', value: 0.58, provisional: false },
      provenance: { kind: 'official', sourceField: '% within 18 weeks' },
      source,
    },
  ];

  return {
    schemaVersion: 1,
    nation: 'england',
    reportingPeriod: period,
    publicationDate: pubDate,
    source,
    retrievedAt: '2026-09-10T09:30:00.000Z',
    sourceFiles: [
      {
        url: 'https://www.england.nhs.uk/statistics/Incomplete-Provider-Jul26.xlsx',
        sha256: 'a'.repeat(64),
        revised: false,
      },
    ],
    reportingUnits: [r1h, raj],
    figures,
    comparisonFigures: [],
    ...overrides,
  };
}

describe('T-7.1 Release Validation Gate', () => {
  const reference = createMockEnglandReference();
  const validRelease = createMockEnglandRelease();
  const previousRelease = createMockEnglandRelease({
    reportingPeriod: reportingPeriod('2026-06-30'),
    publicationDate: publicationDate('2026-08-13'),
  });

  describe('Check 1: schema', () => {
    it('passes for valid Release', () => {
      const result = checkSchema(validRelease);
      expect(result.ok).toBe(true);
      expect(result.id).toBe('schema');
    });

    it('fails when figure value is out of allowed range or invalid', () => {
      const firstFigure = validRelease.figures[0];
      if (!firstFigure) throw new Error('Expected at least one figure');

      const invalidFigure: Figure<'england'> = {
        ...firstFigure,
        value: { status: 'published', value: -50, provisional: false }, // Count cannot be negative
      };
      const invalidRelease: Release<'england'> = {
        ...validRelease,
        figures: [invalidFigure],
      };
      const result = checkSchema(invalidRelease);
      expect(result.ok).toBe(false);
      expect(result.detail).toContain('Count cannot be negative');
    });
  });

  describe('Check 2: period-order', () => {
    it('passes when previous release is null (initial release)', () => {
      const result = checkPeriodOrder(validRelease, null);
      expect(result.ok).toBe(true);
      expect(result.detail).toContain('Initial release');
    });

    it('passes when candidate period is chronologically after previous', () => {
      const result = checkPeriodOrder(validRelease, previousRelease);
      expect(result.ok).toBe(true);
      expect(result.detail).toContain('is after previous period');
    });

    it('passes when candidate period equals previous period (revision)', () => {
      const revision = createMockEnglandRelease({
        reportingPeriod: previousRelease.reportingPeriod,
        publicationDate: publicationDate('2026-09-15'),
      });
      const result = checkPeriodOrder(revision, previousRelease);
      expect(result.ok).toBe(true);
      expect(result.detail).toContain('Revision release');
    });

    it('fails when candidate period is before previous period', () => {
      const olderCandidate = createMockEnglandRelease({
        reportingPeriod: reportingPeriod('2026-05-31'),
      });
      const result = checkPeriodOrder(olderCandidate, previousRelease);
      expect(result.ok).toBe(false);
      expect(result.detail).toContain('chronologically before');
    });
  });

  describe('Check 3: dates', () => {
    it('passes when publication date > reporting period and <= today', () => {
      const result = checkDates(validRelease, '2026-10-04');
      expect(result.ok).toBe(true);
    });

    it('fails when publication date is on or before reporting period', () => {
      const badRelease = createMockEnglandRelease({
        publicationDate: publicationDate('2026-07-31'),
      });
      const result = checkDates(badRelease, '2026-10-04');
      expect(result.ok).toBe(false);
      expect(result.detail).toContain('must be strictly after reporting period');
    });

    it('fails when publication date is in the future', () => {
      const futureRelease = createMockEnglandRelease({
        publicationDate: publicationDate('2026-10-15'),
      });
      const result = checkDates(futureRelease, '2026-10-04');
      expect(result.ok).toBe(false);
      expect(result.detail).toContain('cannot be in the future');
    });
  });

  describe('Check 4: unit-count', () => {
    it('England: passes when unit count >= 95% of previous', () => {
      const prev = createMockEnglandRelease({
        reportingUnits: [reportingUnitId('england', 'R1H'), reportingUnitId('england', 'RAJ')],
      });
      const cand = createMockEnglandRelease({
        reportingUnits: [reportingUnitId('england', 'R1H'), reportingUnitId('england', 'RAJ')],
      });
      const result = checkUnitCount(cand, prev, DEFAULT_VALIDATION_THRESHOLDS);
      expect(result.ok).toBe(true);
    });

    it('England: fails when unit count drops below 95% of previous', () => {
      const prevUnits = Array.from({ length: 100 }, (_, i) =>
        reportingUnitId('england', `U${String(i).padStart(3, '0')}`),
      );
      const candUnits = prevUnits.slice(0, 94); // 94%

      const prev = createMockEnglandRelease({ reportingUnits: prevUnits });
      const cand = createMockEnglandRelease({ reportingUnits: candUnits });
      const result = checkUnitCount(cand, prev, DEFAULT_VALIDATION_THRESHOLDS);
      expect(result.ok).toBe(false);
      expect(result.detail).toContain('below minimum threshold of 95.0%');
    });

    it('Wales/Scotland: passes when all previous units are present', () => {
      const board1 = reportingUnitId('scotland', 'S08000015');
      const board2 = reportingUnitId('scotland', 'S08000016');

      const prev: Release<'scotland'> = {
        schemaVersion: 1,
        nation: 'scotland',
        reportingPeriod: reportingPeriod('2026-06-30'),
        publicationDate: publicationDate('2026-08-13'),
        source: {
          nation: 'scotland',
          publisher: 'Public Health Scotland',
          title: 'Stage of Treatment Waiting Times',
          url: 'https://publichealthscotland.scot/publications/stage-of-treatment-waiting-times/',
          licence: 'OGL-3.0',
          attribution: 'OGL v3.0',
        },
        retrievedAt: '2026-08-13T09:30:00.000Z',
        sourceFiles: [],
        reportingUnits: [board1, board2],
        figures: [],
        comparisonFigures: [],
      };
      const cand: Release<'scotland'> = {
        ...prev,
        reportingPeriod: reportingPeriod('2026-07-31'),
        publicationDate: publicationDate('2026-09-10'),
      };

      const result = checkUnitCount(cand, prev, DEFAULT_VALIDATION_THRESHOLDS);
      expect(result.ok).toBe(true);
    });

    it('Wales/Scotland: fails when any previous board is missing', () => {
      const board1 = reportingUnitId('scotland', 'S08000015');
      const board2 = reportingUnitId('scotland', 'S08000016');

      const prev: Release<'scotland'> = {
        schemaVersion: 1,
        nation: 'scotland',
        reportingPeriod: reportingPeriod('2026-06-30'),
        publicationDate: publicationDate('2026-08-13'),
        source: {
          nation: 'scotland',
          publisher: 'Public Health Scotland',
          title: 'Stage of Treatment Waiting Times',
          url: 'https://publichealthscotland.scot/publications/stage-of-treatment-waiting-times/',
          licence: 'OGL-3.0',
          attribution: 'OGL v3.0',
        },
        retrievedAt: '2026-08-13T09:30:00.000Z',
        sourceFiles: [],
        reportingUnits: [board1, board2],
        figures: [],
        comparisonFigures: [],
      };
      const cand: Release<'scotland'> = {
        ...prev,
        reportingPeriod: reportingPeriod('2026-07-31'),
        publicationDate: publicationDate('2026-09-10'),
        reportingUnits: [board1],
      };

      const result = checkUnitCount(cand, prev, DEFAULT_VALIDATION_THRESHOLDS);
      expect(result.ok).toBe(false);
      expect(result.detail).toContain('Missing 1 reporting units');
      expect(result.detail).toContain('S08000016');
    });
  });

  describe('Check 5: figure-count', () => {
    it('passes when figure count >= 90% of previous', () => {
      const result = checkFigureCount(validRelease, previousRelease, DEFAULT_VALIDATION_THRESHOLDS);
      expect(result.ok).toBe(true);
    });

    it('fails when figure count drops below 90% of previous', () => {
      const cand = createMockEnglandRelease({
        figures: validRelease.figures.slice(0, 5), // 5 vs 12 figures = 41.7%
      });
      const result = checkFigureCount(cand, previousRelease, DEFAULT_VALIDATION_THRESHOLDS);
      expect(result.ok).toBe(false);
      expect(result.detail).toContain('below minimum threshold of 90.0%');
    });
  });

  describe('Check 6: reference', () => {
    it('passes when all reporting units and specialties exist in reference data', () => {
      const result = checkReference(validRelease, reference);
      expect(result.ok).toBe(true);
    });

    it('fails when reporting unit is missing from reference data', () => {
      const unknownUnit = reportingUnitId('england', 'UNKNOWN');
      const cand = createMockEnglandRelease({
        reportingUnits: [...validRelease.reportingUnits, unknownUnit],
      });
      const result = checkReference(cand, reference);
      expect(result.ok).toBe(false);
      expect(result.detail).toContain('Unknown reporting units: england:UNKNOWN');
    });

    it('fails when specialty is missing from reference data', () => {
      const unknownSpec = specialtyId('england', 'UNKNOWN_SPEC');
      const firstFig = validRelease.figures[0];
      if (!firstFig) throw new Error('Expected figure');

      const badFigure: Figure<'england'> = {
        ...firstFig,
        specialty: unknownSpec,
      };
      const cand = createMockEnglandRelease({
        figures: [badFigure],
      });
      const result = checkReference(cand, reference);
      expect(result.ok).toBe(false);
      expect(result.detail).toContain('Unknown specialties: england:UNKNOWN_SPEC');
    });
  });

  describe('Check 7: internal-consistency', () => {
    it('passes when long wait <= total waiting', () => {
      const result = checkInternalConsistency(validRelease);
      expect(result.ok).toBe(true);
    });

    it('fails when long wait count > total waiting for an entry', () => {
      const r1h = reportingUnitId('england', 'R1H');
      const specAll = specialtyId('england', 'all');

      const badFigures = validRelease.figures.map((f) => {
        if (
          f.reportingUnit === r1h &&
          f.specialty === specAll &&
          f.statistic === statisticId('england', 'long-wait-count')
        ) {
          return {
            ...f,
            value: { status: 'published' as const, value: 50000, provisional: false }, // total-waiting is 10000
          };
        }
        return f;
      });

      const badRelease = createMockEnglandRelease({ figures: badFigures });
      const result = checkInternalConsistency(badRelease);
      expect(result.ok).toBe(false);
      expect(result.detail).toContain('Long wait count (50000) exceeds total waiting (10000)');
    });

    it('Scotland: fails when within-12-weeks count > total waiting', () => {
      const board = reportingUnitId('scotland', 'S08000015');
      const spec = specialtyId('scotland', 'all');
      const stage = waitStageId('scotland', 'new-outpatient');
      const period = reportingPeriod('2026-07-31');
      const pubDate = publicationDate('2026-09-10');
      const source: SourceRef<'scotland'> = {
        nation: 'scotland',
        publisher: 'Public Health Scotland',
        title: 'Stage of Treatment Waiting Times',
        url: 'https://publichealthscotland.scot/publications/stage-of-treatment-waiting-times/',
        licence: 'OGL-3.0',
        attribution:
          'Contains public sector information licensed under the Open Government Licence v3.0.',
      };

      const scotlandFigures: Figure<'scotland'>[] = [
        {
          nation: 'scotland',
          reportingUnit: board,
          specialty: spec,
          waitStage: stage,
          statistic: statisticId('scotland', 'total-waiting'),
          reportingPeriod: period,
          publicationDate: pubDate,
          unit: 'count',
          value: { status: 'published', value: 1000, provisional: false },
          provenance: { kind: 'official', sourceField: 'Waits' },
          source,
        },
        {
          nation: 'scotland',
          reportingUnit: board,
          specialty: spec,
          waitStage: stage,
          statistic: statisticId('scotland', 'within-waiting-standard-count'),
          reportingPeriod: period,
          publicationDate: pubDate,
          unit: 'count',
          value: { status: 'published', value: 1500, provisional: false }, // 1500 > 1000
          provenance: {
            kind: 'derived',
            method: 'exact-sum',
            inputs: ['LessThan4WeekWait', '4To8WeekWait', '8To12WeekWait'],
          },
          source,
        },
      ];

      const scotlandRelease: Release<'scotland'> = {
        schemaVersion: 1,
        nation: 'scotland',
        reportingPeriod: period,
        publicationDate: pubDate,
        source,
        retrievedAt: '2026-09-10T09:30:00.000Z',
        sourceFiles: [],
        reportingUnits: [board],
        figures: scotlandFigures,
        comparisonFigures: [],
      };

      const result = checkInternalConsistency(scotlandRelease);
      expect(result.ok).toBe(false);
      expect(result.detail).toContain('Within-12-weeks count (1500) exceeds total waiting (1000)');
    });
  });

  describe('Check 8: nation-total-swing', () => {
    it('passes when national total waiting swing is <= 25%', () => {
      const result = checkNationTotalSwing(
        validRelease,
        previousRelease,
        reference,
        DEFAULT_VALIDATION_THRESHOLDS,
      );
      expect(result.ok).toBe(true);
    });

    it('fails when national total waiting swing exceeds 25%', () => {
      const r1h = reportingUnitId('england', 'R1H');
      const raj = reportingUnitId('england', 'RAJ');
      const specAll = specialtyId('england', 'all');

      const bigCandFigures = validRelease.figures.map((f) => {
        if (f.specialty === specAll && f.statistic === statisticId('england', 'total-waiting')) {
          if (f.reportingUnit === r1h) {
            return {
              ...f,
              value: { status: 'published' as const, value: 20000, provisional: false },
            };
          }
          if (f.reportingUnit === raj) {
            return {
              ...f,
              value: { status: 'published' as const, value: 15000, provisional: false },
            };
          }
        }
        return f;
      });

      const bigCand = createMockEnglandRelease({ figures: bigCandFigures });
      const result = checkNationTotalSwing(
        bigCand,
        previousRelease,
        reference,
        DEFAULT_VALIDATION_THRESHOLDS,
      );
      expect(result.ok).toBe(false);
      expect(result.detail).toContain('exceeds maximum threshold of 25.0%');
    });
  });

  describe('Check 9: no-estimates', () => {
    it('passes when all figures have official or exact-sum derived provenance', () => {
      const result = checkNoEstimates(validRelease);
      expect(result.ok).toBe(true);
    });

    it('fails when figure has empty sourceField for official provenance', () => {
      const firstFig = validRelease.figures[0];
      if (!firstFig) throw new Error('Expected figure');

      const badFigure: Figure<'england'> = {
        ...firstFig,
        provenance: { kind: 'official', sourceField: '' },
      };
      const badRelease = createMockEnglandRelease({ figures: [badFigure] });
      const result = checkNoEstimates(badRelease);
      expect(result.ok).toBe(false);
      expect(result.detail).toContain('has official provenance but empty sourceField');
    });

    it('fails when derived figure uses a non exact-sum method', () => {
      const firstFig = validRelease.figures[0];
      if (!firstFig) throw new Error('Expected figure');

      const badFigure = {
        ...firstFig,
        provenance: {
          kind: 'derived',
          method: 'interpolation', // forbidden
          inputs: ['colA', 'colB'],
        },
      } as unknown as Figure<'england'>;
      const badRelease = createMockEnglandRelease({ figures: [badFigure] });
      const result = checkNoEstimates(badRelease);
      expect(result.ok).toBe(false);
      expect(result.detail).toContain('forbidden method "interpolation"');
    });
  });

  describe('validateRelease Integration', () => {
    it('returns ok: true when all 9 checks pass', () => {
      const report = validateRelease(validRelease, previousRelease, reference, {
        today: '2026-10-04',
      });
      expect(report.ok).toBe(true);
      expect(report.nation).toBe('england');
      expect(report.reportingPeriod).toBe('2026-07-31');
      expect(report.checks).toHaveLength(9);
      expect(report.checks.every((c) => c.ok)).toBe(true);
    });

    it('returns ok: false when one or more checks fail', () => {
      const badRelease = createMockEnglandRelease({
        publicationDate: publicationDate('2026-07-01'), // Before reporting period
      });
      const report = validateRelease(badRelease, previousRelease, reference, {
        today: '2026-10-04',
      });
      expect(report.ok).toBe(false);
      const failedCheck = report.checks.find((c) => c.id === 'dates');
      expect(failedCheck?.ok).toBe(false);
    });
  });

  describe('renderValidationReport Markdown snapshot', () => {
    it('matches snapshot for passing report', () => {
      const report = validateRelease(validRelease, previousRelease, reference, {
        today: '2026-10-04',
      });
      const markdown = renderValidationReport(report);
      expect(markdown).toMatchInlineSnapshot(`
        "# Pipeline Validation Report: England (2026-07-31)

        **Status:** ✅ PASSED
        **Nation:** England
        **Reporting Period:** 2026-07-31
        **Result:** 9 / 9 checks passed

        ## ✅ Passed Checks

        - **\`schema\`**: Release passes domain Zod schema validation.
        - **\`period-order\`**: Reporting period (2026-07-31) is after previous period (2026-06-30).
        - **\`dates\`**: Publication date (2026-09-10) is valid and after reporting period (2026-07-31).
        - **\`unit-count\`**: England reporting unit count: 2 (vs 2 previously, 100.0%).
        - **\`figure-count\`**: Figures count: 12 (vs 12 previously, 100.0%).
        - **\`reference\`**: All reporting units and specialties exist in reference data.
        - **\`internal-consistency\`**: Internal consistency checks passed for all entries.
        - **\`nation-total-swing\`**: National total-waiting swing is 0.0% (from 22000 to 22000), within threshold of 25.0%.
        - **\`no-estimates\`**: All figures have valid official or exact-sum derived provenance with no estimates.
        "
      `);
    });

    it('matches snapshot for failing report (failed checks listed first)', () => {
      const badRelease = createMockEnglandRelease({
        publicationDate: publicationDate('2026-07-01'), // Before period
        reportingUnits: [reportingUnitId('england', 'UNKNOWN')],
      });
      const report = validateRelease(badRelease, previousRelease, reference, {
        today: '2026-10-04',
      });
      const markdown = renderValidationReport(report);
      expect(markdown).toMatchInlineSnapshot(`
        "# Pipeline Validation Report: England (2026-07-31)

        **Status:** ❌ BLOCKED
        **Nation:** England
        **Reporting Period:** 2026-07-31
        **Result:** 5 / 9 checks passed

        ## ❌ Failed Checks

        - **\`schema\`**: Schema validation failed (24 issues): [figures.0.publicationDate] Figure publicationDate "2026-09-10" does not match release publicationDate "2026-07-01"; [figures.0.reportingUnit] Reporting unit "england:R1H" is not listed in release reportingUnits; [figures.1.publicationDate] Figure publicationDate "2026-09-10" does not match release publicationDate "2026-07-01"; [figures.1.reportingUnit] Reporting unit "england:R1H" is not listed in release reportingUnits; [figures.2.publicationDate] Figure publicationDate "2026-09-10" does not match release publicationDate "2026-07-01"; [figures.2.reportingUnit] Reporting unit "england:R1H" is not listed in release reportingUnits; [figures.3.publicationDate] Figure publicationDate "2026-09-10" does not match release publicationDate "2026-07-01"; [figures.3.reportingUnit] Reporting unit "england:R1H" is not listed in release reportingUnits; [figures.4.publicationDate] Figure publicationDate "2026-09-10" does not match release publicationDate "2026-07-01"; [figures.4.reportingUnit] Reporting unit "england:R1H" is not listed in release reportingUnits (...and 14 more)
        - **\`dates\`**: Publication date (2026-07-01) must be strictly after reporting period (2026-07-31).
        - **\`unit-count\`**: England reporting unit count dropped from 2 to 1 (50.0%), below minimum threshold of 95.0%.
        - **\`reference\`**: Reference data check failed: Unknown reporting units: england:UNKNOWN.

        ## ✅ Passed Checks

        - **\`period-order\`**: Reporting period (2026-07-31) is after previous period (2026-06-30).
        - **\`figure-count\`**: Figures count: 12 (vs 12 previously, 100.0%).
        - **\`internal-consistency\`**: Internal consistency checks passed for all entries.
        - **\`nation-total-swing\`**: National total-waiting swing is 0.0% (from 22000 to 22000), within threshold of 25.0%.
        - **\`no-estimates\`**: All figures have valid official or exact-sum derived provenance with no estimates.
        "
      `);
    });
  });
});
