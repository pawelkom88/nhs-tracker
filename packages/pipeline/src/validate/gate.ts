import type { Figure } from '@kyw/model/figure';
import type { PublishingNation } from '@kyw/model/nation';
import type { ReferenceData } from '@kyw/model/reference';
import type { Release } from '@kyw/model/release';
import type { ReportingPeriod } from '@kyw/model/period';
import { englandReleaseSchema } from '@kyw/model/england/schema';
import { walesReleaseSchema } from '@kyw/model/wales/schema';
import { scotlandReleaseSchema } from '@kyw/model/scotland/schema';
import { DEFAULT_VALIDATION_THRESHOLDS, type ValidationThresholds } from './thresholds.js';

export type ValidationCheckId =
  | 'schema'
  | 'period-order'
  | 'dates'
  | 'unit-count'
  | 'figure-count'
  | 'reference'
  | 'internal-consistency'
  | 'nation-total-swing'
  | 'no-estimates';

/**
 * Result of a single named validation check.
 */
export interface ValidationCheckResult {
  readonly id: ValidationCheckId;
  readonly ok: boolean;
  readonly detail: string;
}

/**
 * Full validation report returned by the release validation gate.
 */
export interface ValidationReport {
  readonly ok: boolean;
  readonly nation: PublishingNation;
  readonly reportingPeriod: ReportingPeriod;
  readonly checks: readonly ValidationCheckResult[];
}

/**
 * Options for running release validation.
 */
export interface ValidationOptions {
  /**
   * Current date in ISO format (`YYYY-MM-DD`).
   * Defaults to today in UTC. Injected for deterministic testing.
   */
  readonly today?: string;
  /**
   * Custom validation thresholds. Defaults to `DEFAULT_VALIDATION_THRESHOLDS`.
   */
  readonly thresholds?: Partial<ValidationThresholds>;
}

function getSchemaForNation(nation: PublishingNation) {
  switch (nation) {
    case 'england':
      return englandReleaseSchema;
    case 'wales':
      return walesReleaseSchema;
    case 'scotland':
      return scotlandReleaseSchema;
    default:
      throw new Error(`Unsupported publishing nation: ${String(nation)}`);
  }
}

/**
 * Check 1: `schema`
 * Validates candidate release against the nation's domain Zod schema.
 */
export function checkSchema<N extends PublishingNation>(
  candidate: Release<N>,
): ValidationCheckResult {
  const schema = getSchemaForNation(candidate.nation);
  const result = schema.safeParse(candidate);
  if (!result.success) {
    const errorSummary = result.error.issues
      .slice(0, 10)
      .map((i) => `[${i.path.join('.')}] ${i.message}`)
      .join('; ');
    const totalCount = result.error.issues.length;
    const suffix = totalCount > 10 ? ` (...and ${String(totalCount - 10)} more)` : '';
    return {
      id: 'schema',
      ok: false,
      detail: `Schema validation failed (${String(totalCount)} issues): ${errorSummary}${suffix}`,
    };
  }

  return {
    id: 'schema',
    ok: true,
    detail: 'Release passes domain Zod schema validation.',
  };
}

/**
 * Check 2: `period-order`
 * Candidate period must be > previous period (chronologically later) or = previous period (revision).
 */
export function checkPeriodOrder<N extends PublishingNation>(
  candidate: Release<N>,
  previous: Release<N> | null,
): ValidationCheckResult {
  if (!previous) {
    return {
      id: 'period-order',
      ok: true,
      detail: 'Initial release: no previous reporting period to compare.',
    };
  }

  if (candidate.reportingPeriod < previous.reportingPeriod) {
    return {
      id: 'period-order',
      ok: false,
      detail: `Candidate reporting period (${candidate.reportingPeriod}) is chronologically before previous reporting period (${previous.reportingPeriod}).`,
    };
  }

  const isRevision = candidate.reportingPeriod === previous.reportingPeriod;
  return {
    id: 'period-order',
    ok: true,
    detail: isRevision
      ? `Revision release: reporting period matches previous period (${candidate.reportingPeriod}).`
      : `Reporting period (${candidate.reportingPeriod}) is after previous period (${previous.reportingPeriod}).`,
  };
}

/**
 * Check 3: `dates`
 * Publication date must be strictly after the reporting period and <= today.
 */
