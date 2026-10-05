import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';
import { reportingUnitId, specialtyId, statisticId, waitStageId } from '@kyw/model/ids';
import { publicationDate, reportingPeriod } from '@kyw/model/period';
import { SchemaChangeError, ValidationError } from '../../src/errors.js';
import {
  parseScotlandPerformanceCsv,
  parseScotlandDistributionCsv,
} from '../../src/scotland/parse.js';
import { normaliseScotlandRelease } from '../../src/scotland/normalise.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const FIXTURES_DIR = path.resolve(__dirname, '../../fixtures/scotland/stage-of-treatment');

describe('Scotland Normalise Release (T-6.4)', () => {
  async function loadTrimmedDatasets() {
    const perfCsv = await fs.readFile(path.join(FIXTURES_DIR, 'ac63b747-data.csv'), 'utf8');
    const distCsv = await fs.readFile(path.join(FIXTURES_DIR, 'f9232c17-data.csv'), 'utf8');

    return {
      performance: parseScotlandPerformanceCsv(perfCsv),
      distribution: parseScotlandDistributionCsv(distCsv),
    };
  }

  it('normalises trimmed real fixture files into a valid Release<"scotland">', async () => {
    const parsed = await loadTrimmedDatasets();
    const release = normaliseScotlandRelease(parsed, {
      publicationDate: publicationDate('2026-09-29'),
      performanceUrl:
        'https://www.opendata.nhs.scot/dataset/e9dbef36-a343-4b9a-ab7e-b6e6cbcbb38e/resource/ac63b747-fdcc-410c-ae43-de6fe3c46abf/download/monthly-ongoing-and-completed-waits.csv',
      distributionUrl:
        'https://www.opendata.nhs.scot/dataset/e9dbef36-a343-4b9a-ab7e-b6e6cbcbb38e/resource/f9232c17-a90e-4d35-a863-11bdb3a748c0/download/monthly-distribution-of-ongoing-and-completed-waits.csv',
    });

    expect(release.schemaVersion).toBe(1);
    expect(release.nation).toBe('scotland');
    expect(release.reportingPeriod).toBe('2026-08-31');
    expect(release.publicationDate).toBe('2026-09-29');
    expect(release.source.publisher).toBe('Public Health Scotland');
    expect(release.source.licence).toBe('OGL-3.0');
    expect(release.figures.length).toBeGreaterThan(0);
    expect(release.comparisonFigures.length).toBeGreaterThan(0);
  });

  it('produces two distinct Wait Stages and never combines or sums them (ADR-0002)', async () => {
    const parsed = await loadTrimmedDatasets();
    const release = normaliseScotlandRelease(parsed);

    const newOutpatientStage = waitStageId('scotland', 'new-outpatient');
    const inpatientDayCaseStage = waitStageId('scotland', 'inpatient-day-case');
    const allowedWaitStages = new Set([newOutpatientStage, inpatientDayCaseStage]);

    for (const fig of release.figures) {
      expect(allowedWaitStages.has(fig.waitStage)).toBe(true);
    }
    for (const compFig of release.comparisonFigures) {
      expect(allowedWaitStages.has(compFig.waitStage)).toBe(true);
    }

    // Assert both wait stages are present for Lothian Z9
    const lothianUnit = reportingUnitId('scotland', 'S08000024');
    const z9Specialty = specialtyId('scotland', 'Z9');

    const lothianFigures = release.figures.filter(
      (f) => f.reportingUnit === lothianUnit && f.specialty === z9Specialty,
    );
    const lothianWaitStages = new Set(lothianFigures.map((f) => f.waitStage));
    expect(lothianWaitStages.has(newOutpatientStage)).toBe(true);
    expect(lothianWaitStages.has(inpatientDayCaseStage)).toBe(true);

    // Assert that no figure has a value equal to the sum of the two stages' totals (ADR-0002)
    const totalStat = statisticId('scotland', 'total-waiting');
    const newOutpatientTotalFig = lothianFigures.find(
      (f) => f.waitStage === newOutpatientStage && f.statistic === totalStat,
    );
    const inpatientDayCaseTotalFig = lothianFigures.find(
      (f) => f.waitStage === inpatientDayCaseStage && f.statistic === totalStat,
    );
    expect(newOutpatientTotalFig?.value.status).toBe('published');
    expect(inpatientDayCaseTotalFig?.value.status).toBe('published');

    const newOutpatientTotal =
      newOutpatientTotalFig?.value.status === 'published' ? newOutpatientTotalFig.value.value : 0;
    const inpatientDayCaseTotal =
      inpatientDayCaseTotalFig?.value.status === 'published'
        ? inpatientDayCaseTotalFig.value.value
        : 0;
    expect(newOutpatientTotal).toBe(79598);
    expect(inpatientDayCaseTotal).toBe(21858);

    // Assert that no figure in figures or comparisonFigures has a value equal to the sum of the two stages' totals (ADR-0002)
    const combinedTotal = newOutpatientTotal + inpatientDayCaseTotal;
    for (const fig of release.figures) {
      if (fig.value.status === 'published') {
        expect(fig.value.value).not.toBe(combinedTotal);
      }
    }
    for (const compFig of release.comparisonFigures) {
      if (compFig.value.status === 'published') {
        expect(compFig.value.value).not.toBe(combinedTotal);
      }
    }

    // Verify across all reporting units and specialties that no figure has a value equal to the sum of its stages' totals
    for (const unit of release.reportingUnits) {
      const unitTotals = release.figures.filter(
        (f) => f.reportingUnit === unit && f.statistic === totalStat,
      );
      const specialties = new Set(unitTotals.map((f) => f.specialty));
      for (const spec of specialties) {
        const outFig = unitTotals.find(
          (f) => f.specialty === spec && f.waitStage === newOutpatientStage,
        );
        const inpFig = unitTotals.find(
          (f) => f.specialty === spec && f.waitStage === inpatientDayCaseStage,
        );
        if (outFig?.value.status === 'published' && inpFig?.value.status === 'published') {
          const sumStages = outFig.value.value + inpFig.value.value;
          for (const fig of release.figures) {
            if (
              fig.reportingUnit === unit &&
              fig.specialty === spec &&
              fig.value.status === 'published'
            ) {
              expect(fig.value.value).not.toBe(sumStages);
            }
          }
        }
      }
    }
  });

  it('stores Median Ongoing Wait in days exactly as published (ADR-0006)', async () => {
    const parsed = await loadTrimmedDatasets();
    const release = normaliseScotlandRelease(parsed);

    const medianStat = statisticId('scotland', 'median-ongoing-wait');
    const medianFigures = release.figures.filter((f) => f.statistic === medianStat);
    expect(medianFigures.length).toBeGreaterThan(0);

    for (const mf of medianFigures) {
      expect(mf.unit).toBe('days');
      expect(mf.provenance).toEqual({
        kind: 'official',
        sourceField: 'Median',
      });
      if (mf.value.status === 'published') {
        expect(typeof mf.value.value).toBe('number');
      }
    }

    // Check specific known Lothian Z9 New Outpatient median
    const lothianUnit = reportingUnitId('scotland', 'S08000024');
    const z9Specialty = specialtyId('scotland', 'Z9');
    const newOutpatientStage = waitStageId('scotland', 'new-outpatient');

    const lothianMedian = release.figures.find(
      (f) =>
        f.reportingUnit === lothianUnit &&
        f.specialty === z9Specialty &&
        f.waitStage === newOutpatientStage &&
        f.statistic === medianStat,
    );
    expect(lothianMedian).toBeDefined();
    expect(lothianMedian?.value).toEqual({
      status: 'published',
      value: 88,
      provisional: false,
    });
  });

  it('calculates Within Waiting Standard Count via exactSum of the 3 bands with derived provenance (ADR-0005)', async () => {
    const parsed = await loadTrimmedDatasets();
    const release = normaliseScotlandRelease(parsed);

    const withinStandardStat = statisticId('scotland', 'within-waiting-standard-count');
    const withinStandardFigures = release.figures.filter((f) => f.statistic === withinStandardStat);
    expect(withinStandardFigures.length).toBeGreaterThan(0);

    for (const wsf of withinStandardFigures) {
      expect(wsf.unit).toBe('count');
      expect(wsf.provenance).toEqual({
        kind: 'derived',
        method: 'exact-sum',
        inputs: ['LessThan4WeekWait', '4To8WeekWait', '8To12WeekWait'],
      });
      expect(wsf.value.status).toBe('published');
    }

    // Check Lothian Z9 New Outpatient: 39039
    const lothianUnit = reportingUnitId('scotland', 'S08000024');
    const z9Specialty = specialtyId('scotland', 'Z9');
    const newOutpatientStage = waitStageId('scotland', 'new-outpatient');

    const lothianWithin = release.figures.find(
      (f) =>
        f.reportingUnit === lothianUnit &&
        f.specialty === z9Specialty &&
        f.waitStage === newOutpatientStage &&
        f.statistic === withinStandardStat,
    );
    expect(lothianWithin).toBeDefined();
    expect(lothianWithin?.value).toEqual({
      status: 'published',
      value: 39039,
      provisional: false,
    });
  });

  it('omits Within Waiting Standard Count when any component band is suppressed (ADR-0005)', async () => {
    const parsed = await loadTrimmedDatasets();
    // Mutate one band of a distribution row to suppressed
    const mutatedDistribution = parsed.distribution.map((r) => {
      if (
        r.hbt === 'S08000024' &&
        r.specialty === 'Z9' &&
        r.patientType === 'New Outpatient' &&
        r.monthEnding === '20260831'
      ) {
        return {
          ...r,
          bands: {
            ...r.bands,
            '4To8WeekWait': { status: 'suppressed' as const, provisional: false },
          },
        };
      }
      return r;
    });

    const release = normaliseScotlandRelease({
      performance: parsed.performance,
      distribution: mutatedDistribution,
    });

    const lothianUnit = reportingUnitId('scotland', 'S08000024');
    const z9Specialty = specialtyId('scotland', 'Z9');
    const newOutpatientStage = waitStageId('scotland', 'new-outpatient');
    const withinStandardStat = statisticId('scotland', 'within-waiting-standard-count');

    const lothianWithin = release.figures.find(
      (f) =>
        f.reportingUnit === lothianUnit &&
        f.specialty === z9Specialty &&
        f.waitStage === newOutpatientStage &&
        f.statistic === withinStandardStat,
    );

    expect(lothianWithin).toBeUndefined();
  });

  it('records Long Wait count as official and equal to WaitsOver52Weeks', async () => {
    const parsed = await loadTrimmedDatasets();
    const release = normaliseScotlandRelease(parsed);

    const longWaitStat = statisticId('scotland', 'long-wait-count');
    const longWaitFigures = release.figures.filter((f) => f.statistic === longWaitStat);
    expect(longWaitFigures.length).toBeGreaterThan(0);

    for (const lwf of longWaitFigures) {
      expect(lwf.unit).toBe('count');
      expect(lwf.provenance).toEqual({
        kind: 'official',
        sourceField: 'WaitsOver52Weeks',
      });
    }

    const lothianUnit = reportingUnitId('scotland', 'S08000024');
    const z9Specialty = specialtyId('scotland', 'Z9');
    const newOutpatientStage = waitStageId('scotland', 'new-outpatient');

    const lothianLongWait = release.figures.find(
      (f) =>
        f.reportingUnit === lothianUnit &&
        f.specialty === z9Specialty &&
        f.waitStage === newOutpatientStage &&
        f.statistic === longWaitStat,
    );
    expect(lothianLongWait?.value).toEqual({
      status: 'published',
      value: 3188,
      provisional: false,
    });
  });

  it('includes Golden Jubilee (SB0801) and excludes non-reporting geography codes (S92000003, S27000001, RA2702, RA2704)', async () => {
    const parsed = await loadTrimmedDatasets();
    const release = normaliseScotlandRelease(parsed);

    const goldenJubilee = reportingUnitId('scotland', 'SB0801');
    const scotlandTotal = reportingUnitId('scotland', 'S92000003');
    const nonNhsProvider = reportingUnitId('scotland', 'S27000001');
    const restOfUk = reportingUnitId('scotland', 'RA2702');
    const unknownRes = reportingUnitId('scotland', 'RA2704');

    expect(release.reportingUnits).toContain(goldenJubilee);
    expect(release.reportingUnits).not.toContain(scotlandTotal);
    expect(release.reportingUnits).not.toContain(nonNhsProvider);
    expect(release.reportingUnits).not.toContain(restOfUk);
    expect(release.reportingUnits).not.toContain(unknownRes);

    for (const fig of release.figures) {
      expect(fig.reportingUnit).not.toBe(scotlandTotal);
      expect(fig.reportingUnit).not.toBe(nonNhsProvider);
      expect(fig.reportingUnit).not.toBe(restOfUk);
      expect(fig.reportingUnit).not.toBe(unknownRes);
    }
  });

  it('populates year-earlier comparison figures from the same rolling file', async () => {
    const parsed = await loadTrimmedDatasets();
    const release = normaliseScotlandRelease(parsed);

    const medianStat = statisticId('scotland', 'median-ongoing-wait');

    expect(release.comparisonFigures.length).toBeGreaterThan(0);
    for (const compFig of release.comparisonFigures) {
      expect(compFig.reportingPeriod).toBe('2025-08-31');
      expect(compFig.statistic).toBe(medianStat);
      expect(compFig.unit).toBe('days');
      expect(compFig.provenance).toEqual({
        kind: 'official',
        sourceField: 'Median',
      });
    }
  });

  it('throws ValidationError when band cross-check sum of 22 bands mismatches Waits', async () => {
    const parsed = await loadTrimmedDatasets();
    const mutatedPerf = parsed.performance.map((r) => {
      if (r.hbt === 'S08000024' && r.monthEnding === '20260831') {
        return {
          ...r,
          waits: { status: 'published' as const, value: 999999, provisional: false },
        };
      }
      return r;
    });

    expect(() =>
      normaliseScotlandRelease({
        performance: mutatedPerf,
        distribution: parsed.distribution,
      }),
    ).toThrow(ValidationError);
  });

  it('throws ValidationError when band cross-check for WaitsOver12Weeks mismatches', async () => {
    const parsed = await loadTrimmedDatasets();
    const mutatedPerf = parsed.performance.map((r) => {
      if (r.hbt === 'S08000024' && r.monthEnding === '20260831') {
        return {
          ...r,
          waitsOver12Weeks: { status: 'published' as const, value: 1, provisional: false },
        };
      }
      return r;
    });

    expect(() =>
      normaliseScotlandRelease({
        performance: mutatedPerf,
        distribution: parsed.distribution,
      }),
    ).toThrow(ValidationError);
  });

  it('throws ValidationError when band cross-check for WaitsOver52Weeks mismatches', async () => {
    const parsed = await loadTrimmedDatasets();
    const mutatedPerf = parsed.performance.map((r) => {
      if (r.hbt === 'S08000024' && r.monthEnding === '20260831') {
        return {
          ...r,
          waitsOver52Weeks: { status: 'published' as const, value: 0, provisional: false },
        };
      }
      return r;
    });

    expect(() =>
      normaliseScotlandRelease({
        performance: mutatedPerf,
        distribution: parsed.distribution,
      }),
    ).toThrow(ValidationError);
  });

  it('throws SchemaChangeError if latest MonthEnding differs between files', async () => {
    const parsed = await loadTrimmedDatasets();
    const mutatedDist = parsed.distribution.map((r) => ({
      ...r,
      monthEnding: '20260731',
      reportingPeriod: reportingPeriod('2026-07-31'),
    }));

    expect(() =>
      normaliseScotlandRelease({
        performance: parsed.performance,
        distribution: mutatedDist,
      }),
    ).toThrow(SchemaChangeError);
  });
});
