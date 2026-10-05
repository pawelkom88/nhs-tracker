import type { ReportingUnitId, SpecialtyId } from '@kyw/model/ids';
import type { PublishingNation } from '@kyw/model/nation';
import { compareReportingPeriods, monthsBetween } from '@kyw/model/period';
import type {
  PublishedFigure,
  PublishedUnitSpecialty,
  PublishedUnitSpecialtyState,
} from '@kyw/model/published';
import type { ReferenceData } from '@kyw/model/reference';
import type { Release } from '@kyw/model/release';
import { yearEarlierFor, type YearEarlierContext } from './year-earlier.js';

export interface CarryForwardOptions<N extends PublishingNation> {
  readonly latest: Release<N>;
  readonly history: readonly Release<N>[];
  readonly reference: ReferenceData<N>;
  readonly getYearEarlierContext?: (historicalRelease: Release<N>) => YearEarlierContext<N>;
}

/**
 * Computes carried-forward entries for Reporting Units absent from the latest release.
 *
 * Rules:
 * 1. A Reporting Unit present in the latest release is untouched (not returned here; handled as current in published assembly).
 * 2. If a Reporting Unit is absent from latest but present in history:
 *    - For each Specialty reported for that unit in history, find the most recent historical release containing figures for that unit × Specialty.
 *    - Compute `monthsOld = monthsBetween(thatPeriod, latest.reportingPeriod)`.
 *    - If `monthsOld > 24`, drop completely (Assumption A-07).
 *    - If the unit has a successor in reference data, it has merged/closed: state is `{ kind: 'no-recent-figures', lastReportingPeriod }` with empty figures.
 *    - If `monthsOld` is 1–12 and no successor: state is `{ kind: 'carried-forward', monthsOld }` with that historical release's figures (with their own reportingPeriod, publicationDate, source, and precomputed year-earlier comparison).
 *    - If `monthsOld` is > 12 (up to 24): state is `{ kind: 'no-recent-figures', lastReportingPeriod: thatPeriod }` with empty figures.
 * 3. Results are ordered stably by Reporting Unit ID then Specialty ID (never by any Statistic).
 *
 * @see GLOSSARY.md Carried-Forward Figure, Reporting Unit, Reporting Period
 * @see ADR-0007
 * @see docs/plan/MASTER-PLAN.md § Conventions
 */
export function carryForward<N extends PublishingNation>(
  options: CarryForwardOptions<N>,
): PublishedUnitSpecialty<N>[] {
  const { latest, history, reference, getYearEarlierContext } = options;

  const latestUnits = new Set(latest.reportingUnits);

  // Map reference reporting units to check for successors
  const unitSuccessorMap = new Map<string, boolean>();
  for (const ru of reference.reportingUnits) {
    unitSuccessorMap.set(ru.id, ru.successors.length > 0);
  }

  // Sort history releases descending (newest historical first)
  const sortedHistory = [...history].sort((a, b) =>
    compareReportingPeriods(b.reportingPeriod, a.reportingPeriod),
  );

  // Identify all absent units that appeared in history
  const absentUnits = new Set<ReportingUnitId<N>>();
  for (const rel of sortedHistory) {
    for (const unit of rel.reportingUnits) {
      if (!latestUnits.has(unit)) {
        absentUnits.add(unit);
      }
    }
  }

  if (absentUnits.size === 0) {
    return [];
  }

  // Group figures by unit and specialty across history to find the most recent occurrence
  // Key: `${unitId}|${specialtyId}`
  interface MostRecentRecord {
    readonly unitId: ReportingUnitId<N>;
    readonly specialtyId: SpecialtyId<N>;
    readonly release: Release<N>;
    readonly figures: readonly PublishedFigure<N>[];
  }

  const mostRecentMap = new Map<string, MostRecentRecord>();

  for (const rel of sortedHistory) {
    // Only process figures for absent units
    for (const fig of rel.figures) {
      if (!absentUnits.has(fig.reportingUnit)) {
        continue;
      }

      const comboKey = `${fig.reportingUnit}|${fig.specialty}`;
      if (mostRecentMap.has(comboKey)) {
        // Already found the newest occurrence
        continue;
      }

      // Collect all figures for this unit x specialty in this release
      const matchingFigures = rel.figures.filter(
        (f) => f.reportingUnit === fig.reportingUnit && f.specialty === fig.specialty,
      );

      // Compute year-earlier comparisons for these historical figures
      const yeCtx = getYearEarlierContext
        ? getYearEarlierContext(rel)
        : {
            comparisonFigures: rel.comparisonFigures,
            isSameEntity: () => true,
          };

      const publishedFigures: PublishedFigure<N>[] = matchingFigures.map((f) => ({
        ...f,
        yearEarlier: yearEarlierFor(f, yeCtx),
      })) as unknown as PublishedFigure<N>[];

      mostRecentMap.set(comboKey, {
        unitId: fig.reportingUnit,
        specialtyId: fig.specialty,
        release: rel,
        figures: publishedFigures,
      });
    }
  }

  const entries: PublishedUnitSpecialty<N>[] = [];

  for (const record of mostRecentMap.values()) {
    const monthsOld = monthsBetween(record.release.reportingPeriod, latest.reportingPeriod);

    // Drop if older than 24 months
    if (monthsOld > 24 || monthsOld <= 0) {
      continue;
    }

    const hasSuccessor = unitSuccessorMap.get(record.unitId) ?? false;

    let state: PublishedUnitSpecialtyState;
    let figures: readonly PublishedFigure<N>[];

    if (hasSuccessor) {
      // Merged or succeeded unit: ceases to exist independently
      state = {
        kind: 'no-recent-figures',
        lastReportingPeriod: record.release.reportingPeriod,
      };
      figures = [];
    } else if (monthsOld >= 1 && monthsOld <= 12) {
      state = {
        kind: 'carried-forward',
        monthsOld,
      };
      figures = record.figures;
    } else {
      // > 12 months up to 24 months
      state = {
        kind: 'no-recent-figures',
        lastReportingPeriod: record.release.reportingPeriod,
      };
      figures = [];
    }

    entries.push({
      reportingUnit: record.unitId,
      specialty: record.specialtyId,
      state,
      figures,
    } as unknown as PublishedUnitSpecialty<N>);
  }

  // Sort deterministically by reportingUnit then specialty (never by any statistic)
  entries.sort((a, b) => {
    const unitCmp = a.reportingUnit.localeCompare(b.reportingUnit);
    if (unitCmp !== 0) return unitCmp;
    return a.specialty.localeCompare(b.specialty);
  });

  return entries;
}
