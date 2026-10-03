import { describe, expectTypeOf, test } from 'vitest';
import type { z } from 'zod';
import {
  publicationDate,
  publicationDateSchema,
  reportingPeriod,
  reportingPeriodSchema,
  type PublicationDate,
  type ReportingPeriod,
} from '../src/period.js';

describe('ReportingPeriod and PublicationDate type tests', () => {
  test('prevents cross-assignment between ReportingPeriod and PublicationDate', () => {
    expectTypeOf<PublicationDate>().not.toExtend<ReportingPeriod>();
    expectTypeOf<ReportingPeriod>().not.toExtend<PublicationDate>();

    const rp = reportingPeriod('2026-01-31');
    const pd = publicationDate('2026-03-15');

    // @ts-expect-error PublicationDate is not assignable to ReportingPeriod
    const _invalidRp: ReportingPeriod = pd;
    expectTypeOf(_invalidRp).toEqualTypeOf<ReportingPeriod>();

    // @ts-expect-error ReportingPeriod is not assignable to PublicationDate
    const _invalidPd: PublicationDate = rp;
    expectTypeOf(_invalidPd).toEqualTypeOf<PublicationDate>();
  });

  test('prevents assigning unbranded plain string to ReportingPeriod or PublicationDate', () => {
    expectTypeOf<string>().not.toExtend<ReportingPeriod>();
    expectTypeOf<string>().not.toExtend<PublicationDate>();

    // @ts-expect-error Plain string is not assignable to ReportingPeriod
    const _unbrandedRp: ReportingPeriod = '2026-01-31';
    expectTypeOf(_unbrandedRp).toEqualTypeOf<ReportingPeriod>();

    // @ts-expect-error Plain string is not assignable to PublicationDate
    const _unbrandedPd: PublicationDate = '2026-03-15';
    expectTypeOf(_unbrandedPd).toEqualTypeOf<PublicationDate>();
  });

  test('schema outputs match branded types', () => {
    expectTypeOf(reportingPeriodSchema).toEqualTypeOf<z.ZodType<ReportingPeriod>>();
    expectTypeOf(publicationDateSchema).toEqualTypeOf<z.ZodType<PublicationDate>>();

    type ReportingPeriodSchemaOutput = z.infer<typeof reportingPeriodSchema>;
    type PublicationDateSchemaOutput = z.infer<typeof publicationDateSchema>;

    expectTypeOf<ReportingPeriodSchemaOutput>().toEqualTypeOf<ReportingPeriod>();
    expectTypeOf<PublicationDateSchemaOutput>().toEqualTypeOf<PublicationDate>();
  });
});
