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
  yearEarlierThan,
  type PublicationDate,
  type ReportingPeriod,
} from './period.js';
import { sourceRefSchema, type SourceRef } from './source.js';
import {
  figureKey,
  figureSchema,
  figureValueSchema,
  provenanceSchema,
  publishedUnitSchema,
  type Figure,
  type FigureValue,
  type Provenance,
  type PublishedUnit,
} from './figure.js';
import type { NationDefinitions } from './nation-definitions.js';

/**
 * Metadata for a raw source file retrieved during pipeline ingestion.
 */
export interface SourceFileRef {
  readonly url: string;
  readonly sha256: string;
  readonly revised: boolean;
}

/**
 * A normalised publication release for one Publishing Nation and Reporting Period.
 *
 * `Release<N>` evaluates to `never` if `N` is a union of nations.
 *
 * @see GLOSSARY.md Publishing Nation, Reporting Period, Publication Date, Official Figure, Derived Figure
 * @see ADR-0006
 * @see ADR-0007
 */
export type Release<N extends PublishingNation> = [SingleNation<N>] extends [never]
  ? never
  : {
      readonly schemaVersion: 1;
      readonly nation: N;
      readonly reportingPeriod: ReportingPeriod;
      readonly publicationDate: PublicationDate;
      readonly source: SourceRef<N>;
      readonly retrievedAt: string;
      readonly sourceFiles: readonly SourceFileRef[];
      readonly reportingUnits: readonly ReportingUnitId<N>[];
      readonly figures: readonly Figure<N>[];
      readonly comparisonFigures: readonly Figure<N>[];
    };

/**
 * Compact representation of a Figure omitting release-level duplicate dimensions.
 *
 * @see ADR-0007
 */
export interface CompactFigure<N extends PublishingNation> {
  readonly reportingUnit: ReportingUnitId<N>;
  readonly specialty: SpecialtyId<N>;
  readonly waitStage: WaitStageId<N>;
  readonly statistic: StatisticId<N>;
  readonly unit: PublishedUnit;
  readonly value: FigureValue;
  readonly provenance: Provenance;
}

/**
 * Compact representation of a Comparison Figure omitting release-level duplicate dimensions
 * but retaining its distinct 12-month earlier reporting period.
 *
 * @see ADR-0002
 * @see ADR-0007
 */
export interface CompactComparisonFigure<N extends PublishingNation> {
  readonly reportingUnit: ReportingUnitId<N>;
  readonly specialty: SpecialtyId<N>;
  readonly waitStage: WaitStageId<N>;
  readonly statistic: StatisticId<N>;
  readonly reportingPeriod: ReportingPeriod;
  readonly unit: PublishedUnit;
  readonly value: FigureValue;
  readonly provenance: Provenance;
}

/**
 * Serialised JSON file structure of a Release stored on disk.
 *
 * @see ADR-0007
 */
export type ReleaseFile<N extends PublishingNation> = [SingleNation<N>] extends [never]
  ? never
  : {
      readonly schemaVersion: 1;
      readonly nation: N;
      readonly reportingPeriod: ReportingPeriod;
      readonly publicationDate: PublicationDate;
      readonly source: SourceRef<N>;
      readonly retrievedAt: string;
      readonly sourceFiles: readonly SourceFileRef[];
      readonly reportingUnits: readonly ReportingUnitId<N>[];
      readonly figures: readonly CompactFigure<N>[];
      readonly comparisonFigures: readonly CompactComparisonFigure<N>[];
    };

/**
 * Converts a domain `Release<N>` object into its compact `ReleaseFile<N>` representation.
 */
export function toReleaseFile<N extends PublishingNation>(release: Release<N>): ReleaseFile<N> {
  const compactFigures: CompactFigure<N>[] = release.figures.map((f) => ({
    reportingUnit: f.reportingUnit,
    specialty: f.specialty,
    waitStage: f.waitStage,
    statistic: f.statistic,
    unit: f.unit,
    value: f.value,
    provenance: f.provenance,
  }));

  const compactComparisonFigures: CompactComparisonFigure<N>[] = release.comparisonFigures.map(
    (f) => ({
      reportingUnit: f.reportingUnit,
      specialty: f.specialty,
      waitStage: f.waitStage,
      statistic: f.statistic,
      reportingPeriod: f.reportingPeriod,
      unit: f.unit,
      value: f.value,
      provenance: f.provenance,
    }),
  );

  return {
    schemaVersion: release.schemaVersion,
    nation: release.nation,
    reportingPeriod: release.reportingPeriod,
    publicationDate: release.publicationDate,
    source: release.source,
    retrievedAt: release.retrievedAt,
    sourceFiles: [...release.sourceFiles],
    reportingUnits: [...release.reportingUnits],
    figures: compactFigures,
    comparisonFigures: compactComparisonFigures,
  } as unknown as ReleaseFile<N>;
}

