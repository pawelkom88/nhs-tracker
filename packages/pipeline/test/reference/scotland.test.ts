import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { describe, expect, it } from 'vitest';
import { referenceDataSchema } from '@kyw/model/reference';
import { SchemaChangeError } from '../../src/errors.js';
import { canonicalJsonStringify } from '../../src/io/json.js';
import {
  SCOTLAND_BOARD_SUCCESSIONS,
  SCOTLAND_NON_REPORTING_CODES,
  SCOTLAND_NON_REPORTING_SPECIAL_BOARDS,
  buildScotlandReportingUnits,
  isSameEntityAcrossScotland,
  loadScotlandBoardConfigs,
  resolveScotlandBoard,
} from '../../src/reference/scotland/boards.js';
import {
  buildScotlandHospitalSites,
  extractTownFromAddressLines,
  getScotlandHospitalSitesForBoard,
} from '../../src/reference/scotland/sites.js';
import {
  RESERVED_SPECIALTY_SLUGS,
  SCOTLAND_SPECIALTIES,
  assertKnownScotlandSpecialties,
  specialtyForScotland,
} from '../../src/reference/scotland/specialties.js';
import {
  DEFAULT_SCOTLAND_REFERENCE_OUTPUT_PATH,
  buildScotlandReferenceData,
  writeScotlandReferenceData,
} from '../../src/reference/scotland/build.js';

