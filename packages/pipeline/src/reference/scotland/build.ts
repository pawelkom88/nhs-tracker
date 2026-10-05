import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { ReferenceData, ReportingUnit } from '@kyw/model/reference';
import { referenceDataSchema } from '@kyw/model/reference';
import type { SourceRef } from '@kyw/model/source';
import { writeCanonicalJson } from '../../io/json.js';
import { buildScotlandReportingUnits } from './boards.js';
import { buildScotlandHospitalSites, getScotlandHospitalSitesForBoard } from './sites.js';
import { SCOTLAND_SPECIALTIES } from './specialties.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const DEFAULT_SCOTLAND_REFERENCE_OUTPUT_PATH = path.resolve(
  __dirname,
  '../../../../../data/scotland/reference.json',
);

export const SCOTLAND_REFERENCE_SOURCES: readonly SourceRef<'scotland'>[] = [
  {
    nation: 'scotland',
    publisher: 'Public Health Scotland',
    title: 'Stage of Treatment Waiting Times',
    url: 'https://www.opendata.nhs.scot/dataset/stage-of-treatment-waiting-times',
    licence: 'OGL-3.0',
    attribution:
      'Source: Public Health Scotland, Stage of Treatment Waiting Times (opendata.nhs.scot). Contains public sector information licensed under the Open Government Licence v3.0.',
  },
  {
    nation: 'scotland',
    publisher: 'Public Health Scotland',
    title: 'NHS Scotland Geography and Hospital Codes',
    url: 'https://www.opendata.nhs.scot/dataset/geography-codes-and-labels',
    licence: 'OGL-3.0',
    attribution:
      'Source: Public Health Scotland. Contains public sector information licensed under the Open Government Licence v3.0.',
  },
] as const;

export interface BuildScotlandReferenceOptions {
  readonly boardsCsvPath?: string;
  readonly specialBoardsCsvPath?: string;
  readonly hospitalsCsvPath?: string;
  readonly retrievedAt?: string;
}

/**
 * Builds and validates the complete Scotland ReferenceData bundle.
 */
export function buildScotlandReferenceData(
  options: BuildScotlandReferenceOptions = {},
): ReferenceData<'scotland'> {
  const baseUnits = buildScotlandReportingUnits(
    options.boardsCsvPath,
    options.specialBoardsCsvPath,
  );
  const allSites = buildScotlandHospitalSites(options.hospitalsCsvPath);

  // Link hospital site IDs to each reporting unit
  const reportingUnits: ReportingUnit<'scotland'>[] = baseUnits.map((unit) => {
    const sites = getScotlandHospitalSitesForBoard(unit.officialCode, options.hospitalsCsvPath);
    return {
      ...unit,
      hospitalSites: sites.map((s) => s.id),
    };
  });

  const retrievedAt = options.retrievedAt ?? '2026-10-01T00:00:00.000Z';

  const data: ReferenceData<'scotland'> = {
    nation: 'scotland',
    reportingUnits,
    hospitalSites: allSites,
    specialties: SCOTLAND_SPECIALTIES,
    retrievedAt,
    sources: SCOTLAND_REFERENCE_SOURCES,
  };

  // Validate against strict model schema
  return referenceDataSchema('scotland').parse(data);
}

/**
 * Builds Scotland reference data and writes it to disk as canonical JSON.
 */
export async function writeScotlandReferenceData(
  targetPath: string = DEFAULT_SCOTLAND_REFERENCE_OUTPUT_PATH,
  options: BuildScotlandReferenceOptions = {},
): Promise<ReferenceData<'scotland'>> {
  const data = buildScotlandReferenceData(options);
  await writeCanonicalJson(targetPath, data);
  return data;
}
