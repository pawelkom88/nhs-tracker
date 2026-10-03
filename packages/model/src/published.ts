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
 * Valid omission reasons when a Year-Earlier Comparison cannot be displayed.
 *
 * @see GLOSSARY.md Year-Earlier Comparison
 */
export const YEAR_EARLIER_OMITTED_REASONS = [
  'not-in-release',
  'unit-changed',
  'specialty-changed',
  'suppressed',
  'not-median',
] as const;

export type YearEarlierComparisonOmittedReason = (typeof YEAR_EARLIER_OMITTED_REASONS)[number];

/**
 * Year-earlier comparison value when available and eligible for display.
 * Only Median Ongoing Wait figures may have `status: 'shown'`.
 *
 * @see GLOSSARY.md Year-Earlier Comparison, Median Ongoing Wait
 */
export interface YearEarlierComparisonShown {
  readonly status: 'shown';
  readonly value: FigureValue;
  readonly reportingPeriod: ReportingPeriod;
  readonly publicationDate: PublicationDate;
}

/**
 * Year-earlier comparison omission state with structured domain reason.
 *
 * @see GLOSSARY.md Year-Earlier Comparison
 */
export interface YearEarlierComparisonOmitted {
  readonly status: 'omitted';
  readonly reason: YearEarlierComparisonOmittedReason;
}

/**
 * Precomputed year-earlier comparison state attached to a published figure.
 */
export type YearEarlierComparison = YearEarlierComparisonShown | YearEarlierComparisonOmitted;

/**
 * A published figure enriched with precomputed year-earlier comparison state.
 *
 * Evaluates to `never` if `N` is not a single concrete publishing nation.
 *
 * @see GLOSSARY.md Year-Earlier Comparison, Official Figure, Derived Figure
 * @see ADR-0005
 * @see ADR-0006
 */
export type PublishedFigure<N extends PublishingNation> = [SingleNation<N>] extends [never]
  ? never
  : Figure<N> & {
      readonly yearEarlier: YearEarlierComparison;
    };

/**
 * Publication currency state of a reporting unit × specialty combination.
 *
 * - `current`: Figures are from the latest published release.
 * - `carried-forward`: Figures are missing from latest release and carried forward (1–12 months old).
 * - `no-recent-figures`: No figures published for > 12 months; no figures rendered.
 *
 * @see GLOSSARY.md Carried-Forward Figure, Reporting Period
 */
export type PublishedUnitSpecialtyState =
  | { readonly kind: 'current' }
  | { readonly kind: 'carried-forward'; readonly monthsOld: number }
  | { readonly kind: 'no-recent-figures'; readonly lastReportingPeriod: ReportingPeriod };

/**
 * Grouped waiting time figures and publication state for a specific Reporting Unit and Specialty.
 *
 * @see GLOSSARY.md Reporting Unit, Specialty, Carried-Forward Figure
 * @see ADR-0006
 */
export type PublishedUnitSpecialty<N extends PublishingNation> = [SingleNation<N>] extends [never]
  ? never
  : {
      readonly reportingUnit: ReportingUnitId<N>;
      readonly specialty: SpecialtyId<N>;
      readonly state: PublishedUnitSpecialtyState;
      readonly figures: readonly PublishedFigure<N>[];
    };

/**
 * Metadata for the latest published statistical release for a nation.
 */
export interface PublishedLatestRelease<N extends PublishingNation> {
  readonly reportingPeriod: ReportingPeriod;
  readonly publicationDate: PublicationDate;
  readonly source: SourceRef<N>;
}

/**
 * The complete published domain view consumed by the static site.
 *
 * Precomputed, validated snapshot of waiting times per nation.
 *
 * Evaluates to `never` if `N` is a union of nations.
 *
 * @see GLOSSARY.md Publishing Nation, Reporting Period, Publication Date
 * @see ADR-0006
 * @see ADR-0007
 */
export type PublishedNation<N extends PublishingNation> = [SingleNation<N>] extends [never]
  ? never
  : {
      readonly schemaVersion: 1;
      readonly nation: N;
      readonly latestRelease: PublishedLatestRelease<N>;
      readonly generatedAt: string;
      readonly entries: readonly PublishedUnitSpecialty<N>[];
    };

/**
 * Compact representation of a published figure omitting repetitive unit/specialty/release dimensions.
 */
