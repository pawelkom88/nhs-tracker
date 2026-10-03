import { describe, expect, test } from 'vitest';
import {
  exactSum,
  figureKey,
  figureSchema,
  figureValueSchema,
  provenanceSchema,
  publishedFigureValueSchema,
  type Figure,
} from '../src/figure.js';
import { reportingUnitId, specialtyId, statisticId, waitStageId } from '../src/ids.js';
import { publicationDate, reportingPeriod } from '../src/period.js';
import { sourceRefSchema, type SourceRef } from '../src/source.js';

const mockEnglandSource: SourceRef<'england'> = {
  nation: 'england',
  publisher: 'NHS England',
  title: 'Consultant-led Referral to Treatment Waiting Times',
  url: 'https://www.england.nhs.uk/statistics/statistical-work-areas/rtt-waiting-times/',
  licence: 'OGL-3.0',
  attribution: 'Contains NHS England data licensed under the Open Government Licence v3.0.',
};

function createMockFigure(overrides: Partial<Figure<'england'>> = {}): Figure<'england'> {
  return {
    nation: 'england',
    reportingUnit: reportingUnitId('england', 'RGT'),
    specialty: specialtyId('england', '100'),
    waitStage: waitStageId('england', 'rtt-incomplete-pathway'),
    statistic: statisticId('england', 'total-waiting'),
    reportingPeriod: reportingPeriod('2026-01-31'),
    publicationDate: publicationDate('2026-03-12'),
    unit: 'count',
    value: {
      status: 'published',
      value: 150,
      provisional: false,
    },
    provenance: {
      kind: 'official',
      sourceField: 'Total number of incomplete pathways',
    },
    source: mockEnglandSource,
    ...overrides,
  };
}

describe('figureKey', () => {
  test('generates a stable compound key combining the 6 dimensions', () => {
    const f = createMockFigure();
    const key = figureKey(f);
    expect(key).toBe(
      'england|england:RGT|england:100|england:rtt-incomplete-pathway|england:total-waiting|2026-01-31',
    );
  });
});

describe('exactSum', () => {
  test('returns null for empty array', () => {
    expect(exactSum([])).toBeNull();
  });

  test('sums multiple valid integer figures exactly', () => {
    const f1 = createMockFigure({
      value: { status: 'published', value: 100, provisional: false },
    });
    const f2 = createMockFigure({
      value: { status: 'published', value: 250, provisional: false },
    });
    const f3 = createMockFigure({
      value: { status: 'published', value: 50, provisional: false },
    });

    const result = exactSum([f1, f2, f3]);
    expect(result).toEqual({
      status: 'published',
      value: 400,
      provisional: false,
    });
  });

  test('propagates provisional flag if any input is provisional', () => {
    const f1 = createMockFigure({
      value: { status: 'published', value: 100, provisional: false },
    });
    const f2 = createMockFigure({
      value: { status: 'published', value: 200, provisional: true },
    });

    const result = exactSum([f1, f2]);
    expect(result).toEqual({
      status: 'published',
      value: 300,
      provisional: true,
    });
  });

  test('returns null if any input is suppressed', () => {
    const f1 = createMockFigure({
      value: { status: 'published', value: 100, provisional: false },
    });
    const f2 = createMockFigure({
      value: { status: 'suppressed', provisional: false },
    });

    expect(exactSum([f1, f2])).toBeNull();
  });

  test('returns null if input values are not safe integers', () => {
    const f1 = createMockFigure({
      value: { status: 'published', value: 100.5, provisional: false },
    });
    const f2 = createMockFigure({
      value: { status: 'published', value: 50, provisional: false },
    });

    expect(exactSum([f1, f2])).toBeNull();
  });

  test('returns null when inputs differ in reportingPeriod', () => {
    const f1 = createMockFigure({ reportingPeriod: reportingPeriod('2026-01-31') });
    const f2 = createMockFigure({ reportingPeriod: reportingPeriod('2026-02-28') });

    expect(exactSum([f1, f2])).toBeNull();
  });

  test('returns null when inputs differ in publicationDate', () => {
    const f1 = createMockFigure({ publicationDate: publicationDate('2026-03-12') });
    const f2 = createMockFigure({ publicationDate: publicationDate('2026-04-09') });

    expect(exactSum([f1, f2])).toBeNull();
  });

  test('returns null when inputs differ in reportingUnit', () => {
    const f1 = createMockFigure({ reportingUnit: reportingUnitId('england', 'RGT') });
    const f2 = createMockFigure({ reportingUnit: reportingUnitId('england', 'RRK') });

    expect(exactSum([f1, f2])).toBeNull();
  });

  test('returns null when inputs differ in specialty', () => {
    const f1 = createMockFigure({ specialty: specialtyId('england', '100') });
    const f2 = createMockFigure({ specialty: specialtyId('england', '110') });

    expect(exactSum([f1, f2])).toBeNull();
  });

  test('returns null when inputs differ in waitStage', () => {
    const f1 = createMockFigure({
      waitStage: waitStageId('england', 'rtt-incomplete-pathway'),
    });
    const f2 = createMockFigure({
      waitStage: waitStageId('england', 'other-stage'),
    });

    expect(exactSum([f1, f2])).toBeNull();
  });

  test('returns null when inputs differ in unit', () => {
    const f1 = createMockFigure({ unit: 'count' });
    const f2 = createMockFigure({ unit: 'weeks' });

    expect(exactSum([f1, f2])).toBeNull();
  });
});

