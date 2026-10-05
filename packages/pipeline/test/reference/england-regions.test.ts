import { describe, expect, test } from 'vitest';
import { nhsRegionSchema } from '@kyw/model/reference';
import { ENGLAND_NHS_REGIONS, regionFor } from '../../src/reference/england/regions.js';
import { SchemaChangeError } from '../../src/errors.js';

describe('ENGLAND_NHS_REGIONS', () => {
  test('contains exactly the 7 current NHS England regions', () => {
    expect(ENGLAND_NHS_REGIONS).toHaveLength(7);
  });

  test('all 7 regions have unique IDs and official codes', () => {
    const ids = new Set(ENGLAND_NHS_REGIONS.map((r) => r.id));
    const codes = new Set(ENGLAND_NHS_REGIONS.map((r) => r.officialCode));
    const names = new Set(ENGLAND_NHS_REGIONS.map((r) => r.name));

    expect(ids.size).toBe(7);
    expect(codes.size).toBe(7);
    expect(names.size).toBe(7);
  });

  test('all regions match model nhsRegionSchema', () => {
    for (const region of ENGLAND_NHS_REGIONS) {
      // nhsRegionSchema checks id, officialCode, name
      const parsed = nhsRegionSchema.parse({
        id: region.id,
        officialCode: region.officialCode,
        name: region.name,
      });
      expect(parsed.id).toBe(`england:${region.officialCode}`);
      expect(parsed.officialCode).toBe(region.officialCode);
      expect(parsed.name).toBe(region.name);
    }
  });

  test('each region has valid officialName ending in COMMISSIONING REGION', () => {
    for (const region of ENGLAND_NHS_REGIONS) {
      expect(region.officialName).toMatch(/^[A-Z\s]+ COMMISSIONING REGION$/);
    }
  });
});

describe('regionFor', () => {
  test('returns matching region for official code', () => {
    const london = regionFor('Y56');
    expect(london).toEqual({
      id: 'england:Y56',
      officialCode: 'Y56',
      officialName: 'LONDON COMMISSIONING REGION',
      name: 'London',
    });

    const northEastYorks = regionFor('Y63');
    expect(northEastYorks.name).toBe('North East and Yorkshire');
  });

  test('returns matching region when ID is passed', () => {
    const midlands = regionFor('england:Y60');
    expect(midlands.name).toBe('Midlands');
  });

  test('throws SchemaChangeError on inactive or unknown region codes', () => {
    expect(() => regionFor('Y54')).toThrow(SchemaChangeError);
    expect(() => regionFor('Y55')).toThrow(SchemaChangeError);
    expect(() => regionFor('Y57')).toThrow(SchemaChangeError);
    expect(() => regionFor('Y99')).toThrow(SchemaChangeError);
    expect(() => regionFor('INVALID')).toThrow(SchemaChangeError);
    expect(() => regionFor('')).toThrow(SchemaChangeError);
  });

  test('SchemaChangeError contains details about requested code', () => {
    try {
      regionFor('Y99');
      expect.fail('Should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(SchemaChangeError);
      const schemaErr = err as SchemaChangeError;
      expect(schemaErr.details?.code).toBe('Y99');
      expect(schemaErr.details?.knownCodes).toEqual([
        'Y56',
        'Y58',
        'Y59',
        'Y60',
        'Y61',
        'Y62',
        'Y63',
      ]);
    }
  });
});