describe('Scotland Reference Data', () => {
  describe('Boards & Succession', () => {
    it('contains exactly 15 reporting units (14 territorial + Golden Jubilee)', () => {
      const configs = loadScotlandBoardConfigs();
      expect(configs).toHaveLength(15);

      const territorial = configs.filter((c) => c.kind === 'health-board');
      const special = configs.filter((c) => c.kind === 'special-health-board');

      expect(territorial).toHaveLength(14);
      expect(special).toHaveLength(1);
      expect(special[0]?.code).toBe('SB0801');
    });

    it('Golden Jubilee (SB0801) has special-health-board kind and note', () => {
      const board = resolveScotlandBoard('SB0801');
      expect(board).not.toBeNull();
      expect(board?.kind).toBe('special-health-board');
      expect(board?.notes).toEqual(['treats-patients-from-all-boards']);
      // cp1252 label decoded without non-breaking space
      expect(board?.officialName).toBe('Golden Jubilee National Hospital');
      expect(board?.displayName).toBe('Golden Jubilee National Hospital');
      expect(board?.officialName).not.toContain('\u00A0');
    });

    it('maps archived board codes (S08000018/21/23/27) to current successors', () => {
      expect(SCOTLAND_BOARD_SUCCESSIONS.S08000018).toBe('S08000029'); // Fife
      expect(SCOTLAND_BOARD_SUCCESSIONS.S08000021).toBe('S08000031'); // GG&C
      expect(SCOTLAND_BOARD_SUCCESSIONS.S08000023).toBe('S08000032'); // Lanarkshire
      expect(SCOTLAND_BOARD_SUCCESSIONS.S08000027).toBe('S08000030'); // Tayside

      // resolveScotlandBoard maps archived code to successor config
      expect(resolveScotlandBoard('S08000018')?.code).toBe('S08000029');
      expect(resolveScotlandBoard('S08000021')?.code).toBe('S08000031');
      expect(resolveScotlandBoard('S08000023')?.code).toBe('S08000032');
      expect(resolveScotlandBoard('S08000027')?.code).toBe('S08000030');
    });

    it('records predecessors on active boards that had boundary reorganisations', () => {
      const units = buildScotlandReportingUnits();
      const fife = units.find((u) => u.officialCode === 'S08000029');
      expect(fife?.predecessors).toEqual(['scotland:S08000018']);

      const ggc = units.find((u) => u.officialCode === 'S08000031');
      expect(ggc?.predecessors).toEqual(['scotland:S08000021']);

      const lanarkshire = units.find((u) => u.officialCode === 'S08000032');
      expect(lanarkshire?.predecessors).toEqual(['scotland:S08000023']);

      const tayside = units.find((u) => u.officialCode === 'S08000030');
      expect(tayside?.predecessors).toEqual(['scotland:S08000027']);
    });

    it('excludes non-reporting entities (S92000003, S27000001, RA2702, RA2704, other special boards)', () => {
      for (const nonReporting of SCOTLAND_NON_REPORTING_CODES) {
        expect(resolveScotlandBoard(nonReporting)).toBeNull();
      }
      for (const nonReportingSpecial of SCOTLAND_NON_REPORTING_SPECIAL_BOARDS) {
        expect(resolveScotlandBoard(nonReportingSpecial)).toBeNull();
      }
    });

    it('throws SchemaChangeError on unrecognised board code', () => {
      expect(() => {
        resolveScotlandBoard('S08999999');
      }).toThrow(SchemaChangeError);
    });

    it('evaluates continuity correctly across reporting periods', () => {
      expect(isSameEntityAcrossScotland('S08000024', '2024-08-31', '2025-08-31')).toBe(true);
      expect(isSameEntityAcrossScotland('SB0801', '2024-08-31', '2025-08-31')).toBe(true);
      expect(isSameEntityAcrossScotland('S08000018', '2018-08-31', '2025-08-31')).toBe(true);
    });
  });

  describe('Hospital Sites', () => {
    it('extracts town accurately from address lines using heuristic', () => {
      expect(
        extractTownFromAddressLines([
          '51 LITTLE FRANCE CRESCENT',
          'OLD DALKEITH ROAD',
          'EDINBURGH',
          'MIDLOTHIAN',
        ]),
      ).toBe('Midlothian');
      expect(
        extractTownFromAddressLines([
          'AGAMEMNON STREET',
          'CLYDEBANK',
          'DUNBARTONSHIRE',
          '',
          'G81 4DY',
        ]),
      ).toBe('Dunbartonshire');
      expect(extractTownFromAddressLines(['1345 GOVAN ROAD', 'GLASGOW', '', 'G51 4TF'])).toBe(
        'Glasgow',
      );
      expect(extractTownFromAddressLines(['', ''])).toBeNull();
    });

    it('reassigns D102H (Golden Jubilee) to SB0801', () => {
      const sites = buildScotlandHospitalSites();
      const goldenJubileeSite = sites.find((s) => s.officialCode === 'D102H');

      expect(goldenJubileeSite).toBeDefined();
      expect(goldenJubileeSite?.id).toBe('scotland:D102H');
      expect(goldenJubileeSite?.name).toBe('Golden Jubilee National Hospital');
      expect(goldenJubileeSite?.reportingUnit).toBe('scotland:SB0801');
      expect(goldenJubileeSite?.town).toBe('Dunbartonshire');

      // Check strictly no postcode or extra fields
      expect((goldenJubileeSite as Record<string, unknown>).postcode).toBeUndefined();
    });

    it('filters sites by reporting health board', () => {
      const lothianSites = getScotlandHospitalSitesForBoard('S08000024');
      expect(lothianSites.length).toBeGreaterThanOrEqual(3);
      expect(lothianSites.some((s) => s.name.includes('Royal Infirmary of Edinburgh'))).toBe(true);

      const gjSites = getScotlandHospitalSitesForBoard('SB0801');
      expect(gjSites).toHaveLength(1);
      expect(gjSites[0]?.officialCode).toBe('D102H');
    });
  });

  describe('Specialties', () => {
    it('contains stage-of-treatment clinical specialties plus All Specialties (Z9)', () => {
      expect(SCOTLAND_SPECIALTIES.length).toBeGreaterThanOrEqual(35);
      const z9 = SCOTLAND_SPECIALTIES.find((s) => s.officialCode === 'Z9');
      expect(z9).toBeDefined();
      expect(z9?.isAllSpecialties).toBe(true);
      expect(z9?.slug).toBe('all-specialties');
      expect(z9?.id).toBe('scotland:Z9');
    });

    it('has unique slugs and codes adhering to pattern', () => {
      const slugSet = new Set<string>();
      const codeSet = new Set<string>();
      const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

      for (const specialty of SCOTLAND_SPECIALTIES) {
        expect(specialty.slug).toMatch(slugPattern);
        expect(slugSet.has(specialty.slug)).toBe(false);
        slugSet.add(specialty.slug);

        expect(codeSet.has(specialty.officialCode)).toBe(false);
        codeSet.add(specialty.officialCode);

        // Slugs must never collide with reserved routes
        expect(RESERVED_SPECIALTY_SLUGS).not.toContain(specialty.slug);
      }
    });

    it('resolves specialties by code, ID, or slug', () => {
      expect(specialtyForScotland('C8').slug).toBe('trauma-and-orthopaedics');
      expect(specialtyForScotland('scotland:C8').slug).toBe('trauma-and-orthopaedics');
      expect(specialtyForScotland('trauma-and-orthopaedics').officialCode).toBe('C8');
      expect(specialtyForScotland('C1').slug).toBe('general-surgery');
      expect(specialtyForScotland('Z9').isAllSpecialties).toBe(true);
    });

    it('throws SchemaChangeError on unknown specialty code or slug', () => {
      expect(() => {
        specialtyForScotland('ZZ99');
      }).toThrow(SchemaChangeError);
      expect(() => {
        assertKnownScotlandSpecialties(['C1', 'UNKNOWN_CODE']);
      }).toThrow(SchemaChangeError);
    });

    it('asserts known specialties without throwing when valid', () => {
      expect(() => {
        assertKnownScotlandSpecialties(['Z9', 'C1', 'C8', 'A1']);
      }).not.toThrow();
    });
  });

  describe('Build & Validation', () => {
    it('builds reference data that strictly validates against model schema', () => {
      const refData = buildScotlandReferenceData();
      const schema = referenceDataSchema('scotland');

      expect(() => {
        schema.parse(refData);
      }).not.toThrow();

      expect(refData.nation).toBe('scotland');
      expect(refData.reportingUnits).toHaveLength(15);
      expect(refData.hospitalSites.length).toBeGreaterThan(20);
      expect(refData.specialties.length).toBeGreaterThanOrEqual(35);
      expect(refData.sources).toHaveLength(2);

      // Verify Golden Jubilee unit and linked site
      const gjUnit = refData.reportingUnits.find((u) => u.officialCode === 'SB0801');
      expect(gjUnit).toBeDefined();
      expect(gjUnit?.kind).toBe('special-health-board');
      expect(gjUnit?.notes).toEqual(['treats-patients-from-all-boards']);
      expect(gjUnit?.hospitalSites).toContain('scotland:D102H');

      // Verify each reporting unit has valid hospital sites
      for (const unit of refData.reportingUnits) {
        expect(unit.hospitalSites.length).toBeGreaterThan(0);
        for (const siteId of unit.hospitalSites) {
          expect(refData.hospitalSites.some((s) => s.id === siteId)).toBe(true);
        }
      }
    });

    it('writes deterministic canonical JSON output', async () => {
      const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'kyw-scotland-ref-test-'));
      const fileA = path.join(tempDir, 'ref-a.json');
      const fileB = path.join(tempDir, 'ref-b.json');

      const fixedTime = '2026-10-01T00:00:00.000Z';
      await writeScotlandReferenceData(fileA, { retrievedAt: fixedTime });
      await writeScotlandReferenceData(fileB, { retrievedAt: fixedTime });

      const contentA = await fs.readFile(fileA, 'utf-8');
      const contentB = await fs.readFile(fileB, 'utf-8');

      expect(contentA).toBe(contentB);
      expect(contentA.endsWith('\n')).toBe(true);

      const parsed = JSON.parse(contentA) as unknown;
      expect(() => {
        referenceDataSchema('scotland').parse(parsed);
      }).not.toThrow();

      await fs.rm(tempDir, { recursive: true, force: true });
    });

    it('committed data/scotland/reference.json matches build output and validates', async () => {
      const built = buildScotlandReferenceData();

      const raw = await fs.readFile(DEFAULT_SCOTLAND_REFERENCE_OUTPUT_PATH, 'utf-8');
      const parsed = JSON.parse(raw) as unknown;
      const validated = referenceDataSchema('scotland').parse(parsed);

      expect(validated.nation).toBe('scotland');
      expect(validated.reportingUnits).toHaveLength(15);
      expect(validated.hospitalSites.length).toBeGreaterThan(20);
      expect(raw).toBe(canonicalJsonStringify(built));
    });
  });
});
