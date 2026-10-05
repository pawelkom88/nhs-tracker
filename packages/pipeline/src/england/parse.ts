import {
  reportingPeriod,
  publicationDate,
  type ReportingPeriod,
  type PublicationDate,
} from '@kyw/model/period';
import { SchemaChangeError, ValidationError } from '../errors.js';
import { readXlsx, type ParsedWorkbook, type XlsxCellValue } from '../io/xlsx.js';
import { ENGLAND_EXPECTED_HEADERS, ENGLAND_COLUMN_OFFSETS } from './columns.js';

const ENGLISH_MONTHS: Readonly<Record<string, number>> = {
  january: 1,
  jan: 1,
  february: 2,
  feb: 2,
  march: 3,
  mar: 3,
  april: 4,
  apr: 4,
  may: 5,
  june: 6,
  jun: 6,
  july: 7,
  jul: 7,
  august: 8,
  aug: 8,
  september: 9,
  sep: 9,
  sept: 9,
  october: 10,
  oct: 10,
  november: 11,
  nov: 11,
  december: 12,
  dec: 12,
};

function getDaysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

const pad = (n: number): string => String(n).padStart(2, '0');

/**
 * Parses English period strings like "July 2026" or "Jul 2026" into a month-end ReportingPeriod.
 */
export function parseEnglishPeriod(raw: unknown): ReportingPeriod {
  if (raw instanceof Date) {
    const year = raw.getUTCFullYear();
    const monthNum = raw.getUTCMonth() + 1;
    const lastDay = getDaysInMonth(year, monthNum);
    return reportingPeriod(`${String(year)}-${pad(monthNum)}-${pad(lastDay)}`);
  }

  if (typeof raw !== 'string') {
    throw new SchemaChangeError(`Expected string for Period metadata cell, got ${typeof raw}`);
  }

  const trimmed = raw.trim();
  const match = /^([A-Za-z]+)\s+(\d{4})$/.exec(trimmed);
  if (!match?.[1] || !match[2]) {
    // If it's already an ISO date
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      return reportingPeriod(trimmed);
    }
    throw new SchemaChangeError(`Unrecognised Period metadata format: "${raw}"`);
  }

  const monthNum = ENGLISH_MONTHS[match[1].toLowerCase()];
  if (!monthNum) {
    throw new SchemaChangeError(`Unknown month name in Period: "${match[1]}"`);
  }

  const year = Number(match[2]);
  const lastDay = getDaysInMonth(year, monthNum);
  return reportingPeriod(`${String(year)}-${pad(monthNum)}-${pad(lastDay)}`);
}

/**
 * Extracts month-end ReportingPeriod from a filename containing Incomplete-Provider-MMM-YY.
 */
export function extractPeriodFromFilename(filename: string): ReportingPeriod | null {
  const match = /Incomplete-Provider-([A-Za-z]{3})(\d{2})/i.exec(filename);
  if (!match?.[1] || !match[2]) {
    return null;
  }
  const monthNum = ENGLISH_MONTHS[match[1].toLowerCase()];
  if (!monthNum) {
    return null;
  }
  const year = 2000 + Number(match[2]);
  const lastDay = getDaysInMonth(year, monthNum);
  return reportingPeriod(`${String(year)}-${pad(monthNum)}-${pad(lastDay)}`);
}

/**
 * Parses English date strings like "10th September 2026" or "11 September 2025" into a PublicationDate.
 */
