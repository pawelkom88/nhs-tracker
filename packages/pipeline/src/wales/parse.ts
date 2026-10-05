import { SchemaChangeError } from '../errors.js';
import { readCsv } from '../io/csv.js';
import {
  type WalesDatasetKind,
  resolveWalesDatasetKind,
  WALES_KEY_MEASURES_EXPECTED_HEADERS,
  WALES_KEY_MEASURES_COLUMN_OFFSETS,
  WALES_KEY_MEASURES_EXPECTED_MEASURE_CODES,
  WALES_THRESHOLD_COUNTS_EXPECTED_HEADERS,
  WALES_THRESHOLD_COUNTS_COLUMN_OFFSETS,
  WALES_THRESHOLD_COUNTS_EXPECTED_MEASURE_CODES,
} from './columns.js';

export interface RawWalesValue {
  readonly dataset: WalesDatasetKind;
  readonly dateCode: string;
  readonly boardOnsCode: string;
  readonly specialtyCode: string;
  readonly measureCode: string;
  readonly value: number;
}

function validateHeaders(
  actualHeaders: readonly string[],
  expectedHeaders: readonly string[],
  datasetKind: WalesDatasetKind,
): void {
  if (actualHeaders.length !== expectedHeaders.length) {
    throw new SchemaChangeError(
      `Wales ${datasetKind} CSV header column count mismatch: expected ${String(expectedHeaders.length)}, got ${String(actualHeaders.length)}`,
      {
        datasetKind,
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
      `Wales ${datasetKind} CSV headers do not match specification (${String(mismatches.length)} mismatches)`,
      {
        datasetKind,
        mismatches,
      },
    );
  }
}

/**
 * Parses raw CSV string or buffer from Wales Key Measures dataset (`acd9529c`).
 */
export function parseWalesKeyMeasuresCsv(
  input: string | Buffer | Uint8Array,
): readonly RawWalesValue[] {
  const rows = readCsv<string[]>(input, {
    columns: false,
    trim: true,
    skipEmptyLines: true,
    relaxColumnCount: false,
  });

  if (rows.length === 0) {
    throw new SchemaChangeError('Wales Key Measures CSV is empty');
  }

  const headerRow = rows[0];
  if (!headerRow) {
    throw new SchemaChangeError('Wales Key Measures CSV has no header row');
  }

  validateHeaders(headerRow, WALES_KEY_MEASURES_EXPECTED_HEADERS, 'key_measures');

  const validMeasureCodes = new Set<string>(WALES_KEY_MEASURES_EXPECTED_MEASURE_CODES);
  const results: RawWalesValue[] = [];

  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    if (!row || row.length === 0) continue;

    if (row.length !== WALES_KEY_MEASURES_EXPECTED_HEADERS.length) {
      throw new SchemaChangeError(
        `Wales Key Measures CSV row ${String(r + 1)} has ${String(row.length)} columns, expected ${String(WALES_KEY_MEASURES_EXPECTED_HEADERS.length)}`,
        { row: r + 1, columnCount: row.length },
      );
    }

    const rawValue = row[WALES_KEY_MEASURES_COLUMN_OFFSETS.DATA_VALUE];
    const measureCode = row[WALES_KEY_MEASURES_COLUMN_OFFSETS.DATA_DESCRIPTION_REFERENCE];
    const dateCode = row[WALES_KEY_MEASURES_COLUMN_OFFSETS.DATE_REFERENCE];
    const boardOnsCode = row[WALES_KEY_MEASURES_COLUMN_OFFSETS.BOARD_REFERENCE];
    const specialtyCode = row[WALES_KEY_MEASURES_COLUMN_OFFSETS.SPECIALTY_REFERENCE];

    if (rawValue === undefined || rawValue === '') {
      throw new SchemaChangeError(
        `Wales Key Measures CSV row ${String(r + 1)} missing data value`,
        { row: r + 1 },
      );
    }

    const numericValue = Number(rawValue);
    if (!Number.isFinite(numericValue)) {
      throw new SchemaChangeError(
        `Wales Key Measures CSV row ${String(r + 1)} has non-numeric data value: "${rawValue}"`,
        { row: r + 1, rawValue },
      );
    }

    if (!measureCode || !validMeasureCodes.has(measureCode)) {
      throw new SchemaChangeError(
        `Wales Key Measures CSV row ${String(r + 1)} has unknown MeasureCode: "${String(measureCode)}"`,
        { row: r + 1, measureCode },
      );
    }

    if (!dateCode || !/^\d{6}$/.test(dateCode)) {
      throw new SchemaChangeError(
        `Wales Key Measures CSV row ${String(r + 1)} has invalid Date_reference format: "${String(dateCode)}"`,
        { row: r + 1, dateCode },
      );
    }

    if (!boardOnsCode) {
      throw new SchemaChangeError(
        `Wales Key Measures CSV row ${String(r + 1)} has empty board reference code`,
        { row: r + 1 },
      );
    }

    if (!specialtyCode) {
      throw new SchemaChangeError(
        `Wales Key Measures CSV row ${String(r + 1)} has empty specialty reference code`,
        { row: r + 1 },
      );
    }

    results.push({
      dataset: 'key_measures',
      dateCode,
      boardOnsCode,
      specialtyCode,
      measureCode,
      value: numericValue,
    });
  }

  return results;
}

