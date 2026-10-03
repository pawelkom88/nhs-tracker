import { z } from 'zod';
import { isPublishingNation, type PublishingNation, type SingleNation } from './nation.js';
import {
  nationScopedIdSchema,
  type ReportingUnitId,
  type SpecialtyId,
  type StatisticId,
  type WaitStageId,
} from './ids.js';
import {
  publicationDateSchema,
  reportingPeriodSchema,
  type PublicationDate,
  type ReportingPeriod,
} from './period.js';
import { sourceRefSchema, type SourceRef } from './source.js';

/**
 * Standard units in which waiting-time figures are published.
 * Values are kept exactly as published in their respective nation's unit.
 *
 * @see ADR-0006
 */
export const PUBLISHED_UNITS = ['weeks', 'days', 'percent', 'proportion', 'count'] as const;

export type PublishedUnit = (typeof PUBLISHED_UNITS)[number];

export function isPublishedUnit(value: unknown): value is PublishedUnit {
  return typeof value === 'string' && (PUBLISHED_UNITS as readonly string[]).includes(value);
}

/**
 * A published numeric figure value with quality metadata.
 */
export interface PublishedFigureValue {
  readonly status: 'published';
  readonly value: number;
  readonly provisional: boolean;
}

/**
 * A figure value suppressed by the publisher due to small numbers / disclosure control.
 * Has no numeric value property.
 *
 * @see GLOSSARY.md Suppressed Figure
 */
export interface SuppressedFigureValue {
  readonly status: 'suppressed';
  readonly provisional: boolean;
}

/**
 * Figure value representing either a published number or a suppressed cell.
 *
 * @see GLOSSARY.md Official Figure, Suppressed Figure, Provisional Figure
 */
export type FigureValue = PublishedFigureValue | SuppressedFigureValue;

/**
 * Provenance for an Official Figure directly published in an NHS source dataset.
 *
 * @see GLOSSARY.md Official Figure
 */
export interface OfficialProvenance {
  readonly kind: 'official';
  readonly sourceField: string;
}

/**
 * Provenance for a Derived Figure produced solely by exact summation of Official Figures.
 *
 * @see GLOSSARY.md Derived Figure
 * @see ADR-0005
 */
export interface DerivedProvenance {
  readonly kind: 'derived';
  readonly method: 'exact-sum';
  readonly inputs: readonly [string, string, ...string[]];
}

/**
 * Provenance tracking where a figure originated and how it was calculated.
 */
export type Provenance = OfficialProvenance | DerivedProvenance;

/**
 * A single waiting-time statistic record, fully qualified by its 6 core dimensions.
 *
 * `Figure<N>` evaluates to `never` if `N` is not a single concrete publishing nation.
 *
 * @see GLOSSARY.md Official Figure, Derived Figure
 * @see ADR-0005
 * @see ADR-0006
 */
export type Figure<N extends PublishingNation> = [SingleNation<N>] extends [never]
  ? never
  : {
      readonly nation: N;
      readonly reportingUnit: ReportingUnitId<N>;
      readonly specialty: SpecialtyId<N>;
      readonly waitStage: WaitStageId<N>;
      readonly statistic: StatisticId<N>;
      readonly reportingPeriod: ReportingPeriod;
      readonly publicationDate: PublicationDate;
      readonly unit: PublishedUnit;
      readonly value: FigureValue;
      readonly provenance: Provenance;
      readonly source: SourceRef<N>;
    };

/**
 * Returns a stable unique compound key for a figure across its 6 key dimensions.
 */
export function figureKey<N extends PublishingNation>(f: {
  readonly nation: N;
  readonly reportingUnit: ReportingUnitId<N>;
  readonly specialty: SpecialtyId<N>;
  readonly waitStage: WaitStageId<N>;
  readonly statistic: StatisticId<N>;
  readonly reportingPeriod: ReportingPeriod;
}): string {
  return `${f.nation}|${f.reportingUnit}|${f.specialty}|${f.waitStage}|${f.statistic}|${f.reportingPeriod}`;
}

/**
 * Sums a list of figures exactly.
 *
 * Returns `null` if:
 * - The input array is empty
 * - Any input figure has a suppressed value
 * - Any input figure value is not a safe integer
 * - Inputs differ in nation, reporting unit, specialty, wait stage, reporting period, publication date, or unit
 *
 * Inherits `provisional: true` if any input is provisional.
 *
 * @see ADR-0005
 */
