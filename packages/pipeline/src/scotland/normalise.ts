import { reportingUnitId, specialtyId, statisticId, waitStageId } from '@kyw/model/ids';
import type { ReportingUnitId, WaitStageId } from '@kyw/model/ids';
import {
  type Figure,
  type OfficialProvenance,
  type DerivedProvenance,
  exactSum,
} from '@kyw/model/figure';
import type { Release, SourceFileRef } from '@kyw/model/release';
import {
  publicationDate as parsePublicationDate,
  yearEarlierThan,
  type PublicationDate,
  type ReportingPeriod,
} from '@kyw/model/period';
import type { SourceRef } from '@kyw/model/source';
import { scotlandReleaseSchema } from '@kyw/model/scotland/schema';
import {
  SCOTLAND_WAIT_STAGE_NEW_OUTPATIENT,
  SCOTLAND_WAIT_STAGE_INPATIENT_DAY_CASE,
} from '@kyw/model/scotland/definitions';
import { SchemaChangeError, ValidationError } from '../errors.js';
import { resolveScotlandBoard } from '../reference/scotland/boards.js';
import {
  assertKnownScotlandSpecialties,
  specialtyForScotland,
} from '../reference/scotland/specialties.js';
import type { RawScotlandPerformanceRow, RawScotlandDistributionRow } from './parse.js';
import type { ScotlandPatientType } from './columns.js';
import { crossCheckScotlandBands, BANDS_UNDER_12_WEEKS } from './bands.js';

export interface ParsedScotlandDatasets {
  readonly performance: readonly RawScotlandPerformanceRow[];
  readonly distribution: readonly RawScotlandDistributionRow[];
}

export interface NormaliseScotlandOptions {
  readonly reportingPeriod?: ReportingPeriod;
  readonly publicationDate?: PublicationDate;
  readonly performanceUrl?: string;
  readonly distributionUrl?: string;
  readonly performanceSha256?: string;
  readonly distributionSha256?: string;
  readonly retrievedAt?: string;
  readonly revised?: boolean;
  readonly sourceRef?: SourceRef<'scotland'>;
}

export const DEFAULT_SCOTLAND_SOURCE_URL =
  'https://publichealthscotland.scot/publications/stage-of-treatment-waiting-times/';

export const DEFAULT_SCOTLAND_SOURCE_TITLE =
  'Stage of Treatment Waiting Times - Inpatients, Day Cases and New Outpatients';

export const DEFAULT_SCOTLAND_ATTRIBUTION =
  'Source: Public Health Scotland, Stage of Treatment Waiting Times (opendata.nhs.scot). Contains public sector information licensed under the Open Government Licence v3.0.';

export function createScotlandSourceRef(
  url: string = DEFAULT_SCOTLAND_SOURCE_URL,
  title: string = DEFAULT_SCOTLAND_SOURCE_TITLE,
): SourceRef<'scotland'> {
  return {
    nation: 'scotland',
    publisher: 'Public Health Scotland',
    title,
    url,
    licence: 'OGL-3.0',
    attribution: DEFAULT_SCOTLAND_ATTRIBUTION,
  };
}

const PROVENANCE_MEDIAN: OfficialProvenance = {
  kind: 'official',
  sourceField: 'Median',
};

const PROVENANCE_LONG_WAIT_52_PLUS: OfficialProvenance = {
  kind: 'official',
  sourceField: 'WaitsOver52Weeks',
};

const PROVENANCE_TOTAL: OfficialProvenance = {
  kind: 'official',
  sourceField: 'Waits',
};

const PROVENANCE_WITHIN_12: DerivedProvenance = {
  kind: 'derived',
  method: 'exact-sum',
  inputs: ['LessThan4WeekWait', '4To8WeekWait', '8To12WeekWait'],
};

function mapWaitStage(patientType: ScotlandPatientType): WaitStageId<'scotland'> {
  switch (patientType) {
    case 'New Outpatient':
      return SCOTLAND_WAIT_STAGE_NEW_OUTPATIENT.id;
    case 'Inpatient/Day case':
      return SCOTLAND_WAIT_STAGE_INPATIENT_DAY_CASE.id;
    default: {
      const exhaustiveCheck: never = patientType;
      return waitStageId('scotland', exhaustiveCheck);
    }
  }
}

function distributionKey(
  monthEnding: string,
  hbt: string,
  patientType: string,
  specialty: string,
): string {
  return `${monthEnding}|${hbt}|${patientType}|${specialty}`;
}

