import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { ReferenceData, ReportingUnit } from '@kyw/model/reference';
import { referenceDataSchema } from '@kyw/model/reference';
import type { SourceRef } from '@kyw/model/source';
import { writeCanonicalJson } from '../../io/json.js';
import { buildWalesReportingUnits } from './boards.js';
import { buildWalesHospitalSites, getWalesHospitalSitesForBoard } from './sites.js';
import { WALES_SPECIALTIES } from './specialties.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const DEFAULT_WALES_REFERENCE_OUTPUT_PATH = path.resolve(
  __dirname,
  '../../../../../data/wales/reference.json',
);

export const WALES_REFERENCE_SOURCES: readonly SourceRef<'wales'>[] = [
  {
    nation: 'wales',
    publisher: 'Welsh Government, StatsWales',
    title: 'NHS Activity and Performance Summary: Referral to Treatment (RTT)',
    url: 'https://stats.gov.wales/en-GB/topic/50/performance-and-waiting-times',
    licence: 'OGL-3.0',
    attribution:
      'Source: Welsh Government, StatsWales (data provider: Digital Health and Care Wales). Contains public sector information licensed under the Open Government Licence v3.0.',
  },
  {
    nation: 'wales',
    publisher: 'NHS England Organisation Data Service',
    title: 'Organisation Data Service: Welsh Local Health Boards and Sites',
    url: 'https://www.odsdatasearchandexport.nhs.uk/',
    licence: 'OGL-3.0',
    attribution:
      'Contains Organisation Data Service data © NHS England, licensed under the Open Government Licence v3.0.',
  },
] as const;

export interface BuildWalesReferenceOptions {
  readonly retrievedAt?: string;
}

/**
 * Builds and validates the complete Wales ReferenceData bundle.
 */
export function buildWalesReferenceData(
  options: BuildWalesReferenceOptions = {},
): ReferenceData<'wales'> {
  const baseUnits = buildWalesReportingUnits();
  const allSites = buildWalesHospitalSites();

  // Link hospital site IDs to each reporting unit
  const reportingUnits: ReportingUnit<'wales'>[] = baseUnits.map((unit) => {
    const sites = getWalesHospitalSitesForBoard(unit.officialCode);
    return {
      ...unit,
      hospitalSites: sites.map((s) => s.id),
    };
  });

  const retrievedAt = options.retrievedAt ?? '2026-10-01T00:00:00.000Z';

  const data: ReferenceData<'wales'> = {
    nation: 'wales',
    reportingUnits,
    hospitalSites: allSites,
    specialties: WALES_SPECIALTIES,
    retrievedAt,
    sources: WALES_REFERENCE_SOURCES,
  };

  // Validate against strict model schema
  return referenceDataSchema('wales').parse(data);
}

/**
 * Builds Wales reference data and writes it to disk as canonical JSON.
 */
export async function writeWalesReferenceData(
  targetPath: string = DEFAULT_WALES_REFERENCE_OUTPUT_PATH,
  options: BuildWalesReferenceOptions = {},
): Promise<ReferenceData<'wales'>> {
  const data = buildWalesReferenceData(options);
  await writeCanonicalJson(targetPath, data);
  return data;
}
