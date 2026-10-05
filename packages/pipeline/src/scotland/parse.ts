import { reportingPeriod, type ReportingPeriod } from '@kyw/model/period';
import type { FigureValue } from '@kyw/model/figure';
import { SchemaChangeError } from '../errors.js';
import { readCsv } from '../io/csv.js';
import {
  SCOTLAND_PERFORMANCE_EXPECTED_HEADERS,
  SCOTLAND_PERFORMANCE_COLUMN_OFFSETS,
  SCOTLAND_DISTRIBUTION_EXPECTED_HEADERS,
  SCOTLAND_DISTRIBUTION_COLUMN_OFFSETS,
  SCOTLAND_DISTRIBUTION_BANDS,
  type ScotlandDistributionBand,
  type ScotlandPatientType,
  isScotlandPatientType,
  isScotlandWaitType,
} from './columns.js';
import { decodeQf } from './quality-flags.js';

export interface RawScotlandPerformanceRow {
  readonly monthEnding: string;
  readonly reportingPeriod: ReportingPeriod;
  readonly hbt: string;
  readonly hbtQf: string;
  readonly patientType: ScotlandPatientType;
  readonly waitType: 'Ongoing';
  readonly specialty: string;
  readonly specialtyQf: string;
  readonly waits: FigureValue;
  readonly waitsOver12Weeks: FigureValue;
  readonly waitsOver52Weeks: FigureValue;
  readonly waitsOver78Weeks: FigureValue;
  readonly waitsOver104Weeks: FigureValue;
  readonly median: FigureValue;
  readonly percentile90: FigureValue;
}

export type ScotlandDistributionBands = Readonly<Record<ScotlandDistributionBand, FigureValue>>;

export interface RawScotlandDistributionRow {
  readonly monthEnding: string;
  readonly reportingPeriod: ReportingPeriod;
  readonly hbt: string;
  readonly hbtQf: string;
  readonly patientType: ScotlandPatientType;
  readonly waitType: 'Ongoing';
  readonly specialty: string;
  readonly specialtyQf: string;
  readonly bands: ScotlandDistributionBands;
}

/**
 * Validates and converts an 8-digit Scotland MonthEnding string (`YYYYMMDD`)
 * to a branded ISO `ReportingPeriod` (`YYYY-MM-DD`).
 */
export function parseScotlandMonthEnding(raw: string): {
  readonly monthEnding: string;
  readonly reportingPeriod: ReportingPeriod;
} {
  const trimmed = raw.trim();
  const match = /^(\d{4})(\d{2})(\d{2})$/.exec(trimmed);
  if (!match?.[1] || !match[2] || !match[3]) {
    throw new SchemaChangeError(
      `Invalid Scotland MonthEnding format: "${raw}" (expected YYYYMMDD)`,
      { monthEnding: raw },
    );
  }

  const year = match[1];
  const month = match[2];
  const day = match[3];
  const iso = `${year}-${month}-${day}`;

  try {
    return {
      monthEnding: trimmed,
      reportingPeriod: reportingPeriod(iso),
    };
  } catch (error) {
    throw new SchemaChangeError(
      `Invalid calendar date in Scotland MonthEnding: "${raw}" (${iso})`,
      {
        monthEnding: raw,
        iso,
        error: error instanceof Error ? error.message : String(error),
      },
    );
  }
}

function validateHeaders(
  actualHeaders: readonly string[],
  expectedHeaders: readonly string[],
  fileDescription: string,
): void {
  if (actualHeaders.length !== expectedHeaders.length) {
    throw new SchemaChangeError(
      `Scotland ${fileDescription} CSV header column count mismatch: expected ${String(expectedHeaders.length)}, got ${String(actualHeaders.length)}`,
      {
        fileDescription,
        expectedColumnCount: expectedHeaders.length,
        actualColumnCount: actualHeaders.length,
        actualHeaders,
      },
    );
  }

  const mismatches: { index: number; expected: string; actual: string }[] = [];
  for (let i = 0; i < expectedHeaders.length; i++) {
    const expected = expectedHeaders[i] ?? '';
    const actual = actualHeaders[i];
    if (actual !== expected) {
      mismatches.push({ index: i, expected, actual: actual ?? '' });
    }
  }

  if (mismatches.length > 0) {
    throw new SchemaChangeError(
      `Scotland ${fileDescription} CSV headers do not match specification (${String(mismatches.length)} mismatches)`,
      {
        fileDescription,
        mismatches,
      },
    );
  }
}

