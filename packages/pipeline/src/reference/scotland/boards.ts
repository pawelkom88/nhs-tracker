import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { reportingUnitId } from '@kyw/model/ids';
import type { ReportingUnit } from '@kyw/model/reference';
import { SchemaChangeError } from '../../errors.js';
import { readCsv } from '../../io/csv.js';
import { toDisplayName } from '../names.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const DEFAULT_SCOTLAND_BOARDS_CSV_PATH = path.resolve(
  __dirname,
  '../../../fixtures/scotland/lookups/health-boards.csv',
);

export const DEFAULT_SCOTLAND_SPECIAL_BOARDS_CSV_PATH = path.resolve(
  __dirname,
  '../../../fixtures/scotland/lookups/special-health-boards.csv',
);

export interface ScotlandBoardConfig {
  readonly code: string;
  readonly officialName: string;
  readonly displayName: string;
  readonly kind: 'health-board' | 'special-health-board';
  readonly openDate: string | null;
  readonly closeDate: string | null;
  readonly predecessors: readonly string[];
  readonly successors: readonly string[];
  readonly notes: readonly 'treats-patients-from-all-boards'[];
}

/**
 * Mapping of archived Scottish territorial health board codes to their current same-name successors.
 * Represents boundary/administrative changes where the underlying entity is continuous.
 *
 * @see data-sources.md § Scotland
 * @see ADR-0003
 */
export const SCOTLAND_BOARD_SUCCESSIONS: Readonly<Record<string, string>> = {
  S08000018: 'S08000029', // NHS Fife (archived 2019-03-31 -> enacted 2019-04-01)
  S08000021: 'S08000031', // NHS Greater Glasgow and Clyde (archived 2019-03-31 -> enacted 2019-04-01)
  S08000023: 'S08000032', // NHS Lanarkshire (archived 2019-03-31 -> enacted 2019-04-01)
  S08000027: 'S08000030', // NHS Tayside (archived 2019-03-31 -> enacted 2019-04-01)
};

/**
 * Non-reporting geography codes, aggregates, independent sector aggregations,
 * or residency codes published by PHS that are not Reporting Units.
 *
 * @see data-sources.md § Scotland
 * @see Assumption A-11
 */
export const SCOTLAND_NON_REPORTING_CODES = new Set<string>([
  'S92000003', // Scotland country total
  'S27000001', // Non-NHS Provider/Location (independent sector activity)
  'RA2702', // Rest of UK resident
  'RA2704', // Unknown residency
]);

/**
 * Other special health boards in Scotland that do not report planned care waiting times.
 */
export const SCOTLAND_NON_REPORTING_SPECIAL_BOARDS = new Set<string>([
  'SB0802', // Scottish Ambulance Service
  'SB0803', // The State Hospital
  'SB0804', // NHS 24
  'SB0805', // NHS Education for Scotland
  'SB0806', // NHS National Services Scotland
  'SB0807', // Healthcare Improvement Scotland
  'SB0808', // Public Health Scotland
]);

interface RawBoardCsvRow {
  readonly HB: string;
  readonly HBName: string;
  readonly HBDateEnacted: string;
  readonly HBDateArchived: string;
  readonly Country: string;
}

interface RawSpecialBoardCsvRow {
  readonly SHB: string;
  readonly SHBName: string;
  readonly SHBDateEnacted: string;
  readonly SHBDateArchived: string;
  readonly Country: string;
}

function parseIsoDate(yyyymmdd: string): string | null {
  const trimmed = yyyymmdd.trim();
  if (trimmed.length !== 8) return null;
  const y = trimmed.slice(0, 4);
  const m = trimmed.slice(4, 6);
  const d = trimmed.slice(6, 8);
  return `${y}-${m}-${d}`;
}

/**
 * Parses raw CSVs to construct the 15 active Scotland Reporting Units (14 territorial + Golden Jubilee).
 */
