import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { HospitalSite, ReferenceData, ReportingUnit } from '@kyw/model/reference';
import { referenceDataSchema } from '@kyw/model/reference';
import type { SourceRef } from '@kyw/model/source';
import { writeCanonicalJson } from '../../io/json.js';
import { loadOdsReport, type LoadOdsReportOptions } from '../ods/client.js';
import type { OdsSuccessionRow } from '../ods/columns.js';
import { ENGLAND_NHS_REGIONS } from './regions.js';
import { ENGLAND_SPECIALTIES } from './specialties.js';
import {
  buildEnglandSuccessionIndex,
  parseEnglandSuccessions,
  populateEnglandReportingUnitsSuccessions,
} from './succession.js';
import {
  buildEnglandReportingUnitsAndSites,
  type EnglandOdsData,
  type EnglandRttProviderInput,
} from './units.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const DEFAULT_ENGLAND_REFERENCE_OUTPUT_PATH = path.resolve(
  __dirname,
  '../../../../../data/england/reference.json',
);

export const ENGLAND_REFERENCE_SOURCES: readonly SourceRef<'england'>[] = [
  {
    nation: 'england',
    publisher: 'NHS England',
    title: 'Consultant-led Referral to Treatment (RTT) Waiting Times',
    url: 'https://www.england.nhs.uk/statistics/statistical-work-areas/rtt-waiting-times/',
    licence: 'OGL-3.0',
    attribution:
      'Source: NHS England, Consultant-led Referral to Treatment (RTT) Waiting Times. Contains public sector information licensed under the Open Government Licence v3.0.',
  },
  {
    nation: 'england',
    publisher: 'NHS England Organisation Data Service',
    title: 'Organisation Data Service: Trusts, Sites and Successors',
    url: 'https://www.odsdatasearchandexport.nhs.uk/',
    licence: 'OGL-3.0',
    attribution:
      'Contains Organisation Data Service data © NHS England, licensed under the Open Government Licence v3.0.',
  },
] as const;

export interface FullEnglandOdsData extends EnglandOdsData {
  readonly succ: readonly OdsSuccessionRow[];
}

export interface BuildEnglandReferenceOptions {
  readonly providers?: readonly EnglandRttProviderInput[];
  readonly ods?: FullEnglandOdsData;
  readonly odsOptions?: LoadOdsReportOptions;
  readonly retrievedAt?: string;
}

/**
 * Loads the complete set of England ODS reports needed for reference data assembly.
 */
export async function loadEnglandReferenceOds(
  options: LoadOdsReportOptions = {},
): Promise<FullEnglandOdsData> {
  const [etr, ets, ephp, ephpsite, succ] = await Promise.all([
    loadOdsReport('etr', options),
    loadOdsReport('ets', options),
    loadOdsReport('ephp', options),
    loadOdsReport('ephpsite', options),
    loadOdsReport('succ', options),
  ]);
  return { etr, ets, ephp, ephpsite, succ };
}

/**
 * Extracts default English provider inputs from raw ODS tables when no RTT release is provided.
 */
export function extractDefaultEnglandProviders(ods: FullEnglandOdsData): EnglandRttProviderInput[] {
  const englishRegionCodes = new Set(ENGLAND_NHS_REGIONS.map((r) => r.officialCode));
  const providers: EnglandRttProviderInput[] = [];
  const seen = new Set<string>();

  for (const row of ods.etr) {
    if (row.nhsRegionCode && englishRegionCodes.has(row.nhsRegionCode)) {
      if (!seen.has(row.code)) {
        seen.add(row.code);
        providers.push({
          code: row.code,
          rttName: row.name,
          kind: 'nhs-trust',
          regionCode: row.nhsRegionCode,
        });
      }
    }
  }

  for (const row of ods.ephp) {
    if (row.nhsRegionCode && englishRegionCodes.has(row.nhsRegionCode)) {
      if (!seen.has(row.code)) {
        seen.add(row.code);
        providers.push({
          code: row.code,
          rttName: row.name,
          kind: 'independent-sector-provider',
          regionCode: row.nhsRegionCode,
        });
      }
    }
  }

  for (const row of ods.ephpsite) {
    if (row.nhsRegionCode && englishRegionCodes.has(row.nhsRegionCode)) {
      if (!seen.has(row.code)) {
        seen.add(row.code);
        providers.push({
          code: row.code,
          rttName: row.name,
          kind: 'independent-sector-provider',
          regionCode: row.nhsRegionCode,
        });
      }
    }
  }

  return providers;
}

/**
 * Builds and validates the complete England ReferenceData bundle.
 */
export async function buildEnglandReferenceData(
  options: BuildEnglandReferenceOptions = {},
): Promise<ReferenceData<'england'>> {
  const ods = options.ods ?? (await loadEnglandReferenceOds(options.odsOptions));
  const rawProviders = options.providers ?? extractDefaultEnglandProviders(ods);

  // Deduplicate providers by official code
  const uniqueProvidersMap = new Map<string, EnglandRttProviderInput>();
  for (const p of rawProviders) {
    if (!uniqueProvidersMap.has(p.code)) {
      uniqueProvidersMap.set(p.code, p);
    }
  }
  const providers = Array.from(uniqueProvidersMap.values());

  const { reportingUnits: rawUnits, hospitalSites: rawSites } = buildEnglandReportingUnitsAndSites(
    providers,
    ods,
  );

  const succRecords = parseEnglandSuccessions(ods.succ);
  const succIndex = buildEnglandSuccessionIndex(succRecords);
  const unitsWithSuccession = populateEnglandReportingUnitsSuccessions(rawUnits, succIndex);

  const reportingUnits: ReportingUnit<'england'>[] = [...unitsWithSuccession].sort((a, b) =>
    a.id.localeCompare(b.id),
  );
  const hospitalSites: HospitalSite<'england'>[] = [...rawSites].sort((a, b) =>
    a.id.localeCompare(b.id),
  );

  const retrievedAt = options.retrievedAt ?? '2026-10-01T00:00:00.000Z';

  const nhsRegions = ENGLAND_NHS_REGIONS.map((r) => ({
    id: r.id,
    officialCode: r.officialCode,
    name: r.name,
  }));

  const data: ReferenceData<'england'> = {
    nation: 'england',
    nhsRegions,
    reportingUnits,
    hospitalSites,
    specialties: ENGLAND_SPECIALTIES,
    retrievedAt,
    sources: ENGLAND_REFERENCE_SOURCES,
  };

  return referenceDataSchema('england').parse(data);
}

/**
 * Builds England reference data and writes it to disk as canonical JSON.
 */
export async function writeEnglandReferenceData(
  targetPath: string = DEFAULT_ENGLAND_REFERENCE_OUTPUT_PATH,
  options: BuildEnglandReferenceOptions = {},
): Promise<ReferenceData<'england'>> {
  const data = await buildEnglandReferenceData(options);
  await writeCanonicalJson(targetPath, data);
  return data;
}
