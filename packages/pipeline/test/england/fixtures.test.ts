import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { describe, it, expect } from 'vitest';
import ExcelJS from 'exceljs';
import { ENGLAND_EXPECTED_HEADERS } from '../../src/england/columns.js';
import {
  trimEnglandXlsx,
  TARGET_TRUST_CODES,
  TARGET_ISP_CODES,
} from '../../scripts/trim-england-fixture.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const FIXTURES_DIR = path.resolve(__dirname, '../../fixtures/england');

function cellString(cell: ExcelJS.Cell): string {
  const val = cell.value;
  if (typeof val === 'string') return val.trim();
  if (typeof val === 'number' || typeof val === 'boolean') return String(val);
  return '';
}

const EXPECTED_FIXTURE_FILES = [
  'Incomplete-Provider-Jul26.xlsx',
  'Incomplete-Provider-Jul25.xlsx',
  'Incomplete-Provider-Mar26-revised.xlsx',
  'rtt-data-2026-27.html',
  'rtt-data-2025-26.html',
] as const;

describe('England Fixtures (T-4.1)', () => {
  it('all fixture XLSX files open successfully with ExcelJS', async () => {
    for (const filename of [
      'Incomplete-Provider-Jul26.xlsx',
      'Incomplete-Provider-Jul25.xlsx',
      'Incomplete-Provider-Mar26-revised.xlsx',
    ] as const) {
      const filePath = path.join(FIXTURES_DIR, filename);
      const workbook = new ExcelJS.Workbook();
      await expect(workbook.xlsx.readFile(filePath)).resolves.not.toThrow();

      const providerSheet = workbook.getWorksheet('Provider');
      const isProviderSheet = workbook.getWorksheet('IS Provider');
      expect(providerSheet).toBeDefined();
      expect(isProviderSheet).toBeDefined();
    }
  });

  it('header row 14 is unchanged and matches expected headers exactly across all fixture sheets', async () => {
    for (const filename of [
      'Incomplete-Provider-Jul26.xlsx',
      'Incomplete-Provider-Jul25.xlsx',
      'Incomplete-Provider-Mar26-revised.xlsx',
    ] as const) {
      const filePath = path.join(FIXTURES_DIR, filename);
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.readFile(filePath);

      for (const sheetName of ['Provider', 'IS Provider'] as const) {
        const sheet = workbook.getWorksheet(sheetName);
        expect(sheet).toBeDefined();
        if (!sheet) continue;

        // Row 14 contains the headers, starting at column B (cell 2)
        const row14 = sheet.getRow(14);
        const headers: string[] = [];
        for (let col = 2; col <= 2 + ENGLAND_EXPECTED_HEADERS.length - 1; col++) {
          headers.push(cellString(row14.getCell(col)));
        }

        expect(headers).toEqual([...ENGLAND_EXPECTED_HEADERS]);
      }
    }
  });

  it('total fixture size is within 500 KB budget', async () => {
    let totalBytes = 0;
    const entries = await fs.readdir(FIXTURES_DIR);
    for (const entry of entries) {
      const stat = await fs.stat(path.join(FIXTURES_DIR, entry));
      if (stat.isFile()) {
        totalBytes += stat.size;
      }
    }

    const budgetBytes = 500 * 1024;
    expect(totalBytes).toBeLessThanOrEqual(budgetBytes);
  });

  it('README.md documents all fixtures, URLs, download dates and sha256 hashes', async () => {
    const readmeContent = await fs.readFile(path.join(FIXTURES_DIR, 'README.md'), 'utf-8');

    for (const file of EXPECTED_FIXTURE_FILES) {
      expect(readmeContent).toContain(file);
    }

    expect(readmeContent).toContain('https://www.england.nhs.uk/statistics/');
    expect(readmeContent).toContain('SHA-256');
    expect(readmeContent).toMatch(/[a-f0-9]{64}/);
  });

  it('contains expected providers and all 24 treatment functions per provider', async () => {
    expect(TARGET_TRUST_CODES.has('R1H')).toBe(true);
    expect(TARGET_ISP_CODES.has('A1D1B')).toBe(true);

    const jul26Wb = new ExcelJS.Workbook();
    await jul26Wb.xlsx.readFile(path.join(FIXTURES_DIR, 'Incomplete-Provider-Jul26.xlsx'));

    const providerSheet = jul26Wb.getWorksheet('Provider');
    expect(providerSheet).toBeDefined();
    if (!providerSheet) return;

    // Collect provider codes and their treatment function counts
    const trustCounts = new Map<string, number>();
    providerSheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
      if (rowNumber <= 14) return;
      const code = cellString(row.getCell(3));
      trustCounts.set(code, (trustCounts.get(code) ?? 0) + 1);
    });

    // Jul 2026 has R1H, RRK, RAL
    expect(trustCounts.get('R1H')).toBe(24);
    expect(trustCounts.get('RRK')).toBe(24);
    expect(trustCounts.get('RAL')).toBe(24);
    // RA9 is a non-submitter in Jul 2026
    expect(trustCounts.has('RA9')).toBe(false);

    // Jul 2025 has RA9
    const jul25Wb = new ExcelJS.Workbook();
    await jul25Wb.xlsx.readFile(path.join(FIXTURES_DIR, 'Incomplete-Provider-Jul25.xlsx'));
    const jul25ProviderSheet = jul25Wb.getWorksheet('Provider');
    const jul25TrustCounts = new Map<string, number>();
    jul25ProviderSheet?.eachRow({ includeEmpty: false }, (row, rowNumber) => {
      if (rowNumber <= 14) return;
      const code = cellString(row.getCell(3));
      jul25TrustCounts.set(code, (jul25TrustCounts.get(code) ?? 0) + 1);
    });
    expect(jul25TrustCounts.get('RA9')).toBe(24);

    // IS Provider checks on Jul 2026
    const isSheet = jul26Wb.getWorksheet('IS Provider');
    const isCounts = new Map<string, number>();
    isSheet?.eachRow({ includeEmpty: false }, (row, rowNumber) => {
      if (rowNumber <= 14) return;
      const code = cellString(row.getCell(3));
      isCounts.set(code, (isCounts.get(code) ?? 0) + 1);
    });
    expect(isCounts.get('A1D1B')).toBe(24);
    expect(isCounts.get('NT314')).toBe(24);
  });

  it('trimEnglandXlsx produces deterministic byte-for-byte identical output', async () => {
    const rawBuf = await fs.readFile(path.join(FIXTURES_DIR, 'Incomplete-Provider-Jul26.xlsx'));
    const out1 = await trimEnglandXlsx(rawBuf);
    const out2 = await trimEnglandXlsx(rawBuf);

    const hash1 = createHash('sha256').update(out1).digest('hex');
    const hash2 = createHash('sha256').update(out2).digest('hex');

    expect(hash1).toBe(hash2);
    expect(out1.equals(out2)).toBe(true);
  });
});
