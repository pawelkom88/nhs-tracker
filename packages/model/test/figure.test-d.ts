import { describe, expectTypeOf, test } from 'vitest';
import type { PublishingNation } from '../src/nation.js';
import type {
  Figure,
  FigureValue,
  PublishedFigureValue,
  SuppressedFigureValue,
} from '../src/figure.js';
import { exactSum } from '../src/figure.js';

describe('FigureValue type tests', () => {
  test('reading value without narrowing produces a compile error', () => {
    const fv = {} as FigureValue;

    // @ts-expect-error Property 'value' does not exist on type 'FigureValue' (it is on PublishedFigureValue only)
    expectTypeOf(fv.value).toBeUndefined();

    if (fv.status === 'published') {
      expectTypeOf(fv.value).toBeNumber();
    }
  });

  test('SuppressedFigureValue has no value property', () => {
    expectTypeOf<keyof SuppressedFigureValue>().toEqualTypeOf<'status' | 'provisional'>();

    interface InvalidSuppressed {
      status: 'suppressed';
      provisional: boolean;
      value: number;
    }
    expectTypeOf<InvalidSuppressed>().not.toEqualTypeOf<SuppressedFigureValue>();
  });

  test('PublishedFigureValue requires value property', () => {
    interface MissingValue {
      status: 'published';
      provisional: boolean;
    }
    expectTypeOf<MissingValue>().not.toEqualTypeOf<PublishedFigureValue>();
    expectTypeOf<keyof PublishedFigureValue>().toEqualTypeOf<'status' | 'value' | 'provisional'>();
  });
});

describe('Figure type tests', () => {
  test('union of nations or generic PublishingNation evaluates to never', () => {
    expectTypeOf<Figure<PublishingNation>>().toEqualTypeOf<never>();
    expectTypeOf<Figure<'england' | 'wales'>>().toEqualTypeOf<never>();
    expectTypeOf<Figure<'england' | 'scotland'>>().toEqualTypeOf<never>();
    expectTypeOf<Figure<'wales' | 'scotland'>>().toEqualTypeOf<never>();
  });

  test('single nations resolve to concrete Figure types', () => {
    expectTypeOf<Figure<'england'>>().not.toEqualTypeOf<never>();
    expectTypeOf<Figure<'wales'>>().not.toEqualTypeOf<never>();
    expectTypeOf<Figure<'scotland'>>().not.toEqualTypeOf<never>();
  });

  test('cross-nation Figure assignment is prohibited', () => {
    expectTypeOf<Figure<'wales'>>().not.toEqualTypeOf<Figure<'england'>>();
    expectTypeOf<Figure<'scotland'>>().not.toEqualTypeOf<Figure<'england'>>();
  });

  test('exactSum rejects mixed-nation array at compile time', () => {
    const englandFigure = {} as Figure<'england'>;
    const walesFigure = {} as Figure<'wales'>;

    // @ts-expect-error exactSum cannot accept an array with mixed nations
    exactSum([englandFigure, walesFigure]);
  });
});