/**
 * Normalises parsed Scotland Ongoing Performance and Distribution datasets into a validated Release<'scotland'>.
 *
 * @see docs/plan/phase-06-pipeline-scotland.md § T-6.4
 * @see GLOSSARY.md Wait Stage, Median Ongoing Wait, Waiting Standard, Long Wait, Derived Figure, Official Figure, Suppressed Figure, Year-Earlier Comparison
 * @see ADR-0002
 * @see ADR-0005
 * @see ADR-0006
 */
export function normaliseScotlandRelease(
  parsed: ParsedScotlandDatasets,
  options?: NormaliseScotlandOptions,
): Release<'scotland'> {
  const { performance: perfRows, distribution: distRows } = parsed;

  if (perfRows.length === 0) {
    throw new SchemaChangeError('Cannot normalise empty Scotland performance dataset');
  }
  if (distRows.length === 0) {
    throw new SchemaChangeError('Cannot normalise empty Scotland distribution dataset');
  }

  // 1. Cross-check distribution bands with performance metrics (ADR-0005 integrity checks)
  crossCheckScotlandBands(perfRows, distRows);

  // 2. Determine reporting period as max MonthEnding across both files
  let perfMaxMonthEnding = '';
  let perfLatestPeriod: ReportingPeriod | null = null;
  for (const row of perfRows) {
    if (row.monthEnding > perfMaxMonthEnding) {
      perfMaxMonthEnding = row.monthEnding;
      perfLatestPeriod = row.reportingPeriod;
    }
  }

  let distMaxMonthEnding = '';
  let distLatestPeriod: ReportingPeriod | null = null;
  for (const row of distRows) {
    if (row.monthEnding > distMaxMonthEnding) {
      distMaxMonthEnding = row.monthEnding;
      distLatestPeriod = row.reportingPeriod;
    }
  }

  if (
    perfMaxMonthEnding !== distMaxMonthEnding ||
    !perfLatestPeriod ||
    perfLatestPeriod !== distLatestPeriod
  ) {
    throw new SchemaChangeError(
      `Latest MonthEnding mismatch between Scotland Performance (${perfMaxMonthEnding}) and Distribution (${distMaxMonthEnding})`,
      { perfMaxMonthEnding, distMaxMonthEnding },
    );
  }

  const reportingPeriod = options?.reportingPeriod ?? perfLatestPeriod;
  const targetMonthEnding = options?.reportingPeriod
    ? options.reportingPeriod.replace(/-/g, '')
    : perfMaxMonthEnding;
  const publicationDate = options?.publicationDate ?? parsePublicationDate(reportingPeriod);
  const releaseSource = options?.sourceRef ?? createScotlandSourceRef();

  // 3. Assert all specialty codes are registered in Scottish reference
  const specialtyCodes = new Set<string>();
  for (const row of perfRows) {
    specialtyCodes.add(row.specialty);
  }
  for (const row of distRows) {
    specialtyCodes.add(row.specialty);
  }
  assertKnownScotlandSpecialties(Array.from(specialtyCodes));

  // Index distribution rows for quick lookup by key
  const distMap = new Map<string, RawScotlandDistributionRow>();
  for (const distRow of distRows) {
    distMap.set(
      distributionKey(distRow.monthEnding, distRow.hbt, distRow.patientType, distRow.specialty),
      distRow,
    );
  }

  const medianStatId = statisticId('scotland', 'median-ongoing-wait');
  const withinStandardStatId = statisticId('scotland', 'within-waiting-standard-count');
  const longWaitStatId = statisticId('scotland', 'long-wait-count');
  const totalStatId = statisticId('scotland', 'total-waiting');

  const figures: Figure<'scotland'>[] = [];
  const activeReportingUnitIds = new Set<ReportingUnitId<'scotland'>>();
  const activeCellKeys = new Set<string>();

  // 4. Build figures for target month
  for (const perfRow of perfRows) {
    if (perfRow.monthEnding !== targetMonthEnding) {
      continue;
    }

    const board = resolveScotlandBoard(perfRow.hbt);
    if (!board) {
      // Non-reporting code (S92000003, S27000001, RA2702, RA2704, etc.)
      continue;
    }

    const repUnitId = reportingUnitId('scotland', board.code);
    const specialty = specialtyForScotland(perfRow.specialty);
    const specId = specialtyId('scotland', specialty.officialCode);
    const waitStage = mapWaitStage(perfRow.patientType);

    activeReportingUnitIds.add(repUnitId);
    activeCellKeys.add(`${repUnitId}|${specId}|${waitStage}`);

    // 1. Median Ongoing Wait figure (stored in days)
    figures.push({
      nation: 'scotland',
      reportingUnit: repUnitId,
      specialty: specId,
      waitStage,
      statistic: medianStatId,
      reportingPeriod,
      publicationDate,
      unit: 'days',
      value: perfRow.median,
      provenance: PROVENANCE_MEDIAN,
      source: releaseSource,
    });

    // 2. Long Wait Count figure (> 52 weeks)
    figures.push({
      nation: 'scotland',
      reportingUnit: repUnitId,
      specialty: specId,
      waitStage,
      statistic: longWaitStatId,
      reportingPeriod,
      publicationDate,
      unit: 'count',
      value: perfRow.waitsOver52Weeks,
      provenance: PROVENANCE_LONG_WAIT_52_PLUS,
      source: releaseSource,
    });

    // 3. Total Waiting figure
    figures.push({
      nation: 'scotland',
      reportingUnit: repUnitId,
      specialty: specId,
      waitStage,
      statistic: totalStatId,
      reportingPeriod,
      publicationDate,
      unit: 'count',
      value: perfRow.waits,
      provenance: PROVENANCE_TOTAL,
      source: releaseSource,
    });

    // 4. Within Waiting Standard Count figure (Derived exactSum of the 3 bands under 12 weeks)
    const distRow = distMap.get(
      distributionKey(perfRow.monthEnding, perfRow.hbt, perfRow.patientType, perfRow.specialty),
    );

    if (distRow) {
      const inputFigures: Figure<'scotland'>[] = BANDS_UNDER_12_WEEKS.map((band) => ({
        nation: 'scotland',
        reportingUnit: repUnitId,
        specialty: specId,
        waitStage,
        statistic: withinStandardStatId,
        reportingPeriod,
        publicationDate,
        unit: 'count',
        value: distRow.bands[band],
        provenance: { kind: 'official', sourceField: band },
        source: releaseSource,
      }));

      const derivedSum = exactSum(inputFigures);
      if (derivedSum !== null) {
        figures.push({
          nation: 'scotland',
          reportingUnit: repUnitId,
          specialty: specId,
          waitStage,
          statistic: withinStandardStatId,
          reportingPeriod,
          publicationDate,
          unit: 'count',
          value: derivedSum,
          provenance: PROVENANCE_WITHIN_12,
          source: releaseSource,
        });
      }
    }
  }

  // 5. Build comparison figures for year-earlier month
  const comparisonFigures: Figure<'scotland'>[] = [];
  const yearEarlierPeriod = yearEarlierThan(reportingPeriod);
  const yearEarlierMonthEnding = yearEarlierPeriod.replace(/-/g, '');

  for (const perfRow of perfRows) {
    if (perfRow.monthEnding !== yearEarlierMonthEnding) {
      continue;
    }

    const board = resolveScotlandBoard(perfRow.hbt);
    if (!board) {
      continue;
    }

    const repUnitId = reportingUnitId('scotland', board.code);
    if (!activeReportingUnitIds.has(repUnitId)) {
      continue;
    }

    const specialty = specialtyForScotland(perfRow.specialty);
    const specId = specialtyId('scotland', specialty.officialCode);
    const waitStage = mapWaitStage(perfRow.patientType);

    const cellKey = `${repUnitId}|${specId}|${waitStage}`;
    if (!activeCellKeys.has(cellKey)) {
      continue;
    }

    comparisonFigures.push({
      nation: 'scotland',
      reportingUnit: repUnitId,
      specialty: specId,
      waitStage,
      statistic: medianStatId,
      reportingPeriod: yearEarlierPeriod,
      publicationDate,
      unit: 'days',
      value: perfRow.median,
      provenance: PROVENANCE_MEDIAN,
      source: releaseSource,
    });
  }

  const reportingUnits = Array.from(activeReportingUnitIds).sort();

  const sourceFiles: readonly SourceFileRef[] = [
    {
      url: options?.performanceUrl ?? DEFAULT_SCOTLAND_SOURCE_URL,
      sha256: options?.performanceSha256 ?? '0'.repeat(64),
      revised: options?.revised ?? false,
    },
    {
      url: options?.distributionUrl ?? DEFAULT_SCOTLAND_SOURCE_URL,
      sha256: options?.distributionSha256 ?? '0'.repeat(64),
      revised: options?.revised ?? false,
    },
  ];

  const releaseCandidate: Release<'scotland'> = {
    schemaVersion: 1,
    nation: 'scotland',
    reportingPeriod,
    publicationDate,
    source: releaseSource,
    retrievedAt: options?.retrievedAt ?? new Date().toISOString(),
    sourceFiles,
    reportingUnits,
    figures,
    comparisonFigures,
  };

  const validationResult = scotlandReleaseSchema.safeParse(releaseCandidate);
  if (!validationResult.success) {
    throw new ValidationError(
      `Normalised Scotland release failed schema validation: ${validationResult.error.message}`,
      validationResult.error.issues,
    );
  }

  return validationResult.data;
}
