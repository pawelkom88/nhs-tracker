import { figureKey, type Figure } from '@kyw/model/figure';
import type { PublishingNation } from '@kyw/model/nation';
import type { NationDefinitions } from '@kyw/model/nation-definitions';
import { yearEarlierThan } from '@kyw/model/period';
import {
  publishedNationSchema,
  type PublishedFigure,
  type PublishedNation,
  type PublishedUnitSpecialty,
} from '@kyw/model/published';
import type { ReferenceData, ReportingUnit } from '@kyw/model/reference';
import type { Release } from '@kyw/model/release';
import {
  buildEnglandSuccessionIndex,
  type EnglandSuccessionIndex,
} from '../reference/england/succession.js';
import { carryForward } from './carry-forward.js';
import {
  createEnglandYearEarlierContext,
  createScotlandYearEarlierContext,
  createWalesYearEarlierContext,
  yearEarlierFor,
  type YearEarlierContext,
} from './year-earlier.js';

export interface AssemblePublishedOptions<N extends PublishingNation> {
  readonly latest: Release<N>;
  readonly history: readonly Release<N>[];
  readonly reference: ReferenceData<N>;
  readonly generatedAt?: string;
  readonly successionIndex?: EnglandSuccessionIndex;
  readonly getYearEarlierContext?: (release: Release<N>) => YearEarlierContext<N>;
  readonly nationDefinitions?: NationDefinitions<N>;
}

/**
 * Creates default YearEarlierContext for a given release using reference data and historical releases.
 */
export function createDefaultYearEarlierContext<N extends PublishingNation>(
  nation: N,
  release: Release<N>,
  history: readonly Release<N>[],
  reference: ReferenceData<N>,
  options?: {
    readonly successionIndex?: EnglandSuccessionIndex;
  },
): YearEarlierContext<N> {
  const targetPeriod = yearEarlierThan(release.reportingPeriod);
  const olderRelease = history.find((r) => r.reportingPeriod === targetPeriod) ?? null;

  const validSpecialties = new Set(reference.specialties.map((s) => s.id as string));
  const specialtyLookup = (specId: string) => validSpecialties.has(specId);

  if (nation === 'england') {
    let succIndex: EnglandSuccessionIndex;
    if (options?.successionIndex) {
      succIndex = options.successionIndex;
    } else {
      const records = [];
      const ruList = reference.reportingUnits as readonly ReportingUnit<'england'>[];
      for (const ru of ruList) {
        for (const succ of ru.successors) {
          const succCode = succ.startsWith('england:') ? succ.slice('england:'.length) : succ;
          records.push({
            predecessor: ru.officialCode,
            successor: succCode,
            effectiveDate: ru.operational.to ?? '9999-12-31',
          });
        }
      }
      succIndex = buildEnglandSuccessionIndex(records);
    }

    const unitCloseDates = new Map<string, string | null>();
    for (const ru of reference.reportingUnits) {
      unitCloseDates.set(ru.officialCode, ru.operational.to);
    }

    return createEnglandYearEarlierContext({
      olderRelease: olderRelease as unknown as Release<'england'> | null,
      successionIndex: succIndex,
      unitCloseDates,
      specialtyLookup: (id) => specialtyLookup(id),
    }) as unknown as YearEarlierContext<N>;
  }

  if (nation === 'wales') {
    const rel = release as unknown as Release<'wales'>;
    return createWalesYearEarlierContext({
      comparisonFigures: rel.comparisonFigures,
      olderRelease: olderRelease as unknown as Release<'wales'> | null,
      specialtyLookup: (id) => specialtyLookup(id),
    }) as unknown as YearEarlierContext<N>;
  }

  const rel = release as unknown as Release<'scotland'>;
  return createScotlandYearEarlierContext({
    comparisonFigures: rel.comparisonFigures,
    olderRelease: olderRelease as unknown as Release<'scotland'> | null,
    specialtyLookup: (id) => specialtyLookup(id),
  }) as unknown as YearEarlierContext<N>;
}