export function parseEnglishDate(raw: unknown, label: string): PublicationDate {
  if (raw instanceof Date) {
    const y = raw.getUTCFullYear();
    const m = raw.getUTCMonth() + 1;
    const d = raw.getUTCDate();
    return publicationDate(`${String(y)}-${pad(m)}-${pad(d)}`);
  }

  if (typeof raw !== 'string') {
    throw new SchemaChangeError(`Expected string for ${label} date cell, got ${typeof raw}`);
  }

  const trimmed = raw.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return publicationDate(trimmed);
  }

  const match = /^(\d{1,2})(?:st|nd|rd|th)?\s+([A-Za-z]+)\s+(\d{4})$/i.exec(trimmed);
  if (!match?.[1] || !match[2] || !match[3]) {
    throw new SchemaChangeError(`Unrecognised ${label} date format: "${raw}"`);
  }

  const day = Number(match[1]);
  const monthNum = ENGLISH_MONTHS[match[2].toLowerCase()];
  if (!monthNum) {
    throw new SchemaChangeError(`Unknown month name in ${label} date: "${match[2]}"`);
  }
  const year = Number(match[3]);

  return publicationDate(`${String(year)}-${pad(monthNum)}-${pad(day)}`);
}

export interface EnglandXlsxMetadata {
  readonly reportingPeriod: ReportingPeriod;
  readonly publicationDate: PublicationDate;
  readonly revisedDate?: PublicationDate | null;
  readonly status: string;
}

export interface RawEnglandRow {
  readonly sheet: 'Provider' | 'IS Provider';
  readonly regionCode: string;
  readonly providerCode: string;
  readonly providerName: string;
  readonly treatmentFunctionCode: string;
  readonly treatmentFunctionName: string;
  readonly total: number;
  readonly within18Proportion: number;
  readonly median: number | 'suppressed';
  readonly longWait52Plus: number;
}

export interface ParsedEnglandXlsx {
  readonly metadata: EnglandXlsxMetadata;
  readonly rows: readonly RawEnglandRow[];
}

export interface ParseEnglandOptions {
  readonly expectedPeriod?: ReportingPeriod;
}

function extractMetadata(sheetRows: readonly (readonly XlsxCellValue[])[]): EnglandXlsxMetadata {
  const metaMap = new Map<string, unknown>();

  // Look across rows 1–12
  const maxSearchRow = Math.min(sheetRows.length, 12);
  for (let r = 0; r < maxSearchRow; r++) {
    const row = sheetRows[r];
    if (!row) continue;
    for (let c = 0; c < row.length; c++) {
      const cell = row[c];
      if (typeof cell === 'string') {
        const trimmed = cell.trim();
        if (trimmed.endsWith(':') && c < row.length - 1) {
          const key = trimmed.slice(0, -1).trim().toLowerCase();
          const val = row[c + 1];
          if (val !== null && val !== undefined && val !== '') {
            metaMap.set(key, val);
          }
        } else if (trimmed.includes(':')) {
          const colonIdx = trimmed.indexOf(':');
          const key = trimmed.slice(0, colonIdx).trim().toLowerCase();
          const val = trimmed.slice(colonIdx + 1).trim();
          if (val && !metaMap.has(key)) {
            metaMap.set(key, val);
          }
        }
      }
    }
  }

  const rawPeriod = metaMap.get('period');
  if (!rawPeriod) {
    throw new SchemaChangeError('Missing "Period:" metadata in England XLSX');
  }
  const rPeriod = parseEnglishPeriod(rawPeriod);

  const rawPublished = metaMap.get('published');
  if (!rawPublished) {
    throw new SchemaChangeError('Missing "Published:" metadata in England XLSX');
  }
  const pubDate = parseEnglishDate(rawPublished, 'Published');

  const rawRevised = metaMap.get('revised');
  let revDate: PublicationDate | null = null;
  if (typeof rawRevised === 'string') {
    const revStr = rawRevised.trim();
    if (revStr !== '' && revStr.toUpperCase() !== 'N/A') {
      revDate = parseEnglishDate(revStr, 'Revised');
    }
  } else if (rawRevised instanceof Date) {
    revDate = parseEnglishDate(rawRevised, 'Revised');
  }

  const rawStatus = metaMap.get('status');
  if (typeof rawStatus !== 'string' || !rawStatus.trim()) {
    throw new SchemaChangeError('Missing or invalid "Status:" metadata in England XLSX');
  }

  return {
    reportingPeriod: rPeriod,
    publicationDate: pubDate,
    revisedDate: revDate,
    status: rawStatus.trim(),
  };
}

