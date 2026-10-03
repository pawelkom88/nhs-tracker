import { describe, expectTypeOf, test } from 'vitest';
import type { z } from 'zod';
import type { PublishingNation, SingleNation } from '../src/nation.js';
import type {
  HospitalSiteId,
  ReportingUnitId,
  SpecialtyId,
  StatisticId,
  WaitStageId,
} from '../src/ids.js';
import { nationScopedIdSchema } from '../src/ids.js';

describe('SingleNation type tests', () => {
  test('single nations resolve to their exact literal type', () => {
    expectTypeOf<SingleNation<'england'>>().toEqualTypeOf<'england'>();
    expectTypeOf<SingleNation<'wales'>>().toEqualTypeOf<'wales'>();
    expectTypeOf<SingleNation<'scotland'>>().toEqualTypeOf<'scotland'>();
  });

  test('union of nations resolves to never', () => {
    expectTypeOf<SingleNation<'england' | 'wales'>>().toEqualTypeOf<never>();
    expectTypeOf<SingleNation<'england' | 'scotland'>>().toEqualTypeOf<never>();
    expectTypeOf<SingleNation<PublishingNation>>().toEqualTypeOf<never>();
  });

  test('never resolves to never', () => {
    expectTypeOf<SingleNation<never>>().toEqualTypeOf<never>();
  });
});

describe('NationScopedId type tests', () => {
  test('cross-nation assignment is prohibited', () => {
    type EnglandSpecialty = SpecialtyId<'england'>;
    type WalesSpecialty = SpecialtyId<'wales'>;

    expectTypeOf<WalesSpecialty>().not.toExtend<EnglandSpecialty>();

    // @ts-expect-error Wales specialty cannot be assigned to England specialty
    const _englandSpec: EnglandSpecialty = {} as WalesSpecialty;
    expectTypeOf(_englandSpec).toEqualTypeOf<EnglandSpecialty>();
  });

  test('cross-kind assignment within the same nation is prohibited', () => {
    type EnglandReportingUnit = ReportingUnitId<'england'>;
    type EnglandSpecialty = SpecialtyId<'england'>;
    type EnglandHospitalSite = HospitalSiteId<'england'>;
    type EnglandWaitStage = WaitStageId<'england'>;
    type EnglandStatistic = StatisticId<'england'>;

    expectTypeOf<EnglandReportingUnit>().not.toExtend<EnglandSpecialty>();
    expectTypeOf<EnglandHospitalSite>().not.toExtend<EnglandReportingUnit>();
    expectTypeOf<EnglandWaitStage>().not.toExtend<EnglandStatistic>();

    // @ts-expect-error ReportingUnitId cannot be assigned to SpecialtyId
    const _spec: EnglandSpecialty = {} as EnglandReportingUnit;
    expectTypeOf(_spec).toEqualTypeOf<EnglandSpecialty>();

    // @ts-expect-error HospitalSiteId cannot be assigned to ReportingUnitId
    const _ru: EnglandReportingUnit = {} as EnglandHospitalSite;
    expectTypeOf(_ru).toEqualTypeOf<EnglandReportingUnit>();

    // @ts-expect-error WaitStageId cannot be assigned to StatisticId
    const _stat: EnglandStatistic = {} as EnglandWaitStage;
    expectTypeOf(_stat).toEqualTypeOf<EnglandStatistic>();
  });

  test('plain strings and unbranded template literals cannot be assigned to IDs', () => {
    type EnglandSpecialty = SpecialtyId<'england'>;

    expectTypeOf<string>().not.toExtend<EnglandSpecialty>();
    expectTypeOf<`england:${string}`>().not.toExtend<EnglandSpecialty>();

    // @ts-expect-error Plain string is not assignable to branded id
    const _s1: EnglandSpecialty = 'england:100';
    expectTypeOf(_s1).toEqualTypeOf<EnglandSpecialty>();

    const code = '100';
    // @ts-expect-error Generic template string is not assignable
    const _s2: EnglandSpecialty = `england:${code}`;
    expectTypeOf(_s2).toEqualTypeOf<EnglandSpecialty>();
  });

  test('schema output type matches branded type', () => {
    const schema = nationScopedIdSchema('england', 'specialty');
    type SchemaOutput = z.infer<typeof schema>;

    expectTypeOf(schema).toEqualTypeOf<z.ZodType<SpecialtyId<'england'>>>();
    expectTypeOf<SchemaOutput>().toEqualTypeOf<SpecialtyId<'england'>>();
  });
});
