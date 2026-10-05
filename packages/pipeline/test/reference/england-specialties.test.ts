import { describe, expect, test } from 'vitest';
import { specialtySchema } from '@kyw/model/reference';
import {
  ENGLAND_SPECIALTIES,
  RESERVED_SPECIALTY_SLUGS,
  specialtyForEngland,
  assertKnownTreatmentFunctions,
} from '../../src/reference/england/specialties.js';
import { SchemaChangeError } from '../../src/errors.js';

describe('ENGLAND_SPECIALTIES', () => {
  test('contains exactly 24 official RTT treatment functions', () => {
    expect(ENGLAND_SPECIALTIES).toHaveLength(24);
  });

  test('all 24 entries have unique official codes, IDs, and slugs', () => {
    const codes = new Set(ENGLAND_SPECIALTIES.map((s) => s.officialCode));
    const ids = new Set(ENGLAND_SPECIALTIES.map((s) => s.id));
    const slugs = new Set(ENGLAND_SPECIALTIES.map((s) => s.slug));

    expect(codes.size).toBe(24);
    expect(ids.size).toBe(24);
    expect(slugs.size).toBe(24);
  });

  test('all entries validate against model specialtySchema for england', () => {
    const schema = specialtySchema('england');
    for (const entry of ENGLAND_SPECIALTIES) {
      const parsed = schema.parse(entry);
      expect(parsed.id).toBe(`england:${entry.officialCode}`);
      expect(parsed.officialCode).toBe(entry.officialCode);
      expect(parsed.descriptionKey).toBe(`england/${entry.slug}`);
    }
  });

  test('only C_999 isAllSpecialties is true, others are false', () => {
    const allSpecs = ENGLAND_SPECIALTIES.filter((s) => s.isAllSpecialties);
    expect(allSpecs).toHaveLength(1);
    expect(allSpecs[0]?.officialCode).toBe('C_999');
    expect(allSpecs[0]?.slug).toBe('all-specialties');

    const others = ENGLAND_SPECIALTIES.filter((s) => !s.isAllSpecialties);
    expect(others).toHaveLength(23);
  });

  test('no slug equals a reserved route', () => {
    const reservedSet = new Set(RESERVED_SPECIALTY_SLUGS);
    expect(reservedSet.has('about-the-figures')).toBe(true);
    expect(reservedSet.has('your-rights')).toBe(true);

    for (const specialty of ENGLAND_SPECIALTIES) {
      expect(reservedSet.has(specialty.slug)).toBe(false);
    }
  });
});

describe('specialtyForEngland', () => {
  test('retrieves specialty by official code', () => {
    const trauma = specialtyForEngland('C_110');
    expect(trauma.officialName).toBe('Trauma and Orthopaedic Service');
    expect(trauma.slug).toBe('trauma-and-orthopaedics');
  });

  test('retrieves specialty by nation-scoped ID', () => {
    const ophth = specialtyForEngland('england:C_130');
    expect(ophth.officialName).toBe('Ophthalmology Service');
    expect(ophth.slug).toBe('ophthalmology');
  });

  test('retrieves specialty by slug', () => {
    const all = specialtyForEngland('all-specialties');
    expect(all.officialCode).toBe('C_999');
    expect(all.isAllSpecialties).toBe(true);
  });

  test('throws SchemaChangeError on unknown code, ID, or slug', () => {
    expect(() => {
      specialtyForEngland('C_998');
    }).toThrow(SchemaChangeError);
    expect(() => {
      specialtyForEngland('england:UNKNOWN');
    }).toThrow(SchemaChangeError);
    expect(() => {
      specialtyForEngland('random-specialty');
    }).toThrow(SchemaChangeError);
  });
});

describe('assertKnownTreatmentFunctions', () => {
  test('succeeds for array containing known treatment function codes', () => {
    const knownCodes = ENGLAND_SPECIALTIES.map((s) => s.officialCode);
    expect(() => {
      assertKnownTreatmentFunctions(knownCodes);
    }).not.toThrow();
    expect(() => {
      assertKnownTreatmentFunctions(['C_100', 'C_110', 'C_999']);
    }).not.toThrow();
  });

  test('throws SchemaChangeError when encountering an unknown code', () => {
    expect(() => {
      assertKnownTreatmentFunctions(['C_100', 'UNKNOWN_CODE']);
    }).toThrow(SchemaChangeError);

    try {
      assertKnownTreatmentFunctions(['C_100', 'C_998']);
      expect.fail('Should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(SchemaChangeError);
      const schemaErr = err as SchemaChangeError;
      expect(schemaErr.details?.unknownCode).toBe('C_998');
      expect(Array.isArray(schemaErr.details?.knownCodes)).toBe(true);
    }
  });
});
