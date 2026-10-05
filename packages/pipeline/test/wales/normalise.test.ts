import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { describe, it, expect } from 'vitest';
import { reportingUnitId, specialtyId, statisticId, waitStageId } from '@kyw/model/ids';
import { publicationDate, reportingPeriod } from '@kyw/model/period';
import { walesReleaseSchema } from '@kyw/model/wales/schema';
import { SchemaChangeError, ValidationError } from '../../src/errors.js';
import {
  parseWalesKeyMeasuresCsv,
  parseWalesThresholdCountsCsv,
  type RawWalesValue,
} from '../../src/wales/parse.js';
import {
  normaliseWalesRelease,
  createWalesSourceRef,
  type NormaliseWalesOptions,
} from '../../src/wales/normalise.js';

const FIXTURES_DIR = path.resolve(__dirname, '../../fixtures/wales');

async function loadFixtureDatasets(): Promise<{
  keyMeasures: readonly RawWalesValue[];
  thresholdCounts: readonly RawWalesValue[];
}> {
  const kmCsv = await fs.readFile(path.join(FIXTURES_DIR, 'acd9529c-data.csv'), 'utf-8');
  const tcCsv = await fs.readFile(path.join(FIXTURES_DIR, '3ef3a1d8-data.csv'), 'utf-8');

  return {
    keyMeasures: parseWalesKeyMeasuresCsv(kmCsv),
    thresholdCounts: parseWalesThresholdCountsCsv(tcCsv),
  };
}

