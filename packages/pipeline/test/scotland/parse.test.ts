import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';
import { SchemaChangeError } from '../../src/errors.js';
import { decodeQf } from '../../src/scotland/quality-flags.js';
import {
  parseScotlandMonthEnding,
  parseScotlandPerformanceCsv,
  parseScotlandDistributionCsv,
} from '../../src/scotland/parse.js';
import {
  SCOTLAND_PERFORMANCE_EXPECTED_HEADERS,
  SCOTLAND_DISTRIBUTION_EXPECTED_HEADERS,
  SCOTLAND_DISTRIBUTION_BANDS,
} from '../../src/scotland/columns.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const FIXTURES_DIR = path.resolve(__dirname, '../../fixtures/scotland/stage-of-treatment');

describe('Scotland Quality Flags decoder (decodeQf)', () => {
  it('decodes empty flag with numeric value as published and non-provisional', () => {
    const result = decodeQf('', '447');
    expect(result).toEqual({
      status: 'published',
      value: 447,
      provisional: false,
    });
  });

  it('decodes null or undefined flag with numeric value as published', () => {
    expect(decodeQf(null, '120')).toEqual({
      status: 'published',
      value: 120,
      provisional: false,
    });
    expect(decodeQf(undefined, 85)).toEqual({
      status: 'published',
      value: 85,
      provisional: false,
    });
  });

  it('decodes "d" (derived aggregate) total as published and non-provisional', () => {
    const result = decodeQf('d', '107926');
    expect(result).toEqual({
      status: 'published',
      value: 107926,
      provisional: false,
    });
  });

  it('decodes "p" (provisional) with numeric value as published with provisional: true', () => {
    const result = decodeQf('p', '5432');
    expect(result).toEqual({
      status: 'published',
      value: 5432,
      provisional: true,
    });
  });

  it('decodes ":" (not available / withheld) median as suppressed', () => {
    const resultEmptyVal = decodeQf(':', '');
    expect(resultEmptyVal).toEqual({
      status: 'suppressed',
      provisional: false,
    });

    const resultColonVal = decodeQf(':', ':');
    expect(resultColonVal).toEqual({
      status: 'suppressed',
      provisional: false,
    });

    // Even if a numeric string is accompanied by ':', it is suppressed
    const resultNumVal = decodeQf(':', '5');
    expect(resultNumVal).toEqual({
      status: 'suppressed',
      provisional: false,
    });
  });

  it('decodes ":u" (not available, low reliability) as suppressed', () => {
    const result = decodeQf(':u', '');
    expect(result).toEqual({
      status: 'suppressed',
      provisional: false,
    });
  });

  it('decodes "e" (estimate) as suppressed per ADR-0005', () => {
    const result = decodeQf('e', '588073');
    expect(result).toEqual({
      status: 'suppressed',
      provisional: false,
    });
  });

  it('decodes "c", "u", "x", "y", "z", "~", "b", "r" qualifiers as suppressed', () => {
    const qualifiers = ['c', 'u', 'x', 'y', 'z', '~', 'b', 'r'];
    for (const qf of qualifiers) {
      expect(decodeQf(qf, '100')).toEqual({
        status: 'suppressed',
        provisional: false,
      });
    }
  });

  it('decodes empty or non-numeric raw value as suppressed', () => {
    expect(decodeQf('', '')).toEqual({
      status: 'suppressed',
      provisional: false,
    });
    expect(decodeQf('', '   ')).toEqual({
      status: 'suppressed',
      provisional: false,
    });
    expect(decodeQf('', '-')).toEqual({
      status: 'suppressed',
      provisional: false,
    });
    expect(decodeQf('', 'N/A')).toEqual({
      status: 'suppressed',
      provisional: false,
    });
    expect(decodeQf('d', '')).toEqual({
      status: 'suppressed',
      provisional: false,
    });
    expect(decodeQf('p', '')).toEqual({
      status: 'suppressed',
      provisional: true,
    });
  });

  it('parses decimal medians correctly', () => {
    const result = decodeQf('', '494.4');
    expect(result).toEqual({
      status: 'published',
      value: 494.4,
      provisional: false,
    });
  });
});

