import { reportingUnitId } from '@kyw/model/ids';
import type {
  EnglandReportingUnitKind,
  HospitalSite,
  OperationalPeriod,
  ReportingUnit,
} from '@kyw/model/reference';
import type { OdsStandardRow } from '../ods/columns.js';
import { toDisplayName } from '../names.js';
import { regionFor } from './regions.js';
import { buildEnglandHospitalSites, buildEnglandSitesIndex } from './sites.js';

export interface EnglandRttProviderInput {
  readonly code: string;
  readonly rttName: string;
  readonly kind: EnglandReportingUnitKind;
  readonly regionCode: string;
}

export interface EnglandOdsData {
  readonly etr: readonly OdsStandardRow[];
  readonly ets: readonly OdsStandardRow[];
  readonly ephp: readonly OdsStandardRow[];
  readonly ephpsite: readonly OdsStandardRow[];
}

export interface EnglandReportingUnitsResult {
  readonly reportingUnits: readonly ReportingUnit<'england'>[];
  readonly hospitalSites: readonly HospitalSite<'england'>[];
  readonly warnings: readonly string[];
}

function formatOdsDateToIso(odsDate: string | null): string | null {
  if (odsDate?.length !== 8) {
    return null;
  }
  const yyyy = odsDate.slice(0, 4);
  const mm = odsDate.slice(4, 6);
  const dd = odsDate.slice(6, 8);
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * Builds England Reporting Units and their associated Hospital Sites.
 */
export function buildEnglandReportingUnitsAndSites(
  providers: readonly EnglandRttProviderInput[],
  ods: EnglandOdsData,
): EnglandReportingUnitsResult {
  const sitesIndex = buildEnglandSitesIndex(ods.ets, ods.ephp, ods.ephpsite);

  const etrByCode = new Map<string, OdsStandardRow>();
  for (const row of ods.etr) {
    etrByCode.set(row.code, row);
  }

  const reportingUnits: ReportingUnit<'england'>[] = [];
  const allHospitalSites: HospitalSite<'england'>[] = [];
  const seenSiteIds = new Set<string>();
  const warnings: string[] = [];

  for (const provider of providers) {
    const region = regionFor(provider.regionCode);

    // Operational dates lookup
    let odsRow: OdsStandardRow | undefined;
    if (provider.kind === 'nhs-trust') {
      odsRow = etrByCode.get(provider.code);
    } else {
      odsRow =
        sitesIndex.ephpByCode.get(provider.code) ?? sitesIndex.ephpsiteByCode.get(provider.code);
    }

    if (!odsRow) {
      warnings.push(`Unit "${provider.code}" (${provider.rttName}) not found in ODS data`);
    }

    const operational: OperationalPeriod = {
      from: formatOdsDateToIso(odsRow?.openDate ?? null),
      to: formatOdsDateToIso(odsRow?.closeDate ?? null),
    };

    const sites = buildEnglandHospitalSites(
      provider.code,
      provider.kind,
      provider.rttName,
      sitesIndex,
    );

    for (const site of sites) {
      if (!seenSiteIds.has(site.id)) {
        seenSiteIds.add(site.id);
        allHospitalSites.push(site);
      }
    }

    const unit: ReportingUnit<'england'> = {
      id: reportingUnitId('england', provider.code),
      officialCode: provider.code,
      officialName: provider.rttName,
      displayName: toDisplayName(provider.rttName),
      kind: provider.kind,
      nhsRegion: region.id,
      hospitalSites: sites.map((s) => s.id),
      operational,
      predecessors: [],
      successors: [],
      notes: [],
    };

    reportingUnits.push(unit);
  }

  return {
    reportingUnits,
    hospitalSites: allHospitalSites,
    warnings,
  };
}
