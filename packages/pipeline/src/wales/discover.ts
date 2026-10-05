import {
  reportingPeriod,
  publicationDate,
  type ReportingPeriod,
  type PublicationDate,
} from '@kyw/model/period';
import type { PipelineState, ReleaseCandidate } from '../source.js';
import { SourceUnavailableError } from '../errors.js';
import type { FetchToCacheOptions } from '../http/fetch.js';
import {
  STATSWALES_API_BASE,
  KEY_MEASURES_DATASET_ID,
  THRESHOLD_COUNTS_DATASET_ID,
  getStatsWalesMetadata,
  type StatsWalesDatasetMetadata,
} from './api.js';

export interface WalesReleaseCandidate extends ReleaseCandidate {
  readonly publicationDate: PublicationDate;
  readonly keyMeasuresVersionId: string;
  readonly thresholdCountsVersionId: string;
}

export interface DiscoverWalesOptions {
  readonly fetchOptions?: FetchToCacheOptions;
  readonly metadataFetcher?: (datasetId: string) => Promise<StatsWalesDatasetMetadata>;
}

/**
 * Builds a deterministic release fingerprint joining reporting period and both dataset version IDs.
 */
export function buildWalesFingerprint(
  period: ReportingPeriod,
  kmVersionId: string,
  tcVersionId: string,
): string {
  return `${period}:${kmVersionId}:${tcVersionId}`;
}

/**
 * Discovers Wales release candidates by inspecting dataset metadata for both
 * Key Measures (`acd9529c`) and Threshold Counts (`3ef3a1d8`).
 *
 * @see GLOSSARY.md Reporting Period
 * @see GLOSSARY.md Publication Date
 * @see ADR-0007
 */
export async function discoverWalesReleases(
  state: PipelineState,
  options: DiscoverWalesOptions = {},
): Promise<readonly WalesReleaseCandidate[]> {
  const fetcher =
    options.metadataFetcher ??
    ((datasetId: string) => getStatsWalesMetadata(datasetId, options.fetchOptions));

  const [kmMeta, tcMeta] = await Promise.all([
    fetcher(KEY_MEASURES_DATASET_ID),
    fetcher(THRESHOLD_COUNTS_DATASET_ID),
  ]);

  const kmRev = kmMeta.published_revision;
  const tcRev = tcMeta.published_revision;

  const kmVersionId = kmRev?.id ?? kmMeta.version_id;
  const tcVersionId = tcRev?.id ?? tcMeta.version_id;

  if (!kmVersionId || !tcVersionId) {
    throw new SourceUnavailableError('StatsWales metadata response missing revision ID', {
      url: `${STATSWALES_API_BASE}/${!kmVersionId ? KEY_MEASURES_DATASET_ID : THRESHOLD_COUNTS_DATASET_ID}`,
    });
  }

  if (!kmRev?.coverage_end_date) {
    throw new SourceUnavailableError('StatsWales Key Measures metadata missing coverage_end_date', {
      url: `${STATSWALES_API_BASE}/${KEY_MEASURES_DATASET_ID}`,
    });
  }

  if (tcRev?.coverage_end_date && kmRev.coverage_end_date !== tcRev.coverage_end_date) {
    throw new SourceUnavailableError(
      `StatsWales dataset coverage_end_date mismatch: Key Measures has "${kmRev.coverage_end_date}", Threshold Counts has "${tcRev.coverage_end_date}"`,
    );
  }

  const period: ReportingPeriod = reportingPeriod(kmRev.coverage_end_date);
  const rawPublishAt = kmRev.publish_at;
  if (!rawPublishAt) {
    throw new SourceUnavailableError('StatsWales metadata missing publish_at timestamp');
  }

  const pubDateIso = rawPublishAt.slice(0, 10);
  const pubDate: PublicationDate = publicationDate(pubDateIso);

  const fingerprint = buildWalesFingerprint(period, kmVersionId, tcVersionId);

  // Check if this exact release version combination has already been processed
  const seenKeys = Object.keys(state.seenFiles);
  if (seenKeys.includes(fingerprint)) {
    return [];
  }

  // Detect whether this is a revision of an already seen period
  const isRevised = seenKeys.some((k) => k.includes(period) || k.startsWith(`${period}:`));

  const candidate: WalesReleaseCandidate = {
    reportingPeriod: period,
    publicationDate: pubDate,
    sourceUrls: [
      `${STATSWALES_API_BASE}/${KEY_MEASURES_DATASET_ID}`,
      `${STATSWALES_API_BASE}/${THRESHOLD_COUNTS_DATASET_ID}`,
    ],
    revised: isRevised,
    fingerprint,
    keyMeasuresVersionId: kmVersionId,
    thresholdCountsVersionId: tcVersionId,
  };

  return [candidate];
}
