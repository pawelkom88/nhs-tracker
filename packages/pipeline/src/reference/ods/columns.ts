import { SchemaChangeError } from '../../errors.js';

export const ODS_STANDARD_COLUMN_COUNT = 27;
export const ODS_SUCCESSION_COLUMN_COUNT = 5;

export type StandardOdsReportName = 'etr' | 'ets' | 'ephp' | 'ephpsite' | 'wlhb';
export type OdsReportName = StandardOdsReportName | 'succ';

/**
 * Parsed row from a 27-column standard NHS ODS CSV file.
 *
 * NOTE: Column 10 (postcode) is deliberately read and discarded.
 * It is never added as a property on this object.
 */
export interface OdsStandardRow {
  readonly code: string;
  readonly name: string;
  readonly nhsRegionCode: string | null;
  readonly icbCode: string | null;
  readonly addressLine1: string | null;
  readonly addressLine2: string | null;
  readonly addressLine3: string | null;
  readonly town: string | null;
  readonly county: string | null;
  readonly openDate: string | null; // YYYYMMDD
  readonly closeDate: string | null; // YYYYMMDD
  readonly statusCode: string | null;
  readonly subTypeRoles: readonly string[]; // e.g. ["RO31"], ["RO29", "RO320"]
  readonly parentOrgCode: string | null;
  readonly joinProviderDate: string | null;
  readonly leftProviderDate: string | null;
  readonly contactTelephone: string | null;
  readonly amendedDate: string | null;
  readonly gorCode: string | null;
}

/**
 * Parsed row from a 5-column NHS ODS succession CSV file (`succ.csv`).
 */
export interface OdsSuccessionRow {
  readonly predecessor: string;
  readonly successor: string;
  readonly effectiveDate: string; // YYYYMMDD
  readonly hasForwardSuccession: boolean;
}

export type OdsRowFor<R extends OdsReportName> = R extends 'succ'
  ? OdsSuccessionRow
  : OdsStandardRow;

function nullIfEmpty(val: string | undefined): string | null {
  if (val === undefined) return null;
  const trimmed = val.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * Maps a raw 27-column row array from a standard ODS CSV report into an `OdsStandardRow`.
 * Postcode at index 9 is discarded and never placed on the returned object.
 */
export function mapOdsStandardRow(
  raw: readonly string[],
  rowIndex: number,
  reportName: StandardOdsReportName,
): OdsStandardRow {
  if (raw.length !== ODS_STANDARD_COLUMN_COUNT) {
    throw new SchemaChangeError(
      `ODS report "${reportName}" row ${String(rowIndex + 1)} has ${String(raw.length)} columns; expected ${String(ODS_STANDARD_COLUMN_COUNT)}`,
      { reportName, rowIndex, columnCount: raw.length, expected: ODS_STANDARD_COLUMN_COUNT },
    );
  }

  const subTypeRaw = raw[13]?.trim() ?? '';
  const subTypeRoles = subTypeRaw
    ? subTypeRaw
        .split('|')
        .map((s) => s.trim())
        .filter(Boolean)
    : [];

  const row: OdsStandardRow = {
    code: raw[0]?.trim() ?? '',
    name: raw[1]?.trim() ?? '',
    nhsRegionCode: nullIfEmpty(raw[2]),
    icbCode: nullIfEmpty(raw[3]),
    addressLine1: nullIfEmpty(raw[4]),
    addressLine2: nullIfEmpty(raw[5]),
    addressLine3: nullIfEmpty(raw[6]),
    town: nullIfEmpty(raw[7]),
    county: nullIfEmpty(raw[8]),
    openDate: nullIfEmpty(raw[10]),
    closeDate: nullIfEmpty(raw[11]),
    statusCode: nullIfEmpty(raw[12]),
    subTypeRoles,
    parentOrgCode: nullIfEmpty(raw[14]),
    joinProviderDate: nullIfEmpty(raw[15]),
    leftProviderDate: nullIfEmpty(raw[16]),
    contactTelephone: nullIfEmpty(raw[17]),
    amendedDate: nullIfEmpty(raw[21]),
    gorCode: nullIfEmpty(raw[23]),
  };

  return row;
}

/**
 * Maps a raw 5-column row array from the ODS succession CSV report into an `OdsSuccessionRow`.
 */
export function mapOdsSuccessionRow(raw: readonly string[], rowIndex: number): OdsSuccessionRow {
  if (raw.length !== ODS_SUCCESSION_COLUMN_COUNT) {
    throw new SchemaChangeError(
      `ODS report "succ" row ${String(rowIndex + 1)} has ${String(raw.length)} columns; expected ${String(ODS_SUCCESSION_COLUMN_COUNT)}`,
      {
        reportName: 'succ',
        rowIndex,
        columnCount: raw.length,
        expected: ODS_SUCCESSION_COLUMN_COUNT,
      },
    );
  }

  const forwardFlag = (raw[4]?.trim() ?? '').toUpperCase();
  const hasForwardSuccession =
    forwardFlag === 'Y' || forwardFlag === 'TRUE' || forwardFlag === 'T' || forwardFlag === '1';

  return {
    predecessor: raw[0]?.trim() ?? '',
    successor: raw[1]?.trim() ?? '',
    effectiveDate: raw[3]?.trim() ?? '',
    hasForwardSuccession,
  };
}