/**
 * Parses raw CSV string or buffer from Scotland Ongoing and Completed Waits – Monthly
 * (resource `ac63b747-fdcc-410c-ae43-de6fe3c46abf`).
 *
 * Filters output rows strictly to `WaitType = 'Ongoing'`.
 *
 * Throws `SchemaChangeError` on header mismatch, column count mismatch, unknown `PatientType`,
 * or unknown `WaitType`.
 */
export function parseScotlandPerformanceCsv(
  input: string | Buffer | Uint8Array,
): readonly RawScotlandPerformanceRow[] {
  let rows: string[][];
  try {
    rows = readCsv<string[]>(input, {
      columns: false,
      trim: true,
      skipEmptyLines: true,
      relaxColumnCount: true,
    });
  } catch (error) {
    throw new SchemaChangeError('Failed to parse Scotland Ongoing and Completed Waits CSV', {
      error: error instanceof Error ? error.message : String(error),
    });
  }

  if (rows.length === 0) {
    throw new SchemaChangeError('Scotland Ongoing and Completed Waits CSV is empty');
  }

  const headerRow = rows[0];
  if (!headerRow) {
    throw new SchemaChangeError('Scotland Ongoing and Completed Waits CSV has no header row');
  }

  validateHeaders(
    headerRow,
    SCOTLAND_PERFORMANCE_EXPECTED_HEADERS,
    'Ongoing and Completed Waits (ac63b747)',
  );

  const results: RawScotlandPerformanceRow[] = [];

  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    if (!row || row.length === 0) continue;

    if (row.length !== SCOTLAND_PERFORMANCE_EXPECTED_HEADERS.length) {
      throw new SchemaChangeError(
        `Scotland Ongoing and Completed Waits CSV row ${String(r + 1)} has ${String(row.length)} columns, expected ${String(SCOTLAND_PERFORMANCE_EXPECTED_HEADERS.length)}`,
        { row: r + 1, columnCount: row.length },
      );
    }

    const rawWaitType = row[SCOTLAND_PERFORMANCE_COLUMN_OFFSETS.WAIT_TYPE] ?? '';
    if (!isScotlandWaitType(rawWaitType)) {
      throw new SchemaChangeError(
        `Unknown Scotland WaitType "${rawWaitType}" at row ${String(r + 1)}`,
        { row: r + 1, waitType: rawWaitType },
      );
    }

    // Filter strictly to Ongoing waits (ADR-0002)
    if (rawWaitType === 'Completed') {
      continue;
    }

    const rawPatientType = row[SCOTLAND_PERFORMANCE_COLUMN_OFFSETS.PATIENT_TYPE] ?? '';
    if (!isScotlandPatientType(rawPatientType)) {
      throw new SchemaChangeError(
        `Unknown Scotland PatientType "${rawPatientType}" at row ${String(r + 1)}`,
        { row: r + 1, patientType: rawPatientType },
      );
    }

    const rawMonthEnding = row[SCOTLAND_PERFORMANCE_COLUMN_OFFSETS.MONTH_ENDING] ?? '';
    const { monthEnding, reportingPeriod } = parseScotlandMonthEnding(rawMonthEnding);

    const hbt = row[SCOTLAND_PERFORMANCE_COLUMN_OFFSETS.HBT]?.trim() ?? '';
    if (!hbt) {
      throw new SchemaChangeError(`Missing HBT code at row ${String(r + 1)}`, { row: r + 1 });
    }

    const specialty = row[SCOTLAND_PERFORMANCE_COLUMN_OFFSETS.SPECIALTY]?.trim() ?? '';
    if (!specialty) {
      throw new SchemaChangeError(`Missing Specialty code at row ${String(r + 1)}`, {
        row: r + 1,
      });
    }

    const hbtQf = row[SCOTLAND_PERFORMANCE_COLUMN_OFFSETS.HBT_QF] ?? '';
    const specialtyQf = row[SCOTLAND_PERFORMANCE_COLUMN_OFFSETS.SPECIALTY_QF] ?? '';

    const waits = decodeQf(
      row[SCOTLAND_PERFORMANCE_COLUMN_OFFSETS.WAITS_QF],
      row[SCOTLAND_PERFORMANCE_COLUMN_OFFSETS.WAITS],
    );
    const waitsOver12Weeks = decodeQf(
      row[SCOTLAND_PERFORMANCE_COLUMN_OFFSETS.WAITS_OVER_12_WEEKS_QF],
      row[SCOTLAND_PERFORMANCE_COLUMN_OFFSETS.WAITS_OVER_12_WEEKS],
    );
    const waitsOver52Weeks = decodeQf(
      row[SCOTLAND_PERFORMANCE_COLUMN_OFFSETS.WAITS_OVER_52_WEEKS_QF],
      row[SCOTLAND_PERFORMANCE_COLUMN_OFFSETS.WAITS_OVER_52_WEEKS],
    );
    const waitsOver78Weeks = decodeQf(
      row[SCOTLAND_PERFORMANCE_COLUMN_OFFSETS.WAITS_OVER_78_WEEKS_QF],
      row[SCOTLAND_PERFORMANCE_COLUMN_OFFSETS.WAITS_OVER_78_WEEKS],
    );
    const waitsOver104Weeks = decodeQf(
      row[SCOTLAND_PERFORMANCE_COLUMN_OFFSETS.WAITS_OVER_104_WEEKS_QF],
      row[SCOTLAND_PERFORMANCE_COLUMN_OFFSETS.WAITS_OVER_104_WEEKS],
    );
    const median = decodeQf(
      row[SCOTLAND_PERFORMANCE_COLUMN_OFFSETS.MEDIAN_QF],
      row[SCOTLAND_PERFORMANCE_COLUMN_OFFSETS.MEDIAN],
    );
    const percentile90 = decodeQf(
      row[SCOTLAND_PERFORMANCE_COLUMN_OFFSETS.PERCENTILE_90_QF],
      row[SCOTLAND_PERFORMANCE_COLUMN_OFFSETS.PERCENTILE_90],
    );

    results.push({
      monthEnding,
      reportingPeriod,
      hbt,
      hbtQf,
      patientType: rawPatientType,
      waitType: 'Ongoing',
      specialty,
      specialtyQf,
      waits,
      waitsOver12Weeks,
      waitsOver52Weeks,
      waitsOver78Weeks,
      waitsOver104Weeks,
      median,
      percentile90,
    });
  }

  return results;
}