function validateHeaders(
  sheetName: 'Provider' | 'IS Provider',
  sheetRows: readonly (readonly XlsxCellValue[])[],
): void {
  const HEADER_ROW_INDEX = 13; // 0-based index for row 14

  if (sheetRows.length <= HEADER_ROW_INDEX) {
    throw new SchemaChangeError(
      `Sheet "${sheetName}" has only ${String(sheetRows.length)} rows, expected at least 14 rows for headers`,
      { sheet: sheetName, rowCount: sheetRows.length },
    );
  }

  // Check if header row was shifted to a different row
  const maxScanRows = Math.min(sheetRows.length, 100);
  for (let r = 0; r < maxScanRows; r++) {
    if (r === HEADER_ROW_INDEX) continue;
    const row = sheetRows[r];
    if (row?.[1] === 'Region Code' && row[2] === 'Provider Code') {
      throw new SchemaChangeError(
        `Expected header row on row 14 of sheet "${sheetName}", but header was found on row ${String(r + 1)}`,
        { sheet: sheetName, expectedRow: 14, actualRow: r + 1 },
      );
    }
  }

  const row14 = sheetRows[HEADER_ROW_INDEX];
  if (!row14) {
    throw new SchemaChangeError(`Header row 14 is missing on sheet "${sheetName}"`, {
      sheet: sheetName,
    });
  }

  // Column A is empty (index 0). Data headers start at column B (index 1).
  const colA = row14[0];
  if (colA !== null && colA !== undefined && colA !== '') {
    throw new SchemaChangeError(
      `Expected column A on header row 14 of sheet "${sheetName}" to be empty, but found "${String(colA)}"`,
      { sheet: sheetName, columnAValue: colA },
    );
  }

  const actualHeaders = row14.slice(1);
  const mismatches: {
    column: number;
    expected: string;
    actual: XlsxCellValue | undefined;
  }[] = [];

  for (let i = 0; i < ENGLAND_EXPECTED_HEADERS.length; i++) {
    const expected = ENGLAND_EXPECTED_HEADERS[i];
    const actual = actualHeaders[i];
    if (actual !== expected) {
      mismatches.push({
        column: i + 2, // 1-based column number (B = 2)
        expected: expected ?? '',
        actual,
      });
    }
  }

  // Check for any unexpected non-empty headers beyond the expected column set
  for (let i = ENGLAND_EXPECTED_HEADERS.length; i < actualHeaders.length; i++) {
    const actual = actualHeaders[i];
    if (actual !== null && actual !== undefined && actual !== '') {
      mismatches.push({
        column: i + 2,
        expected: '(no column)',
        actual,
      });
    }
  }

  if (actualHeaders.length < ENGLAND_EXPECTED_HEADERS.length || mismatches.length > 0) {
    throw new SchemaChangeError(
      `Header structure on sheet "${sheetName}" row 14 does not match expected England RTT specification (${String(mismatches.length)} mismatches)`,
      {
        sheet: sheetName,
        expectedColumnCount: ENGLAND_EXPECTED_HEADERS.length,
        actualColumnCount: actualHeaders.length,
        mismatches: mismatches.slice(0, 10),
      },
    );
  }
}