export interface CompactPublishedFigure<N extends PublishingNation> {
  readonly waitStage: WaitStageId<N>;
  readonly statistic: StatisticId<N>;
  readonly unit: PublishedUnit;
  readonly value: FigureValue;
  readonly provenance: Provenance;
  readonly yearEarlier: YearEarlierComparison;
}

/**
 * Reference to an older release when figures for a unit-specialty are carried forward.
 */
export interface PublishedReleaseRef {
  readonly reportingPeriod: ReportingPeriod;
  readonly publicationDate: PublicationDate;
  readonly sourceKey: string;
}

/**
 * Compact representation of a unit-specialty entry in serialised JSON files.
 */
export interface CompactPublishedUnitSpecialty<N extends PublishingNation> {
  readonly reportingUnit: ReportingUnitId<N>;
  readonly specialty: SpecialtyId<N>;
  readonly state: PublishedUnitSpecialtyState;
  readonly releaseRef?: PublishedReleaseRef;
  readonly figures: readonly CompactPublishedFigure<N>[];
}

/**
 * Serialised JSON file structure of published nation data stored in `data/<nation>/published.json`.
 *
 * @see ADR-0007
 */
export type PublishedFile<N extends PublishingNation> = [SingleNation<N>] extends [never]
  ? never
  : {
      readonly schemaVersion: 1;
      readonly nation: N;
      readonly latestRelease: PublishedLatestRelease<N>;
      readonly generatedAt: string;
      readonly sources: Record<string, SourceRef<N>>;
      readonly entries: readonly CompactPublishedUnitSpecialty<N>[];
    };

/**
 * Converts a domain `PublishedNation<N>` into its compact `PublishedFile<N>` representation.
 */
export function toPublishedFile<N extends PublishingNation>(
  published: PublishedNation<N>,
): PublishedFile<N> {
  const sources: Record<string, SourceRef<N>> = {
    latest: published.latestRelease.source,
  };

  let sourceCounter = 1;
  const sourceToKey = new Map<string, string>();
  sourceToKey.set(
    `${published.latestRelease.source.url}|${published.latestRelease.source.title}`,
    'latest',
  );

  function getOrAddSourceKey(source: SourceRef<N>): string {
    const key = `${source.url}|${source.title}`;
    let existing = sourceToKey.get(key);
    if (!existing) {
      existing = `src-${String(sourceCounter++)}`;
      sourceToKey.set(key, existing);
      sources[existing] = source;
    }
    return existing;
  }

  const entries: CompactPublishedUnitSpecialty<N>[] = published.entries.map((entry) => {
    const compactFigures: CompactPublishedFigure<N>[] = entry.figures.map((fig) => ({
      waitStage: fig.waitStage,
      statistic: fig.statistic,
      unit: fig.unit,
      value: fig.value,
      provenance: fig.provenance,
      yearEarlier: fig.yearEarlier,
    }));

    let releaseRef: PublishedReleaseRef | undefined;

    if (entry.state.kind === 'carried-forward' && entry.figures.length > 0) {
      const firstFig = entry.figures[0];
      if (firstFig) {
        const sourceKey = getOrAddSourceKey(firstFig.source);
        releaseRef = {
          reportingPeriod: firstFig.reportingPeriod,
          publicationDate: firstFig.publicationDate,
          sourceKey,
        };
      }
    }

    return {
      reportingUnit: entry.reportingUnit,
      specialty: entry.specialty,
      state: entry.state,
      ...(releaseRef ? { releaseRef } : {}),
      figures: compactFigures,
    };
  });

  return {
    schemaVersion: published.schemaVersion,
    nation: published.nation,
    latestRelease: published.latestRelease,
    generatedAt: published.generatedAt,
    sources,
    entries,
  } as unknown as PublishedFile<N>;
}

/**
 * Reconstitutes a domain `PublishedNation<N>` from a compact `PublishedFile<N>` losslessly.
 */
