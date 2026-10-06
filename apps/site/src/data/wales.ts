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
  type HospitalSite,
  type ReportingUnit,
  type Specialty,
  type WalesReferenceData,
} from '@kyw/model/reference';
import { dataDir, readJson } from './load.js';

export type WalesUnitForSpecialty = ReportingUnit<'wales'> & {
  readonly state: PublishedUnitSpecialtyState;
};

export interface WalesUnitDetail {
  readonly unit: ReportingUnit<'wales'>;
  readonly specialty: Specialty<'wales'>;
  readonly state: PublishedUnitSpecialtyState;
  readonly figures: readonly PublishedFigure<'wales'>[];
  readonly hospitalSites: readonly HospitalSite<'wales'>[];
  readonly latestRelease: PublishedLatestRelease<'wales'>;
}

let cachedPublished: PublishedNation<'wales'> | null = null;
let cachedReference: WalesReferenceData | null = null;

/**
 * Clears in-memory build cache (primarily for test environments).
 */
export function _clearCache(): void {
  cachedPublished = null;
  cachedReference = null;
}

/**
 * Loads and validates Wales published waiting times data.
 * Memoised per build.
 */
export async function getPublished(): Promise<PublishedNation<'wales'>> {
  if (!cachedPublished) {
    const filePath = path.join(dataDir(), 'wales', 'published.json');
    cachedPublished = await readJson(filePath, publishedNationSchema('wales'));
  }
  return cachedPublished;
}

/**
 * Loads and validates Wales reference data.
 * Memoised per build.
 */
export async function getReference(): Promise<WalesReferenceData> {
  if (!cachedReference) {
    const filePath = path.join(dataDir(), 'wales', 'reference.json');
    cachedReference = await readJson(filePath, referenceDataSchema('wales'));
  }
  return cachedReference;
}

/**
 * Returns all Wales planned care specialties from reference data.
 */
export async function getSpecialties(): Promise<readonly Specialty<'wales'>[]> {
  const reference = await getReference();
  return reference.specialties;
}

/**
 * Finds a Wales specialty by URL slug.
 */
export async function getSpecialtyBySlug(
  slug: string,
): Promise<Specialty<'wales'> | undefined> {
  const specialties = await getSpecialties();
  return specialties.find((s) => s.slug === slug);
}

/**
 * Returns all Reporting Units with published entries for a given specialty.
 * Always sorted alphabetically by displayName using Intl.Collator('en-GB') (never ranked by wait times).
 */
export async function getUnitsForSpecialty(
  specialtyId: string,
): Promise<readonly WalesUnitForSpecialty[]> {
  const [published, reference] = await Promise.all([getPublished(), getReference()]);
  const unitMap = new Map(reference.reportingUnits.map((u) => [u.id as string, u]));

  const matchingEntries = published.entries.filter((e) => e.specialty === specialtyId);
  const result: WalesUnitForSpecialty[] = [];

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
): Promise<WalesUnitDetail | null> {
  const [published, reference] = await Promise.all([getPublished(), getReference()]);

  const unit = reference.reportingUnits.find((u) => u.id === unitId);
  if (!unit) return null;

  const specialty = reference.specialties.find((s) => s.id === specialtyId);
  if (!specialty) return null;

  const entry = published.entries.find(
    (e) => e.reportingUnit === unitId && e.specialty === specialtyId,
  );
  if (!entry) return null;

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
  };
}
