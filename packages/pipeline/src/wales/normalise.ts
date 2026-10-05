import { reportingUnitId, statisticId, waitStageId } from '@kyw/model/ids';
import type { ReportingUnitId } from '@kyw/model/ids';
import type { Figure, OfficialProvenance } from '@kyw/model/figure';
import type { Release, SourceFileRef } from '@kyw/model/release';
import { type PublicationDate, type ReportingPeriod, yearEarlierThan } from '@kyw/model/period';
import type { SourceRef } from '@kyw/model/source';
import { walesReleaseSchema } from '@kyw/model/wales/schema';
import { ValidationError } from '../errors.js';
import { resolveWalesBoardFromOnsCode } from '../reference/wales/boards.js';
import { specialtyForWales } from '../reference/wales/specialties.js';
import {
  KEY_MEASURES_DATASET_ID,
  THRESHOLD_COUNTS_DATASET_ID,
  STATSWALES_API_BASE,
  dateCodeFromReportingPeriod,
} from './api.js';
import type { RawWalesValue } from './parse.js';

export interface ParsedWalesDatasets {
  readonly keyMeasures: readonly RawWalesValue[];
  readonly thresholdCounts: readonly RawWalesValue[];
}

export interface NormaliseWalesOptions {
  readonly reportingPeriod: ReportingPeriod;
  readonly publicationDate: PublicationDate;
  readonly retrievedAt?: string;
  readonly revised?: boolean;
  readonly keyMeasuresUrl?: string;
  readonly thresholdCountsUrl?: string;
  readonly keyMeasuresSha256?: string;
  readonly thresholdCountsSha256?: string;
  readonly sourceRef?: SourceRef<'wales'>;
}

export const DEFAULT_WALES_SOURCE_URL =
  'https://stats.gov.wales/en-GB/topic/50/performance-and-waiting-times';

export const DEFAULT_WALES_SOURCE_TITLE =
  'NHS Activity and Performance Summary (Referral to Treatment)';

export const DEFAULT_WALES_ATTRIBUTION =
  'Source: Welsh Government, StatsWales (data provider: Digital Health and Care Wales). Contains public sector information licensed under the Open Government Licence v3.0.';

export function createWalesSourceRef(
  url: string = DEFAULT_WALES_SOURCE_URL,
  title: string = DEFAULT_WALES_SOURCE_TITLE,
): SourceRef<'wales'> {
  return {
    nation: 'wales',
    publisher: 'Welsh Government / StatsWales',
    title,
    url,
    licence: 'OGL-3.0',
    attribution: DEFAULT_WALES_ATTRIBUTION,
  };
}

const PROVENANCE_TOTAL: OfficialProvenance = {
  kind: 'official',
  sourceField: 'Total patient pathways waiting',
};

const PROVENANCE_WITHIN_26: OfficialProvenance = {
  kind: 'official',
  sourceField: '% waiting under 26 weeks',
};

const PROVENANCE_MEDIAN: OfficialProvenance = {
  kind: 'official',
  sourceField: 'Median waiting time (in weeks)',
};

const PROVENANCE_LONG_WAIT_52_PLUS: OfficialProvenance = {
  kind: 'official',
  sourceField: 'Waiting more than 52 weeks',
};

