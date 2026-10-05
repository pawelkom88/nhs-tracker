import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';
import { parseEnglandXlsx, type RawEnglandRow } from '../../src/england/parse.js';
import { normaliseEnglandRelease } from '../../src/england/normalise.js';
import { SchemaChangeError } from '../../src/errors.js';
import { publicationDate, reportingPeriod } from '@kyw/model/period';
import { reportingUnitId, specialtyId, statisticId } from '@kyw/model/ids';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const FIXTURES_DIR = path.resolve(__dirname, '../../fixtures/england');

describe('normaliseEnglandRelease', () => {
  it('normalises parsed Incomplete-Provider-Jul26.xlsx fixture into valid Release<england>', async () => {
    const fixturePath = path.join(FIXTURES_DIR, 'Incomplete-Provider-Jul26.xlsx');
    const parsed = await parseEnglandXlsx(fixturePath);

    const sourceUrl =
      'https://www.england.nhs.uk/statistics/wp-content/uploads/sites/2/2026/09/Incomplete-Provider-Jul26-XLSX-9M-97ylx5.xlsx';
    const release = normaliseEnglandRelease(parsed, {
      sourceUrl,
      sourceSha256: 'a'.repeat(64),
      retrievedAt: '2026-10-03T12:00:00.000Z',
    });

    expect(release.schemaVersion).toBe(1);
    expect(release.nation).toBe('england');
    expect(release.reportingPeriod).toBe(reportingPeriod('2026-07-31'));
    expect(release.publicationDate).toBe(publicationDate('2026-09-10'));
    expect(release.source.url).toBe(sourceUrl);
    expect(release.comparisonFigures).toEqual([]);

    // Check R1H x C_110 (Trauma and Orthopaedic Service) figures
    const r1hId = reportingUnitId('england', 'R1H');
    const c110Id = specialtyId('england', 'C_110');
    const r1hC110Figs = release.figures.filter(
      (f) => f.reportingUnit === r1hId && f.specialty === c110Id,
    );
    expect(r1hC110Figs).toHaveLength(4);

    const medianStatId = statisticId('england', 'median-ongoing-wait');
    const medianFig = r1hC110Figs.find((f) => f.statistic === medianStatId);
    expect(medianFig).toBeDefined();
    expect(medianFig?.unit).toBe('weeks');
    expect(medianFig?.provenance).toEqual({
      kind: 'official',
      sourceField: 'Average (median) waiting time (in weeks)',
    });
    expect(medianFig?.value.status).toBe('published');
    if (medianFig?.value.status === 'published') {
      expect(medianFig.value.value).toBeCloseTo(14.99230769, 5);
    }

    const withinStandardStatId = statisticId('england', 'within-waiting-standard');
    const withinStandardFig = r1hC110Figs.find((f) => f.statistic === withinStandardStatId);
    expect(withinStandardFig).toBeDefined();
    expect(withinStandardFig?.unit).toBe('proportion');
    expect(withinStandardFig?.provenance).toEqual({
      kind: 'official',
      sourceField: '% within 18 weeks',
    });
    expect(withinStandardFig?.value.status).toBe('published');
    if (withinStandardFig?.value.status === 'published') {
      expect(withinStandardFig.value.value).toBeCloseTo(0.57743719, 5);
    }

    const longWaitStatId = statisticId('england', 'long-wait-count');
    const longWaitFig = r1hC110Figs.find((f) => f.statistic === longWaitStatId);
    expect(longWaitFig).toBeDefined();
    expect(longWaitFig?.unit).toBe('count');
    expect(longWaitFig?.provenance).toEqual({
      kind: 'official',
      sourceField: 'Total 52 plus weeks',
    });
    expect(longWaitFig?.value).toEqual({
      status: 'published',
      value: 74,
      provisional: false,
    });

    const totalStatId = statisticId('england', 'total-waiting');
    const totalFig = r1hC110Figs.find((f) => f.statistic === totalStatId);
    expect(totalFig).toBeDefined();
    expect(totalFig?.unit).toBe('count');
    expect(totalFig?.provenance).toEqual({
      kind: 'official',
      sourceField: 'Total number of incomplete pathways',
    });
    expect(totalFig?.value).toEqual({
      status: 'published',
      value: 8678,
      provisional: false,
    });

    // Verify all figures have kind === 'official' and none has 'derived'
    for (const fig of release.figures) {
      expect(fig.provenance.kind).toBe('official');
    }

    // Verify zero total rows produced 0 figures
    const zeroRowInParsed = parsed.rows.find((r) => r.total === 0);
    expect(zeroRowInParsed).toBeDefined();
    if (zeroRowInParsed) {
      const zeroFigs = release.figures.filter(
        (f) =>
          f.reportingUnit === reportingUnitId('england', zeroRowInParsed.providerCode) &&
          f.specialty === specialtyId('england', zeroRowInParsed.treatmentFunctionCode),
      );
      expect(zeroFigs).toHaveLength(0);
    }

    // Verify reportingUnits only contains providers with >0 pathways
    expect(release.reportingUnits).toContain(reportingUnitId('england', 'R1H'));
    expect(release.reportingUnits).toContain(reportingUnitId('england', 'RRK'));
    expect(release.reportingUnits).toContain(reportingUnitId('england', 'RAL'));
  });

  it('handles suppressed medians on active rows (no value property)', () => {
    const mockRow: RawEnglandRow = {
      sheet: 'IS Provider',
      regionCode: 'Y56',
      providerCode: 'A1D1B',
      providerName: 'SpaMedica Wembley',
      treatmentFunctionCode: 'C_130',
      treatmentFunctionName: 'Ophthalmology Service',
      total: 10,
      within18Proportion: 0.9,
      median: 'suppressed',
      longWait52Plus: 0,
    };

    const release = normaliseEnglandRelease(
      {
        metadata: {
          reportingPeriod: reportingPeriod('2026-07-31'),
          publicationDate: publicationDate('2026-09-10'),
          status: 'Published',
        },
        rows: [mockRow],
      },
      {
        sourceUrl: 'https://example.com/rtt.xlsx',
        sourceSha256: '0'.repeat(64),
        retrievedAt: '2026-10-03T12:00:00.000Z',
      },
    );

    const medianFig = release.figures.find(
      (f) => f.statistic === statisticId('england', 'median-ongoing-wait'),
    );
    expect(medianFig).toBeDefined();
    expect(medianFig?.value).toEqual({
      status: 'suppressed',
      provisional: false,
    });
    expect(medianFig?.value).not.toHaveProperty('value');
  });

  it('throws SchemaChangeError when encountering an unknown treatment function code', () => {
    const badRow: RawEnglandRow = {
      sheet: 'Provider',
      regionCode: 'Y56',
      providerCode: 'R1H',
      providerName: 'BARTS HEALTH',
      treatmentFunctionCode: 'UNKNOWN_999',
      treatmentFunctionName: 'Unknown Service',
      total: 10,
      within18Proportion: 0.8,
      median: 5.2,
      longWait52Plus: 0,
    };

    expect(() =>
      normaliseEnglandRelease(
        {
          metadata: {
            reportingPeriod: reportingPeriod('2026-07-31'),
            publicationDate: publicationDate('2026-09-10'),
            status: 'Published',
          },
          rows: [badRow],
        },
        {
          sourceUrl: 'https://example.com/rtt.xlsx',
          sourceSha256: '0'.repeat(64),
          retrievedAt: '2026-10-03T12:00:00.000Z',
        },
      ),
    ).toThrow(SchemaChangeError);
  });

  it('handles release where all rows have total 0 (produces 0 figures, passes schema)', () => {
    const zeroRow: RawEnglandRow = {
      sheet: 'Provider',
      regionCode: 'Y56',
      providerCode: 'R1H',
      providerName: 'BARTS HEALTH',
      treatmentFunctionCode: 'C_100',
      treatmentFunctionName: 'General Surgery Service',
      total: 0,
      within18Proportion: 0,
      median: 'suppressed',
      longWait52Plus: 0,
    };

    const release = normaliseEnglandRelease(
      {
        metadata: {
          reportingPeriod: reportingPeriod('2026-07-31'),
          publicationDate: publicationDate('2026-09-10'),
          status: 'Published',
        },
        rows: [zeroRow],
      },
      {
        sourceUrl: 'https://example.com/rtt.xlsx',
        sourceSha256: '0'.repeat(64),
        retrievedAt: '2026-10-03T12:00:00.000Z',
      },
    );

    expect(release.figures).toHaveLength(0);
    expect(release.reportingUnits).toHaveLength(0);
  });
});