/**
 * Reconstitutes a complete domain `Release<N>` from a compact `ReleaseFile<N>` losslessly.
 */
export function fromReleaseFile<N extends PublishingNation>(file: ReleaseFile<N>): Release<N> {
  const figures: Figure<N>[] = file.figures.map((cf) => ({
    nation: file.nation,
    reportingUnit: cf.reportingUnit,
    specialty: cf.specialty,
    waitStage: cf.waitStage,
    statistic: cf.statistic,
    reportingPeriod: file.reportingPeriod,
    publicationDate: file.publicationDate,
    unit: cf.unit,
    value: cf.value,
    provenance: cf.provenance,
    source: file.source,
  })) as Figure<N>[];

  const comparisonFigures: Figure<N>[] = file.comparisonFigures.map((cf) => ({
    nation: file.nation,
    reportingUnit: cf.reportingUnit,
    specialty: cf.specialty,
    waitStage: cf.waitStage,
    statistic: cf.statistic,
    reportingPeriod: cf.reportingPeriod,
    publicationDate: file.publicationDate,
    unit: cf.unit,
    value: cf.value,
    provenance: cf.provenance,
    source: file.source,
  })) as Figure<N>[];

  return {
    schemaVersion: file.schemaVersion,
    nation: file.nation,
    reportingPeriod: file.reportingPeriod,
    publicationDate: file.publicationDate,
    source: file.source,
    retrievedAt: file.retrievedAt,
    sourceFiles: [...file.sourceFiles],
    reportingUnits: [...file.reportingUnits],
    figures,
    comparisonFigures,
  } as unknown as Release<N>;
}

export const sourceFileRefSchema: z.ZodType<SourceFileRef> = z.strictObject({
  url: z.url('Source file URL must be a valid URL'),
  sha256: z.string().regex(/^[a-f0-9]{64}$/i, 'SHA-256 must be 64 hexadecimal characters'),
  revised: z.boolean(),
});

const isoDateTimeSchema = z.iso.datetime({
  message: 'retrievedAt must be a valid ISO 8601 datetime string',
});

/**
 * Creates a Zod schema validating a complete `Release<N>` against its nation definitions.
 */
