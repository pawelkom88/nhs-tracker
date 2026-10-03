import { describe, expectTypeOf, test } from 'vitest';
import type { PublishingNation } from '../src/nation.js';
import type {
  HospitalSite,
  NhsRegion,
  NhsRegionId,
  ReferenceData,
  ReportingUnit,
  Specialty,
} from '../src/reference.js';

describe('Reference data type tests', () => {
  test('HospitalSite has no postcode, coordinates, or distance fields', () => {
    type EnglandSite = HospitalSite<'england'>;
    type WalesSite = HospitalSite<'wales'>;
    type ScotlandSite = HospitalSite<'scotland'>;

    expectTypeOf<keyof EnglandSite>().not.toEqualTypeOf<'postcode'>();
    expectTypeOf<keyof EnglandSite>().not.toEqualTypeOf<'latitude'>();
    expectTypeOf<keyof EnglandSite>().not.toEqualTypeOf<'longitude'>();
    expectTypeOf<keyof EnglandSite>().not.toEqualTypeOf<'distance'>();

    expectTypeOf<keyof WalesSite>().not.toEqualTypeOf<'postcode'>();
    expectTypeOf<keyof ScotlandSite>().not.toEqualTypeOf<'postcode'>();

    const englandSite = {} as EnglandSite;
    // @ts-expect-error Property 'postcode' does not exist on HospitalSite<'england'>
    expectTypeOf(englandSite.postcode).toBeUndefined();

    const walesSite = {} as WalesSite;
    // @ts-expect-error Property 'postcode' does not exist on HospitalSite<'wales'>
    expectTypeOf(walesSite.postcode).toBeUndefined();

    const scotlandSite = {} as ScotlandSite;
    // @ts-expect-error Property 'postcode' does not exist on HospitalSite<'scotland'>
    expectTypeOf(scotlandSite.postcode).toBeUndefined();
  });

  test('ReportingUnit nhsRegion exists only for England', () => {
    type EnglandRU = ReportingUnit<'england'>;
    type WalesRU = ReportingUnit<'wales'>;
    type ScotlandRU = ReportingUnit<'scotland'>;

    expectTypeOf<EnglandRU>().toHaveProperty('nhsRegion');
    expectTypeOf<EnglandRU['nhsRegion']>().toEqualTypeOf<NhsRegionId>();

    const walesRU = {} as WalesRU;
    // @ts-expect-error Property 'nhsRegion' does not exist on ReportingUnit<'wales'>
    expectTypeOf(walesRU.nhsRegion).toBeUndefined();

    const scotlandRU = {} as ScotlandRU;
    // @ts-expect-error Property 'nhsRegion' does not exist on ReportingUnit<'scotland'>
    expectTypeOf(scotlandRU.nhsRegion).toBeUndefined();
  });

  test('ReferenceData nhsRegions exists only for England', () => {
    type EnglandRef = ReferenceData<'england'>;
    type WalesRef = ReferenceData<'wales'>;
    type ScotlandRef = ReferenceData<'scotland'>;

    expectTypeOf<EnglandRef>().toHaveProperty('nhsRegions');
    expectTypeOf<EnglandRef['nhsRegions']>().toEqualTypeOf<readonly NhsRegion[]>();

    const walesRef = {} as WalesRef;
    // @ts-expect-error Property 'nhsRegions' does not exist on ReferenceData<'wales'>
    expectTypeOf(walesRef.nhsRegions).toBeUndefined();

    const scotlandRef = {} as ScotlandRef;
    // @ts-expect-error Property 'nhsRegions' does not exist on ReferenceData<'scotland'>
    expectTypeOf(scotlandRef.nhsRegions).toBeUndefined();
  });

  test('Union of nations in generics resolves to never', () => {
    expectTypeOf<ReportingUnit<PublishingNation>>().toEqualTypeOf<never>();
    expectTypeOf<HospitalSite<PublishingNation>>().toEqualTypeOf<never>();
    expectTypeOf<Specialty<PublishingNation>>().toEqualTypeOf<never>();
    expectTypeOf<ReferenceData<PublishingNation>>().toEqualTypeOf<never>();
    expectTypeOf<ReportingUnit<'england' | 'wales'>>().toEqualTypeOf<never>();
  });
});