export function fromPublishedFile<N extends PublishingNation>(
  file: PublishedFile<N>,
): PublishedNation<N> {
  const entries: PublishedUnitSpecialty<N>[] = file.entries.map((entry) => {
    let reportingPeriod = file.latestRelease.reportingPeriod;
    let publicationDate = file.latestRelease.publicationDate;
    let source = file.latestRelease.source;

    if (entry.releaseRef) {
      reportingPeriod = entry.releaseRef.reportingPeriod;
      publicationDate = entry.releaseRef.publicationDate;
      const resolvedSource =
        entry.releaseRef.sourceKey === 'latest'
          ? file.latestRelease.source
          : file.sources[entry.releaseRef.sourceKey];
      if (resolvedSource) {
        source = resolvedSource;
      }
    }

    const figures: PublishedFigure<N>[] = entry.figures.map((cf) => ({
      nation: file.nation,
      reportingUnit: entry.reportingUnit,
      specialty: entry.specialty,
      waitStage: cf.waitStage,
      statistic: cf.statistic,
      reportingPeriod,
      publicationDate,
      unit: cf.unit,
      value: cf.value,
      provenance: cf.provenance,
      source,
      yearEarlier: cf.yearEarlier,
    })) as PublishedFigure<N>[];

    return {
      reportingUnit: entry.reportingUnit,
      specialty: entry.specialty,
      state: entry.state,
      figures,
    } as unknown as PublishedUnitSpecialty<N>;
  });

  return {
    schemaVersion: file.schemaVersion,
    nation: file.nation,
    latestRelease: file.latestRelease,
    generatedAt: file.generatedAt,
    entries,
  } as unknown as PublishedNation<N>;
}

export const yearEarlierComparisonOmittedSchema: z.ZodType<YearEarlierComparisonOmitted> =
  z.strictObject({
    status: z.literal('omitted'),
    reason: z.enum(YEAR_EARLIER_OMITTED_REASONS),
  });

export const yearEarlierComparisonShownSchema: z.ZodType<YearEarlierComparisonShown> =
  z.strictObject({
    status: z.literal('shown'),
    value: figureValueSchema(),
    reportingPeriod: reportingPeriodSchema,
    publicationDate: publicationDateSchema,
  });

export const yearEarlierComparisonSchema: z.ZodType<YearEarlierComparison> = z.union([
  yearEarlierComparisonShownSchema,
  yearEarlierComparisonOmittedSchema,
]);

/**
 * Creates a Zod schema validating a `PublishedFigure<N>`.
 */
export function publishedFigureSchema<N extends PublishingNation>(
  nation: N,
): z.ZodType<PublishedFigure<N>> {
  if (!isPublishingNation(nation)) {
    throw new TypeError(`Invalid publishing nation: "${String(nation)}"`);
  }

  const baseFigure = figureSchema(nation);
  const medianStatisticId = `${nation}:median-ongoing-wait`;

  return baseFigure
    .and(
      z.strictObject({
        yearEarlier: yearEarlierComparisonSchema,
      }),
    )
    .superRefine((data, ctx) => {
      if (data.yearEarlier.status === 'shown') {
        if (data.statistic !== medianStatisticId) {
          ctx.addIssue({
            code: 'custom',
            message: `Year-earlier comparison status "shown" is only permitted on median ongoing wait ("${medianStatisticId}"), got "${data.statistic}"`,
            path: ['yearEarlier', 'status'],
          });
        }

        const expectedPeriod = yearEarlierThan(data.reportingPeriod);
        if (data.yearEarlier.reportingPeriod !== expectedPeriod) {
          ctx.addIssue({
            code: 'custom',
            message: `Year-earlier comparison reportingPeriod "${data.yearEarlier.reportingPeriod}" must equal 1 year earlier period "${expectedPeriod}"`,
            path: ['yearEarlier', 'reportingPeriod'],
          });
        }
      }
    }) as unknown as z.ZodType<PublishedFigure<N>>;
}

export const publishedUnitSpecialtyStateSchema: z.ZodType<PublishedUnitSpecialtyState> =
  z.discriminatedUnion('kind', [
    z.strictObject({
      kind: z.literal('current'),
    }),
    z.strictObject({
      kind: z.literal('carried-forward'),
      monthsOld: z
        .number()
        .int('monthsOld must be an integer')
        .min(1, 'Carried-forward figures must be at least 1 month old')
        .max(12, 'Carried-forward figures cannot exceed 12 months old'),
    }),
    z.strictObject({
      kind: z.literal('no-recent-figures'),
      lastReportingPeriod: reportingPeriodSchema,
    }),
  ]);

/**
 * Creates a Zod schema validating a `PublishedUnitSpecialty<N>`.
 */