describe('Scotland MonthEnding date helper (parseScotlandMonthEnding)', () => {
  it('parses valid YYYYMMDD into ReportingPeriod', () => {
    const parsed = parseScotlandMonthEnding('20260831');
    expect(parsed.monthEnding).toBe('20260831');
    expect(parsed.reportingPeriod).toBe('2026-08-31');
  });

  it('throws SchemaChangeError on invalid format', () => {
    expect(() => parseScotlandMonthEnding('2026-08-31')).toThrow(SchemaChangeError);
    expect(() => parseScotlandMonthEnding('202608')).toThrow(SchemaChangeError);
    expect(() => parseScotlandMonthEnding('invalid')).toThrow(SchemaChangeError);
  });

  it('throws SchemaChangeError on invalid calendar date', () => {
    // 31st of September does not exist
    expect(() => parseScotlandMonthEnding('20260931')).toThrow(SchemaChangeError);
  });
});

describe('Scotland Performance CSV parser (parseScotlandPerformanceCsv)', () => {
  it('parses real committed fixture correctly and filters strictly to Ongoing rows', async () => {
    const csv = await fs.readFile(path.join(FIXTURES_DIR, 'ac63b747-data.csv'), 'utf-8');
    const rows = parseScotlandPerformanceCsv(csv);

    expect(rows.length).toBeGreaterThan(0);

    // Every returned row must be 'Ongoing'
    for (const row of rows) {
      expect(row.waitType).toBe('Ongoing');
    }

    // Verify Lothian (S08000024) New Outpatient All Specialties (Z9) for 20260831
    const lothianAug26 = rows.find(
      (r) =>
        r.hbt === 'S08000024' &&
        r.patientType === 'New Outpatient' &&
        r.specialty === 'Z9' &&
        r.monthEnding === '20260831',
    );
    expect(lothianAug26).toBeDefined();
    expect(lothianAug26?.reportingPeriod).toBe('2026-08-31');
    expect(lothianAug26?.waits).toEqual({
      status: 'published',
      value: 79598,
      provisional: false,
    });
    expect(lothianAug26?.waitsOver52Weeks).toEqual({
      status: 'published',
      value: 3188,
      provisional: false,
    });
    expect(lothianAug26?.median).toEqual({
      status: 'published',
      value: 88,
      provisional: false,
    });

    // Verify Golden Jubilee (SB0801) is present
    const goldenJubilee = rows.find((r) => r.hbt === 'SB0801');
    expect(goldenJubilee).toBeDefined();

    // Verify suppressed row: Lothian (S08000024) Inpatient/Day case G1 row has :u
    const suppressedRow = rows.find(
      (r) => r.hbt === 'S08000024' && r.specialty === 'G1' && r.median.status === 'suppressed',
    );
    expect(suppressedRow).toBeDefined();
    expect(suppressedRow?.median).toEqual({
      status: 'suppressed',
      provisional: false,
    });
    expect(suppressedRow?.waits).toEqual({
      status: 'suppressed',
      provisional: false,
    });
  });

  it('decodes "d" quality flag on Scotland aggregate total (S92000003) as published', async () => {
    const csv = await fs.readFile(path.join(FIXTURES_DIR, 'ac63b747-data.csv'), 'utf-8');
    const rows = parseScotlandPerformanceCsv(csv);

    const scotlandRow = rows.find(
      (r) =>
        r.hbt === 'S92000003' &&
        r.specialty === 'Z9' &&
        r.monthEnding === '20260831' &&
        r.patientType === 'New Outpatient',
    );

    expect(scotlandRow).toBeDefined();
    expect(scotlandRow?.hbtQf).toBe('d');
    expect(scotlandRow?.specialtyQf).toBe('d');
    expect(scotlandRow?.waits.status).toBe('published');
    expect(scotlandRow?.waitsOver52Weeks.status).toBe('published');
  });

  it('throws SchemaChangeError when header columns differ', () => {
    const mutatedHeaders: string[] = [...SCOTLAND_PERFORMANCE_EXPECTED_HEADERS];
    mutatedHeaders[17] = 'AverageWait'; // Renamed Median column

    const badCsv = `${mutatedHeaders.map((h) => `"${h}"`).join(',')}\n20260831,"S08000024",,"New Outpatient","Ongoing","Z9","d",100,,10,,1,,0,,0,,45,,100,`;

    expect(() => parseScotlandPerformanceCsv(badCsv)).toThrow(SchemaChangeError);
    expect(() => parseScotlandPerformanceCsv(badCsv)).toThrow(/do not match specification/);
  });

  it('throws SchemaChangeError when column count differs', () => {
    const truncatedHeaders = SCOTLAND_PERFORMANCE_EXPECTED_HEADERS.slice(0, 15);
    const badCsv = `${truncatedHeaders.map((h) => `"${h}"`).join(',')}\n20260831,"S08000024",,"New Outpatient","Ongoing","Z9","d",100,,10,,1,,0,,0,`;

    expect(() => parseScotlandPerformanceCsv(badCsv)).toThrow(SchemaChangeError);
    expect(() => parseScotlandPerformanceCsv(badCsv)).toThrow(/column count mismatch/);
  });

  it('throws SchemaChangeError when row column count differs from header', () => {
    const headerLine = SCOTLAND_PERFORMANCE_EXPECTED_HEADERS.map((h) => `"${h}"`).join(',');
    const badRow = '20260831,"S08000024"';
    const badCsv = `${headerLine}\n${badRow}`;

    expect(() => parseScotlandPerformanceCsv(badCsv)).toThrow(SchemaChangeError);
    expect(() => parseScotlandPerformanceCsv(badCsv)).toThrow(/has 2 columns, expected 21/);
  });

  it('throws SchemaChangeError on unknown PatientType', () => {
    const headerLine = SCOTLAND_PERFORMANCE_EXPECTED_HEADERS.map((h) => `"${h}"`).join(',');
    const badRow =
      '20260831,"S08000024",,"Day Case Only","Ongoing","Z9","d",100,,10,,1,,0,,0,,45,,100,';
    const badCsv = `${headerLine}\n${badRow}`;

    expect(() => parseScotlandPerformanceCsv(badCsv)).toThrow(SchemaChangeError);
    expect(() => parseScotlandPerformanceCsv(badCsv)).toThrow(/Unknown Scotland PatientType/);
  });

  it('throws SchemaChangeError on unknown WaitType', () => {
    const headerLine = SCOTLAND_PERFORMANCE_EXPECTED_HEADERS.map((h) => `"${h}"`).join(',');
    const badRow =
      '20260831,"S08000024",,"New Outpatient","Planned","Z9","d",100,,10,,1,,0,,0,,45,,100,';
    const badCsv = `${headerLine}\n${badRow}`;

    expect(() => parseScotlandPerformanceCsv(badCsv)).toThrow(SchemaChangeError);
    expect(() => parseScotlandPerformanceCsv(badCsv)).toThrow(/Unknown Scotland WaitType/);
  });

  it('throws SchemaChangeError on missing HBT code', () => {
    const headerLine = SCOTLAND_PERFORMANCE_EXPECTED_HEADERS.map((h) => `"${h}"`).join(',');
    const badRow = '20260831,"",,"New Outpatient","Ongoing","Z9","d",100,,10,,1,,0,,0,,45,,100,';
    const badCsv = `${headerLine}\n${badRow}`;

    expect(() => parseScotlandPerformanceCsv(badCsv)).toThrow(SchemaChangeError);
    expect(() => parseScotlandPerformanceCsv(badCsv)).toThrow(/Missing HBT code/);
  });

  it('throws SchemaChangeError on empty input', () => {
    expect(() => parseScotlandPerformanceCsv('')).toThrow(SchemaChangeError);
  });
});