function parseDataRows(
  sheetName: 'Provider' | 'IS Provider',
  sheetRows: readonly (readonly XlsxCellValue[])[],
): readonly RawEnglandRow[] {
  const DATA_START_ROW_INDEX = 14; // 0-based index for row 15
  const rows: RawEnglandRow[] = [];

  for (let r = DATA_START_ROW_INDEX; r < sheetRows.length; r++) {
    const row = sheetRows[r];
    if (!row || row.length <= 1) continue;

    const dataSlice = row.slice(1); // from Column B onwards

    const rawRegionCode = dataSlice[ENGLAND_COLUMN_OFFSETS.REGION_CODE];
    const rawProviderCode = dataSlice[ENGLAND_COLUMN_OFFSETS.PROVIDER_CODE];
    const rawProviderName = dataSlice[ENGLAND_COLUMN_OFFSETS.PROVIDER_NAME];
    const rawTfCode = dataSlice[ENGLAND_COLUMN_OFFSETS.TREATMENT_FUNCTION_CODE];
    const rawTfName = dataSlice[ENGLAND_COLUMN_OFFSETS.TREATMENT_FUNCTION_NAME];

    const regionCode =
      typeof rawRegionCode === 'string'
        ? rawRegionCode.trim()
        : typeof rawRegionCode === 'number'
          ? String(rawRegionCode).trim()
          : '';
    const providerCode =
      typeof rawProviderCode === 'string'
        ? rawProviderCode.trim()
        : typeof rawProviderCode === 'number'
          ? String(rawProviderCode).trim()
          : '';
    const providerName =
      typeof rawProviderName === 'string'
        ? rawProviderName.trim()
        : typeof rawProviderName === 'number'
          ? String(rawProviderName).trim()
          : '';
    const tfCode =
      typeof rawTfCode === 'string'
        ? rawTfCode.trim()
        : typeof rawTfCode === 'number'
          ? String(rawTfCode).trim()
          : '';
    const tfName =
      typeof rawTfName === 'string'
        ? rawTfName.trim()
        : typeof rawTfName === 'number'
          ? String(rawTfName).trim()
          : '';

    // If completely empty row (e.g. trailing blanks), skip
    if (!providerCode && !tfCode && !providerName) {
      continue;
    }

    if (!regionCode) {
      throw new ValidationError(
        `Row ${String(r + 1)} on sheet "${sheetName}" has invalid Region Code: ${JSON.stringify(rawRegionCode)}`,
      );
    }
    if (!providerCode) {
      throw new ValidationError(
        `Row ${String(r + 1)} on sheet "${sheetName}" has invalid Provider Code: ${JSON.stringify(rawProviderCode)}`,
      );
    }
    if (!providerName) {
      throw new ValidationError(
        `Row ${String(r + 1)} on sheet "${sheetName}" has invalid Provider Name: ${JSON.stringify(rawProviderName)}`,
      );
    }
    if (!tfCode) {
      throw new ValidationError(
        `Row ${String(r + 1)} on sheet "${sheetName}" has invalid Treatment Function Code: ${JSON.stringify(rawTfCode)}`,
      );
    }
    if (!tfName) {
      throw new ValidationError(
        `Row ${String(r + 1)} on sheet "${sheetName}" has invalid Treatment Function Name: ${JSON.stringify(rawTfName)}`,
      );
    }

    // Total incomplete pathways
    const rawTotal = dataSlice[ENGLAND_COLUMN_OFFSETS.TOTAL_INCOMPLETE_PATHWAYS];
    if (typeof rawTotal !== 'number' || !Number.isFinite(rawTotal) || rawTotal < 0) {
      throw new ValidationError(
        `Row ${String(r + 1)} on sheet "${sheetName}" has invalid Total pathways: ${JSON.stringify(rawTotal)}`,
      );
    }

    // % within 18 weeks (proportion 0..1 or 0)
    const rawWithin18 = dataSlice[ENGLAND_COLUMN_OFFSETS.PERCENT_WITHIN_18_WEEKS];
    let within18Proportion: number;
    if (
      rawTotal === 0 &&
      (rawWithin18 === 0 ||
        rawWithin18 === '-' ||
        rawWithin18 === null ||
        rawWithin18 === '' ||
        (typeof rawWithin18 === 'string' && rawWithin18.trim() === '-'))
    ) {
      within18Proportion = 0;
    } else if (
      typeof rawWithin18 === 'number' &&
      Number.isFinite(rawWithin18) &&
      rawWithin18 >= 0 &&
      rawWithin18 <= 1.0001
    ) {
      within18Proportion = Math.min(rawWithin18, 1);
    } else {
      throw new ValidationError(
        `Row ${String(r + 1)} on sheet "${sheetName}" has invalid % within 18 weeks proportion: ${JSON.stringify(rawWithin18)}`,
      );
    }

    // Median waiting time
    const rawMedian = dataSlice[ENGLAND_COLUMN_OFFSETS.MEDIAN_WAIT_TIME_WEEKS];
    let median: number | 'suppressed';
    if (
      rawMedian === '-' ||
      rawMedian === ' - ' ||
      (typeof rawMedian === 'string' && rawMedian.trim() === '-')
    ) {
      median = 'suppressed';
    } else if (typeof rawMedian === 'number' && Number.isFinite(rawMedian) && rawMedian >= 0) {
      median = rawMedian;
    } else {
      throw new ValidationError(
        `Row ${String(r + 1)} on sheet "${sheetName}" has non-numeric median waiting time: ${JSON.stringify(rawMedian)}`,
      );
    }

    // Total 52 plus weeks
    const rawLongWait = dataSlice[ENGLAND_COLUMN_OFFSETS.TOTAL_52_PLUS_WEEKS];
    let longWait52Plus: number;
    if (
      rawTotal === 0 &&
      (rawLongWait === 0 ||
        rawLongWait === '-' ||
        rawLongWait === null ||
        rawLongWait === '' ||
        (typeof rawLongWait === 'string' && rawLongWait.trim() === '-'))
    ) {
      longWait52Plus = 0;
    } else if (
      typeof rawLongWait === 'number' &&
      Number.isFinite(rawLongWait) &&
      rawLongWait >= 0
    ) {
      longWait52Plus = rawLongWait;
    } else {
      throw new ValidationError(
        `Row ${String(r + 1)} on sheet "${sheetName}" has invalid Total 52 plus weeks count: ${JSON.stringify(rawLongWait)}`,
      );
    }

    rows.push({
      sheet: sheetName,
      regionCode,
      providerCode,
      providerName,
      treatmentFunctionCode: tfCode,
      treatmentFunctionName: tfName,
      total: rawTotal,
      within18Proportion,
      median,
      longWait52Plus,
    });
  }

  return rows;
}

