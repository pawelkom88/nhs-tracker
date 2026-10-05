import type { Figure } from '@kyw/model/figure';
import { figureKey } from '@kyw/model/figure';
import type { ReportingUnitId, SpecialtyId } from '@kyw/model/ids';
import type { PublishingNation } from '@kyw/model/nation';
import { yearEarlierThan, type ReportingPeriod } from '@kyw/model/period';
import type { YearEarlierComparison } from '@kyw/model/published';
import type { Release } from '@kyw/model/release';
import type { EnglandSuccessionIndex } from '../reference/england/succession.js';
import { isSameEntityAcrossScotland } from '../reference/scotland/boards.js';
import { isSameEntityAcrossWales } from '../reference/wales/boards.js';

export interface YearEarlierContext<N extends PublishingNation> {
  readonly comparisonFigures?: readonly Figure<N>[];
  readonly comparisonFigureIndex?: ReadonlyMap<string, Figure<N>>;
  readonly olderRelease?: Release<N> | null;
  readonly olderReleaseFigureIndex?: ReadonlyMap<string, Figure<N>>;
  readonly isSameEntity: (
    unitId: ReportingUnitId<N>,
    olderPeriod: ReportingPeriod,
    newerPeriod: ReportingPeriod,
  ) => boolean;
  readonly specialtyExistedThen?: (
    specialtyId: SpecialtyId<N>,
    olderPeriod: ReportingPeriod,
  ) => boolean;
}

/**
 * Builds an index of figures keyed by dimension tuple (excluding publication date & value)
 * for O(1) comparison lookup.
 */
export function buildFigureLookupMap<N extends PublishingNation>(
  figures: readonly Figure<N>[],
): Map<string, Figure<N>> {
  const map = new Map<string, Figure<N>>();
  for (const fig of figures) {
    map.set(figureKey(fig), fig);
  }
  return map;
}

/**
 * Computes Year-Earlier Comparison for a given figure according to national statistical rules.
 *
 * Rules:
 * 1. Statistic must be Median Ongoing Wait. Non-median figures omit comparison with 'not-median'.
 * 2. Look up comparison figure matching reportingUnit, specialty, waitStage, statistic, and 12-month-earlier period:
 *    - Prefer comparisonFigures (same-release comparison medians supplied by Wales and Scotland).
 *    - Fall back to olderRelease matching yearEarlierThan(figure.reportingPeriod).
 * 3. If comparison figure is not found: return { status: 'omitted', reason: 'not-in-release' }.
 * 4. If reporting unit entity identity changed (merger/takeover/closure): return { status: 'omitted', reason: 'unit-changed' }.
 * 5. If specialty did not exist in the older period: return { status: 'omitted', reason: 'specialty-changed' }.
 * 6. If either current median or comparison median is suppressed: return { status: 'omitted', reason: 'suppressed' }.
 * 7. Otherwise return { status: 'shown', value, reportingPeriod, publicationDate }.
 *
 * @see GLOSSARY.md Year-Earlier Comparison
 * @see ADR-0002
 * @see ADR-0006
 * @see docs/plan/data-sources.md § Succession and mergers (B-4)
 */
export function yearEarlierFor<N extends PublishingNation>(
  figure: Figure<N>,
  ctx: YearEarlierContext<N>,
): YearEarlierComparison {
  const medianStatisticId = `${figure.nation}:median-ongoing-wait`;
  if (figure.statistic !== medianStatisticId) {
    return { status: 'omitted', reason: 'not-median' };
  }

  const expectedPeriod = yearEarlierThan(figure.reportingPeriod);
  const targetKey = `${figure.nation}|${figure.reportingUnit}|${figure.specialty}|${figure.waitStage}|${figure.statistic}|${expectedPeriod}`;

  // 1. Look up comparison figure: prefer same-release comparisonFigures, then olderRelease
  let comparisonFigure: Figure<N> | undefined;

  if (ctx.comparisonFigureIndex) {
    comparisonFigure = ctx.comparisonFigureIndex.get(targetKey);
  } else if (ctx.comparisonFigures && ctx.comparisonFigures.length > 0) {
    comparisonFigure = ctx.comparisonFigures.find(
      (f) =>
        f.reportingUnit === figure.reportingUnit &&
        f.specialty === figure.specialty &&
        f.waitStage === figure.waitStage &&
        f.statistic === figure.statistic &&
        f.reportingPeriod === expectedPeriod,
    );
  }

  if (
    !comparisonFigure &&
    ctx.olderRelease &&
    ctx.olderRelease.reportingPeriod === expectedPeriod
  ) {
    if (ctx.olderReleaseFigureIndex) {
      comparisonFigure = ctx.olderReleaseFigureIndex.get(targetKey);
    } else {
      comparisonFigure = ctx.olderRelease.figures.find(
        (f) =>
          f.reportingUnit === figure.reportingUnit &&
          f.specialty === figure.specialty &&
          f.waitStage === figure.waitStage &&
          f.statistic === figure.statistic,
      );
    }
  }

  if (!comparisonFigure) {
    return { status: 'omitted', reason: 'not-in-release' };
  }

  // 2. Check reporting unit entity continuity
  if (!ctx.isSameEntity(figure.reportingUnit, expectedPeriod, figure.reportingPeriod)) {
    return { status: 'omitted', reason: 'unit-changed' };
  }

  // 3. Check specialty existence in older period
  if (ctx.specialtyExistedThen && !ctx.specialtyExistedThen(figure.specialty, expectedPeriod)) {
    return { status: 'omitted', reason: 'specialty-changed' };
  }

  // 4. Check suppression on current or comparison figure
  if (figure.value.status === 'suppressed' || comparisonFigure.value.status === 'suppressed') {
    return { status: 'omitted', reason: 'suppressed' };
  }

  // 5. Valid year-earlier comparison
  return {
    status: 'shown',
    value: comparisonFigure.value,
    reportingPeriod: comparisonFigure.reportingPeriod,
    publicationDate: comparisonFigure.publicationDate,
  };
}

