import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { SchemaChangeError } from '../../src/errors.js';
import { loadOdsReport } from '../../src/reference/ods/client.js';
import {
  mapOdsStandardRow,
  mapOdsSuccessionRow,
  type StandardOdsReportName,
} from '../../src/reference/ods/columns.js';

describe('ODS bulk CSV client and fixtures', () => {
  const standardReports: StandardOdsReportName[] = ['etr', 'ets', 'ephp', 'ephpsite', 'wlhb'];

  describe('Standard reports fixture parsing', () => {
    for (const report of standardReports) {
      it(`parses ${report}.csv fixture without any postcode properties`, async () => {
        const rows = await loadOdsReport(report, { source: 'fixture' });
        expect(rows.length).toBeGreaterThan(0);

        for (const row of rows) {
          expect('postcode' in row).toBe(false);
          expect(Object.keys(row)).not.toContain('postcode');
          expect(row.code).toBeTruthy();
          expect(row.name).toBeTruthy();
          expect(Array.isArray(row.subTypeRoles)).toBe(true);
        }
      });
    }
  });

  describe('Succession report fixture parsing', () => {
    it('parses succ.csv fixture accurately', async () => {
      const rows = await loadOdsReport('succ', { source: 'fixture' });
      expect(rows.length).toBeGreaterThan(0);

      // Verify specific known successions from PRD / ADR-0006
      const rapToRal = rows.find((r) => r.predecessor === 'RAP' && r.successor === 'RAL');
      expect(rapToRal).toBeDefined();
      expect(rapToRal?.effectiveDate).toBe('20250101');
      expect(typeof rapToRal?.hasForwardSuccession).toBe('boolean');

      const rvjToRa7 = rows.find((r) => r.predecessor === 'RVJ' && r.successor === 'RA7');
      expect(rvjToRa7).toBeDefined();
      expect(rvjToRa7?.effectiveDate).toBe('20260701');

      const rr1ToRrk = rows.find((r) => r.predecessor === 'RR1' && r.successor === 'RRK');
      expect(rr1ToRrk).toBeDefined();
      expect(rr1ToRrk?.effectiveDate).toBe('20180402');
    });
  });

  describe('Welsh LHBs report', () => {
    it('parses exactly 7 health boards from wlhb.csv', async () => {
      const rows = await loadOdsReport('wlhb', { source: 'fixture' });
      expect(rows.length).toBe(7);

      const codes = rows.map((r) => r.code);
      expect(codes).toEqual(['7A1', '7A2', '7A3', '7A4', '7A5', '7A6', '7A7']);
      const firstRow = rows[0];
      expect(firstRow).toBeDefined();
      expect(firstRow?.name).toContain('BETSI CADWALADR');
      expect(firstRow?.town).toBe('BANGOR');
    });
  });

  describe('RO31 sub-type role exposure', () => {
    it('exposes RO31 on ePACT pseudo-sites in ets.csv', async () => {
      const etsRows = await loadOdsReport('ets', { source: 'fixture' });
      const epactSites = etsRows.filter((r) => r.subTypeRoles.includes('RO31'));
      expect(epactSites.length).toBeGreaterThan(0);

      const regularSites = etsRows.filter((r) => !r.subTypeRoles.includes('RO31'));
      expect(regularSites.length).toBeGreaterThan(0);

      // Check queen elizabeth hospital pseudo site
      const renalTransplant = epactSites.find((r) => r.name.includes('RENAL TRANSPLANT'));
      expect(renalTransplant).toBeDefined();
      expect(renalTransplant?.parentOrgCode).toBe('RRK');
    });
  });

  describe('Column count schema validation', () => {
    it('throws SchemaChangeError when a standard row has 26 columns', () => {
      const invalidRow = new Array(26).fill('val');
      expect(() => mapOdsStandardRow(invalidRow, 0, 'etr')).toThrow(SchemaChangeError);
      expect(() => mapOdsStandardRow(invalidRow, 0, 'etr')).toThrow(/has 26 columns; expected 27/);
    });

    it('throws SchemaChangeError when a standard row has 28 columns', () => {
      const invalidRow = new Array(28).fill('val');
      expect(() => mapOdsStandardRow(invalidRow, 4, 'ets')).toThrow(SchemaChangeError);
      expect(() => mapOdsStandardRow(invalidRow, 4, 'ets')).toThrow(
        /row 5 has 28 columns; expected 27/,
      );
    });

    it('throws SchemaChangeError when a succession row has 4 columns', () => {
      const invalidRow = ['A', 'B', '', '20240101'];
      expect(() => mapOdsSuccessionRow(invalidRow, 2)).toThrow(SchemaChangeError);
      expect(() => mapOdsSuccessionRow(invalidRow, 2)).toThrow(/row 3 has 4 columns; expected 5/);
    });

    it('throws SchemaChangeError when a succession row has 6 columns', () => {
      const invalidRow = ['A', 'B', '', '20240101', '0', 'EXTRA'];
      expect(() => mapOdsSuccessionRow(invalidRow, 0)).toThrow(SchemaChangeError);
      expect(() => mapOdsSuccessionRow(invalidRow, 0)).toThrow(/has 6 columns; expected 5/);
    });
  });

  describe('Live loading with mock fetch implementation', () => {
    it('fetches from live source using injected fetchImpl', async () => {
      const mockCsvContent =
        '"R1H","BARTS HEALTH NHS TRUST","Y56","QMF","THE ROYAL LONDON HOSPITAL","80 NEWARK STREET","","LONDON","","E1 2ES","20120401","","","","","","","","","","","1","","H","","",""';

      const mockFetch: typeof fetch = () => {
        return Promise.resolve(
          new Response(mockCsvContent, {
            status: 200,
            headers: { 'Content-Type': 'text/csv' },
          }),
        );
      };

      const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'kyw-ods-test-'));

      try {
        const rows = await loadOdsReport('etr', {
          source: 'live',
          fetchImpl: mockFetch,
          cacheDir: tmpDir,
        });

        expect(rows.length).toBe(1);
        const firstRow = rows[0];
        expect(firstRow).toBeDefined();
        expect(firstRow?.code).toBe('R1H');
        expect(firstRow?.name).toBe('BARTS HEALTH NHS TRUST');
        expect(firstRow?.town).toBe('LONDON');
        if (firstRow) {
          expect('postcode' in firstRow).toBe(false);
        }
      } finally {
        await fs.rm(tmpDir, { recursive: true, force: true });
      }
    });
  });
});