export function releaseSchema<N extends PublishingNation>(
  defs: NationDefinitions<N>,
): z.ZodType<Release<N>> {
  const nation = defs.nation;
  if (!isPublishingNation(nation)) {
    throw new TypeError(`Invalid publishing nation: "${String(nation)}"`);
  }

  const waitStageMap = new Map(Object.values(defs.waitStages).map((ws) => [ws.id, ws]));
  const statisticMap = new Map(Object.values(defs.statistics).map((st) => [st.id, st]));
  const medianOngoingWaitId = `${nation}:median-ongoing-wait`;

  return z
    .strictObject({
      schemaVersion: z.literal(1),
      nation: z.literal(nation),
      reportingPeriod: reportingPeriodSchema,
      publicationDate: publicationDateSchema,
      source: sourceRefSchema(nation),
      retrievedAt: isoDateTimeSchema,
      sourceFiles: z.array(sourceFileRefSchema),
      reportingUnits: z.array(nationScopedIdSchema(nation, 'reporting-unit')),
      figures: z.array(figureSchema(nation)),
      comparisonFigures: z.array(figureSchema(nation)),
    })
    .superRefine((data, ctx) => {
      const reportingUnitsSet = new Set(data.reportingUnits);
      const seenFigureKeys = new Set<string>();

      data.figures.forEach((fig, index) => {
        const pathPrefix = ['figures', index];

        if (fig.nation !== data.nation) {
          ctx.addIssue({
            code: 'custom',
            message: `Figure nation "${fig.nation}" does not match release nation "${data.nation}"`,
            path: [...pathPrefix, 'nation'],
          });
        }

        if (fig.reportingPeriod !== data.reportingPeriod) {
          ctx.addIssue({
            code: 'custom',
            message: `Figure reportingPeriod "${fig.reportingPeriod}" does not match release reportingPeriod "${data.reportingPeriod}"`,
            path: [...pathPrefix, 'reportingPeriod'],
          });
        }

        if (fig.publicationDate !== data.publicationDate) {
          ctx.addIssue({
            code: 'custom',
            message: `Figure publicationDate "${fig.publicationDate}" does not match release publicationDate "${data.publicationDate}"`,
            path: [...pathPrefix, 'publicationDate'],
          });
        }

        if (fig.source.url !== data.source.url || fig.source.title !== data.source.title) {
          ctx.addIssue({
            code: 'custom',
            message: 'Figure source does not match release source',
            path: [...pathPrefix, 'source'],
          });
        }

        if (!reportingUnitsSet.has(fig.reportingUnit)) {
          ctx.addIssue({
            code: 'custom',
            message: `Reporting unit "${fig.reportingUnit}" is not listed in release reportingUnits`,
            path: [...pathPrefix, 'reportingUnit'],
          });
        }

        if (!waitStageMap.has(fig.waitStage)) {
          ctx.addIssue({
            code: 'custom',
            message: `Wait stage "${fig.waitStage}" is not defined in nation definitions`,
            path: [...pathPrefix, 'waitStage'],
          });
        }

        const statDef = statisticMap.get(fig.statistic);
        if (!statDef) {
          ctx.addIssue({
            code: 'custom',
            message: `Statistic "${fig.statistic}" is not defined in nation definitions`,
            path: [...pathPrefix, 'statistic'],
          });
        } else {
          if (fig.unit !== statDef.unit) {
            ctx.addIssue({
              code: 'custom',
              message: `Figure unit "${fig.unit}" does not match defined statistic unit "${statDef.unit}"`,
              path: [...pathPrefix, 'unit'],
            });
          }

          if (statDef.allowedProvenance === 'official' && fig.provenance.kind !== 'official') {
            ctx.addIssue({
              code: 'custom',
              message: `Statistic "${fig.statistic}" requires official provenance, got "${fig.provenance.kind}"`,
              path: [...pathPrefix, 'provenance'],
            });
          } else if (statDef.allowedProvenance === 'derived' && fig.provenance.kind !== 'derived') {
            ctx.addIssue({
              code: 'custom',
              message: `Statistic "${fig.statistic}" requires derived provenance, got "${fig.provenance.kind}"`,
              path: [...pathPrefix, 'provenance'],
            });
          }

          if (fig.value.status === 'published') {
            const num = fig.value.value;
            if (num < statDef.range.min || num > statDef.range.max) {
              ctx.addIssue({
                code: 'custom',
                message: `Figure value ${String(num)} is outside allowed range [${String(statDef.range.min)}, ${String(statDef.range.max)}] for statistic "${fig.statistic}"`,
                path: [...pathPrefix, 'value', 'value'],
              });
            }
          }
        }

        const key = figureKey(fig);
        if (seenFigureKeys.has(key)) {
          ctx.addIssue({
            code: 'custom',
            message: `Duplicate figureKey detected in release: "${key}"`,
            path: [...pathPrefix],
          });
        } else {
          seenFigureKeys.add(key);
        }
      });

      const expectedComparisonPeriod = yearEarlierThan(data.reportingPeriod);
      const seenCompFigureKeys = new Set<string>();

      data.comparisonFigures.forEach((fig, index) => {
        const pathPrefix = ['comparisonFigures', index];

        if (fig.nation !== data.nation) {
          ctx.addIssue({
            code: 'custom',
            message: `Comparison figure nation "${fig.nation}" does not match release nation "${data.nation}"`,
            path: [...pathPrefix, 'nation'],
          });
        }

        if (fig.reportingPeriod !== expectedComparisonPeriod) {
          ctx.addIssue({
            code: 'custom',
            message: `Comparison figure reportingPeriod "${fig.reportingPeriod}" must equal 1 year earlier period "${expectedComparisonPeriod}"`,
            path: [...pathPrefix, 'reportingPeriod'],
          });
        }

        if (fig.publicationDate !== data.publicationDate) {
          ctx.addIssue({
            code: 'custom',
            message: `Comparison figure publicationDate "${fig.publicationDate}" does not match release publicationDate "${data.publicationDate}"`,
            path: [...pathPrefix, 'publicationDate'],
          });
        }

        if (fig.statistic !== medianOngoingWaitId) {
          ctx.addIssue({
            code: 'custom',
            message: `Comparison figure statistic "${fig.statistic}" must be median ongoing wait ("${medianOngoingWaitId}")`,
            path: [...pathPrefix, 'statistic'],
          });
        }

        if (!reportingUnitsSet.has(fig.reportingUnit)) {
          ctx.addIssue({
            code: 'custom',
            message: `Comparison reporting unit "${fig.reportingUnit}" is not listed in release reportingUnits`,
            path: [...pathPrefix, 'reportingUnit'],
          });
        }

        if (!waitStageMap.has(fig.waitStage)) {
          ctx.addIssue({
            code: 'custom',
            message: `Wait stage "${fig.waitStage}" is not defined in nation definitions`,
            path: [...pathPrefix, 'waitStage'],
          });
        }

        const statDef = statisticMap.get(fig.statistic);
        if (statDef) {
          if (fig.unit !== statDef.unit) {
            ctx.addIssue({
              code: 'custom',
              message: `Comparison figure unit "${fig.unit}" does not match defined statistic unit "${statDef.unit}"`,
              path: [...pathPrefix, 'unit'],
            });
          }

          if (fig.value.status === 'published') {
            const num = fig.value.value;
            if (num < statDef.range.min || num > statDef.range.max) {
              ctx.addIssue({
                code: 'custom',
                message: `Comparison figure value ${String(num)} is outside allowed range [${String(statDef.range.min)}, ${String(statDef.range.max)}] for statistic "${fig.statistic}"`,
                path: [...pathPrefix, 'value', 'value'],
              });
            }
          }
        }

        const key = figureKey(fig);
        if (seenCompFigureKeys.has(key)) {
          ctx.addIssue({
            code: 'custom',
            message: `Duplicate figureKey detected in comparisonFigures: "${key}"`,
            path: [...pathPrefix],
          });
        } else {
          seenCompFigureKeys.add(key);
        }
      });
    }) as unknown as z.ZodType<Release<N>>;
}

