import { describe, expectTypeOf, test } from 'vitest';
import type { Figure, FigureValue } from '../src/figure.js';
import { exactSum } from '../src/figure.js';
import type { StatisticId, WaitStageId } from '../src/ids.js';
import type { WaitStageDefinition } from '../src/nation-definitions.js';
import type { Release } from '../src/release.js';
import type {
  SCOTLAND_WAIT_STAGE_INPATIENT_DAY_CASE,
  SCOTLAND_WAIT_STAGE_NEW_OUTPATIENT,
  scotlandStages,
} from '../src/scotland/definitions.js';

describe('Scotland type tests', () => {
  test('scotlandStages is a tuple of WaitStageDefinition<"scotland">', () => {
    expectTypeOf<typeof scotlandStages>().toEqualTypeOf<
      readonly [
        typeof SCOTLAND_WAIT_STAGE_NEW_OUTPATIENT,
        typeof SCOTLAND_WAIT_STAGE_INPATIENT_DAY_CASE,
      ]
    >();
    expectTypeOf<(typeof scotlandStages)[number]>().toExtend<WaitStageDefinition<'scotland'>>();
  });

  test('Figure<"scotland"> accepts both Scotland wait stages', () => {
    type OutpatientFigure = Figure<'scotland'> & {
      readonly waitStage: WaitStageId<'scotland'>;
    };
    type InpatientFigure = Figure<'scotland'> & {
      readonly waitStage: WaitStageId<'scotland'>;
    };

    expectTypeOf<OutpatientFigure>().toExtend<Figure<'scotland'>>();
    expectTypeOf<InpatientFigure>().toExtend<Figure<'scotland'>>();
  });

  test('exactSum accepts Figure<"scotland"> array and returns FigureValue | null', () => {
    const scotlandFigure1 = {} as Figure<'scotland'>;
    const scotlandFigure2 = {} as Figure<'scotland'>;

    expectTypeOf(exactSum<'scotland'>).toBeCallableWith([scotlandFigure1, scotlandFigure2]);
    expectTypeOf(exactSum([scotlandFigure1, scotlandFigure2])).toEqualTypeOf<FigureValue | null>();
  });

  test('cross-nation types cannot be mixed with Scotland definitions', () => {
    expectTypeOf<WaitStageId<'england'>>().not.toExtend<WaitStageId<'scotland'>>();
    expectTypeOf<StatisticId<'wales'>>().not.toExtend<StatisticId<'scotland'>>();
    expectTypeOf<Figure<'england'>>().not.toExtend<Figure<'scotland'>>();

    // @ts-expect-error England wait stage ID is not assignable to Scotland WaitStageId
    const _badWaitStage: WaitStageId<'scotland'> = 'england:rtt-incomplete-pathway';
    expectTypeOf(_badWaitStage).toEqualTypeOf<WaitStageId<'scotland'>>();

    // @ts-expect-error Wales statistic ID is not assignable to Scotland StatisticId
    const _badStatistic: StatisticId<'scotland'> = 'wales:median-ongoing-wait';
    expectTypeOf(_badStatistic).toEqualTypeOf<StatisticId<'scotland'>>();

    // @ts-expect-error England Figure is not assignable to Scotland Figure array
    const _badFigureArray: Figure<'scotland'>[] = [] as Figure<'england'>[];
    expectTypeOf(_badFigureArray).toEqualTypeOf<Figure<'scotland'>[]>();
  });

  test('Release<"scotland"> is strictly for Scotland', () => {
    expectTypeOf<Release<'scotland'>>().not.toEqualTypeOf<Release<'england'>>();
    expectTypeOf<Release<'scotland'>>().not.toEqualTypeOf<Release<'wales'>>();
  });
});