/**
 * Parses raw CSV string or buffer from Scotland Distribution of Ongoing and Completed Waits – Monthly
 * (resource `f9232c17-a90e-4d35-a863-11bdb3a748c0`).
 *
 * Filters output rows strictly to `WaitType = 'Ongoing'`.
 *
 * Throws `SchemaChangeError` on header mismatch, column count mismatch, unknown `PatientType`,
 * or unknown `WaitType`.
 */
export function parseScotlandDistributionCsv(
  input: string | Buffer | Uint8Array,
): readonly RawScotlandDistributionRow[] {
  let rows: string[][];
  try {
    rows = readCsv<string[]>(input, {
      columns: false,
      trim: true,
      skipEmptyLines: true,
      relaxColumnCount: true,
    });
  } catch (error) {
    throw new SchemaChangeError('Failed to parse Scotland Distribution CSV', {
      error: error instanceof Error ? error.message : String(error),
    });
  }

  if (rows.length === 0) {
    throw new SchemaChangeError('Scotland Distribution CSV is empty');
  }

  const headerRow = rows[0];
  if (!headerRow) {
    throw new SchemaChangeError('Scotland Distribution CSV has no header row');
  }

  validateHeaders(headerRow, SCOTLAND_DISTRIBUTION_EXPECTED_HEADERS, 'Distribution (f9232c17)');

  const results: RawScotlandDistributionRow[] = [];

  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    if (!row || row.length === 0) continue;

    if (row.length !== SCOTLAND_DISTRIBUTION_EXPECTED_HEADERS.length) {
      throw new SchemaChangeError(
        `Scotland Distribution CSV row ${String(r + 1)} has ${String(row.length)} columns, expected ${String(SCOTLAND_DISTRIBUTION_EXPECTED_HEADERS.length)}`,
        { row: r + 1, columnCount: row.length },
      );
    }

    const rawWaitType = row[SCOTLAND_DISTRIBUTION_COLUMN_OFFSETS.WAIT_TYPE] ?? '';
    if (!isScotlandWaitType(rawWaitType)) {
      throw new SchemaChangeError(
        `Unknown Scotland WaitType "${rawWaitType}" at row ${String(r + 1)}`,
        { row: r + 1, waitType: rawWaitType },
      );
    }

    // Filter strictly to Ongoing waits (ADR-0002)
    if (rawWaitType === 'Completed') {
      continue;
    }

    const rawPatientType = row[SCOTLAND_DISTRIBUTION_COLUMN_OFFSETS.PATIENT_TYPE] ?? '';
    if (!isScotlandPatientType(rawPatientType)) {
      throw new SchemaChangeError(
        `Unknown Scotland PatientType "${rawPatientType}" at row ${String(r + 1)}`,
        { row: r + 1, patientType: rawPatientType },
      );
    }

    const rawMonthEnding = row[SCOTLAND_DISTRIBUTION_COLUMN_OFFSETS.MONTH_ENDING] ?? '';
    const { monthEnding, reportingPeriod } = parseScotlandMonthEnding(rawMonthEnding);

    const hbt = row[SCOTLAND_DISTRIBUTION_COLUMN_OFFSETS.HBT]?.trim() ?? '';
    if (!hbt) {
      throw new SchemaChangeError(`Missing HBT code at row ${String(r + 1)}`, { row: r + 1 });
    }

    const specialty = row[SCOTLAND_DISTRIBUTION_COLUMN_OFFSETS.SPECIALTY]?.trim() ?? '';
    if (!specialty) {
      throw new SchemaChangeError(`Missing Specialty code at row ${String(r + 1)}`, {
        row: r + 1,
      });
    }

    const hbtQf = row[SCOTLAND_DISTRIBUTION_COLUMN_OFFSETS.HBT_QF] ?? '';
    const specialtyQf = row[SCOTLAND_DISTRIBUTION_COLUMN_OFFSETS.SPECIALTY_QF] ?? '';

    const bandsRecord = {} as Record<ScotlandDistributionBand, FigureValue>;

    for (let b = 0; b < SCOTLAND_DISTRIBUTION_BANDS.length; b++) {
      const bandName = SCOTLAND_DISTRIBUTION_BANDS[b];
      if (!bandName) continue;

      const valueOffset = SCOTLAND_DISTRIBUTION_COLUMN_OFFSETS.BANDS_START + b * 2;
      const qfOffset = valueOffset + 1;

      const bandValue = decodeQf(row[qfOffset], row[valueOffset]);
      bandsRecord[bandName] = bandValue;
    }

    results.push({
      monthEnding,
      reportingPeriod,
      hbt,
      hbtQf,
      patientType: rawPatientType,
      waitType: 'Ongoing',
      specialty,
      specialtyQf,
      bands: bandsRecord,
    });
  }

  return results;
}
