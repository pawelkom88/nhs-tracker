import { z } from 'zod';
import { isPublishingNation, type PublishingNation } from './nation.js';
import { nationScopedIdSchema, type StatisticId, type WaitStageId } from './ids.js';
import { publishedUnitSchema, type PublishedUnit } from './figure.js';

/**
 * Definition of an official waiting time standard for a wait stage.
 *
 * @see GLOSSARY.md Waiting Standard
 * @see ADR-0002
 */
export interface WaitingStandardDefinition {
  readonly weeks: number;
  readonly officialName: string;
  readonly sourceUrl: string;
}

/**
 * Nation-specific definition of a distinct wait stage in a patient journey.
 *
 * @see GLOSSARY.md Wait Stage, Waiting Standard
 * @see ADR-0002
 * @see ADR-0006
 */
export interface WaitStageDefinition<N extends PublishingNation> {
  readonly id: WaitStageId<N>;
  readonly officialName: string;
  readonly waitingStandard: WaitingStandardDefinition;
}

/**
 * Allowed data provenance kinds for a given statistic definition.
 */
export const ALLOWED_PROVENANCE_VALUES = ['official', 'derived', 'official-or-derived'] as const;

export type AllowedProvenance = (typeof ALLOWED_PROVENANCE_VALUES)[number];

/**
 * Value range constraints for a numeric statistic.
 */
export interface StatisticRange {
  readonly min: number;
  readonly max: number;
}

/**
 * Nation-specific definition of a published or derived waiting time metric.
 *
 * @see GLOSSARY.md Statistic, Official Figure, Derived Figure
 * @see ADR-0005
 * @see ADR-0006
 */
export interface StatisticDefinition<N extends PublishingNation> {
  readonly id: StatisticId<N>;
  readonly unit: PublishedUnit;
  readonly officialName: string;
  readonly allowedProvenance: AllowedProvenance;
  readonly range: StatisticRange;
}

/**
 * Container bundle holding all wait stages and statistics defined for a Publishing Nation.
 *
 * @see GLOSSARY.md Publishing Nation, Wait Stage, Statistic
 * @see ADR-0006
 */
export interface NationDefinitions<N extends PublishingNation> {
  readonly nation: N;
  readonly waitStages: Record<string, WaitStageDefinition<N>>;
  readonly statistics: Record<string, StatisticDefinition<N>>;
}

export const waitingStandardDefinitionSchema: z.ZodType<WaitingStandardDefinition> = z.strictObject(
  {
    weeks: z.number().positive('Waiting standard weeks must be positive'),
    officialName: z.string().min(1, 'Official name must be non-empty'),
    sourceUrl: z.url('Source URL must be a valid URL'),
  },
);

export function waitStageDefinitionSchema<N extends PublishingNation>(
  nation: N,
): z.ZodType<WaitStageDefinition<N>> {
  if (!isPublishingNation(nation)) {
    throw new TypeError(`Invalid publishing nation: "${String(nation)}"`);
  }

  return z.strictObject({
    id: nationScopedIdSchema(nation, 'wait-stage'),
    officialName: z.string().min(1, 'Official name must be non-empty'),
    waitingStandard: waitingStandardDefinitionSchema,
  });
}

export const allowedProvenanceSchema: z.ZodType<AllowedProvenance> =
  z.enum(ALLOWED_PROVENANCE_VALUES);

export const statisticRangeSchema: z.ZodType<StatisticRange> = z
  .strictObject({
    min: z.number(),
    max: z.number(),
  })
  .refine((r) => r.min <= r.max, {
    message: 'Range min cannot be greater than range max',
  });

export function statisticDefinitionSchema<N extends PublishingNation>(
  nation: N,
): z.ZodType<StatisticDefinition<N>> {
  if (!isPublishingNation(nation)) {
    throw new TypeError(`Invalid publishing nation: "${String(nation)}"`);
  }

  return z.strictObject({
    id: nationScopedIdSchema(nation, 'statistic'),
    unit: publishedUnitSchema,
    officialName: z.string().min(1, 'Official name must be non-empty'),
    allowedProvenance: allowedProvenanceSchema,
    range: statisticRangeSchema,
  });
}

export function nationDefinitionsSchema<N extends PublishingNation>(
  nation: N,
): z.ZodType<NationDefinitions<N>> {
  if (!isPublishingNation(nation)) {
    throw new TypeError(`Invalid publishing nation: "${String(nation)}"`);
  }

  return z.strictObject({
    nation: z.literal(nation),
    waitStages: z.record(z.string(), waitStageDefinitionSchema(nation)),
    statistics: z.record(z.string(), statisticDefinitionSchema(nation)),
  });
}
