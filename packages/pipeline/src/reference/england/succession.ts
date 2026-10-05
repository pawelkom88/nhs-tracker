import { reportingUnitId } from '@kyw/model/ids';
import type { ReportingUnit } from '@kyw/model/reference';
import type { OdsSuccessionRow } from '../ods/columns.js';

export interface EnglandSuccessionRecord {
  readonly predecessor: string;
  readonly successor: string;
  readonly effectiveDate: string; // YYYY-MM-DD
}

export interface EnglandSuccessionIndex {
  readonly records: readonly EnglandSuccessionRecord[];
  readonly successorsByPredecessor: ReadonlyMap<string, readonly EnglandSuccessionRecord[]>;
  readonly predecessorsBySuccessor: ReadonlyMap<string, readonly EnglandSuccessionRecord[]>;
  isSameEntityAcross(
    code: string,
    olderPeriod: string,
    newerPeriod: string,
    closeDate?: string | null,
  ): boolean;
}

/**
 * Recognises ODS 5-character trust site codes (e.g. "RRK02", "R1H01")
 * to distinguish them from trust codes (3 chars) and ISP codes.
 */
const TRUST_SITE_CODE_PATTERN = /^[A-Z][0-9A-Z]{2}[0-9]{2}$/;

function formatOdsDateToIso(odsDate: string): string | null {
  const trimmed = odsDate.trim();
  if (trimmed.length !== 8) {
    return null;
  }
  const yyyy = trimmed.slice(0, 4);
  const mm = trimmed.slice(4, 6);
  const dd = trimmed.slice(6, 8);
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * Normalises raw ODS succession rows into typed `EnglandSuccessionRecord` objects.
 * Ignores site-level entries.
 */
export function parseEnglandSuccessions(
  rows: readonly OdsSuccessionRow[],
): EnglandSuccessionRecord[] {
  const records: EnglandSuccessionRecord[] = [];
  const seen = new Set<string>();

  for (const row of rows) {
    const predecessor = row.predecessor.trim();
    const successor = row.successor.trim();

    // Ignore site-level codes
    if (TRUST_SITE_CODE_PATTERN.test(predecessor) || TRUST_SITE_CODE_PATTERN.test(successor)) {
      continue;
    }

    if (!predecessor || !successor) {
      continue;
    }

    const isoDate = formatOdsDateToIso(row.effectiveDate);
    if (!isoDate) {
      continue;
    }

    const dedupeKey = `${predecessor}|${successor}|${isoDate}`;
    if (!seen.has(dedupeKey)) {
      seen.add(dedupeKey);
      records.push({
        predecessor,
        successor,
        effectiveDate: isoDate,
      });
    }
  }

  return records;
}

/**
 * Evaluates whether a Reporting Unit remains the same entity across a 12-month comparison window.
 *
 * Rules:
 * 1. Returns false if the unit has a successor with effective date <= newerPeriod.
 * 2. Returns false if the unit received a predecessor with effective date in (olderPeriod, newerPeriod].
 * 3. Returns false if the unit closed with closeDate <= newerPeriod.
 * 4. Otherwise returns true.
 *
 * @see ADR-0006
 * @see GLOSSARY.md Year-Earlier Comparison
 * @see docs/plan/data-sources.md § Succession and mergers (B-4)
 */
export function isSameEntityAcross(
  code: string,
  olderPeriod: string,
  newerPeriod: string,
  successionIndex: Pick<
    EnglandSuccessionIndex,
    'successorsByPredecessor' | 'predecessorsBySuccessor'
  >,
  closeDate?: string | null,
): boolean {
  if (closeDate && closeDate <= newerPeriod) {
    return false;
  }

  // Check if unit was succeeded on or before newerPeriod
  const successors = successionIndex.successorsByPredecessor.get(code) ?? [];
  for (const succ of successors) {
    if (succ.effectiveDate <= newerPeriod) {
      return false;
    }
  }

  // Check if unit received an absorbed predecessor inside the window (olderPeriod, newerPeriod]
  const predecessors = successionIndex.predecessorsBySuccessor.get(code) ?? [];
  for (const pred of predecessors) {
    if (pred.effectiveDate > olderPeriod && pred.effectiveDate <= newerPeriod) {
      return false;
    }
  }

  return true;
}

/**
 * Builds an in-memory index of England successions.
 */
export function buildEnglandSuccessionIndex(
  records: readonly EnglandSuccessionRecord[],
): EnglandSuccessionIndex {
  const successorsByPredecessor = new Map<string, EnglandSuccessionRecord[]>();
  const predecessorsBySuccessor = new Map<string, EnglandSuccessionRecord[]>();

  for (const record of records) {
    const succList = successorsByPredecessor.get(record.predecessor);
    if (succList) {
      succList.push(record);
    } else {
      successorsByPredecessor.set(record.predecessor, [record]);
    }

    const predList = predecessorsBySuccessor.get(record.successor);
    if (predList) {
      predList.push(record);
    } else {
      predecessorsBySuccessor.set(record.successor, [record]);
    }
  }

  return {
    records,
    successorsByPredecessor,
    predecessorsBySuccessor,
    isSameEntityAcross(
      code: string,
      olderPeriod: string,
      newerPeriod: string,
      closeDate?: string | null,
    ): boolean {
      return isSameEntityAcross(
        code,
        olderPeriod,
        newerPeriod,
        { successorsByPredecessor, predecessorsBySuccessor },
        closeDate,
      );
    },
  };
}

/**
 * Populates predecessors and successors on a single English Reporting Unit.
 */
export function populateEnglandReportingUnitSuccessions(
  unit: ReportingUnit<'england'>,
  index: EnglandSuccessionIndex,
): ReportingUnit<'england'> {
  const predRecords = index.predecessorsBySuccessor.get(unit.officialCode) ?? [];
  const succRecords = index.successorsByPredecessor.get(unit.officialCode) ?? [];

  const predecessors = Array.from(
    new Set(predRecords.map((r) => reportingUnitId('england', r.predecessor))),
  ).sort((a, b) => a.localeCompare(b));

  const successors = Array.from(
    new Set(succRecords.map((r) => reportingUnitId('england', r.successor))),
  ).sort((a, b) => a.localeCompare(b));

  return {
    ...unit,
    predecessors,
    successors,
  };
}

/**
 * Populates predecessors and successors on multiple English Reporting Units.
 */
export function populateEnglandReportingUnitsSuccessions(
  units: readonly ReportingUnit<'england'>[],
  index: EnglandSuccessionIndex,
): ReportingUnit<'england'>[] {
  return units.map((u) => populateEnglandReportingUnitSuccessions(u, index));
}
