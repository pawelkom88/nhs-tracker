import { describe, expectTypeOf, test } from 'vitest';
import type { PublishingNation } from '../src/nation.js';
import type {
  PublishedFigure,
  PublishedFile,
  PublishedNation,
  PublishedUnitSpecialty,
} from '../src/published.js';

describe('PublishedNation type tests', () => {
  test('union of nations or generic PublishingNation evaluates to never', () => {
    expectTypeOf<PublishedNation<PublishingNation>>().toEqualTypeOf<never>();
    expectTypeOf<PublishedNation<'england' | 'wales'>>().toEqualTypeOf<never>();
    expectTypeOf<PublishedNation<'england' | 'scotland'>>().toEqualTypeOf<never>();
    expectTypeOf<PublishedNation<'wales' | 'scotland'>>().toEqualTypeOf<never>();
  });

  test('single nations resolve to concrete PublishedNation types', () => {
    expectTypeOf<PublishedNation<'england'>>().not.toEqualTypeOf<never>();
    expectTypeOf<PublishedNation<'wales'>>().not.toEqualTypeOf<never>();
    expectTypeOf<PublishedNation<'scotland'>>().not.toEqualTypeOf<never>();
  });

  test('cross-nation PublishedNation assignment is prohibited', () => {
    expectTypeOf<PublishedNation<'wales'>>().not.toEqualTypeOf<PublishedNation<'england'>>();
    expectTypeOf<PublishedNation<'scotland'>>().not.toEqualTypeOf<PublishedNation<'england'>>();
  });
});

describe('PublishedFigure type tests', () => {
  test('union of nations evaluates to never', () => {
    expectTypeOf<PublishedFigure<PublishingNation>>().toEqualTypeOf<never>();
    expectTypeOf<PublishedFigure<'england' | 'scotland'>>().toEqualTypeOf<never>();
  });

  test('single nations resolve to concrete PublishedFigure types', () => {
    expectTypeOf<PublishedFigure<'england'>>().not.toEqualTypeOf<never>();
    expectTypeOf<PublishedFigure<'wales'>>().not.toEqualTypeOf<never>();
    expectTypeOf<PublishedFigure<'scotland'>>().not.toEqualTypeOf<never>();
  });
});

describe('PublishedUnitSpecialty type tests', () => {
  test('union of nations evaluates to never', () => {
    expectTypeOf<PublishedUnitSpecialty<PublishingNation>>().toEqualTypeOf<never>();
    expectTypeOf<PublishedUnitSpecialty<'england' | 'wales'>>().toEqualTypeOf<never>();
  });

  test('single nations resolve to concrete PublishedUnitSpecialty types', () => {
    expectTypeOf<PublishedUnitSpecialty<'england'>>().not.toEqualTypeOf<never>();
    expectTypeOf<PublishedUnitSpecialty<'wales'>>().not.toEqualTypeOf<never>();
    expectTypeOf<PublishedUnitSpecialty<'scotland'>>().not.toEqualTypeOf<never>();
  });
});

describe('PublishedFile type tests', () => {
  test('union of nations evaluates to never', () => {
    expectTypeOf<PublishedFile<PublishingNation>>().toEqualTypeOf<never>();
    expectTypeOf<PublishedFile<'england' | 'scotland'>>().toEqualTypeOf<never>();
  });

  test('single nations resolve to concrete PublishedFile types', () => {
    expectTypeOf<PublishedFile<'england'>>().not.toEqualTypeOf<never>();
    expectTypeOf<PublishedFile<'wales'>>().not.toEqualTypeOf<never>();
    expectTypeOf<PublishedFile<'scotland'>>().not.toEqualTypeOf<never>();
  });
});
