import { describe, expect, test } from 'vitest';
import { normalizeSpaces, readCsv } from '../../src/io/csv.js';

describe('CSV reader and encoding utilities', () => {
  test('normalizeSpaces converts NBSP characters to standard space', () => {
    const input = 'Hello\u00A0World\u202FTest\u2007End';
    expect(normalizeSpaces(input)).toBe('Hello World Test End');
  });

  test('parses UTF-8 CSV with and without headers', () => {
    const csvContent = `id,name,value\n1,Alpha,100\n2,Beta,200`;

    const withHeaders = readCsv<Record<string, string>>(csvContent, {
      columns: true,
    });
    expect(withHeaders).toEqual([
      { id: '1', name: 'Alpha', value: '100' },
      { id: '2', name: 'Beta', value: '200' },
    ]);

    const withoutHeaders = readCsv<string[]>(csvContent, { columns: false });
    expect(withoutHeaders).toEqual([
      ['id', 'name', 'value'],
      ['1', 'Alpha', '100'],
      ['2', 'Beta', '200'],
    ]);
  });

  test('decodes Windows-1252 buffer and converts 0xA0 (NBSP) to normal space', () => {
    // Construct buffer in Windows-1252 encoding containing byte 0xA0 (non-breaking space)
    // E.g. "NHS", 0xA0, "Trust", 0x2C, "123"
    const bytes = new Uint8Array([
      0x4e, 0x48, 0x53, 0xa0, 0x54, 0x72, 0x75, 0x73, 0x74, 0x2c, 0x31, 0x32, 0x33,
    ]);

    const rows = readCsv<string[]>(bytes, {
      encoding: 'win1252',
      columns: false,
      normalizeNonBreakingSpaces: true,
      trim: true,
    });

    expect(rows).toEqual([['NHS Trust', '123']]);
    expect(rows[0]?.[0]).toBe('NHS Trust');
    expect(rows[0]?.[0]?.charCodeAt(3)).toBe(32); // Standard ASCII space (0x20 = 32)
  });

  test('trims whitespace and handles custom delimiters', () => {
    const pipeDelimited = `  code | description  \n  101  |  Cardiology  `;
    const result = readCsv<Record<string, string>>(pipeDelimited, {
      delimiter: '|',
      columns: true,
      trim: true,
    });

    expect(result).toEqual([{ code: '101', description: 'Cardiology' }]);
  });
});