export function checkDates<N extends PublishingNation>(
  candidate: Release<N>,
  today: string,
): ValidationCheckResult {
  if (String(candidate.publicationDate) <= String(candidate.reportingPeriod)) {
    return {
      id: 'dates',
      ok: false,
      detail: `Publication date (${candidate.publicationDate}) must be strictly after reporting period (${candidate.reportingPeriod}).`,
    };
  }

  if (String(candidate.publicationDate) > today) {
    return {
      id: 'dates',
      ok: false,
      detail: `Publication date (${candidate.publicationDate}) cannot be in the future (today is ${today}).`,
    };
  }

  return {
    id: 'dates',
    ok: true,
    detail: `Publication date (${candidate.publicationDate}) is valid and after reporting period (${candidate.reportingPeriod}).`,
  };
}

/**
 * Check 4: `unit-count`
 * England: candidate units >= 95% of previous.
 * Wales/Scotland: no board missing vs previous.
 */
export function checkUnitCount<N extends PublishingNation>(
  candidate: Release<N>,
  previous: Release<N> | null,
  thresholds: ValidationThresholds,
): ValidationCheckResult {
  if (!previous) {
    return {
      id: 'unit-count',
      ok: true,
      detail: `Initial release: ${String(candidate.reportingUnits.length)} reporting units present.`,
    };
  }

  if ((candidate.nation as string) === 'england') {
    const prevCount = previous.reportingUnits.length;
    const candCount = candidate.reportingUnits.length;
    if (prevCount === 0) {
      return {
        id: 'unit-count',
        ok: true,
        detail: `Previous release had 0 units; candidate has ${String(candCount)} units.`,
      };
    }
    const ratio = candCount / prevCount;
    if (ratio < thresholds.englandUnitCountMinRatio) {
      return {
        id: 'unit-count',
        ok: false,
        detail: `England reporting unit count dropped from ${String(prevCount)} to ${String(candCount)} (${(ratio * 100).toFixed(1)}%), below minimum threshold of ${(thresholds.englandUnitCountMinRatio * 100).toFixed(1)}%.`,
      };
    }
    return {
      id: 'unit-count',
      ok: true,
      detail: `England reporting unit count: ${String(candCount)} (vs ${String(prevCount)} previously, ${(ratio * 100).toFixed(1)}%).`,
    };
  }

  // Wales & Scotland: Any drop in health boards blocks for human check
  const candUnitsSet = new Set<string>(candidate.reportingUnits);
  const missingUnits = previous.reportingUnits.filter((u) => !candUnitsSet.has(u));

  if (missingUnits.length > 0) {
    return {
      id: 'unit-count',
      ok: false,
      detail: `Missing ${String(missingUnits.length)} reporting units from previous release: ${missingUnits.join(', ')}. In ${(candidate.nation as string) === 'wales' ? 'Wales' : 'Scotland'}, any missing board blocks publishing.`,
    };
  }

  return {
    id: 'unit-count',
    ok: true,
    detail: `All ${String(previous.reportingUnits.length)} reporting units from previous release are present in candidate (${String(candidate.reportingUnits.length)} total).`,
  };
}

/**
 * Check 5: `figure-count`
 * Total figures >= 90% of previous.
 */
export function checkFigureCount<N extends PublishingNation>(
  candidate: Release<N>,
  previous: Release<N> | null,
  thresholds: ValidationThresholds,
): ValidationCheckResult {
  if (!previous) {
    return {
      id: 'figure-count',
      ok: true,
      detail: `Initial release: ${String(candidate.figures.length)} figures present.`,
    };
  }

  const prevCount = previous.figures.length;
  const candCount = candidate.figures.length;

  if (prevCount === 0) {
    return {
      id: 'figure-count',
      ok: true,
      detail: `Previous release had 0 figures; candidate has ${String(candCount)} figures.`,
    };
  }

  const ratio = candCount / prevCount;
  if (ratio < thresholds.figureCountMinRatio) {
    return {
      id: 'figure-count',
      ok: false,
      detail: `Total figures count dropped from ${String(prevCount)} to ${String(candCount)} (${(ratio * 100).toFixed(1)}%), below minimum threshold of ${(thresholds.figureCountMinRatio * 100).toFixed(1)}%.`,
    };
  }

  return {
    id: 'figure-count',
    ok: true,
    detail: `Figures count: ${String(candCount)} (vs ${String(prevCount)} previously, ${(ratio * 100).toFixed(1)}%).`,
  };
}

/**
 * Check 6: `reference`
 * Every Reporting Unit and Specialty id in candidate must exist in reference data.
 */
