import * as path from 'node:path';
import {
  publishedNationSchema,
  type PublishedFigure,
  type PublishedLatestRelease,
  type PublishedNation,
  type PublishedUnitSpecialtyState,
} from '@kyw/model/published';
import {
  referenceDataSchema,
  type EnglandReferenceData,
  type HospitalSite,
  type NhsRegion,
  type ReportingUnit,
  type Specialty,
} from '@kyw/model/reference';
import { dataDir, readJson } from './load.js';

export type EnglandUnitForSpecialty = ReportingUnit<'england'> & {
  readonly state: PublishedUnitSpecialtyState;
};

export interface EnglandUnitDetail {
  readonly unit: ReportingUnit<'england'>;
  readonly specialty: Specialty<'england'>;
  readonly state: PublishedUnitSpecialtyState;
  readonly figures: readonly PublishedFigure<'england'>[];
  readonly hospitalSites: readonly HospitalSite<'england'>[];
  readonly latestRelease: PublishedLatestRelease<'england'>;
  readonly nhsRegion: NhsRegion;
}

let cachedPublished: PublishedNation<'england'> | null = null;
let cachedReference: EnglandReferenceData | null = null;

/**
 * Clears in-memory build cache (primarily for test environments).
 */
export function _clearCache(): void {
  cachedPublished = null;
  cachedReference = null;
}

/**
 * Loads and validates England published waiting times data.
 * Memoised per build.
 */
export async function getPublished(): Promise<PublishedNation<'england'>> {
  if (!cachedPublished) {
    const filePath = path.join(dataDir(), 'england', 'published.json');
    cachedPublished = await readJson(filePath, publishedNationSchema('england'));
  }
  return cachedPublished;
}

/**
 * Loads and validates England reference data.
 * Memoised per build.
 */
export async function getReference(): Promise<EnglandReferenceData> {
  if (!cachedReference) {
    const filePath = path.join(dataDir(), 'england', 'reference.json');
    cachedReference = await readJson(filePath, referenceDataSchema('england'));
  }
  return cachedReference;
}

/**
 * Returns all England planned care specialties from reference data.
 */
export async function getSpecialties(): Promise<readonly Specialty<'england'>[]> {
  const reference = await getReference();
  return reference.specialties;
}

/**
 * Finds an England specialty by URL slug.
 */
export async function getSpecialtyBySlug(
  slug: string,
): Promise<Specialty<'england'> | undefined> {
  const specialties = await getSpecialties();
  return specialties.find((s) => s.slug === slug);
}

/**
 * Returns all England NHS administrative regions, sorted alphabetically by name.
 */
export async function getNhsRegions(): Promise<readonly NhsRegion[]> {
  const reference = await getReference();
  const collator = new Intl.Collator('en-GB', { sensitivity: 'base' });
  return [...reference.nhsRegions].sort((a, b) => collator.compare(a.name, b.name));
}

/**
 * Returns all Reporting Units with published entries for a given specialty.
 * Always sorted alphabetically by displayName using Intl.Collator('en-GB') (never ranked by wait times).
 */
export async function getUnitsForSpecialty(
  specialtyId: string,
): Promise<readonly EnglandUnitForSpecialty[]> {
  const [published, reference] = await Promise.all([getPublished(), getReference()]);
  const unitMap = new Map(reference.reportingUnits.map((u) => [u.id as string, u]));

  const matchingEntries = published.entries.filter((e) => e.specialty === specialtyId);
  const result: EnglandUnitForSpecialty[] = [];

  for (const entry of matchingEntries) {
    const unit = unitMap.get(entry.reportingUnit);
    if (unit) {
      result.push({
        ...unit,
        state: entry.state,
      });
    }
  }

  const collator = new Intl.Collator('en-GB', { sensitivity: 'base' });
  return result.sort((a, b) => {
    const cmp = collator.compare(a.displayName, b.displayName);
    if (cmp !== 0) return cmp;
    return a.officialCode.localeCompare(b.officialCode);
  });
}

/**
 * Resolves full Reporting Unit details and waiting figures for a specific unit and specialty.
 * Returns null if the unit, specialty, or published entry is not found.
 */
export async function getUnitDetail(
  unitId: string,
  specialtyId: string,
): Promise<EnglandUnitDetail | null> {
  const [published, reference] = await Promise.all([getPublished(), getReference()]);

  const unit = reference.reportingUnits.find((u) => u.id === unitId);
  if (!unit) return null;

  const specialty = reference.specialties.find((s) => s.id === specialtyId);
  if (!specialty) return null;

  const entry = published.entries.find(
    (e) => e.reportingUnit === unitId && e.specialty === specialtyId,
  );
  if (!entry) return null;

  const region = reference.nhsRegions.find((r) => r.id === unit.nhsRegion);
  if (!region) return null;

  const siteIdSet = new Set(unit.hospitalSites.map((id) => id as string));
  const collator = new Intl.Collator('en-GB', { sensitivity: 'base' });
  const hospitalSites = reference.hospitalSites
    .filter((site) => siteIdSet.has(site.id) || site.reportingUnit === unit.id)
    .sort((a, b) => collator.compare(a.name, b.name));

  return {
    unit,
    specialty,
    state: entry.state,
    figures: entry.figures,
    hospitalSites,
    latestRelease: published.latestRelease,
    nhsRegion: region,
  };
}
