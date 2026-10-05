import { hospitalSiteId, reportingUnitId } from '@kyw/model/ids';
import type { HospitalSite } from '@kyw/model/reference';
import type { OdsStandardRow } from '../ods/columns.js';
import { toDisplayName } from '../names.js';

const HOSPITAL_NAME_PATTERN = /HOSPITAL|INFIRMARY|TREATMENT CENTRE|SURGICAL CENTRE|CLINIC/i;
const ALLOWED_SUB_TYPES = new Set(['RO29', 'RO320']);

export interface EnglandSitesLookupIndex {
  readonly etsByParent: ReadonlyMap<string, readonly OdsStandardRow[]>;
  readonly ephpsiteByParent: ReadonlyMap<string, readonly OdsStandardRow[]>;
  readonly ephpsiteByCode: ReadonlyMap<string, OdsStandardRow>;
  readonly ephpByCode: ReadonlyMap<string, OdsStandardRow>;
}

/**
 * Builds fast lookup maps from raw ODS tables for site and provider resolution.
 */
export function buildEnglandSitesIndex(
  ets: readonly OdsStandardRow[],
  ephp: readonly OdsStandardRow[],
  ephpsite: readonly OdsStandardRow[],
): EnglandSitesLookupIndex {
  const etsByParent = new Map<string, OdsStandardRow[]>();
  for (const row of ets) {
    if (row.parentOrgCode) {
      const existing = etsByParent.get(row.parentOrgCode);
      if (existing) {
        existing.push(row);
      } else {
        etsByParent.set(row.parentOrgCode, [row]);
      }
    }
  }

  const ephpsiteByParent = new Map<string, OdsStandardRow[]>();
  const ephpsiteByCode = new Map<string, OdsStandardRow>();
  for (const row of ephpsite) {
    ephpsiteByCode.set(row.code, row);
    if (row.parentOrgCode) {
      const existing = ephpsiteByParent.get(row.parentOrgCode);
      if (existing) {
        existing.push(row);
      } else {
        ephpsiteByParent.set(row.parentOrgCode, [row]);
      }
    }
  }

  const ephpByCode = new Map<string, OdsStandardRow>();
  for (const row of ephp) {
    ephpByCode.set(row.code, row);
  }

  return {
    etsByParent,
    ephpsiteByParent,
    ephpsiteByCode,
    ephpByCode,
  };
}

function isEligibleHospitalSiteRow(row: OdsStandardRow): boolean {
  // Must be currently open
  if (row.closeDate !== null) {
    return false;
  }

  // Exclude RO31 ePACT pseudo-sites
  if (row.subTypeRoles.includes('RO31')) {
    return false;
  }

  // Must match hospital/clinic name keywords or have hospital/hub role subtype
  const hasAllowedSubType = row.subTypeRoles.some((role) => ALLOWED_SUB_TYPES.has(role));
  const matchesNamePattern = HOSPITAL_NAME_PATTERN.test(row.name);

  return hasAllowedSubType || matchesNamePattern;
}

/**
 * Builds the list of Hospital Sites for an English Reporting Unit.
 */
export function buildEnglandHospitalSites(
  unitCode: string,
  kind: 'nhs-trust' | 'independent-sector-provider',
  rttName: string,
  index: EnglandSitesLookupIndex,
): HospitalSite<'england'>[] {
  const parentUnitId = reportingUnitId('england', unitCode);

  if (kind === 'nhs-trust') {
    const rawChildSites = index.etsByParent.get(unitCode) ?? [];
    const eligibleSites = rawChildSites.filter(isEligibleHospitalSiteRow);

    return eligibleSites
      .map((row) => ({
        id: hospitalSiteId('england', row.code),
        officialCode: row.code,
        name: toDisplayName(row.name),
        town: row.town ? toDisplayName(row.town) : null,
        reportingUnit: parentUnitId,
      }))
      .sort((a, b) => a.name.localeCompare(b.name, 'en-GB'));
  }

  // Independent Sector Provider
  const rawChildSites = index.ephpsiteByParent.get(unitCode) ?? [];
  const eligibleChildSites = rawChildSites.filter(isEligibleHospitalSiteRow);

  if (eligibleChildSites.length > 0) {
    return eligibleChildSites
      .map((row) => ({
        id: hospitalSiteId('england', row.code),
        officialCode: row.code,
        name: toDisplayName(row.name),
        town: row.town ? toDisplayName(row.town) : null,
        reportingUnit: parentUnitId,
      }))
      .sort((a, b) => a.name.localeCompare(b.name, 'en-GB'));
  }

  // If unit code itself is a site-level ISP code with no children, it acts as its own site
  const selfSiteRow = index.ephpsiteByCode.get(unitCode) ?? index.ephpByCode.get(unitCode);
  if (selfSiteRow) {
    return [
      {
        id: hospitalSiteId('england', unitCode),
        officialCode: unitCode,
        name: toDisplayName(selfSiteRow.name || rttName),
        town: selfSiteRow.town ? toDisplayName(selfSiteRow.town) : null,
        reportingUnit: parentUnitId,
      },
    ];
  }

  // No ODS site match
  return [];
}