export function checkReference<N extends PublishingNation>(
  candidate: Release<N>,
  reference: ReferenceData<N>,
): ValidationCheckResult {
  const refUnits = new Set<string>(reference.reportingUnits.map((u) => u.id));
  const refSpecialties = new Set<string>(reference.specialties.map((s) => s.id));

  const missingUnits = new Set<string>();
  const missingSpecialties = new Set<string>();

  for (const unit of candidate.reportingUnits) {
    if (!refUnits.has(unit)) {
      missingUnits.add(unit);
    }
  }

  for (const figure of candidate.figures) {
    if (!refUnits.has(figure.reportingUnit)) {
      missingUnits.add(figure.reportingUnit);
    }
    if (!refSpecialties.has(figure.specialty)) {
      missingSpecialties.add(figure.specialty);
    }
  }

  for (const figure of candidate.comparisonFigures) {
    if (!refUnits.has(figure.reportingUnit)) {
      missingUnits.add(figure.reportingUnit);
    }
    if (!refSpecialties.has(figure.specialty)) {
      missingSpecialties.add(figure.specialty);
    }
  }

  if (missingUnits.size > 0 || missingSpecialties.size > 0) {
    const errorParts: string[] = [];
    if (missingUnits.size > 0) {
      errorParts.push(`Unknown reporting units: ${Array.from(missingUnits).join(', ')}`);
    }
    if (missingSpecialties.size > 0) {
      errorParts.push(`Unknown specialties: ${Array.from(missingSpecialties).join(', ')}`);
    }
    return {
      id: 'reference',
      ok: false,
      detail: `Reference data check failed: ${errorParts.join('; ')}.`,
    };
  }

  return {
    id: 'reference',
    ok: true,
    detail: 'All reporting units and specialties exist in reference data.',
  };
}

/**
 * Check 7: `internal-consistency`
 * Per entry (unit x specialty x stage):
 * - Long wait count <= total waiting
 * - Scotland within-12 count <= total waiting
 */
export function checkInternalConsistency<N extends PublishingNation>(
  candidate: Release<N>,
): ValidationCheckResult {
  const totalWaitingId = `${candidate.nation}:total-waiting`;
  const longWaitId = `${candidate.nation}:long-wait-count`;
  const within12Id = 'scotland:within-waiting-standard-count';

  // Group figures by key: reportingUnit|specialty|waitStage
  const groups = new Map<string, Figure<N>[]>();
  for (const f of candidate.figures) {
    const key = `${f.reportingUnit}|${f.specialty}|${f.waitStage}`;
    let list = groups.get(key);
    if (!list) {
      list = [];
      groups.set(key, list);
    }
    list.push(f);
  }

  const errors: string[] = [];

  for (const [key, figs] of groups.entries()) {
    const totalFig = figs.find((f) => (f.statistic as string) === totalWaitingId);
    const longFig = figs.find((f) => (f.statistic as string) === longWaitId);
    const within12Fig = figs.find((f) => (f.statistic as string) === within12Id);

    if (
      totalFig &&
      longFig &&
      totalFig.value.status === 'published' &&
      longFig.value.status === 'published'
    ) {
      if (longFig.value.value > totalFig.value.value) {
        errors.push(
          `Long wait count (${String(longFig.value.value)}) exceeds total waiting (${String(totalFig.value.value)}) for entry [${key}]`,
        );
      }
    }

    if (
      (candidate.nation as string) === 'scotland' &&
      totalFig &&
      within12Fig &&
      totalFig.value.status === 'published' &&
      within12Fig.value.status === 'published'
    ) {
      if (within12Fig.value.value > totalFig.value.value) {
        errors.push(
          `Within-12-weeks count (${String(within12Fig.value.value)}) exceeds total waiting (${String(totalFig.value.value)}) for entry [${key}]`,
        );
      }
    }
  }

  if (errors.length > 0) {
    return {
      id: 'internal-consistency',
      ok: false,
      detail: `Internal consistency violations (${String(errors.length)}): ${errors.slice(0, 5).join('; ')}${errors.length > 5 ? ` (...and ${String(errors.length - 5)} more)` : ''}`,
    };
  }

  return {
    id: 'internal-consistency',
    ok: true,
    detail: 'Internal consistency checks passed for all entries.',
  };
}

/**
 * Check 8: `nation-total-swing`
 * Sum of `total-waiting` across all-specialties entries changes by <= 25% vs previous.
 * ADR-0006 allows summing within one nation for validation only, never for display.
 */