export function compactFigureSchema<N extends PublishingNation>(
  nation: N,
): z.ZodType<CompactFigure<N>> {
  if (!isPublishingNation(nation)) {
    throw new TypeError(`Invalid publishing nation: "${String(nation)}"`);
  }

  return z.strictObject({
    reportingUnit: nationScopedIdSchema(nation, 'reporting-unit'),
    specialty: nationScopedIdSchema(nation, 'specialty'),
    waitStage: nationScopedIdSchema(nation, 'wait-stage'),
    statistic: nationScopedIdSchema(nation, 'statistic'),
    unit: publishedUnitSchema,
    value: figureValueSchema(),
    provenance: provenanceSchema,
  });
}

export function compactComparisonFigureSchema<N extends PublishingNation>(
  nation: N,
): z.ZodType<CompactComparisonFigure<N>> {
  if (!isPublishingNation(nation)) {
    throw new TypeError(`Invalid publishing nation: "${String(nation)}"`);
  }

  return z.strictObject({
    reportingUnit: nationScopedIdSchema(nation, 'reporting-unit'),
    specialty: nationScopedIdSchema(nation, 'specialty'),
    waitStage: nationScopedIdSchema(nation, 'wait-stage'),
    statistic: nationScopedIdSchema(nation, 'statistic'),
    reportingPeriod: reportingPeriodSchema,
    unit: publishedUnitSchema,
    value: figureValueSchema(),
    provenance: provenanceSchema,
  });
}

/**
 * Creates a Zod schema validating a `ReleaseFile<N>` against its nation definitions.
 */
export function releaseFileSchema<N extends PublishingNation>(
  defs: NationDefinitions<N>,
): z.ZodType<ReleaseFile<N>> {
  const nation = defs.nation;
  if (!isPublishingNation(nation)) {
    throw new TypeError(`Invalid publishing nation: "${String(nation)}"`);
  }

  const baseSchema = z.strictObject({
    schemaVersion: z.literal(1),
    nation: z.literal(nation),
    reportingPeriod: reportingPeriodSchema,
    publicationDate: publicationDateSchema,
    source: sourceRefSchema(nation),
    retrievedAt: isoDateTimeSchema,
    sourceFiles: z.array(sourceFileRefSchema),
    reportingUnits: z.array(nationScopedIdSchema(nation, 'reporting-unit')),
    figures: z.array(compactFigureSchema(nation)),
    comparisonFigures: z.array(compactComparisonFigureSchema(nation)),
  });

  const fullReleaseValidator = releaseSchema(defs);

  return baseSchema.superRefine((file, ctx) => {
    const hydrated = fromReleaseFile(file as unknown as ReleaseFile<N>);
    const result = fullReleaseValidator.safeParse(hydrated);
    if (!result.success) {
      for (const issue of result.error.issues) {
        ctx.addIssue({
          code: 'custom',
          message: issue.message,
          path: issue.path,
        });
      }
    }
  }) as unknown as z.ZodType<ReleaseFile<N>>;
}