export function publishedUnitSpecialtySchema<N extends PublishingNation>(
  nation: N,
): z.ZodType<PublishedUnitSpecialty<N>> {
  if (!isPublishingNation(nation)) {
    throw new TypeError(`Invalid publishing nation: "${String(nation)}"`);
  }

  return z
    .strictObject({
      reportingUnit: nationScopedIdSchema(nation, 'reporting-unit'),
      specialty: nationScopedIdSchema(nation, 'specialty'),
      state: publishedUnitSpecialtyStateSchema,
      figures: z.array(publishedFigureSchema(nation)),
    })
    .superRefine((data, ctx) => {
      if (data.state.kind === 'no-recent-figures' && data.figures.length > 0) {
        ctx.addIssue({
          code: 'custom',
          message:
            'PublishedUnitSpecialty with state "no-recent-figures" must have empty figures array',
          path: ['figures'],
        });
      }

      data.figures.forEach((fig, index) => {
        const pathPrefix = ['figures', index];

        if (fig.reportingUnit !== data.reportingUnit) {
          ctx.addIssue({
            code: 'custom',
            message: `Figure reportingUnit "${fig.reportingUnit}" does not match entry reportingUnit "${data.reportingUnit}"`,
            path: [...pathPrefix, 'reportingUnit'],
          });
        }

        if (fig.specialty !== data.specialty) {
          ctx.addIssue({
            code: 'custom',
            message: `Figure specialty "${fig.specialty}" does not match entry specialty "${data.specialty}"`,
            path: [...pathPrefix, 'specialty'],
          });
        }
      });
    }) as unknown as z.ZodType<PublishedUnitSpecialty<N>>;
}

export function publishedLatestReleaseSchema<N extends PublishingNation>(
  nation: N,
): z.ZodType<PublishedLatestRelease<N>> {
  if (!isPublishingNation(nation)) {
    throw new TypeError(`Invalid publishing nation: "${String(nation)}"`);
  }

  return z.strictObject({
    reportingPeriod: reportingPeriodSchema,
    publicationDate: publicationDateSchema,
    source: sourceRefSchema(nation),
  });
}

const isoDateTimeSchema = z.iso.datetime({
  message: 'generatedAt must be a valid ISO 8601 datetime string',
});

/**
 * Creates a Zod schema validating a complete `PublishedNation<N>`.
 */
export function publishedNationSchema<N extends PublishingNation>(
  nation: N,
  defs?: NationDefinitions<N>,
): z.ZodType<PublishedNation<N>> {
  if (!isPublishingNation(nation)) {
    throw new TypeError(`Invalid publishing nation: "${String(nation)}"`);
  }

  const waitStageMap = defs
    ? new Map(Object.values(defs.waitStages).map((ws) => [ws.id, ws]))
    : null;
  const statisticMap = defs
    ? new Map(Object.values(defs.statistics).map((st) => [st.id, st]))
    : null;

  return z
    .strictObject({
      schemaVersion: z.literal(1),
      nation: z.literal(nation),
      latestRelease: publishedLatestReleaseSchema(nation),
      generatedAt: isoDateTimeSchema,
      entries: z.array(publishedUnitSpecialtySchema(nation)),
    })
    .superRefine((data, ctx) => {
      data.entries.forEach((entry, entryIndex) => {
        const seenFigureKeys = new Set<string>();

        entry.figures.forEach((fig, figIndex) => {
          const pathPrefix = ['entries', entryIndex, 'figures', figIndex];

          if (fig.nation !== data.nation) {
            ctx.addIssue({
              code: 'custom',
              message: `Figure nation "${fig.nation}" does not match published nation "${data.nation}"`,
              path: [...pathPrefix, 'nation'],
            });
          }

          if (entry.state.kind === 'current') {
            if (fig.reportingPeriod !== data.latestRelease.reportingPeriod) {
              ctx.addIssue({
                code: 'custom',
                message: `Current entry figure reportingPeriod "${fig.reportingPeriod}" must match latest release reportingPeriod "${data.latestRelease.reportingPeriod}"`,
                path: [...pathPrefix, 'reportingPeriod'],
              });
            }

            if (fig.publicationDate !== data.latestRelease.publicationDate) {
              ctx.addIssue({
                code: 'custom',
                message: `Current entry figure publicationDate "${fig.publicationDate}" must match latest release publicationDate "${data.latestRelease.publicationDate}"`,
                path: [...pathPrefix, 'publicationDate'],
              });
            }
          }

          if (waitStageMap && !waitStageMap.has(fig.waitStage)) {
            ctx.addIssue({
              code: 'custom',
              message: `Wait stage "${fig.waitStage}" is not defined in nation definitions`,
              path: [...pathPrefix, 'waitStage'],
            });
          }

          if (statisticMap) {
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
          }

          const key = figureKey(fig);
          if (seenFigureKeys.has(key)) {
            ctx.addIssue({
              code: 'custom',
              message: `Duplicate figureKey detected in entry: "${key}"`,
              path: [...pathPrefix],
            });
          } else {
            seenFigureKeys.add(key);
          }
        });
      });
    }) as unknown as z.ZodType<PublishedNation<N>>;
}