export function checkNationTotalSwing<N extends PublishingNation>(
  candidate: Release<N>,
  previous: Release<N> | null,
  reference: ReferenceData<N>,
  thresholds: ValidationThresholds,
): ValidationCheckResult {
  if (!previous) {
    return {
      id: 'nation-total-swing',
      ok: true,
      detail: 'Initial release: no previous release for national total swing calculation.',
    };
  }

  const allSpecialty = reference.specialties.find((s) => s.isAllSpecialties);
  const allSpecialtyId = allSpecialty ? allSpecialty.id : `${candidate.nation}:all`;
  const totalWaitingId = `${candidate.nation}:total-waiting`;

  function sumAllSpecialtiesTotalWaiting(release: Release<N>): number {
    let sum = 0;
    for (const f of release.figures) {
      if (
        (f.statistic as string) === totalWaitingId &&
        f.specialty === allSpecialtyId &&
        f.value.status === 'published'
      ) {
        sum += f.value.value;
      }
    }
    return sum;
  }

  const candSum = sumAllSpecialtiesTotalWaiting(candidate);
  const prevSum = sumAllSpecialtiesTotalWaiting(previous);

  if (prevSum === 0) {
    return {
      id: 'nation-total-swing',
      ok: true,
      detail: `Previous release national total-waiting was 0; candidate is ${String(candSum)}.`,
    };
  }

  const relativeSwing = Math.abs(candSum - prevSum) / prevSum;
  if (relativeSwing > thresholds.nationTotalSwingMaxRatio) {
    return {
      id: 'nation-total-swing',
      ok: false,
      detail: `National total-waiting swing of ${(relativeSwing * 100).toFixed(1)}% (from ${String(prevSum)} to ${String(candSum)}) exceeds maximum threshold of ${(thresholds.nationTotalSwingMaxRatio * 100).toFixed(1)}%.`,
    };
  }

  return {
    id: 'nation-total-swing',
    ok: true,
    detail: `National total-waiting swing is ${(relativeSwing * 100).toFixed(1)}% (from ${String(prevSum)} to ${String(candSum)}), within threshold of ${(thresholds.nationTotalSwingMaxRatio * 100).toFixed(1)}%.`,
  };
}

/**
 * Check 9: `no-estimates`
 * No figure may have provenance other than `official` or `derived/exact-sum`.
 * No Scotland estimate flag `'e'` may reach output.
 *
 * @see ADR-0005
 */
export function checkNoEstimates<N extends PublishingNation>(
  candidate: Release<N>,
): ValidationCheckResult {
  const allFigures: readonly Figure<N>[] = [...candidate.figures, ...candidate.comparisonFigures];

  for (let idx = 0; idx < allFigures.length; idx++) {
    const fig = allFigures[idx];
    if (!fig) continue;

    const prov: {
      readonly kind?: unknown;
      readonly sourceField?: unknown;
      readonly method?: unknown;
    } = fig.provenance;

    if (prov.kind === 'official') {
      if (typeof prov.sourceField !== 'string' || prov.sourceField.trim() === '') {
        return {
          id: 'no-estimates',
          ok: false,
          detail: `Figure at index ${String(idx)} has official provenance but empty sourceField.`,
        };
      }
    } else if (prov.kind === 'derived') {
      if (prov.method !== 'exact-sum') {
        return {
          id: 'no-estimates',
          ok: false,
          detail: `Figure at index ${String(idx)} has derived provenance with forbidden method "${String(prov.method)}". Only exact-sum is allowed.`,
        };
      }
    } else {
      return {
        id: 'no-estimates',
        ok: false,
        detail: `Figure at index ${String(idx)} has forbidden provenance kind "${String(prov.kind)}".`,
      };
    }
  }

  return {
    id: 'no-estimates',
    ok: true,
    detail: 'All figures have valid official or exact-sum derived provenance with no estimates.',
  };
}

/**
 * Validates a candidate release against a previous release and reference data.
 * Releases reach `data/` only after passing all 9 checks.
 *
 * @see ADR-0007
 * @see ADR-0005
 */
export function validateRelease<N extends PublishingNation>(
  candidate: Release<N>,
  previous: Release<N> | null,
  reference: ReferenceData<N>,
  options?: ValidationOptions,
): ValidationReport {
  const today = options?.today ?? new Date().toISOString().slice(0, 10);
  const thresholds: ValidationThresholds = {
    ...DEFAULT_VALIDATION_THRESHOLDS,
    ...options?.thresholds,
  };

  const checks: ValidationCheckResult[] = [
    checkSchema(candidate),
    checkPeriodOrder(candidate, previous),
    checkDates(candidate, today),
    checkUnitCount(candidate, previous, thresholds),
    checkFigureCount(candidate, previous, thresholds),
    checkReference(candidate, reference),
    checkInternalConsistency(candidate),
    checkNationTotalSwing(candidate, previous, reference, thresholds),
    checkNoEstimates(candidate),
  ];

  const ok = checks.every((c) => c.ok);

  return {
    ok,
    nation: candidate.nation,
    reportingPeriod: candidate.reportingPeriod,
    checks,
  };
}