/**
 * Assembles the final `PublishedNation<N>` payload for a publishing nation.
 *
 * Rules:
 * 1. Combines figures from latest release with carried-forward entries from history.
 * 2. Computes Year-Earlier Comparisons for all median figures.
 * 3. Orders figures strictly deterministically (reportingUnit id -> specialty id -> waitStage id -> statistic id).
 * 4. Never ranks or sorts units by any Statistic.
 * 5. Validates against `publishedNationSchema`.
 *
 * @see GLOSSARY.md Carried-Forward Figure, Year-Earlier Comparison, Publication Date, Reporting Period
 * @see ADR-0006
 * @see ADR-0007
 */
export function assemblePublished<N extends PublishingNation>(
  options: AssemblePublishedOptions<N>,
): PublishedNation<N>;
export function assemblePublished<N extends PublishingNation>(
  latest: Release<N>,
  history: readonly Release<N>[],
  reference: ReferenceData<N>,
  options?: Omit<AssemblePublishedOptions<N>, 'latest' | 'history' | 'reference'>,
): PublishedNation<N>;
export function assemblePublished<N extends PublishingNation>(
  latestOrOptions: Release<N> | AssemblePublishedOptions<N>,
  historyParam?: readonly Release<N>[],
  referenceParam?: ReferenceData<N>,
  extraOptions?: Omit<AssemblePublishedOptions<N>, 'latest' | 'history' | 'reference'>,
): PublishedNation<N> {
  let opts: AssemblePublishedOptions<N>;
  if ('latest' in latestOrOptions) {
    opts = latestOrOptions;
  } else {
    if (!historyParam || !referenceParam) {
      throw new Error('history and reference are required when passing latest as first argument');
    }
    opts = {
      latest: latestOrOptions,
      history: historyParam,
      reference: referenceParam,
      ...extraOptions,
    };
  }

  const { latest, history, reference, generatedAt = new Date().toISOString() } = opts;

  const getYearEarlierCtx =
    opts.getYearEarlierContext ??
    ((rel: Release<N>) =>
      createDefaultYearEarlierContext(
        latest.nation,
        rel,
        history,
        reference,
        opts.successionIndex ? { successionIndex: opts.successionIndex } : undefined,
      ));

  const latestCtx = getYearEarlierCtx(latest);

  // Group latest figures by reportingUnit and specialty
  const latestGroups = new Map<string, Figure<N>[]>();
  for (const fig of latest.figures) {
    const key = `${fig.reportingUnit}|${fig.specialty}`;
    const group = latestGroups.get(key);
    if (group) {
      group.push(fig);
    } else {
      latestGroups.set(key, [fig]);
    }
  }

  const currentEntries: PublishedUnitSpecialty<N>[] = [];
  for (const figs of latestGroups.values()) {
    const first = figs[0];
    if (!first) {
      continue;
    }
    const publishedFigs: PublishedFigure<N>[] = figs.map((f) => ({
      ...f,
      yearEarlier: yearEarlierFor(f, latestCtx),
    })) as unknown as PublishedFigure<N>[];

    publishedFigs.sort((a, b) => figureKey(a).localeCompare(figureKey(b)));

    currentEntries.push({
      reportingUnit: first.reportingUnit,
      specialty: first.specialty,
      state: { kind: 'current' },
      figures: publishedFigs,
    } as unknown as PublishedUnitSpecialty<N>);
  }

  // Carried forward entries for units absent from latest
  const carriedEntries = carryForward({
    latest,
    history,
    reference,
    getYearEarlierContext: getYearEarlierCtx,
  });

  for (const entry of carriedEntries) {
    if (entry.figures.length > 1) {
      (entry.figures as PublishedFigure<N>[]).sort((a, b) =>
        figureKey(a).localeCompare(figureKey(b)),
      );
    }
  }

  const allEntries = [...currentEntries, ...carriedEntries];
  allEntries.sort((a, b) => {
    const unitCmp = a.reportingUnit.localeCompare(b.reportingUnit);
    if (unitCmp !== 0) return unitCmp;
    return a.specialty.localeCompare(b.specialty);
  });

  const publishedNation = {
    schemaVersion: 1 as const,
    nation: latest.nation,
    latestRelease: {
      reportingPeriod: latest.reportingPeriod,
      publicationDate: latest.publicationDate,
      source: latest.source,
    },
    generatedAt,
    entries: allEntries,
  } as unknown as PublishedNation<N>;

  return publishedNationSchema(latest.nation, opts.nationDefinitions).parse(publishedNation);
}
