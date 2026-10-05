import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { hospitalSiteId, reportingUnitId } from '@kyw/model/ids';
import type { HospitalSite } from '@kyw/model/reference';
import { readCsv } from '../../io/csv.js';
import { toDisplayName } from '../names.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const DEFAULT_SCOTLAND_HOSPITALS_CSV_PATH = path.resolve(
  __dirname,
  '../../../fixtures/scotland/lookups/hospitals.csv',
);

interface RawHospitalCsvRow {
  readonly HospitalCode: string;
  readonly HospitalName: string;
  readonly AddressLine1?: string;
  readonly AddressLine2?: string;
  readonly AddressLine3?: string;
  readonly AddressLine4?: string;
  readonly Postcode?: string;
  readonly HealthBoard: string;
}

/**
 * Matches UK postcode formats (e.g. "G81 4DY", "EH16 4SA", "KA2 0BE", "IV2 3UJ").
 */
const UK_POSTCODE_PATTERN = /^[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}$/i;

/**
 * Heuristic to extract the town name from Scottish hospital address lines.
 *
 * Sourced from PHS hospital lookup (`c698f450-eeed-41a0-88f7-c1e40a568acc`), which has up to
 * 4 address lines. The town is consistently the last non-empty address line preceding the postcode.
 * This function filters out empty lines and any lines containing UK postcode strings, then selects
 * the last remaining address line as the town name.
 *
 * @see data-sources.md § Scotland
 * @see GLOSSARY.md Hospital Site
 */
export function extractTownFromAddressLines(
  lines: readonly (string | undefined | null)[],
): string | null {
  const validLines = lines
    .map((l) => (l ?? '').trim())
    .filter((l) => l.length > 0 && !UK_POSTCODE_PATTERN.test(l));

  if (validLines.length === 0) {
    return null;
  }

  const candidate = validLines[validLines.length - 1];
  return candidate ? toDisplayName(candidate) : null;
}

/**
 * Loads raw hospital records from CSV and applies domain rules:
 * - Town heuristic from address lines.
 * - Re-assigns Golden Jubilee National Hospital (D102H) from geographical NHS Greater Glasgow and Clyde
 *   (S08000031) to its reporting Special Health Board (SB0801).
 * - Strictly excludes postcode and coordinates.
 */
export function buildScotlandHospitalSites(
  hospitalsCsvPath: string = DEFAULT_SCOTLAND_HOSPITALS_CSV_PATH,
): HospitalSite<'scotland'>[] {
  const content = fs.readFileSync(hospitalsCsvPath, 'utf8');
  const rows = readCsv<RawHospitalCsvRow>(content, { columns: true });

  const sites: HospitalSite<'scotland'>[] = [];

  for (const row of rows) {
    const code = row.HospitalCode.trim();
    if (!code) continue;

    const addressLines = [row.AddressLine1, row.AddressLine2, row.AddressLine3, row.AddressLine4];
    const town = extractTownFromAddressLines(addressLines);

    // D102H (Golden Jubilee) is geographically under S08000031, but reports under SB0801
    const boardCode = code === 'D102H' ? 'SB0801' : row.HealthBoard.trim();

    sites.push({
      id: hospitalSiteId('scotland', code),
      officialCode: code,
      name: toDisplayName(row.HospitalName),
      town,
      reportingUnit: reportingUnitId('scotland', boardCode),
    });
  }

  return sites.sort((a, b) => a.name.localeCompare(b.name, 'en-GB'));
}

/**
 * Returns Hospital Sites belonging to a given Scottish Health Board code (e.g. "S08000024" or "SB0801").
 */
export function getScotlandHospitalSitesForBoard(
  boardCode: string,
  hospitalsCsvPath?: string,
): HospitalSite<'scotland'>[] {
  const cleanCode = boardCode.startsWith('scotland:')
    ? boardCode.slice('scotland:'.length)
    : boardCode;

  const allSites = buildScotlandHospitalSites(hospitalsCsvPath);
  const targetReportingUnitId = reportingUnitId('scotland', cleanCode);

  return allSites.filter((site) => site.reportingUnit === targetReportingUnitId);
}