export function loadScotlandBoardConfigs(
  boardsCsvPath: string = DEFAULT_SCOTLAND_BOARDS_CSV_PATH,
  specialBoardsCsvPath: string = DEFAULT_SCOTLAND_SPECIAL_BOARDS_CSV_PATH,
): readonly ScotlandBoardConfig[] {
  const boardsContent = fs.readFileSync(boardsCsvPath, 'utf8');
  const boardRows = readCsv<RawBoardCsvRow>(boardsContent, { columns: true });

  const activeBoards: ScotlandBoardConfig[] = [];

  for (const row of boardRows) {
    const code = row.HB.trim();
    if (!code || SCOTLAND_NON_REPORTING_CODES.has(code)) {
      continue;
    }

    const archivedDate = parseIsoDate(row.HBDateArchived);
    if (archivedDate) {
      // Archived board (e.g. S08000018); skip from active list, succession tracked via map
      continue;
    }

    const enactedDate = parseIsoDate(row.HBDateEnacted);

    // Find predecessors for this active board
    const predecessors: string[] = [];
    for (const [predCode, succCode] of Object.entries(SCOTLAND_BOARD_SUCCESSIONS)) {
      if (succCode === code) {
        predecessors.push(predCode);
      }
    }

    activeBoards.push({
      code,
      officialName: row.HBName.trim(),
      displayName: toDisplayName(row.HBName),
      kind: 'health-board',
      openDate: enactedDate,
      closeDate: null,
      predecessors,
      successors: [],
      notes: [],
    });
  }

  // Load Golden Jubilee from special health boards lookup (cp1252 encoded)
  const specialBoardsBuffer = fs.readFileSync(specialBoardsCsvPath);
  const specialBoardRows = readCsv<RawSpecialBoardCsvRow>(specialBoardsBuffer, {
    columns: true,
    encoding: 'win1252',
    normalizeNonBreakingSpaces: true,
  });

  const goldenJubileeRow = specialBoardRows.find((r) => r.SHB.trim() === 'SB0801');
  if (!goldenJubileeRow) {
    throw new SchemaChangeError(
      'Golden Jubilee (SB0801) not found in special health boards lookup file.',
    );
  }

  activeBoards.push({
    code: 'SB0801',
    officialName: goldenJubileeRow.SHBName.trim(),
    displayName: toDisplayName(goldenJubileeRow.SHBName),
    kind: 'special-health-board',
    openDate: parseIsoDate(goldenJubileeRow.SHBDateEnacted),
    closeDate: parseIsoDate(goldenJubileeRow.SHBDateArchived),
    predecessors: [],
    successors: [],
    notes: ['treats-patients-from-all-boards'],
  });

  return activeBoards.sort((a, b) => a.displayName.localeCompare(b.displayName, 'en-GB'));
}

/**
 * Resolves a Scotland Board configuration or checks known codes.
 * Returns null if the code is in the non-reporting or non-waiting list.
 * Throws SchemaChangeError on unknown code.
 */
export function resolveScotlandBoard(
  code: string,
  configs?: readonly ScotlandBoardConfig[],
): ScotlandBoardConfig | null {
  const cleanCode = code.startsWith('scotland:') ? code.slice('scotland:'.length) : code;

  if (
    SCOTLAND_NON_REPORTING_CODES.has(cleanCode) ||
    SCOTLAND_NON_REPORTING_SPECIAL_BOARDS.has(cleanCode)
  ) {
    return null;
  }

  // Check if archived code -> map to successor
  const effectiveCode = SCOTLAND_BOARD_SUCCESSIONS[cleanCode] ?? cleanCode;

  const boardList = configs ?? loadScotlandBoardConfigs();
  const board = boardList.find((b) => b.code === effectiveCode);

  if (!board) {
    throw new SchemaChangeError(
      `Unknown Scotland health board code "${code}". A new or changed health board requires manual reference configuration.`,
      {
        requested: code,
        effectiveCode,
        knownCodes: boardList.map((b) => b.code),
      },
    );
  }

  return board;
}

/**
 * Checks whether an entity remained the same across two reporting periods.
 * In Scotland, the 14 territorial boards and Golden Jubilee are treated as continuous
 * same-name entities across boundary changes (e.g. 2019-04-01).
 */
export function isSameEntityAcrossScotland(
  code: string,
  olderPeriod: string,
  newerPeriod: string,
  configs?: readonly ScotlandBoardConfig[],
): boolean {
  if (olderPeriod > newerPeriod) {
    return false;
  }

  const cleanCode = code.startsWith('scotland:') ? code.slice('scotland:'.length) : code;
  const board = resolveScotlandBoard(cleanCode, configs);
  if (!board) {
    return false;
  }

  return true;
}

/**
 * Builds standard ReportingUnit<'scotland'> objects for the 15 Scottish reporting units.
 */
export function buildScotlandReportingUnits(
  boardsCsvPath?: string,
  specialBoardsCsvPath?: string,
): ReportingUnit<'scotland'>[] {
  const configs = loadScotlandBoardConfigs(boardsCsvPath, specialBoardsCsvPath);

  return configs.map((b) => ({
    id: reportingUnitId('scotland', b.code),
    officialCode: b.code,
    officialName: b.officialName,
    displayName: b.displayName,
    kind: b.kind,
    hospitalSites: [], // Linked in build.ts with sites
    operational: {
      from: b.openDate,
      to: b.closeDate,
    },
    predecessors: b.predecessors.map((p) => reportingUnitId('scotland', p)),
    successors: b.successors.map((s) => reportingUnitId('scotland', s)),
    notes: b.notes,
  }));
}