describe('Scotland Distribution CSV parser (parseScotlandDistributionCsv)', () => {
  it('parses real committed fixture correctly and filters strictly to Ongoing rows', async () => {
    const csv = await fs.readFile(path.join(FIXTURES_DIR, 'f9232c17-data.csv'), 'utf-8');
    const rows = parseScotlandDistributionCsv(csv);

    expect(rows.length).toBeGreaterThan(0);

    // Every returned row must be 'Ongoing'
    for (const row of rows) {
      expect(row.waitType).toBe('Ongoing');
    }

    // Verify Lothian (S08000024) New Outpatient All Specialties (Z9) for 20260831
    const lothianAug26 = rows.find(
      (r) =>
        r.hbt === 'S08000024' &&
        r.patientType === 'New Outpatient' &&
        r.specialty === 'Z9' &&
        r.monthEnding === '20260831',
    );

    expect(lothianAug26).toBeDefined();
    expect(lothianAug26?.reportingPeriod).toBe('2026-08-31');

    // Verify all 22 bands exist on the row
    for (const band of SCOTLAND_DISTRIBUTION_BANDS) {
      expect(lothianAug26?.bands[band]).toBeDefined();
    }

    // Verify LessThan4WeekWait is published
    expect(lothianAug26?.bands.LessThan4WeekWait).toEqual({
      status: 'published',
      value: 18280,
      provisional: false,
    });

    // Verify 4To8WeekWait
    expect(lothianAug26?.bands['4To8WeekWait']).toEqual({
      status: 'published',
      value: 11303,
      provisional: false,
    });

    // Verify 8To12WeekWait
    expect(lothianAug26?.bands['8To12WeekWait']).toEqual({
      status: 'published',
      value: 9456,
      provisional: false,
    });
  });

  it('decodes suppressed bands correctly in distribution fixture', async () => {
    const csv = await fs.readFile(path.join(FIXTURES_DIR, 'f9232c17-data.csv'), 'utf-8');
    const rows = parseScotlandDistributionCsv(csv);

    // Lothian (S08000024) has a row for Inpatient/Day case G1 where bands are marked :u (suppressed)
    const lothianG1Row = rows.find((r) => r.hbt === 'S08000024' && r.specialty === 'G1');

    expect(lothianG1Row).toBeDefined();
    expect(lothianG1Row?.bands.LessThan4WeekWait.status).toBe('suppressed');
  });

  it('throws SchemaChangeError when distribution header differs', () => {
    const mutatedHeaders = [...SCOTLAND_DISTRIBUTION_EXPECTED_HEADERS];
    mutatedHeaders[7] = 'Under4Weeks'; // Modified band name

    const badCsv = `${mutatedHeaders.map((h) => `"${h}"`).join(',')}\n`;
    expect(() => parseScotlandDistributionCsv(badCsv)).toThrow(SchemaChangeError);
  });

  it('throws SchemaChangeError when distribution row length mismatch occurs', () => {
    const headerLine = SCOTLAND_DISTRIBUTION_EXPECTED_HEADERS.map((h) => `"${h}"`).join(',');
    const badRow = '20260831,"S08000024",,"New Outpatient","Ongoing","Z9","d",100'; // Missing remaining bands
    const badCsv = `${headerLine}\n${badRow}`;

    expect(() => parseScotlandDistributionCsv(badCsv)).toThrow(SchemaChangeError);
  });

  it('throws SchemaChangeError on unknown PatientType in distribution CSV', () => {
    const headerLine = SCOTLAND_DISTRIBUTION_EXPECTED_HEADERS.map((h) => `"${h}"`).join(',');
    const dummyBands = Array.from({ length: 44 }, () => '').join(',');
    const badRow = `20260831,"S08000024",,"Emergency","Ongoing","Z9","d",${dummyBands}`;
    const badCsv = `${headerLine}\n${badRow}`;

    expect(() => parseScotlandDistributionCsv(badCsv)).toThrow(SchemaChangeError);
  });
});
