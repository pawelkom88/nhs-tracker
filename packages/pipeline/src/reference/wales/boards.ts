import { reportingUnitId } from '@kyw/model/ids';
import type { ReportingUnit } from '@kyw/model/reference';
import { SchemaChangeError } from '../../errors.js';
import { toDisplayName } from '../names.js';

export interface WalesBoardConfig {
  readonly onsCode: string;
  readonly odsCode: string;
  readonly officialName: string;
  readonly displayName: string;
  readonly openDate: string; // ISO YYYY-MM-DD
}

/**
 * The 7 active Welsh Local Health Boards with ONS and ODS codes.
 *
 * @see data-sources.md § Wales
 * @see GLOSSARY.md Reporting Unit
 * @see ADR-0003
 */
export const WALES_BOARDS: readonly WalesBoardConfig[] = [
  {
    onsCode: 'W11000023',
    odsCode: '7A1',
    officialName: 'Betsi Cadwaladr University Local Health Board',
    displayName: 'Betsi Cadwaladr University Health Board',
    openDate: '2009-10-01',
  },
  {
    onsCode: 'W11000025',
    odsCode: '7A2',
    officialName: 'Hywel Dda University Local Health Board',
    displayName: 'Hywel Dda University Health Board',
    openDate: '2009-10-01',
  },
  {
    onsCode: 'W11000031',
    odsCode: '7A3',
    officialName: 'Swansea Bay University Local Health Board',
    displayName: 'Swansea Bay University Health Board',
    openDate: '2019-04-01',
  },
  {
    onsCode: 'W11000029',
    odsCode: '7A4',
    officialName: 'Cardiff and Vale University Local Health Board',
    displayName: 'Cardiff and Vale University Health Board',
    openDate: '2009-10-01',
  },
  {
    onsCode: 'W11000030',
    odsCode: '7A5',
    officialName: 'Cwm Taf Morgannwg University Local Health Board',
    displayName: 'Cwm Taf Morgannwg University Health Board',
    openDate: '2019-04-01',
  },
  {
    onsCode: 'W11000028',
    odsCode: '7A6',
    officialName: 'Aneurin Bevan University Local Health Board',
    displayName: 'Aneurin Bevan University Health Board',
    openDate: '2009-10-01',
  },
  {
    onsCode: 'W11000024',
    odsCode: '7A7',
    officialName: 'Powys Teaching Local Health Board',
    displayName: 'Powys Teaching Health Board',
    openDate: '2009-10-01',
  },
] as const;

/**
 * Pre-2019 legacy ONS board codes retired during the Bridgend boundary reorganisation.
 * These rows are discarded during ingest.
 */
export const WALES_LEGACY_ONS_CODES = new Set<string>([
  'W11000026', // Abertawe Bro Morgannwg University Health Board
  'W11000027', // Cwm Taf University Health Board
]);

/**
 * Aggregations and non-board geographical entities published by StatsWales.
 * These are not Reporting Units and must be skipped.
 */
export const WALES_NON_REPORTING_CODES = new Set<string>([
  'W92000004', // All Wales / Wales national total
  'A1X', // South East Wales Region
]);

const BOARD_BY_ONS = new Map<string, WalesBoardConfig>();
const BOARD_BY_ODS = new Map<string, WalesBoardConfig>();

for (const board of WALES_BOARDS) {
  BOARD_BY_ONS.set(board.onsCode, board);
  BOARD_BY_ODS.set(board.odsCode, board);
}

/**
 * Resolves a Wales Health Board configuration from an ONS code (`W110000xx`).
 * Returns null if the code is a legacy code or non-reporting aggregate entity.
 * Throws SchemaChangeError on any other unrecognised code.
 */
export function resolveWalesBoardFromOnsCode(onsCode: string): WalesBoardConfig | null {
  if (WALES_LEGACY_ONS_CODES.has(onsCode) || WALES_NON_REPORTING_CODES.has(onsCode)) {
    return null;
  }

  const board = BOARD_BY_ONS.get(onsCode);
  if (!board) {
    throw new SchemaChangeError(
      `Unknown Wales health board ONS code "${onsCode}". A new or changed health board requires manual crosswalk configuration.`,
      {
        requested: onsCode,
        knownOnsCodes: WALES_BOARDS.map((b) => b.onsCode),
      },
    );
  }

  return board;
}

/**
 * Resolves a Wales Health Board configuration from an ODS code (`7A1`–`7A7`).
 * Throws SchemaChangeError on any unrecognised code.
 */
export function resolveWalesBoardFromOdsCode(odsCode: string): WalesBoardConfig {
  const cleanCode = odsCode.startsWith('wales:') ? odsCode.slice('wales:'.length) : odsCode;
  const board = BOARD_BY_ODS.get(cleanCode);
  if (!board) {
    throw new SchemaChangeError(
      `Unknown Wales health board ODS code "${odsCode}". Known codes are 7A1 to 7A7.`,
      {
        requested: odsCode,
        knownOdsCodes: WALES_BOARDS.map((b) => b.odsCode),
      },
    );
  }

  return board;
}

/**
 * Checks whether an entity remained the same across two reporting periods.
 * In Wales, all 7 current health boards are stable same-entity units across any
 * 12-month window after the 2019-04-01 Bridgend boundary transfer.
 */
export function isSameEntityAcrossWales(
  code: string,
  olderPeriod: string,
  newerPeriod: string,
): boolean {
  if (olderPeriod > newerPeriod) {
    return false;
  }

  const cleanCode = code.startsWith('wales:') ? code.slice('wales:'.length) : code;
  const board = BOARD_BY_ODS.get(cleanCode) ?? BOARD_BY_ONS.get(cleanCode);
  if (!board) {
    return false;
  }

  // Bridgend boundary reorganisation was effective 2019-04-01
  if (olderPeriod < '2019-04-01') {
    // 7A3 (Swansea Bay) and 7A5 (Cwm Taf Morgannwg) had structural boundary changes
    if (board.odsCode === '7A3' || board.odsCode === '7A5') {
      return false;
    }
  }

  return olderPeriod >= board.openDate;
}

/**
 * Builds the standard ReportingUnit<'wales'> objects for the 7 health boards.
 */
export function buildWalesReportingUnits(): ReportingUnit<'wales'>[] {
  return WALES_BOARDS.map((b) => ({
    id: reportingUnitId('wales', b.odsCode),
    officialCode: b.odsCode,
    officialName: b.officialName,
    displayName: toDisplayName(b.displayName),
    kind: 'health-board' as const,
    hospitalSites: [], // Linked in build.ts with sites
    operational: {
      from: b.openDate,
      to: null,
    },
    predecessors: [],
    successors: [],
    notes: [],
  }));
}