/**
 * Parses raw CSV string or buffer from Wales Threshold Counts dataset (`3ef3a1d8`).
 */
export function parseWalesThresholdCountsCsv(
  input: string | Buffer | Uint8Array,
): readonly RawWalesValue[] {
  const rows = readCsv<string[]>(input, {
    columns: false,
    trim: true,
    skipEmptyLines: true,
    relaxColumnCount: false,
  });

  if (rows.length === 0) {
    throw new SchemaChangeError('Wales Threshold Counts CSV is empty');
  }

  const headerRow = rows[0];
  if (!headerRow) {
    throw new SchemaChangeError('Wales Threshold Counts CSV has no header row');
  }

  validateHeaders(headerRow, WALES_THRESHOLD_COUNTS_EXPECTED_HEADERS, 'threshold_counts');

  const validMeasureCodes = new Set<string>(WALES_THRESHOLD_COUNTS_EXPECTED_MEASURE_CODES);
  const results: RawWalesValue[] = [];

  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    if (!row || row.length === 0) continue;

    if (row.length !== WALES_THRESHOLD_COUNTS_EXPECTED_HEADERS.length) {
      throw new SchemaChangeError(
        `Wales Threshold Counts CSV row ${String(r + 1)} has ${String(row.length)} columns, expected ${String(WALES_THRESHOLD_COUNTS_EXPECTED_HEADERS.length)}`,
        { row: r + 1, columnCount: row.length },
      );
    }

    const rawValue = row[WALES_THRESHOLD_COUNTS_COLUMN_OFFSETS.DATA_VALUE];
    const measureCode = row[WALES_THRESHOLD_COUNTS_COLUMN_OFFSETS.DATA_DESCRIPTION_REFERENCE];
    const dateCode = row[WALES_THRESHOLD_COUNTS_COLUMN_OFFSETS.DATE_REFERENCE];
    const boardOnsCode = row[WALES_THRESHOLD_COUNTS_COLUMN_OFFSETS.BOARD_REFERENCE];
    const specialtyCode = row[WALES_THRESHOLD_COUNTS_COLUMN_OFFSETS.SPECIALTY_REFERENCE];
    const stageCode = row[WALES_THRESHOLD_COUNTS_COLUMN_OFFSETS.STAGE_REFERENCE];
    const ageCode = row[WALES_THRESHOLD_COUNTS_COLUMN_OFFSETS.AGE_REFERENCE];

    if (rawValue === undefined || rawValue === '') {
      throw new SchemaChangeError(
        `Wales Threshold Counts CSV row ${String(r + 1)} missing data value`,
        { row: r + 1 },
      );
    }

    const numericValue = Number(rawValue);
    if (!Number.isFinite(numericValue)) {
      throw new SchemaChangeError(
        `Wales Threshold Counts CSV row ${String(r + 1)} has non-numeric data value: "${rawValue}"`,
        { row: r + 1, rawValue },
      );
    }

    if (!measureCode || !validMeasureCodes.has(measureCode)) {
      throw new SchemaChangeError(
        `Wales Threshold Counts CSV row ${String(r + 1)} has unknown MeasureCode: "${String(measureCode)}"`,
        { row: r + 1, measureCode },
      );
    }

    if (!dateCode || !/^\d{6}$/.test(dateCode)) {
      throw new SchemaChangeError(
        `Wales Threshold Counts CSV row ${String(r + 1)} has invalid Date_reference format: "${String(dateCode)}"`,
        { row: r + 1, dateCode },
      );
    }

    if (!boardOnsCode) {
      throw new SchemaChangeError(
        `Wales Threshold Counts CSV row ${String(r + 1)} has empty board reference code`,
        { row: r + 1 },
      );
    }

    if (!specialtyCode) {
      throw new SchemaChangeError(
        `Wales Threshold Counts CSV row ${String(r + 1)} has empty specialty reference code`,
        { row: r + 1 },
      );
    }

    if (stageCode !== 'T') {
      throw new SchemaChangeError(
        `Wales Threshold Counts CSV row ${String(r + 1)} unexpected stage of pathway reference: "${String(stageCode)}", expected "T"`,
        { row: r + 1, stageCode },
      );
    }

    if (ageCode !== 'T') {
      throw new SchemaChangeError(
        `Wales Threshold Counts CSV row ${String(r + 1)} unexpected age group reference: "${String(ageCode)}", expected "T"`,
        { row: r + 1, ageCode },
      );
    }

    results.push({
      dataset: 'threshold_counts',
      dateCode,
      boardOnsCode,
      specialtyCode,
      measureCode,
      value: numericValue,
    });
  }

  return results;
}

/**
 * Universal Wales coded CSV parser accepting either dataset identifier.
 */
export function parseWalesCodedCsv(
  dataset: string,
  input: string | Buffer | Uint8Array,
): readonly RawWalesValue[] {
  const kind = resolveWalesDatasetKind(dataset);
  return kind === 'key_measures'
    ? parseWalesKeyMeasuresCsv(input)
    : parseWalesThresholdCountsCsv(input);
}