export function compactPublishedFigureSchema<N extends PublishingNation>(
  nation: N,
): z.ZodType<CompactPublishedFigure<N>> {
  if (!isPublishingNation(nation)) {
    throw new TypeError(`Invalid publishing nation: "${String(nation)}"`);
  }

  return z.strictObject({
    waitStage: nationScopedIdSchema(nation, 'wait-stage'),
    statistic: nationScopedIdSchema(nation, 'statistic'),
    unit: publishedUnitSchema,
    value: figureValueSchema(),
    provenance: provenanceSchema,
    yearEarlier: yearEarlierComparisonSchema,
  });
}

export const publishedReleaseRefSchema: z.ZodType<PublishedReleaseRef> = z.strictObject({
  reportingPeriod: reportingPeriodSchema,
  publicationDate: publicationDateSchema,
  sourceKey: z.string().min(1, 'sourceKey must be non-empty'),
});

export function compactPublishedUnitSpecialtySchema<N extends PublishingNation>(
  nation: N,
): z.ZodType<CompactPublishedUnitSpecialty<N>> {
  if (!isPublishingNation(nation)) {
    throw new TypeError(`Invalid publishing nation: "${String(nation)}"`);
  }

  return z.strictObject({
    reportingUnit: nationScopedIdSchema(nation, 'reporting-unit'),
    specialty: nationScopedIdSchema(nation, 'specialty'),
    state: publishedUnitSpecialtyStateSchema,
    releaseRef: publishedReleaseRefSchema.optional(),
    figures: z.array(compactPublishedFigureSchema(nation)),
  }) as unknown as z.ZodType<CompactPublishedUnitSpecialty<N>>;
}

/**
 * Creates a Zod schema validating a `PublishedFile<N>`.
 */
export function publishedFileSchema<N extends PublishingNation>(
  nation: N,
  defs?: NationDefinitions<N>,
): z.ZodType<PublishedFile<N>> {
  if (!isPublishingNation(nation)) {
    throw new TypeError(`Invalid publishing nation: "${String(nation)}"`);
  }

  const baseSchema = z.strictObject({
    schemaVersion: z.literal(1),
    nation: z.literal(nation),
    latestRelease: publishedLatestReleaseSchema(nation),
    generatedAt: isoDateTimeSchema,
    sources: z.record(z.string(), sourceRefSchema(nation)),
    entries: z.array(compactPublishedUnitSpecialtySchema(nation)),
  });

  const fullPublishedValidator = publishedNationSchema(nation, defs);

  return baseSchema.superRefine((file, ctx) => {
    // Check that every releaseRef references a valid sourceKey
    for (let i = 0; i < file.entries.length; i++) {
      const entry = file.entries[i];
      if (entry?.releaseRef) {
        const key = entry.releaseRef.sourceKey;
        if (key !== 'latest' && !(key in file.sources)) {
          ctx.addIssue({
            code: 'custom',
            message: `releaseRef sourceKey "${key}" not found in top-level sources map`,
            path: ['entries', i, 'releaseRef', 'sourceKey'],
          });
        }
      }
    }

    const hydrated = fromPublishedFile(file as unknown as PublishedFile<N>);
    const result = fullPublishedValidator.safeParse(hydrated);
    if (!result.success) {
      for (const issue of result.error.issues) {
        ctx.addIssue({
          code: 'custom',
          message: issue.message,
          path: issue.path,
        });
      }
    }
  }) as unknown as z.ZodType<PublishedFile<N>>;
}
