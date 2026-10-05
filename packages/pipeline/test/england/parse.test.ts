import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';
import { reportingPeriod } from '@kyw/model/period';
import { parseEnglandXlsx, extractPeriodFromFilename } from '../../src/england/parse.js';
import { ENGLAND_EXPECTED_HEADERS } from '../../src/england/columns.js';
import { SchemaChangeError, ValidationError } from '../../src/errors.js';
import type { ParsedWorkbook, XlsxSheetData, XlsxCellValue } from '../../src/io/xlsx.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const FIXTURES_DIR = path.resolve(__dirname, '../../fixtures/england');

function createMockWorkbook(sheets: Record<string, XlsxCellValue[][]>): ParsedWorkbook {
  const sheetNames = Object.keys(sheets);
  const sheetMap = new Map<string, XlsxSheetData>();

  for (const name of sheetNames) {
    const rows = sheets[name];
    if (!rows) continue;
    const maxCols = Math.max(...rows.map((r) => r.length), 0);
    sheetMap.set(name, {
      name,
      rowCount: rows.length,
      columnCount: maxCols,
      rows,
    });
  }

  return {
    sheetNames,
    getSheet(nameOrIndex: string | number): XlsxSheetData | undefined {
      if (typeof nameOrIndex === 'number') {
        const name = sheetNames[nameOrIndex];
        return name ? sheetMap.get(name) : undefined;
      }
      return sheetMap.get(nameOrIndex);
    },
    getSheetRows(nameOrIndex: string | number): readonly (readonly XlsxCellValue[])[] {
      const sheet =
        typeof nameOrIndex === 'number'
          ? sheetMap.get(sheetNames[nameOrIndex] ?? '')
          : sheetMap.get(nameOrIndex);
      return sheet ? sheet.rows : [];
    },
  };
}

function createValidMetadataRows(
  period = 'July 2026',
  published = '10th September 2026',
  revised = 'N/A',
  status = 'Published',
): XlsxCellValue[][] {
  const rows: XlsxCellValue[][] = [];
  rows.push([]); // row 1
  rows.push([null, 'Title:', 'Referral to Treatment (RTT) Waiting Times']); // row 2
  rows.push([null, 'Summary:', 'Monthly Referral to Treatment (RTT) waiting times']); // row 3
  rows.push([]); // row 4
  rows.push([null, 'Period:', period]); // row 5
  rows.push([null, 'Source:', 'NHS England']); // row 6
  rows.push([null, 'Basis:', 'Provider']); // row 7
  rows.push([null, 'Published:', published]); // row 8
  rows.push([null, 'Revised:', revised]); // row 9
  rows.push([null, 'Status:', status]); // row 10
  rows.push([null, 'Contact:', 'england.rtt@nhs.net']); // row 11
  rows.push([]); // row 12
  rows.push([null, 'Provider Level Data']); // row 13
  return rows;
}

function createValidHeaderRow(): XlsxCellValue[] {
  return [null, ...ENGLAND_EXPECTED_HEADERS];
}