describe('Zod Schemas', () => {
  describe('sourceRefSchema', () => {
    test('validates correct source reference', () => {
      const schema = sourceRefSchema('england');
      expect(schema.parse(mockEnglandSource)).toEqual(mockEnglandSource);
    });

    test('rejects mismatched nation', () => {
      const schema = sourceRefSchema('wales');
      expect(() => schema.parse(mockEnglandSource)).toThrow();
    });

    test('rejects invalid URL or non-OGL licence', () => {
      const schema = sourceRefSchema('england');
      expect(() => schema.parse({ ...mockEnglandSource, url: 'not-a-valid-url' })).toThrow();
      expect(() => schema.parse({ ...mockEnglandSource, licence: 'MIT' })).toThrow();
    });
  });

  describe('figureValueSchema', () => {
    test('validates published and suppressed values', () => {
      const schema = figureValueSchema();
      expect(schema.parse({ status: 'published', value: 42, provisional: false })).toEqual({
        status: 'published',
        value: 42,
        provisional: false,
      });

      expect(schema.parse({ status: 'suppressed', provisional: true })).toEqual({
        status: 'suppressed',
        provisional: true,
      });
    });

    test('rejects suppressed value that includes a value property', () => {
      const schema = figureValueSchema();
      expect(() => schema.parse({ status: 'suppressed', value: 0, provisional: false })).toThrow();
    });

    test('validates unit-specific range constraints', () => {
      const countSchema = publishedFigureValueSchema('count');
      expect(
        countSchema.parse({ status: 'published', value: 10, provisional: false }),
      ).toBeDefined();
      expect(() =>
        countSchema.parse({ status: 'published', value: -1, provisional: false }),
      ).toThrow();
      expect(() =>
        countSchema.parse({ status: 'published', value: 10.5, provisional: false }),
      ).toThrow();

      const percentSchema = publishedFigureValueSchema('percent');
      expect(
        percentSchema.parse({ status: 'published', value: 85.5, provisional: false }),
      ).toBeDefined();
      expect(() =>
        percentSchema.parse({ status: 'published', value: -0.1, provisional: false }),
      ).toThrow();
      expect(() =>
        percentSchema.parse({ status: 'published', value: 100.1, provisional: false }),
      ).toThrow();

      const propSchema = publishedFigureValueSchema('proportion');
      expect(
        propSchema.parse({ status: 'published', value: 0.855, provisional: false }),
      ).toBeDefined();
      expect(() =>
        propSchema.parse({ status: 'published', value: -0.01, provisional: false }),
      ).toThrow();
      expect(() =>
        propSchema.parse({ status: 'published', value: 1.01, provisional: false }),
      ).toThrow();
    });
  });

  describe('provenanceSchema', () => {
    test('validates official provenance', () => {
      expect(
        provenanceSchema.parse({
          kind: 'official',
          sourceField: 'Average (median) waiting time (in weeks)',
        }),
      ).toBeDefined();

      expect(() =>
        provenanceSchema.parse({
          kind: 'official',
          sourceField: '',
        }),
      ).toThrow();
    });

    test('validates derived provenance with >= 2 inputs', () => {
      expect(
        provenanceSchema.parse({
          kind: 'derived',
          method: 'exact-sum',
          inputs: ['LessThan4WeekWait', '4To8WeekWait', '8To12WeekWait'],
        }),
      ).toBeDefined();

      expect(() =>
        provenanceSchema.parse({
          kind: 'derived',
          method: 'exact-sum',
          inputs: ['SingleInput'],
        }),
      ).toThrow();
    });
  });

  describe('figureSchema', () => {
    test('parses valid England Figure', () => {
      const f = createMockFigure();
      const schema = figureSchema('england');
      expect(schema.parse(f)).toEqual(f);
    });

    test('parses valid suppressed Figure', () => {
      const f = createMockFigure({
        value: { status: 'suppressed', provisional: false },
      });
      const schema = figureSchema('england');
      expect(schema.parse(f)).toEqual(f);
    });

    test('rejects figure with mismatched nation IDs or sources', () => {
      const f = createMockFigure({
        specialty: 'wales:100' as unknown as Figure<'england'>['specialty'],
      });
      const schema = figureSchema('england');
      expect(() => schema.parse(f)).toThrow();
    });

    test('rejects negative count in complete figure', () => {
      const f = createMockFigure({
        unit: 'count',
        value: { status: 'published', value: -5, provisional: false },
      });
      const schema = figureSchema('england');
      expect(() => schema.parse(f)).toThrow();
    });

    test('rejects out of range percent in complete figure', () => {
      const f = createMockFigure({
        unit: 'percent',
        value: { status: 'published', value: 105, provisional: false },
      });
      const schema = figureSchema('england');
      expect(() => schema.parse(f)).toThrow();
    });
  });
});
