import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import ExcelJS from 'exceljs';
import { describe, expect, test } from 'vitest';
import { normalizeCellValue, readXlsx } from '../../src/io/xlsx.js';

describe('XLSX reader and formula cached result resolution', () => {
  test('normalizeCellValue extracts cached result from formula object', () => {
    const formulaVal = {
      formula: 'SUM(A1:A5)',
      result: 42,
    };
    expect(normalizeCellValue(formulaVal as ExcelJS.CellValue)).toBe(42);

    const stringFormulaVal = {
      formula: 'CONCATENATE("A", "B")',
      result: '  AB  ',
    };
    expect(normalizeCellValue(stringFormulaVal as ExcelJS.CellValue, { trim: true })).toBe('AB');
  });

  test('normalizeCellValue handles rich text, hyperlinks, dates and nulls', () => {
    const richTextVal = {
      richText: [{ text: 'Royal ' }, { text: 'Free' }],
    };
    expect(normalizeCellValue(richTextVal as ExcelJS.CellValue)).toBe('Royal Free');

    const hyperlinkVal = {
      text: 'NHS England',
      hyperlink: 'https://www.england.nhs.uk',
    };
    expect(normalizeCellValue(hyperlinkVal as ExcelJS.CellValue)).toBe('NHS England');

    expect(normalizeCellValue(null)).toBeNull();
    expect(normalizeCellValue(undefined)).toBeNull();

    const d = new Date('2026-07-31T00:00:00Z');
    expect(normalizeCellValue(d)).toEqual(d);
  });

  test('readXlsx reads workbook buffer and extracts formula cached results', async () => {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Provider');

    // Row 1: Headers
    sheet.addRow(['Code', 'Name', 'Total', 'CalculatedTotal']);

    // Row 2: Data
    const row2 = sheet.addRow(['R1H', 'Barts Health NHS Trust', 150, null]);
    // Set formula with cached result on cell D2
    const cellD2 = row2.getCell(4);
    cellD2.value = {
      formula: 'C2 * 2',
      result: 300,
    };

    const buffer = await workbook.xlsx.writeBuffer();
    const parsed = await readXlsx(Buffer.from(buffer));

    expect(parsed.sheetNames).toEqual(['Provider']);
    const providerSheet = parsed.getSheet('Provider');
    expect(providerSheet).toBeDefined();
    expect(providerSheet?.rowCount).toBe(2);

    const rows = parsed.getSheetRows('Provider');
    expect(rows[0]).toEqual(['Code', 'Name', 'Total', 'CalculatedTotal']);
    expect(rows[1]).toEqual(['R1H', 'Barts Health NHS Trust', 150, 300]);
    // Assert the 4th column is indeed 300 (cached formula result)
    expect(rows[1]?.[3]).toBe(300);
  });

  test('readXlsx reads workbook from file path', async () => {
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'kyw-xlsx-test-'));
    const filePath = path.join(tmpDir, 'test.xlsx');

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Summary');
    sheet.addRow(['Metric', 'Value']);
    sheet.addRow(['Median', 12.4]);

    await workbook.xlsx.writeFile(filePath);

    const parsed = await readXlsx(filePath);
    expect(parsed.sheetNames).toEqual(['Summary']);
    expect(parsed.getSheetRows('Summary')).toEqual([
      ['Metric', 'Value'],
      ['Median', 12.4],
    ]);

    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  test('readXlsx returns cached formula results from committed fixture file', async () => {
    const fixturePath = path.resolve(__dirname, '../../fixtures/io/formula-test.xlsx');
    const parsed = await readXlsx(fixturePath);

    expect(parsed.sheetNames).toContain('FormulaTest');
    const rows = parsed.getSheetRows('FormulaTest');
    expect(rows[0]).toEqual(['A', 'B', 'Sum']);
    expect(rows[1]).toEqual([10, 20, 30]);
    expect(rows[1]?.[2]).toBe(30);
  });
});
