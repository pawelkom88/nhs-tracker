import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { describe, expect, it } from 'vitest';
import { referenceDataSchema } from '@kyw/model/reference';
import { SchemaChangeError } from '../../src/errors.js';
import { canonicalJsonStringify } from '../../src/io/json.js';
import {
  WALES_BOARDS,
  WALES_LEGACY_ONS_CODES,
  WALES_NON_REPORTING_CODES,
  buildWalesReportingUnits,
  isSameEntityAcrossWales,
  resolveWalesBoardFromOdsCode,
  resolveWalesBoardFromOnsCode,
} from '../../src/reference/wales/boards.js';
import {
  buildWalesHospitalSites,
  getWalesHospitalSitesForBoard,
} from '../../src/reference/wales/sites.js';
import {
  RESERVED_SPECIALTY_SLUGS,
  WALES_SPECIALTIES,
  assertKnownWalesSpecialties,
  specialtyForWales,
} from '../../src/reference/wales/specialties.js';
import {
  DEFAULT_WALES_REFERENCE_OUTPUT_PATH,
  buildWalesReferenceData,
  writeWalesReferenceData,
} from '../../src/reference/wales/build.js';

describe('Wales Reference Data', () => {
  describe('Boards & Crosswalk', () => {
    it('contains exactly 7 active health boards', () => {
      expect(WALES_BOARDS).toHaveLength(7);
      const odsCodes = WALES_BOARDS.map((b) => b.odsCode);
      expect(odsCodes).toEqual(['7A1', '7A2', '7A3', '7A4', '7A5', '7A6', '7A7']);
    });

    it('resolves active ONS codes to correct ODS boards', () => {
      expect(resolveWalesBoardFromOnsCode('W11000023')?.odsCode).toBe('7A1');
      expect(resolveWalesBoardFromOnsCode('W11000024')?.odsCode).toBe('7A7');
      expect(resolveWalesBoardFromOnsCode('W11000025')?.odsCode).toBe('7A2');
      expect(resolveWalesBoardFromOnsCode('W11000031')?.odsCode).toBe('7A3');
      expect(resolveWalesBoardFromOnsCode('W11000030')?.odsCode).toBe('7A5');
      expect(resolveWalesBoardFromOnsCode('W11000028')?.odsCode).toBe('7A6');
      expect(resolveWalesBoardFromOnsCode('W11000029')?.odsCode).toBe('7A4');
    });

    it('resolves ODS codes (with or without nation prefix) to correct config', () => {
      expect(resolveWalesBoardFromOdsCode('7A1').onsCode).toBe('W11000023');
      expect(resolveWalesBoardFromOdsCode('wales:7A5').onsCode).toBe('W11000030');
    });

    it('drops legacy pre-2019 ONS codes by returning null', () => {
      for (const legacy of WALES_LEGACY_ONS_CODES) {
        expect(resolveWalesBoardFromOnsCode(legacy)).toBeNull();
      }
    });

    it('skips non-reporting aggregate codes (All Wales, South East Wales Region) by returning null', () => {
      for (const nonReporting of WALES_NON_REPORTING_CODES) {
        expect(resolveWalesBoardFromOnsCode(nonReporting)).toBeNull();
      }
    });

    it('throws SchemaChangeError on unknown ONS or ODS code', () => {
      expect(() => {
        resolveWalesBoardFromOnsCode('W11999999');
      }).toThrow(SchemaChangeError);
      expect(() => {
        resolveWalesBoardFromOdsCode('7A9');
      }).toThrow(SchemaChangeError);
    });

    it('evaluates continuity correctly across reporting periods', () => {
      // Current board after 2019-04-01 is same entity
      expect(isSameEntityAcrossWales('7A1', '2024-07-31', '2025-07-31')).toBe(true);
      expect(isSameEntityAcrossWales('wales:7A3', '2025-01-31', '2026-01-31')).toBe(true);

      // Swansea Bay (7A3) and Cwm Taf Morgannwg (7A5) across 2019 boundary change are not same entity
      expect(isSameEntityAcrossWales('7A3', '2018-07-31', '2019-07-31')).toBe(false);
      expect(isSameEntityAcrossWales('7A5', '2018-07-31', '2019-07-31')).toBe(false);

      // Other unaffected boards across 2019 boundary
      expect(isSameEntityAcrossWales('7A1', '2018-07-31', '2019-07-31')).toBe(true);
    });

    it('builds standard ReportingUnit objects with expected structure', () => {
      const units = buildWalesReportingUnits();
      expect(units).toHaveLength(7);
      for (const unit of units) {
        expect(unit.id).toMatch(/^wales:7A[1-7]$/);
        expect(unit.kind).toBe('health-board');
        expect(unit.officialName).toBeTruthy();
        expect(unit.displayName).toBeTruthy();
        expect(unit.operational.from).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        expect(unit.operational.to).toBeNull();
        expect(unit.predecessors).toEqual([]);
        expect(unit.successors).toEqual([]);
        expect(unit.notes).toEqual([]);
      }
    });
  });

  describe('Hospital Sites', () => {
    it('builds valid hospital sites with no postcodes or extraneous fields', () => {
      const sites = buildWalesHospitalSites();
      expect(sites.length).toBeGreaterThan(30);

      for (const site of sites) {
        expect(site.id).toMatch(/^wales:7A[1-7][A-Z0-9]+$/);
        expect(site.officialCode).toBeTruthy();
        expect(site.name).toBeTruthy();
        expect(site.town).toBeTruthy();
        expect(site.reportingUnit).toMatch(/^wales:7A[1-7]$/);

        // Discarded field check
        expect((site as Record<string, unknown>).postcode).toBeUndefined();
      }
    });

    it('correctly filters and returns sites per board', () => {
      const cardiffSites = getWalesHospitalSitesForBoard('7A4');
      expect(cardiffSites.length).toBeGreaterThanOrEqual(4);
      expect(cardiffSites.some((s) => s.name.includes('University Hospital of Wales'))).toBe(true);

      const swanseaSites = getWalesHospitalSitesForBoard('wales:7A3');
      expect(swanseaSites.some((s) => s.name.includes('Morriston Hospital'))).toBe(true);
    });
  });

  describe('Specialties', () => {
    it('contains 51 treatment functions plus All Specialties (52 total)', () => {
      expect(WALES_SPECIALTIES).toHaveLength(52);
    });

    it('has unique slugs and codes adhering to pattern', () => {
      const slugSet = new Set<string>();
      const codeSet = new Set<string>();
      const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

      for (const specialty of WALES_SPECIALTIES) {
        expect(specialty.slug).toMatch(slugPattern);
        expect(slugSet.has(specialty.slug)).toBe(false);
        slugSet.add(specialty.slug);

        expect(codeSet.has(specialty.officialCode)).toBe(false);
        codeSet.add(specialty.officialCode);

        // Never collide with reserved slugs
        expect(RESERVED_SPECIALTY_SLUGS).not.toContain(specialty.slug);
      }
    });

    it('has exactly one entry with isAllSpecialties = true', () => {
      const allList = WALES_SPECIALTIES.filter((s) => s.isAllSpecialties);
      expect(allList).toHaveLength(1);
      expect(allList[0]?.officialCode).toBe('all');
      expect(allList[0]?.slug).toBe('all-specialties');
    });

    it('resolves StatsWales codes "1" and "T" to All Specialties', () => {
      const sp1 = specialtyForWales('1');
      const spT = specialtyForWales('T');
      expect(sp1.isAllSpecialties).toBe(true);
      expect(spT.isAllSpecialties).toBe(true);
      expect(sp1.id).toBe('wales:all');
    });

    it('resolves codes, IDs, and slugs correctly', () => {
      expect(specialtyForWales('110').slug).toBe('trauma-and-orthopaedics');
      expect(specialtyForWales('wales:110').slug).toBe('trauma-and-orthopaedics');
      expect(specialtyForWales('trauma-and-orthopaedics').officialCode).toBe('110');
      expect(specialtyForWales('998').slug).toBe('diagnostic-services');
      expect(specialtyForWales('999').slug).toBe('allied-health-profession-services');
    });

    it('throws SchemaChangeError on unknown specialty code or slug', () => {
      expect(() => {
        specialtyForWales('9999');
      }).toThrow(SchemaChangeError);
      expect(() => {
        assertKnownWalesSpecialties(['100', '9999']);
      }).toThrow(SchemaChangeError);
    });

    it('asserts known treatment functions without error when valid', () => {
      expect(() => {
        assertKnownWalesSpecialties(['100', '101', '110', '1', 'T']);
      }).not.toThrow();
    });
  });

  describe('Build & Validation', () => {
    it('builds reference data that strictly conforms to model schema', () => {
      const refData = buildWalesReferenceData();
      const schema = referenceDataSchema('wales');

      expect(() => {
        schema.parse(refData);
      }).not.toThrow();
      expect(refData.nation).toBe('wales');
      expect(refData.reportingUnits).toHaveLength(7);
      expect(refData.hospitalSites.length).toBeGreaterThan(30);
      expect(refData.specialties).toHaveLength(52);
      expect(refData.sources.length).toBeGreaterThanOrEqual(1);

      // Check each reporting unit has linked hospital sites
      for (const unit of refData.reportingUnits) {
        expect(unit.hospitalSites.length).toBeGreaterThan(0);
        for (const siteId of unit.hospitalSites) {
          expect(refData.hospitalSites.some((s) => s.id === siteId)).toBe(true);
        }
      }
    });

    it('writes deterministic canonical JSON output', async () => {
      const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'kyw-wales-ref-test-'));
      const fileA = path.join(tempDir, 'ref-a.json');
      const fileB = path.join(tempDir, 'ref-b.json');

      const fixedTime = '2026-10-01T00:00:00.000Z';
      await writeWalesReferenceData(fileA, { retrievedAt: fixedTime });
      await writeWalesReferenceData(fileB, { retrievedAt: fixedTime });

      const contentA = await fs.readFile(fileA, 'utf-8');
      const contentB = await fs.readFile(fileB, 'utf-8');

      expect(contentA).toBe(contentB);
      expect(contentA.endsWith('\n')).toBe(true);

      // Verify schema parse on written file
      const parsed = JSON.parse(contentA) as unknown;
      expect(() => {
        referenceDataSchema('wales').parse(parsed);
      }).not.toThrow();
    });

    it('committed data/wales/reference.json matches build output and validates', async () => {
      const built = buildWalesReferenceData();

      const raw = await fs.readFile(DEFAULT_WALES_REFERENCE_OUTPUT_PATH, 'utf-8');
      const parsed = JSON.parse(raw) as unknown;
      const validated = referenceDataSchema('wales').parse(parsed);

      expect(validated.nation).toBe('wales');
      expect(validated.reportingUnits).toHaveLength(7);
      expect(raw).toBe(canonicalJsonStringify(built));
    });
  });
});