export interface EnglandYearEarlierOptions {
  readonly olderRelease?: Release<'england'> | null;
  readonly successionIndex: EnglandSuccessionIndex;
  readonly unitCloseDates?: ReadonlyMap<string, string | null>;
  readonly specialtyLookup?: (
    specialtyId: SpecialtyId<'england'>,
    period: ReportingPeriod,
  ) => boolean;
}

/**
 * Creates a YearEarlierContext for England using ODS succession index.
 */
export function createEnglandYearEarlierContext(
  options: EnglandYearEarlierOptions,
): YearEarlierContext<'england'> {
  const olderReleaseFigureIndex = options.olderRelease
    ? buildFigureLookupMap(options.olderRelease.figures)
    : undefined;

  return {
    ...(options.olderRelease !== undefined ? { olderRelease: options.olderRelease } : {}),
    ...(olderReleaseFigureIndex ? { olderReleaseFigureIndex } : {}),
    isSameEntity: (unitId, olderPeriod, newerPeriod) => {
      const code = unitId.startsWith('england:') ? unitId.slice('england:'.length) : unitId;
      const closeDate = options.unitCloseDates?.get(code) ?? null;
      return options.successionIndex.isSameEntityAcross(code, olderPeriod, newerPeriod, closeDate);
    },
    specialtyExistedThen: (specialtyId, period) => {
      if (options.specialtyLookup) {
        return options.specialtyLookup(specialtyId, period);
      }
      return true;
    },
  };
}

export interface WalesYearEarlierOptions {
  readonly comparisonFigures?: readonly Figure<'wales'>[];
  readonly olderRelease?: Release<'wales'> | null;
  readonly specialtyLookup?: (
    specialtyId: SpecialtyId<'wales'>,
    period: ReportingPeriod,
  ) => boolean;
}

/**
 * Creates a YearEarlierContext for Wales using Welsh health board definitions and same-release comparison figures.
 */
export function createWalesYearEarlierContext(
  options: WalesYearEarlierOptions,
): YearEarlierContext<'wales'> {
  const comparisonFigureIndex = options.comparisonFigures
    ? buildFigureLookupMap(options.comparisonFigures)
    : undefined;
  const olderReleaseFigureIndex = options.olderRelease
    ? buildFigureLookupMap(options.olderRelease.figures)
    : undefined;

  return {
    ...(options.comparisonFigures !== undefined
      ? { comparisonFigures: options.comparisonFigures }
      : {}),
    ...(comparisonFigureIndex ? { comparisonFigureIndex } : {}),
    ...(options.olderRelease !== undefined ? { olderRelease: options.olderRelease } : {}),
    ...(olderReleaseFigureIndex ? { olderReleaseFigureIndex } : {}),
    isSameEntity: (unitId, olderPeriod, newerPeriod) => {
      return isSameEntityAcrossWales(unitId, olderPeriod, newerPeriod);
    },
    specialtyExistedThen: (specialtyId, period) => {
      if (options.specialtyLookup) {
        return options.specialtyLookup(specialtyId, period);
      }
      return true;
    },
  };
}

export interface ScotlandYearEarlierOptions {
  readonly comparisonFigures?: readonly Figure<'scotland'>[];
  readonly olderRelease?: Release<'scotland'> | null;
  readonly specialtyLookup?: (
    specialtyId: SpecialtyId<'scotland'>,
    period: ReportingPeriod,
  ) => boolean;
}

/**
 * Creates a YearEarlierContext for Scotland using Scottish board mapping and same-release comparison figures.
 */
export function createScotlandYearEarlierContext(
  options: ScotlandYearEarlierOptions,
): YearEarlierContext<'scotland'> {
  const comparisonFigureIndex = options.comparisonFigures
    ? buildFigureLookupMap(options.comparisonFigures)
    : undefined;
  const olderReleaseFigureIndex = options.olderRelease
    ? buildFigureLookupMap(options.olderRelease.figures)
    : undefined;

  return {
    ...(options.comparisonFigures !== undefined
      ? { comparisonFigures: options.comparisonFigures }
      : {}),
    ...(comparisonFigureIndex ? { comparisonFigureIndex } : {}),
    ...(options.olderRelease !== undefined ? { olderRelease: options.olderRelease } : {}),
    ...(olderReleaseFigureIndex ? { olderReleaseFigureIndex } : {}),
    isSameEntity: (unitId, olderPeriod, newerPeriod) => {
      return isSameEntityAcrossScotland(unitId, olderPeriod, newerPeriod);
    },
    specialtyExistedThen: (specialtyId, period) => {
      if (options.specialtyLookup) {
        return options.specialtyLookup(specialtyId, period);
      }
      return true;
    },
  };
}