describe('Wales normalise (T-5.4)', () => {
  const defaultOptions: NormaliseWalesOptions = {
    reportingPeriod: reportingPeriod('2026-07-31'),
    publicationDate: publicationDate('2026-09-17'),
    retrievedAt: '2026-09-17T12:00:00Z',
    keyMeasuresSha256: 'a'.repeat(64),
    thresholdCountsSha256: 'b'.repeat(64),
  };

  it('normalises real committed Wales fixtures into a valid Release<"wales">', async () => {
    const datasets = await loadFixtureDatasets();
    const release = normaliseWalesRelease(datasets, defaultOptions);

    // 1. Output passes strict Zod schema
    expect(() => walesReleaseSchema.parse(release)).not.toThrow();

    // 2. Release metadata
    expect(release.nation).toBe('wales');
    expect(release.reportingPeriod).toBe('2026-07-31');
    expect(release.publicationDate).toBe('2026-09-17');
    expect(release.schemaVersion).toBe(1);
    expect(release.retrievedAt).toBe('2026-09-17T12:00:00Z');
    expect(release.sourceFiles).toHaveLength(2);

    // 3. Reporting units are mapped to ODS codes 7A1–7A7 and sorted
    expect(release.reportingUnits).toEqual([
      reportingUnitId('wales', '7A1'),
      reportingUnitId('wales', '7A2'),
      reportingUnitId('wales', '7A3'),
      reportingUnitId('wales', '7A4'),
      reportingUnitId('wales', '7A5'),
      reportingUnitId('wales', '7A6'),
      reportingUnitId('wales', '7A7'),
    ]);

    // 4. All Wales aggregate (W92000004) and Region (A1X) are absent
    expect(release.reportingUnits).not.toContain('wales:W92000004');
    expect(release.reportingUnits).not.toContain('wales:A1X');
    expect(release.figures.some((f) => f.reportingUnit.includes('W92000004'))).toBe(false);
    expect(release.figures.some((f) => f.reportingUnit.includes('A1X'))).toBe(false);

    // 5. Cardiff and Vale (W11000029 -> 7A4) × Trauma & Orthopaedics (110) July 2026
    const cav7A4 = reportingUnitId('wales', '7A4');
    const toSpec = specialtyId('wales', '110');
    const rttWaitStage = waitStageId('wales', 'rtt-pathway');

    const cavFigures = release.figures.filter(
      (f) => f.reportingUnit === cav7A4 && f.specialty === toSpec,
    );

    expect(cavFigures).toHaveLength(4);

    const medianFig = cavFigures.find(
      (f) => f.statistic === statisticId('wales', 'median-ongoing-wait'),
    );
    const withinFig = cavFigures.find(
      (f) => f.statistic === statisticId('wales', 'within-waiting-standard'),
    );
    const longWaitFig = cavFigures.find(
      (f) => f.statistic === statisticId('wales', 'long-wait-count'),
    );
    const totalFig = cavFigures.find((f) => f.statistic === statisticId('wales', 'total-waiting'));

    expect(medianFig).toBeDefined();
    expect(medianFig?.unit).toBe('weeks');
    expect(medianFig?.value).toEqual({ status: 'published', value: 29.5, provisional: false });
    expect(medianFig?.provenance).toEqual({
      kind: 'official',
      sourceField: 'Median waiting time (in weeks)',
    });
    expect(medianFig?.waitStage).toBe(rttWaitStage);

    expect(withinFig).toBeDefined();
    expect(withinFig?.unit).toBe('percent');
    expect(withinFig?.value).toEqual({ status: 'published', value: 45.9, provisional: false });
    expect(withinFig?.provenance).toEqual({
      kind: 'official',
      sourceField: '% waiting under 26 weeks',
    });

    expect(longWaitFig).toBeDefined();
    expect(longWaitFig?.unit).toBe('count');
    expect(longWaitFig?.value).toEqual({ status: 'published', value: 4341, provisional: false });
    expect(longWaitFig?.provenance).toEqual({
      kind: 'official',
      sourceField: 'Waiting more than 52 weeks',
    });

    expect(totalFig).toBeDefined();
    expect(totalFig?.unit).toBe('count');
    expect(totalFig?.value).toEqual({ status: 'published', value: 14090, provisional: false });
    expect(totalFig?.provenance).toEqual({
      kind: 'official',
      sourceField: 'Total patient pathways waiting',
    });

    // 6. Powys (W11000024 -> 7A7) × Cardiology (320) July 2026: median suppressed
    const powys7A7 = reportingUnitId('wales', '7A7');
    const cardioSpec = specialtyId('wales', '320');
    const powysCardioFigures = release.figures.filter(
      (f) => f.reportingUnit === powys7A7 && f.specialty === cardioSpec,
    );

    expect(powysCardioFigures.length).toBeGreaterThan(0);

    const powysMedian = powysCardioFigures.find(
      (f) => f.statistic === statisticId('wales', 'median-ongoing-wait'),
    );
    const powysTotal = powysCardioFigures.find(
      (f) => f.statistic === statisticId('wales', 'total-waiting'),
    );
    const powysLongWait = powysCardioFigures.find(
      (f) => f.statistic === statisticId('wales', 'long-wait-count'),
    );

    expect(powysMedian?.value).toEqual({ status: 'suppressed', provisional: false });
    expect(powysTotal?.value).toEqual({ status: 'published', value: 161, provisional: false });
    // In fixture, Powys 320 is absent from threshold counts => 0
    expect(powysLongWait?.value).toEqual({ status: 'published', value: 0, provisional: false });

    // 7. Comparison figures: median for July 2025 (2025-07-31)
    expect(release.comparisonFigures.length).toBeGreaterThan(0);
    for (const compFig of release.comparisonFigures) {
      expect(compFig.statistic).toBe(statisticId('wales', 'median-ongoing-wait'));
      expect(compFig.reportingPeriod).toBe('2025-07-31');
      expect(compFig.publicationDate).toBe('2026-09-17');
      expect(compFig.unit).toBe('weeks');
      expect(compFig.provenance.kind).toBe('official');
      expect(release.reportingUnits).toContain(compFig.reportingUnit);
    }

    // CAV 110 comparison median for July 2025
    const cavCompMedian = release.comparisonFigures.find(
      (f) => f.reportingUnit === cav7A4 && f.specialty === toSpec,
    );
    expect(cavCompMedian).toBeDefined();
    expect(cavCompMedian?.value.status).toBe('published');

    // 8. Strict provenance check: no derived figures exist
    for (const fig of release.figures) {
      expect(fig.provenance.kind).toBe('official');
    }
  });

  it('maps specialty "1" and "T" to wales:all', () => {
    const rawKM: RawWalesValue[] = [
      {
        dataset: 'key_measures',
        dateCode: '202607',
        boardOnsCode: 'W11000029',
        specialtyCode: '1',
        measureCode: '1',
        value: 5000,
      },
      {
        dataset: 'key_measures',
        dateCode: '202607',
        boardOnsCode: 'W11000029',
        specialtyCode: '1',
        measureCode: '2',
        value: 65.5,
      },
      {
        dataset: 'key_measures',
        dateCode: '202607',
        boardOnsCode: 'W11000029',
        specialtyCode: '1',
        measureCode: '4',
        value: 18.2,
      },
    ];

    const rawTC: RawWalesValue[] = [
      {
        dataset: 'threshold_counts',
        dateCode: '202607',
        boardOnsCode: 'W11000029',
        specialtyCode: 'T',
        measureCode: '52',
        value: 120,
      },
    ];

    const release = normaliseWalesRelease(
      { keyMeasures: rawKM, thresholdCounts: rawTC },
      defaultOptions,
    );

    const allFigures = release.figures.filter((f) => f.specialty === specialtyId('wales', 'all'));
    expect(allFigures).toHaveLength(4);
  });

  it('skips cells where total waiting is 0', () => {
    const rawKM: RawWalesValue[] = [
      {
        dataset: 'key_measures',
        dateCode: '202607',
        boardOnsCode: 'W11000029',
        specialtyCode: '110',
        measureCode: '1',
        value: 0,
      },
      {
        dataset: 'key_measures',
        dateCode: '202607',
        boardOnsCode: 'W11000029',
        specialtyCode: '110',
        measureCode: '2',
        value: 100,
      },
    ];

    const release = normaliseWalesRelease(
      { keyMeasures: rawKM, thresholdCounts: [] },
      defaultOptions,
    );

    expect(release.figures).toHaveLength(0);
    expect(release.reportingUnits).toHaveLength(0);
  });

  it('throws SchemaChangeError on unrecognised board ONS code', () => {
    const rawKM: RawWalesValue[] = [
      {
        dataset: 'key_measures',
        dateCode: '202607',
        boardOnsCode: 'W99999999',
        specialtyCode: '110',
        measureCode: '1',
        value: 100,
      },
    ];

    expect(() =>
      normaliseWalesRelease({ keyMeasures: rawKM, thresholdCounts: [] }, defaultOptions),
    ).toThrow(SchemaChangeError);
  });

  it('throws SchemaChangeError on unrecognised specialty code', () => {
    const rawKM: RawWalesValue[] = [
      {
        dataset: 'key_measures',
        dateCode: '202607',
        boardOnsCode: 'W11000029',
        specialtyCode: '99999',
        measureCode: '1',
        value: 100,
      },
    ];

    expect(() =>
      normaliseWalesRelease({ keyMeasures: rawKM, thresholdCounts: [] }, defaultOptions),
    ).toThrow(SchemaChangeError);
  });

  it('allows custom SourceRef and options', () => {
    const customSource = createWalesSourceRef('https://custom.gov.wales', 'Custom Wales Source');
    const rawKM: RawWalesValue[] = [
      {
        dataset: 'key_measures',
        dateCode: '202607',
        boardOnsCode: 'W11000029',
        specialtyCode: '110',
        measureCode: '1',
        value: 100,
      },
    ];

    const release = normaliseWalesRelease(
      { keyMeasures: rawKM, thresholdCounts: [] },
      { ...defaultOptions, sourceRef: customSource },
    );

    expect(release.source.url).toBe('https://custom.gov.wales');
    expect(release.source.title).toBe('Custom Wales Source');
    expect(release.figures[0]?.source.url).toBe('https://custom.gov.wales');
  });

  it('throws ValidationError when release schema fails validation', () => {
    const rawKM: RawWalesValue[] = [
      {
        dataset: 'key_measures',
        dateCode: '202607',
        boardOnsCode: 'W11000029',
        specialtyCode: '110',
        measureCode: '1',
        value: 100,
      },
      {
        dataset: 'key_measures',
        dateCode: '202607',
        boardOnsCode: 'W11000029',
        specialtyCode: '110',
        measureCode: '2',
        value: 150, // Invalid percentage > 100
      },
    ];

    expect(() =>
      normaliseWalesRelease({ keyMeasures: rawKM, thresholdCounts: [] }, defaultOptions),
    ).toThrow(ValidationError);
  });
});
