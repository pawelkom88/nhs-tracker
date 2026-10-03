import { describe, expectTypeOf, test } from 'vitest';
import type { PublishingNation } from '../src/nation.js';
import type { Release, ReleaseFile } from '../src/release.js';

describe('Release type tests', () => {
  test('union of nations or generic PublishingNation evaluates to never', () => {
    expectTypeOf<Release<PublishingNation>>().toEqualTypeOf<never>();
    expectTypeOf<Release<'england' | 'wales'>>().toEqualTypeOf<never>();
    expectTypeOf<Release<'england' | 'scotland'>>().toEqualTypeOf<never>();
    expectTypeOf<Release<'wales' | 'scotland'>>().toEqualTypeOf<never>();
  });

  test('single nations resolve to concrete Release types', () => {
    expectTypeOf<Release<'england'>>().not.toEqualTypeOf<never>();
    expectTypeOf<Release<'wales'>>().not.toEqualTypeOf<never>();
    expectTypeOf<Release<'scotland'>>().not.toEqualTypeOf<never>();
  });

  test('cross-nation Release assignment is prohibited', () => {
    expectTypeOf<Release<'wales'>>().not.toEqualTypeOf<Release<'england'>>();
    expectTypeOf<Release<'scotland'>>().not.toEqualTypeOf<Release<'england'>>();
  });
});

describe('ReleaseFile type tests', () => {
  test('union of nations evaluates to never', () => {
    expectTypeOf<ReleaseFile<PublishingNation>>().toEqualTypeOf<never>();
    expectTypeOf<ReleaseFile<'england' | 'scotland'>>().toEqualTypeOf<never>();
  });

  test('single nations resolve to concrete ReleaseFile types', () => {
    expectTypeOf<ReleaseFile<'england'>>().not.toEqualTypeOf<never>();
    expectTypeOf<ReleaseFile<'wales'>>().not.toEqualTypeOf<never>();
    expectTypeOf<ReleaseFile<'scotland'>>().not.toEqualTypeOf<never>();
  });
});