/**
 * Parses an NHS England Incomplete Provider XLSX workbook.
 *
 * @see docs/plan/data-sources.md § England
 * @see ADR-0003
 * @see ADR-0005
 */
export async function parseEnglandXlsx(
  input: string | Buffer | Uint8Array | ParsedWorkbook,
  options: ParseEnglandOptions = {},
): Promise<ParsedEnglandXlsx> {
  const workbook = typeof input === 'object' && 'getSheet' in input ? input : await readXlsx(input);

  const providerSheet = workbook.getSheet('Provider');
  if (!providerSheet) {
    throw new SchemaChangeError('Required sheet "Provider" is missing from England XLSX');
  }

  const isProviderSheet = workbook.getSheet('IS Provider');
  if (!isProviderSheet) {
    throw new SchemaChangeError('Required sheet "IS Provider" is missing from England XLSX');
  }

  const metadata = extractMetadata(providerSheet.rows);

  const filenamePeriod = typeof input === 'string' ? extractPeriodFromFilename(input) : null;
  const expectedPeriod = options.expectedPeriod ?? filenamePeriod ?? undefined;

  if (expectedPeriod && metadata.reportingPeriod !== expectedPeriod) {
    throw new ValidationError(
      `England XLSX reporting period "${metadata.reportingPeriod}" does not match expected period "${expectedPeriod}"`,
    );
  }

  validateHeaders('Provider', providerSheet.rows);
  validateHeaders('IS Provider', isProviderSheet.rows);

  const providerRows = parseDataRows('Provider', providerSheet.rows);
  const isProviderRows = parseDataRows('IS Provider', isProviderSheet.rows);

  return {
    metadata,
    rows: [...providerRows, ...isProviderRows],
  };
}