export function normaliseWalesRelease(
  parsed: ParsedWalesDatasets,
  options: NormaliseWalesOptions,
): Release<'wales'> {
  const { keyMeasures, thresholdCounts } = parsed;
  const { reportingPeriod, publicationDate } = options;

  const latestDateCode = dateCodeFromReportingPeriod(reportingPeriod);
  const yearEarlierPeriod = yearEarlierThan(reportingPeriod);
  const yearEarlierDateCode = dateCodeFromReportingPeriod(yearEarlierPeriod);

  const releaseSource = options.sourceRef ?? createWalesSourceRef();

  const waitStage = waitStageId('wales', 'rtt-pathway');
  const medianStatId = statisticId('wales', 'median-ongoing-wait');
  const withinStandardStatId = statisticId('wales', 'within-waiting-standard');
  const longWaitStatId = statisticId('wales', 'long-wait-count');
  const totalStatId = statisticId('wales', 'total-waiting');

  // Key format: `${dateCode}|${boardOdsCode}|${specialtyId}|${measureCode}`
  const kmMap = new Map<string, number>();
  const tcMap = new Map<string, number>();

  for (const row of keyMeasures) {
    const board = resolveWalesBoardFromOnsCode(row.boardOnsCode);
    if (!board) {
      continue; // Skip All Wales (W92000004), regions (A1X), legacy codes
    }
    const specialty = specialtyForWales(row.specialtyCode);
    const key = `${row.dateCode}|${board.odsCode}|${specialty.id}|${row.measureCode}`;
    kmMap.set(key, row.value);
  }

  for (const row of thresholdCounts) {
    const board = resolveWalesBoardFromOnsCode(row.boardOnsCode);
    if (!board) {
      continue;
    }
    const specialty = specialtyForWales(row.specialtyCode);
    const key = `${row.dateCode}|${board.odsCode}|${specialty.id}|${row.measureCode}`;
    tcMap.set(key, row.value);
  }

  const figures: Figure<'wales'>[] = [];
  const activeReportingUnits = new Set<ReportingUnitId<'wales'>>();

  // Extract unique cells for the latest month
  const latestCells = new Set<string>();
  for (const row of keyMeasures) {
    if (row.dateCode !== latestDateCode || row.measureCode !== '1' || row.value <= 0) {
      continue;
    }
    const board = resolveWalesBoardFromOnsCode(row.boardOnsCode);
    if (!board) {
      continue;
    }
    const specialty = specialtyForWales(row.specialtyCode);
    latestCells.add(`${board.odsCode}|${specialty.id}`);
  }

  // Build figures for the latest reporting period
  for (const cellKey of latestCells) {
    const [boardOdsCode, specId] = cellKey.split('|');
    if (!boardOdsCode || !specId) continue;

    const repUnitId = reportingUnitId('wales', boardOdsCode);
    const specialty = specialtyForWales(specId);

    const totalVal = kmMap.get(`${latestDateCode}|${boardOdsCode}|${specialty.id}|1`);
    if (totalVal === undefined || totalVal <= 0) {
      continue;
    }

    activeReportingUnits.add(repUnitId);

    // 1. Total waiting figure
    figures.push({
      nation: 'wales',
      reportingUnit: repUnitId,
      specialty: specialty.id,
      waitStage,
      statistic: totalStatId,
      reportingPeriod,
      publicationDate,
      unit: 'count',
      value: {
        status: 'published',
        value: totalVal,
        provisional: false,
      },
      provenance: PROVENANCE_TOTAL,
      source: releaseSource,
    });

    // 2. Within waiting standard figure (% < 26 weeks)
    const withinVal = kmMap.get(`${latestDateCode}|${boardOdsCode}|${specialty.id}|2`);
    if (withinVal !== undefined) {
      figures.push({
        nation: 'wales',
        reportingUnit: repUnitId,
        specialty: specialty.id,
        waitStage,
        statistic: withinStandardStatId,
        reportingPeriod,
        publicationDate,
        unit: 'percent',
        value: {
          status: 'published',
          value: withinVal,
          provisional: false,
        },
        provenance: PROVENANCE_WITHIN_26,
        source: releaseSource,
      });
    }

    // 3. Median ongoing wait figure (absent row -> suppressed figure)
    const medianVal = kmMap.get(`${latestDateCode}|${boardOdsCode}|${specialty.id}|4`);
    figures.push({
      nation: 'wales',
      reportingUnit: repUnitId,
      specialty: specialty.id,
      waitStage,
      statistic: medianStatId,
      reportingPeriod,
      publicationDate,
      unit: 'weeks',
      value:
        medianVal === undefined
          ? { status: 'suppressed', provisional: false }
          : { status: 'published', value: medianVal, provisional: false },
      provenance: PROVENANCE_MEDIAN,
      source: releaseSource,
    });

    // 4. Long wait count figure (> 52 weeks from Threshold Counts; absent with total present -> 0)
    const longWaitVal = tcMap.get(`${latestDateCode}|${boardOdsCode}|${specialty.id}|52`) ?? 0;
    figures.push({
      nation: 'wales',
      reportingUnit: repUnitId,
      specialty: specialty.id,
      waitStage,
      statistic: longWaitStatId,
      reportingPeriod,
      publicationDate,
      unit: 'count',
      value: {
        status: 'published',
        value: longWaitVal,
        provisional: false,
      },
      provenance: PROVENANCE_LONG_WAIT_52_PLUS,
      source: releaseSource,
    });
  }

  // Build comparison figures for year-earlier month
  const comparisonFigures: Figure<'wales'>[] = [];
  const yearEarlierCells = new Set<string>();

  for (const row of keyMeasures) {
    if (row.dateCode !== yearEarlierDateCode || row.measureCode !== '1' || row.value <= 0) {
      continue;
    }
    const board = resolveWalesBoardFromOnsCode(row.boardOnsCode);
    if (!board) {
      continue;
    }
    const specialty = specialtyForWales(row.specialtyCode);
    yearEarlierCells.add(`${board.odsCode}|${specialty.id}`);
  }

  for (const cellKey of yearEarlierCells) {
    if (!latestCells.has(cellKey)) {
      continue;
    }

    const [boardOdsCode, specId] = cellKey.split('|');
    if (!boardOdsCode || !specId) continue;

    const repUnitId = reportingUnitId('wales', boardOdsCode);

    const specialty = specialtyForWales(specId);
    const compMedianVal = kmMap.get(`${yearEarlierDateCode}|${boardOdsCode}|${specialty.id}|4`);

    comparisonFigures.push({
      nation: 'wales',
      reportingUnit: repUnitId,
      specialty: specialty.id,
      waitStage,
      statistic: medianStatId,
      reportingPeriod: yearEarlierPeriod,
      publicationDate,
      unit: 'weeks',
      value:
        compMedianVal === undefined
          ? { status: 'suppressed', provisional: false }
          : { status: 'published', value: compMedianVal, provisional: false },
      provenance: PROVENANCE_MEDIAN,
      source: releaseSource,
    });
  }

  const reportingUnits = Array.from(activeReportingUnits).sort();

  const sourceFiles: readonly SourceFileRef[] = [
    {
      url: options.keyMeasuresUrl ?? `${STATSWALES_API_BASE}/${KEY_MEASURES_DATASET_ID}`,
      sha256: options.keyMeasuresSha256 ?? '0'.repeat(64),
      revised: options.revised ?? false,
    },
    {
      url: options.thresholdCountsUrl ?? `${STATSWALES_API_BASE}/${THRESHOLD_COUNTS_DATASET_ID}`,
      sha256: options.thresholdCountsSha256 ?? '0'.repeat(64),
      revised: options.revised ?? false,
    },
  ];

  const releaseCandidate: Release<'wales'> = {
    schemaVersion: 1,
    nation: 'wales',
    reportingPeriod,
    publicationDate,
    source: releaseSource,
    retrievedAt: options.retrievedAt ?? new Date().toISOString(),
    sourceFiles,
    reportingUnits,
    figures,
    comparisonFigures,
  };

  const validationResult = walesReleaseSchema.safeParse(releaseCandidate);
  if (!validationResult.success) {
    throw new ValidationError(
      `Normalised Wales release failed schema validation: ${validationResult.error.message}`,
      validationResult.error.issues,
    );
  }

  return validationResult.data;
}