describe('parseEnglandXlsx', () => {
  describe('real fixtures', () => {
    it('parses Incomplete-Provider-Jul26.xlsx fixture accurately', async () => {
      const filePath = path.join(FIXTURES_DIR, 'Incomplete-Provider-Jul26.xlsx');
      const result = await parseEnglandXlsx(filePath);

      expect(result.metadata).toEqual({
        reportingPeriod: reportingPeriod('2026-07-31'),
        publicationDate: '2026-09-10',
        revisedDate: null,
        status: 'Published',
      });

      expect(result.rows.length).toBeGreaterThan(0);

      // Verify Trust rows
      const trustRows = result.rows.filter((r) => r.sheet === 'Provider');
      expect(trustRows.length).toBeGreaterThan(0);
      const r1hGeneralSurgery = trustRows.find(
        (r) => r.providerCode === 'R1H' && r.treatmentFunctionCode === 'C_100',
      );
      expect(r1hGeneralSurgery).toBeDefined();
      expect(r1hGeneralSurgery?.sheet).toBe('Provider');
      expect(r1hGeneralSurgery?.regionCode).toBe('Y56');
      expect(r1hGeneralSurgery?.providerCode).toBe('R1H');
      expect(r1hGeneralSurgery?.providerName).toBe('BARTS HEALTH NHS TRUST');
      expect(r1hGeneralSurgery?.treatmentFunctionCode).toBe('C_100');
      expect(r1hGeneralSurgery?.treatmentFunctionName).toBe('General Surgery Service');
      expect(r1hGeneralSurgery?.total).toBe(4483);
      expect(r1hGeneralSurgery?.within18Proportion).toBeCloseTo(0.650234, 4);
      expect(typeof r1hGeneralSurgery?.median).toBe('number');
      if (typeof r1hGeneralSurgery?.median === 'number') {
        expect(r1hGeneralSurgery.median).toBeCloseTo(12.5229, 3);
      }
      expect(r1hGeneralSurgery?.longWait52Plus).toBe(47);

      // Verify IS Provider rows and suppressed median
      const isRows = result.rows.filter((r) => r.sheet === 'IS Provider');
      expect(isRows.length).toBeGreaterThan(0);
      const spaMedicaC100 = isRows.find(
        (r) => r.providerCode === 'A1D1B' && r.treatmentFunctionCode === 'C_100',
      );
      expect(spaMedicaC100).toBeDefined();
      expect(spaMedicaC100?.sheet).toBe('IS Provider');
      expect(spaMedicaC100?.median).toBe('suppressed');
      expect(spaMedicaC100?.total).toBe(0);

      const spireC100 = isRows.find(
        (r) => r.providerCode === 'NT314' && r.treatmentFunctionCode === 'C_100',
      );
      expect(spireC100).toBeDefined();
      expect(spireC100?.sheet).toBe('IS Provider');
      expect(typeof spireC100?.median).toBe('number');
    });

    it('parses Incomplete-Provider-Jul25.xlsx with revised date and Torbay RA9', async () => {
      const filePath = path.join(FIXTURES_DIR, 'Incomplete-Provider-Jul25.xlsx');
      const result = await parseEnglandXlsx(filePath);

      expect(result.metadata).toEqual({
        reportingPeriod: reportingPeriod('2025-07-31'),
        publicationDate: '2025-09-11',
        revisedDate: '2026-02-12',
        status: 'Published',
      });

      const ra9Rows = result.rows.filter((r) => r.providerCode === 'RA9');
      expect(ra9Rows.length).toBe(24);
    });

    it('parses Incomplete-Provider-Mar26-revised.xlsx with revised date', async () => {
      const filePath = path.join(FIXTURES_DIR, 'Incomplete-Provider-Mar26-revised.xlsx');
      const result = await parseEnglandXlsx(filePath);

      expect(result.metadata).toEqual({
        reportingPeriod: reportingPeriod('2026-03-31'),
        publicationDate: '2026-05-14',
        revisedDate: '2026-07-09',
        status: 'Published',
      });
    });

    it('validates expectedPeriod option when matching and throws on mismatch', async () => {
      const filePath = path.join(FIXTURES_DIR, 'Incomplete-Provider-Jul26.xlsx');
      await expect(
        parseEnglandXlsx(filePath, { expectedPeriod: reportingPeriod('2026-07-31') }),
      ).resolves.toBeDefined();

      await expect(
        parseEnglandXlsx(filePath, { expectedPeriod: reportingPeriod('2026-08-31') }),
      ).rejects.toThrow(ValidationError);
    });
  });

  describe('schema and validation errors', () => {
    it('throws SchemaChangeError when Provider sheet is missing', async () => {
      const mockWb = createMockWorkbook({
        'IS Provider': [createValidHeaderRow()],
      });
      await expect(parseEnglandXlsx(mockWb)).rejects.toThrow(SchemaChangeError);
    });

    it('throws SchemaChangeError when IS Provider sheet is missing', async () => {
      const mockWb = createMockWorkbook({
        Provider: [...createValidMetadataRows(), createValidHeaderRow()],
      });
      await expect(parseEnglandXlsx(mockWb)).rejects.toThrow(SchemaChangeError);
    });

    it('throws SchemaChangeError when metadata Period is missing', async () => {
      const metaRows = createValidMetadataRows();
      metaRows[4] = [null, 'Period:', '']; // empty period
      const mockWb = createMockWorkbook({
        Provider: [...metaRows, createValidHeaderRow()],
        'IS Provider': [...createValidMetadataRows(), createValidHeaderRow()],
      });
      await expect(parseEnglandXlsx(mockWb)).rejects.toThrow(SchemaChangeError);
    });

    it('throws SchemaChangeError when sheet has fewer than 14 rows', async () => {
      const mockWb = createMockWorkbook({
        Provider: [[null, 'Period:', 'July 2026']],
        'IS Provider': [[null, 'Period:', 'July 2026']],
      });
      await expect(parseEnglandXlsx(mockWb)).rejects.toThrow(SchemaChangeError);
    });

    it('throws SchemaChangeError when row 14 header column is renamed or missing', async () => {
      const badHeader = [...createValidHeaderRow()];
      badHeader[1] = 'Incorrect Region Header'; // Column B
      const mockWb = createMockWorkbook({
        Provider: [...createValidMetadataRows(), badHeader],
        'IS Provider': [...createValidMetadataRows(), createValidHeaderRow()],
      });
      await expect(parseEnglandXlsx(mockWb)).rejects.toThrow(SchemaChangeError);
    });

    it('throws SchemaChangeError when header row is found on row 15 instead of row 14', async () => {
      const extraMetaRows = [
        ...createValidMetadataRows(),
        [null, 'Extra Metadata Row'],
        createValidHeaderRow(),
      ];
      const mockWb = createMockWorkbook({
        Provider: extraMetaRows,
        'IS Provider': [...createValidMetadataRows(), createValidHeaderRow()],
      });
      await expect(parseEnglandXlsx(mockWb)).rejects.toThrow(SchemaChangeError);
    });

    it('handles numeric codes and zero-total row with dash in within-18 column', async () => {
      const header = createValidHeaderRow();
      const validRowWithDash: XlsxCellValue[] = Array.from({ length: 120 }, () => 0);
      validRowWithDash[0] = null;
      validRowWithDash[1] = 'Y56';
      validRowWithDash[2] = 12345; // numeric provider code
      validRowWithDash[3] = 'NUMERIC PROVIDER';
      validRowWithDash[4] = 'C_100';
      validRowWithDash[5] = 'General Surgery';
      validRowWithDash[111] = 0; // total 0
      validRowWithDash[113] = '-'; // dash for % within 18 weeks when total is 0
      validRowWithDash[114] = '-'; // suppressed median
      validRowWithDash[116] = 0;

      const mockWb = createMockWorkbook({
        Provider: [...createValidMetadataRows(), header, validRowWithDash],
        'IS Provider': [...createValidMetadataRows(), header],
      });

      const res = await parseEnglandXlsx(mockWb);
      expect(res.rows).toHaveLength(1);
      expect(res.rows[0]?.providerCode).toBe('12345');
      expect(res.rows[0]?.total).toBe(0);
      expect(res.rows[0]?.within18Proportion).toBe(0);
      expect(res.rows[0]?.median).toBe('suppressed');
    });

    it('throws ValidationError when a figure column has non-numeric value', async () => {
      const header = createValidHeaderRow();
      const badDataRow: XlsxCellValue[] = Array.from({ length: 120 }, () => 0);
      badDataRow[0] = null;
      badDataRow[1] = 'Y56'; // Region
      badDataRow[2] = 'R1H'; // Provider Code
      badDataRow[3] = 'BARTS HEALTH'; // Provider Name
      badDataRow[4] = 'C_100'; // Treatment Function Code
      badDataRow[5] = 'General Surgery'; // Treatment Function Name
      badDataRow[111] = 'not-a-number'; // Total pathways (column index 111 = Column DH)

      const mockWb = createMockWorkbook({
        Provider: [...createValidMetadataRows(), header, badDataRow],
        'IS Provider': [...createValidMetadataRows(), header],
      });
      await expect(parseEnglandXlsx(mockWb)).rejects.toThrow(ValidationError);
    });

    it('throws ValidationError when median has unexpected string', async () => {
      const header = createValidHeaderRow();
      const badDataRow: XlsxCellValue[] = Array.from({ length: 120 }, () => 0);
      badDataRow[0] = null;
      badDataRow[1] = 'Y56';
      badDataRow[2] = 'R1H';
      badDataRow[3] = 'BARTS HEALTH';
      badDataRow[4] = 'C_100';
      badDataRow[5] = 'General Surgery';
      badDataRow[111] = 100; // total
      badDataRow[113] = 0.5; // proportion
      badDataRow[114] = 'unknown-flag'; // median column DL
      badDataRow[116] = 5; // 52 plus

      const mockWb = createMockWorkbook({
        Provider: [...createValidMetadataRows(), header, badDataRow],
        'IS Provider': [...createValidMetadataRows(), header],
      });
      await expect(parseEnglandXlsx(mockWb)).rejects.toThrow(ValidationError);
    });

    it('throws SchemaChangeError when row 14 header contains extra unexpected column', async () => {
      const extraHeader = [...createValidHeaderRow(), 'Unexpected 120th Column'];
      const mockWb = createMockWorkbook({
        Provider: [...createValidMetadataRows(), extraHeader],
        'IS Provider': [...createValidMetadataRows(), createValidHeaderRow()],
      });
      await expect(parseEnglandXlsx(mockWb)).rejects.toThrow(SchemaChangeError);
    });

    it('throws SchemaChangeError when Column A on row 14 is non-empty', async () => {
      const headerWithColA = [...createValidHeaderRow()];
      headerWithColA[0] = 'Unexpected Col A Content'; // Column A should be empty
      const mockWb = createMockWorkbook({
        Provider: [...createValidMetadataRows(), headerWithColA],
        'IS Provider': [...createValidMetadataRows(), createValidHeaderRow()],
      });
      await expect(parseEnglandXlsx(mockWb)).rejects.toThrow(SchemaChangeError);
    });

    it('throws SchemaChangeError when header row is shifted past row 25 to row 28', async () => {
      const extraRows = Array.from({ length: 14 }, () => [null, 'Extra guidance row']);
      const mockWb = createMockWorkbook({
        Provider: [...createValidMetadataRows(), ...extraRows, createValidHeaderRow()],
        'IS Provider': [...createValidMetadataRows(), createValidHeaderRow()],
      });
      await expect(parseEnglandXlsx(mockWb)).rejects.toThrow(SchemaChangeError);
    });

    it('handles zero-pathway rows with null or empty string in proportion and 52-week count', async () => {
      const header = createValidHeaderRow();
      const zeroRowWithNulls: XlsxCellValue[] = Array.from({ length: 120 }, () => 0);
      zeroRowWithNulls[0] = null;
      zeroRowWithNulls[1] = 'Y56';
      zeroRowWithNulls[2] = 'R1H';
      zeroRowWithNulls[3] = 'BARTS HEALTH';
      zeroRowWithNulls[4] = 'C_100';
      zeroRowWithNulls[5] = 'General Surgery';
      zeroRowWithNulls[111] = 0; // Total incomplete pathways
      zeroRowWithNulls[113] = null; // % within 18 weeks is blank
      zeroRowWithNulls[114] = '-'; // median is '-'
      zeroRowWithNulls[116] = ''; // 52 plus is empty string

      const mockWb = createMockWorkbook({
        Provider: [...createValidMetadataRows(), header, zeroRowWithNulls],
        'IS Provider': [...createValidMetadataRows(), header],
      });

      const res = await parseEnglandXlsx(mockWb);
      expect(res.rows).toHaveLength(1);
      expect(res.rows[0]?.total).toBe(0);
      expect(res.rows[0]?.within18Proportion).toBe(0);
      expect(res.rows[0]?.median).toBe('suppressed');
      expect(res.rows[0]?.longWait52Plus).toBe(0);
    });

    it('throws ValidationError when filename period does not match metadata period', async () => {
      expect(extractPeriodFromFilename('Incomplete-Provider-Jul26-XLSX-9M-97ylx5.xlsx')).toBe(
        '2026-07-31',
      );
      expect(extractPeriodFromFilename('Incomplete-Provider-Aug26-XLSX-9M.xlsx')).toBe(
        '2026-08-31',
      );

      const filePath = path.join(FIXTURES_DIR, 'Incomplete-Provider-Jul26.xlsx');
      const fileBuffer = await fs.readFile(filePath);

      const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'kyw-england-parse-'));
      const tempPath = path.join(tempDir, 'Incomplete-Provider-Aug26.xlsx');
      await fs.writeFile(tempPath, fileBuffer);
      try {
        await expect(parseEnglandXlsx(tempPath)).rejects.toThrow(ValidationError);
      } finally {
        await fs.rm(tempDir, { recursive: true, force: true });
      }
    });
  });
});
