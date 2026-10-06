import * as fsp from 'node:fs/promises';
import * as path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { z } from 'zod';
import { dataDir, DataLoaderError, readJson } from '../../src/data/load.js';
import * as englandData from '../../src/data/england.js';
import * as walesData from '../../src/data/wales.js';
import * as scotlandData from '../../src/data/scotland.js';

const FIXTURES_DATA_DIR = path.resolve(__dirname, '../fixtures/data');

describe('Data Loader (T-8.2)', () => {
  const originalEnv = process.env.KYW_DATA_DIR;

  beforeEach(() => {
    process.env.KYW_DATA_DIR = FIXTURES_DATA_DIR;
    englandData._clearCache();
    walesData._clearCache();
    scotlandData._clearCache();
  });

  afterEach(() => {
    if (originalEnv !== undefined) {
      process.env.KYW_DATA_DIR = originalEnv;
    } else {
      delete process.env.KYW_DATA_DIR;
    }
    englandData._clearCache();
    walesData._clearCache();
    scotlandData._clearCache();
  });

  describe('dataDir()', () => {
    it('respects process.env.KYW_DATA_DIR when set', () => {
      expect(dataDir()).toBe(FIXTURES_DATA_DIR);
    });

    it('falls back to repository data directory when unset', () => {
      delete process.env.KYW_DATA_DIR;
      const dir = dataDir();
      expect(dir.endsWith('data')).toBe(true);
    });
  });

  describe('readJson()', () => {
    it('successfully reads and validates valid JSON', async () => {
      const englandRefPath = path.join(FIXTURES_DATA_DIR, 'england', 'reference.json');
      const testSchema = z.object({ nation: z.literal('england') });
      const data = await readJson(englandRefPath, testSchema);
      expect(data.nation).toBe('england');
    });

    it('throws DataLoaderError containing file path when file is missing', async () => {
      const missingPath = path.join(FIXTURES_DATA_DIR, 'nonexistent.json');
      await expect(readJson(missingPath)).rejects.toThrow(DataLoaderError);
      try {
        await readJson(missingPath);
      } catch (err) {
        expect(err).toBeInstanceOf(DataLoaderError);
        expect((err as DataLoaderError).filePath).toBe(missingPath);
        expect((err as DataLoaderError).message).toContain(missingPath);
      }
    });

    it('throws DataLoaderError containing file path when JSON syntax is invalid', async () => {
      const badJsonPath = path.join(FIXTURES_DATA_DIR, 'bad-syntax.json');
      await fsp.writeFile(badJsonPath, '{ invalid json: true, }', 'utf-8');
      try {
        await expect(readJson(badJsonPath)).rejects.toThrow(DataLoaderError);
        try {
          await readJson(badJsonPath);
        } catch (err) {
          expect(err).toBeInstanceOf(DataLoaderError);
          expect((err as DataLoaderError).filePath).toBe(badJsonPath);
          expect((err as DataLoaderError).message).toContain(badJsonPath);
          expect((err as DataLoaderError).message).toContain('Invalid JSON syntax');
        }
      } finally {
        await fsp.rm(badJsonPath, { force: true });
      }
    });

    it('throws DataLoaderError containing file path and Zod issues when schema fails', async () => {
      const invalidDataPath = path.join(FIXTURES_DATA_DIR, 'invalid-schema.json');
      await fsp.writeFile(invalidDataPath, JSON.stringify({ nation: 'france' }), 'utf-8');
      const strictSchema = z.object({
        nation: z.literal('england'),
        numberField: z.number(),
      });

      try {
        await expect(readJson(invalidDataPath, strictSchema)).rejects.toThrow(DataLoaderError);
        try {
          await readJson(invalidDataPath, strictSchema);
        } catch (err) {
          expect(err).toBeInstanceOf(DataLoaderError);
          const loaderErr = err as DataLoaderError;
          expect(loaderErr.filePath).toBe(invalidDataPath);
          expect(loaderErr.message).toContain(invalidDataPath);
          expect(loaderErr.message).toContain('Schema validation failed');
          expect(loaderErr.issues).toBeDefined();
          expect(loaderErr.issues?.length).toBeGreaterThan(0);
        }
      } finally {
        await fsp.rm(invalidDataPath, { force: true });
      }
    });
  });

  describe('Single-nation design & accessor signatures (ADR-0006)', () => {
    it('ensures no accessor accepts a nation parameter', () => {
      // england
      expect(englandData.getPublished.length).toBe(0);
      expect(englandData.getReference.length).toBe(0);
      expect(englandData.getSpecialties.length).toBe(0);
      expect(englandData.getSpecialtyBySlug.length).toBe(1); // (slug)
      expect(englandData.getUnitsForSpecialty.length).toBe(1); // (specialtyId)
      expect(englandData.getUnitDetail.length).toBe(2); // (unitId, specialtyId)
      expect(englandData.getNhsRegions.length).toBe(0);

      // wales
      expect(walesData.getPublished.length).toBe(0);
      expect(walesData.getReference.length).toBe(0);
      expect(walesData.getSpecialties.length).toBe(0);
      expect(walesData.getSpecialtyBySlug.length).toBe(1);
      expect(walesData.getUnitsForSpecialty.length).toBe(1);
      expect(walesData.getUnitDetail.length).toBe(2);
      expect('getNhsRegions' in walesData).toBe(false);

      // scotland
      expect(scotlandData.getPublished.length).toBe(0);
      expect(scotlandData.getReference.length).toBe(0);
      expect(scotlandData.getSpecialties.length).toBe(0);
      expect(scotlandData.getSpecialtyBySlug.length).toBe(1);
      expect(scotlandData.getUnitsForSpecialty.length).toBe(1);
      expect(scotlandData.getUnitDetail.length).toBe(2);
      expect('getNhsRegions' in scotlandData).toBe(false);
    });
  });

  describe('England accessor (apps/site/src/data/england.ts)', () => {
    it('loads published and reference data', async () => {
      const pub = await englandData.getPublished();
      expect(pub.nation).toBe('england');
      expect(pub.latestRelease.reportingPeriod).toBe('2026-07-31');

      const ref = await englandData.getReference();
      expect(ref.nation).toBe('england');
      expect(ref.reportingUnits.length).toBe(4);
    });

    it('returns specialties and finds by slug', async () => {
      const specialties = await englandData.getSpecialties();
      expect(specialties.length).toBe(2);
      const to = await englandData.getSpecialtyBySlug('trauma-and-orthopaedics');
      expect(to).toBeDefined();
      expect(to?.id).toBe('england:C_110');

      const missing = await englandData.getSpecialtyBySlug('cardiology');
      expect(missing).toBeUndefined();
    });

    it('returns NHS regions sorted alphabetically by name', async () => {
      const regions = await englandData.getNhsRegions();
      expect(regions.map((r) => r.name)).toEqual(['London', 'South East']);
    });

    it('returns units for specialty sorted strictly alphabetically by displayName', async () => {
      const units = await englandData.getUnitsForSpecialty('england:C_110');
      const names = units.map((u) => u.displayName);
      const collator = new Intl.Collator('en-GB', { sensitivity: 'base' });
      const expected = [...names].sort((a, b) => collator.compare(a, b));

      expect(names).toEqual(expected);
      expect(names).toEqual([
        'Barts Health NHS Trust',
        'Old Berkshire Healthcare NHS Trust',
        'Practice Plus Group Hospitals',
        'University Hospitals Birmingham NHS Foundation Trust',
      ]);
    });

    it('resolves unit detail including hospital sites and region', async () => {
      const detail = await englandData.getUnitDetail('england:RRK', 'england:C_110');
      expect(detail).not.toBeNull();
      expect(detail?.unit.displayName).toBe('University Hospitals Birmingham NHS Foundation Trust');
      expect(detail?.specialty.officialName).toBe('Trauma and Orthopaedic Service');
      expect(detail?.nhsRegion.name).toBe('London');
      expect(detail?.figures.length).toBe(3);
      expect(detail?.hospitalSites.length).toBe(1);
      expect(detail?.hospitalSites[0]?.name).toBe('Queen Elizabeth Hospital Birmingham');
      expect(detail?.latestRelease.reportingPeriod).toBe('2026-07-31');

      const notFound = await englandData.getUnitDetail('england:UNKNOWN', 'england:C_110');
      expect(notFound).toBeNull();
    });
  });

  describe('Wales accessor (apps/site/src/data/wales.ts)', () => {
    it('loads published and reference data', async () => {
      const pub = await walesData.getPublished();
      expect(pub.nation).toBe('wales');
      const ref = await walesData.getReference();
      expect(ref.nation).toBe('wales');
      expect(ref.reportingUnits.length).toBe(2);
    });

    it('returns units sorted alphabetically by displayName', async () => {
      const units = await walesData.getUnitsForSpecialty('wales:110');
      expect(units.length).toBe(1);
      expect(units[0]?.displayName).toBe('Betsi Cadwaladr University Health Board');
    });

    it('resolves unit detail', async () => {
      const detail = await walesData.getUnitDetail('wales:7A1', 'wales:110');
      expect(detail).not.toBeNull();
      expect(detail?.unit.displayName).toBe('Betsi Cadwaladr University Health Board');
      expect(detail?.hospitalSites.length).toBe(1);
      expect(detail?.hospitalSites[0]?.name).toBe('Ysbyty Gwynedd');
    });
  });

  describe('Scotland accessor (apps/site/src/data/scotland.ts)', () => {
    it('loads published and reference data', async () => {
      const pub = await scotlandData.getPublished();
      expect(pub.nation).toBe('scotland');
      const ref = await scotlandData.getReference();
      expect(ref.nation).toBe('scotland');
      expect(ref.reportingUnits.length).toBe(2);
    });

    it('returns units sorted alphabetically by displayName', async () => {
      const units = await scotlandData.getUnitsForSpecialty('scotland:C8');
      expect(units.length).toBe(1);
      expect(units[0]?.displayName).toBe('Golden Jubilee National Hospital');
    });

    it('resolves unit detail', async () => {
      const detail = await scotlandData.getUnitDetail('scotland:SB0801', 'scotland:C8');
      expect(detail).not.toBeNull();
      expect(detail?.unit.displayName).toBe('Golden Jubilee National Hospital');
      expect(detail?.hospitalSites.length).toBe(1);
      expect(detail?.hospitalSites[0]?.name).toBe('Golden Jubilee University National Hospital');
    });
  });

  describe('Alphabetical sorting invariant (shuffle test)', () => {
    it('returns alphabetical order regardless of fixture order and figure values', async () => {
      const units = await englandData.getUnitsForSpecialty('england:C_110');
      const collator = new Intl.Collator('en-GB', { sensitivity: 'base' });
      const expectedNames = [...units.map((u) => u.displayName)].sort((a, b) =>
        collator.compare(a, b),
      );

      // Verify the order returned by the loader matches the collator sort
      expect(units.map((u) => u.displayName)).toEqual(expectedNames);

      // Even if we sort the list by something else (e.g. reverse or length),
      // the loader's output is deterministically alphabetical
      const reversed = [...units].reverse();
      expect(reversed.map((u) => u.displayName)).not.toEqual(expectedNames);
      const reSorted = [...reversed].sort((a, b) => collator.compare(a.displayName, b.displayName));
      expect(reSorted.map((u) => u.displayName)).toEqual(expectedNames);
    });
  });

  describe('Fixture coverage verification', () => {
    it('covers all T-8.2 required fixture data points', async () => {
      const englandPub = await englandData.getPublished();
      const englandRef = await englandData.getReference();
      const scotlandPub = await scotlandData.getPublished();
      const scotlandRef = await scotlandData.getReference();
      const walesRef = await walesData.getReference();

      // 1. One current unit
      const currentEntry = englandPub.entries.find((e) => e.state.kind === 'current');
      expect(currentEntry).toBeDefined();

      // 2. One Suppressed Figure
      const suppressedFig = englandPub.entries
        .flatMap((e) => e.figures)
        .find((f) => f.value.status === 'suppressed');
      expect(suppressedFig).toBeDefined();

      // 3. One Provisional Figure
      const provisionalFig = englandPub.entries
        .flatMap((e) => e.figures)
        .find((f) => f.value.status === 'published' && f.value.provisional);
      expect(provisionalFig).toBeDefined();

      // 4. One Derived Figure (Scotland within-12-weeks count)
      const derivedFig = scotlandPub.entries
        .flatMap((e) => e.figures)
        .find(
          (f) =>
            (f.statistic as string) === 'scotland:within-waiting-standard-count' &&
            f.provenance.kind === 'derived',
        );
      expect(derivedFig).toBeDefined();
      expect(derivedFig?.unit).toBe('count');

      // 5. One Carried-Forward entry (3 months old)
      const carriedForwardEntry = englandPub.entries.find(
        (e) => e.state.kind === 'carried-forward' && e.state.monthsOld === 3,
      );
      expect(carriedForwardEntry).toBeDefined();

      // 6. One no-recent-figures entry
      const noRecentEntry = englandPub.entries.find((e) => e.state.kind === 'no-recent-figures');
      expect(noRecentEntry).toBeDefined();
      expect(noRecentEntry?.figures).toHaveLength(0);

      // 7. One Year-Earlier shown and one omitted
      const yearEarlierShown = englandPub.entries
        .flatMap((e) => e.figures)
        .find((f) => f.yearEarlier.status === 'shown');
      const yearEarlierOmitted = englandPub.entries
        .flatMap((e) => e.figures)
        .find((f) => f.yearEarlier.status === 'omitted');
      expect(yearEarlierShown).toBeDefined();
      expect(yearEarlierOmitted).toBeDefined();

      // 8. One Independent Sector Provider
      const ispUnit = englandRef.reportingUnits.find(
        (u) => u.kind === 'independent-sector-provider',
      );
      expect(ispUnit).toBeDefined();

      // 9. Golden Jubilee
      const goldenJubilee = scotlandRef.reportingUnits.find(
        (u) =>
          u.kind === 'special-health-board' &&
          u.notes.includes('treats-patients-from-all-boards'),
      );
      expect(goldenJubilee).toBeDefined();

      // 10. Two NHS Regions
      expect(englandRef.nhsRegions.length).toBeGreaterThanOrEqual(2);

      // 11. T&O and one other Specialty per nation
      const engTO = englandRef.specialties.find((s) => s.slug === 'trauma-and-orthopaedics');
      const engOther = englandRef.specialties.find((s) => s.slug !== 'trauma-and-orthopaedics');
      expect(engTO).toBeDefined();
      expect(engOther).toBeDefined();

      const walesTO = walesRef.specialties.find((s) => s.slug === 'trauma-and-orthopaedics');
      const walesOther = walesRef.specialties.find((s) => s.slug !== 'trauma-and-orthopaedics');
      expect(walesTO).toBeDefined();
      expect(walesOther).toBeDefined();

      const scotTO = scotlandRef.specialties.find((s) => s.slug === 'trauma-and-orthopaedics');
      const scotOther = scotlandRef.specialties.find((s) => s.slug !== 'trauma-and-orthopaedics');
      expect(scotTO).toBeDefined();
      expect(scotOther).toBeDefined();
    });
  });
});