export function exactSum<N extends PublishingNation>(
  inputs: readonly Figure<N>[],
): FigureValue | null {
  if (inputs.length === 0) {
    return null;
  }

  const first = inputs[0];
  if (!first) {
    return null;
  }

  let sum = 0;
  let isProvisional = false;

  for (const item of inputs) {
    if (
      item.nation !== first.nation ||
      item.reportingUnit !== first.reportingUnit ||
      item.specialty !== first.specialty ||
      item.waitStage !== first.waitStage ||
      item.reportingPeriod !== first.reportingPeriod ||
      item.publicationDate !== first.publicationDate ||
      item.unit !== first.unit
    ) {
      return null;
    }

    if (item.value.status === 'suppressed') {
      return null;
    }

    if (!Number.isSafeInteger(item.value.value)) {
      return null;
    }

    sum += item.value.value;
    if (item.value.provisional) {
      isProvisional = true;
    }
  }

  if (!Number.isSafeInteger(sum)) {
    return null;
  }

  return {
    status: 'published',
    value: sum,
    provisional: isProvisional,
  };
}

export const publishedUnitSchema = z.enum(PUBLISHED_UNITS);

export const officialProvenanceSchema = z.strictObject({
  kind: z.literal('official'),
  sourceField: z.string().min(1, 'Source field name must be non-empty'),
});

export const derivedProvenanceSchema = z.strictObject({
  kind: z.literal('derived'),
  method: z.literal('exact-sum'),
  inputs: z
    .array(z.string().min(1))
    .min(2, 'Exact-sum derived figure must have at least 2 input fields')
    .readonly() as unknown as z.ZodType<readonly [string, string, ...string[]]>,
});

export const provenanceSchema: z.ZodType<Provenance> = z.union([
  officialProvenanceSchema,
  derivedProvenanceSchema,
]);

export function publishedFigureValueSchema(unit?: PublishedUnit): z.ZodType<PublishedFigureValue> {
  let valueRule = z.number();

  if (unit === 'count') {
    valueRule = valueRule.int('Count must be an integer').nonnegative('Count cannot be negative');
  } else if (unit === 'percent') {
    valueRule = valueRule
      .min(0, 'Percent cannot be negative')
      .max(100, 'Percent cannot exceed 100');
  } else if (unit === 'proportion') {
    valueRule = valueRule
      .min(0, 'Proportion cannot be negative')
      .max(1, 'Proportion cannot exceed 1');
  }

  return z.strictObject({
    status: z.literal('published'),
    value: valueRule,
    provisional: z.boolean(),
  });
}

export const suppressedFigureValueSchema: z.ZodType<SuppressedFigureValue> = z.strictObject({
  status: z.literal('suppressed'),
  provisional: z.boolean(),
});

export function figureValueSchema(unit?: PublishedUnit): z.ZodType<FigureValue> {
  return z.union([publishedFigureValueSchema(unit), suppressedFigureValueSchema]);
}

interface RawFigureData {
  unit: PublishedUnit;
  value: {
    status: 'published' | 'suppressed';
    value?: number;
    provisional: boolean;
  };
}

/**
 * Creates a Zod schema validating a complete `Figure<N>` record for a specific publishing nation.
 */
export function figureSchema<N extends PublishingNation>(nation: N): z.ZodType<Figure<N>> {
  if (!isPublishingNation(nation)) {
    throw new TypeError(`Invalid publishing nation: "${String(nation)}"`);
  }

  return z
    .strictObject({
      nation: z.literal(nation),
      reportingUnit: nationScopedIdSchema(nation, 'reporting-unit'),
      specialty: nationScopedIdSchema(nation, 'specialty'),
      waitStage: nationScopedIdSchema(nation, 'wait-stage'),
      statistic: nationScopedIdSchema(nation, 'statistic'),
      reportingPeriod: reportingPeriodSchema,
      publicationDate: publicationDateSchema,
      unit: publishedUnitSchema,
      value: z.union([
        z.strictObject({
          status: z.literal('published'),
          value: z.number(),
          provisional: z.boolean(),
        }),
        suppressedFigureValueSchema,
      ]),
      provenance: provenanceSchema,
      source: sourceRefSchema(nation),
    })
    .superRefine((data: unknown, ctx) => {
      const figureData = data as RawFigureData;
      if (figureData.value.status === 'published' && typeof figureData.value.value === 'number') {
        const val = figureData.value.value;
        if (figureData.unit === 'count') {
          if (!Number.isInteger(val)) {
            ctx.addIssue({
              code: 'custom',
              message: 'Count must be an integer',
              path: ['value', 'value'],
            });
          }
          if (val < 0) {
            ctx.addIssue({
              code: 'custom',
              message: 'Count cannot be negative',
              path: ['value', 'value'],
            });
          }
        } else if (figureData.unit === 'percent') {
          if (val < 0 || val > 100) {
            ctx.addIssue({
              code: 'custom',
              message: 'Percent must be between 0 and 100',
              path: ['value', 'value'],
            });
          }
        } else if (figureData.unit === 'proportion') {
          if (val < 0 || val > 1) {
            ctx.addIssue({
              code: 'custom',
              message: 'Proportion must be between 0 and 1',
              path: ['value', 'value'],
            });
          }
        }
      }
    }) as unknown as z.ZodType<Figure<N>>;
}
