import * as fs from 'node:fs/promises';
import { reportingPeriod, yearEarlierThan, type ReportingPeriod } from '@kyw/model/period';
import { fetchToCache, type FetchToCacheOptions, type CachedFetchResult } from '../http/fetch.js';
import { SourceUnavailableError } from '../errors.js';

export const STATSWALES_API_BASE = 'https://api.stats.gov.wales/v2';
export const KEY_MEASURES_DATASET_ID = 'acd9529c-979a-48ef-a773-870b3ebe4391';
export const THRESHOLD_COUNTS_DATASET_ID = '3ef3a1d8-1467-4afe-ad60-4fc3d92228a1';

export interface StatsWalesPublishedRevision {
  readonly id: string;
  readonly publish_at: string;
  readonly coverage_end_date: string;
  readonly coverage_start_date?: string;
  readonly designation?: string;
  readonly previous_revision_id?: string;
}

export interface StatsWalesDatasetMetadata {
  readonly id: string;
  readonly published_revision?: StatsWalesPublishedRevision;
  readonly version_id?: string;
}

export interface StatsWalesFilterBody {
  readonly filters: readonly Record<string, readonly string[]>[];
  readonly options: { readonly data_value_type: 'raw_extended' };
}

/**
 * Converts a ReportingPeriod (e.g. `2026-07-31`) to a StatsWales DateCode (`202607`).
 *
 * @see GLOSSARY.md Reporting Period
 */
export function dateCodeFromReportingPeriod(period: ReportingPeriod): string {
  // period format: YYYY-MM-DD
  const match = /^(\d{4})-(\d{2})-\d{2}$/.exec(period);
  const year = match?.[1];
  const month = match?.[2];
  if (!year || !month) {
    throw new Error(`Invalid ReportingPeriod format for DateCode conversion: ${period}`);
  }
  return `${year}${month}`;
}

/**
 * Constructs a validated ReportingPeriod from a StatsWales DateCode (`YYYYMM`).
 *
 * @see GLOSSARY.md Reporting Period
 */
export function reportingPeriodFromDateCode(dateCode: string): ReportingPeriod {
  const match = /^(\d{4})(\d{2})$/.exec(dateCode);
  const yearStr = match?.[1];
  const monthStr = match?.[2];
  if (!yearStr || !monthStr) {
    throw new Error(`Invalid DateCode format: ${dateCode}`);
  }
  const year = Number(yearStr);
  const month = Number(monthStr);
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const pad = (n: number): string => String(n).padStart(2, '0');
  return reportingPeriod(`${String(year)}-${pad(month)}-${pad(lastDay)}`);
}

/**
 * Builds the POST filter body for Key Measures dataset (`acd9529c`).
 * Includes latest date and year-earlier comparison date.
 */
export function buildKeyMeasuresFilterBody(period: ReportingPeriod): StatsWalesFilterBody {
  const latestCode = dateCodeFromReportingPeriod(period);
  const yearEarlierCode = dateCodeFromReportingPeriod(yearEarlierThan(period));
  return {
    filters: [{ DateCode: [latestCode, yearEarlierCode] }],
    options: { data_value_type: 'raw_extended' },
  };
}

/**
 * Builds the POST filter body for Threshold Counts dataset (`3ef3a1d8`).
 * Includes latest date, year-earlier comparison date, stage `T`, and age `T`.
 */
export function buildThresholdCountsFilterBody(period: ReportingPeriod): StatsWalesFilterBody {
  const latestCode = dateCodeFromReportingPeriod(period);
  const yearEarlierCode = dateCodeFromReportingPeriod(yearEarlierThan(period));
  return {
    filters: [
      { DateCode: [latestCode, yearEarlierCode] },
      { StageOfPathwayCode: ['T'] },
      { AgeGroupAtReferralCode: ['T'] },
    ],
    options: { data_value_type: 'raw_extended' },
  };
}

/**
 * Fetches dataset metadata from `GET /v2/{uuid}` via cache.
 */
export async function getStatsWalesMetadata(
  datasetId: string,
  options?: FetchToCacheOptions,
): Promise<StatsWalesDatasetMetadata> {
  const url = `${STATSWALES_API_BASE}/${datasetId}`;
  const cached = await fetchToCache(url, options);
  const raw = await fs.readFile(cached.path, 'utf-8');
  try {
    return JSON.parse(raw) as StatsWalesDatasetMetadata;
  } catch (err) {
    throw new SourceUnavailableError(
      `Failed to parse metadata JSON from ${url}: ${err instanceof Error ? err.message : String(err)}`,
      { url },
    );
  }
}

/**
 * Initiates a server-side filtered coded export by POSTing to `/v2/{uuid}/data`.
 * Returns the resulting filter ID.
 */
export async function postStatsWalesFilter(
  datasetId: string,
  body: StatsWalesFilterBody,
  options?: FetchToCacheOptions,
): Promise<string> {
  const url = `${STATSWALES_API_BASE}/${datasetId}/data`;
  const cached = await fetchToCache(url, {
    ...options,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    body: JSON.stringify(body),
  });

  const raw = await fs.readFile(cached.path, 'utf-8');
  try {
    const json = JSON.parse(raw) as Record<string, unknown>;
    const rawId = json.filterId ?? json.filter_id ?? json.id;
    const filterId = typeof rawId === 'string' || typeof rawId === 'number' ? String(rawId) : '';
    if (!filterId) {
      throw new Error(`Response JSON did not contain a filterId`);
    }
    return filterId;
  } catch (err) {
    throw new SourceUnavailableError(
      `Failed to parse filterId from ${url}: ${err instanceof Error ? err.message : String(err)}`,
      { url },
    );
  }
}

/**
 * Downloads the coded CSV with raw_extended reference headers for a given filter ID.
 */
export async function fetchStatsWalesCodedCsv(
  datasetId: string,
  filterId: string,
  options?: FetchToCacheOptions,
): Promise<CachedFetchResult> {
  const url = `${STATSWALES_API_BASE}/${datasetId}/data/${filterId}?format=csv`;
  return fetchToCache(url, options);
}
