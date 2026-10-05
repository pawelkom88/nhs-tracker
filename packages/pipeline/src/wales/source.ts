import * as fs from 'node:fs/promises';
import type { Release } from '@kyw/model/release';
import { publicationDate, type PublicationDate, type ReportingPeriod } from '@kyw/model/period';
import type { SourceRef } from '@kyw/model/source';
import type {
  NationSource,
  ReleaseCandidate,
  RawFiles,
  RawFile,
  PipelineState,
} from '../source.js';
import { fetchToCache, type FetchToCacheOptions } from '../http/fetch.js';
import { SchemaChangeError } from '../errors.js';
import {
  STATSWALES_API_BASE,
  KEY_MEASURES_DATASET_ID,
  THRESHOLD_COUNTS_DATASET_ID,
  buildKeyMeasuresFilterBody,
  buildThresholdCountsFilterBody,
  postStatsWalesFilter,
  fetchStatsWalesCodedCsv,
  reportingPeriodFromDateCode,
} from './api.js';
import { discoverWalesReleases, type DiscoverWalesOptions } from './discover.js';
import {
  parseWalesKeyMeasuresCsv,
  parseWalesThresholdCountsCsv,
  type RawWalesValue,
} from './parse.js';
import { normaliseWalesRelease, type NormaliseWalesOptions } from './normalise.js';

export interface WalesSourceOptions {
  readonly discoverOptions?: DiscoverWalesOptions;
  readonly fetchOptions?: FetchToCacheOptions;
  readonly defaultPublicationDate?: PublicationDate;
  readonly sourceRef?: SourceRef<'wales'>;
}

export interface WalesResolvedRawFiles {
  readonly keyMeasures: { readonly url: string; readonly file: RawFile };
  readonly thresholdCounts: { readonly url: string; readonly file: RawFile };
  readonly keyMeasuresMetadata?: { readonly url: string; readonly file: RawFile };
  readonly thresholdCountsMetadata?: { readonly url: string; readonly file: RawFile };
}

/**
 * Resolves Key Measures and Threshold Counts raw files (and optional metadata) from a RawFiles dictionary.
 */
export function resolveWalesRawFiles(raw: RawFiles): WalesResolvedRawFiles {
  const entries = Object.entries(raw);
  if (entries.length === 0) {
    throw new Error('Cannot resolve empty Wales RawFiles');
  }

  let keyMeasures: { url: string; file: RawFile } | undefined;
  let thresholdCounts: { url: string; file: RawFile } | undefined;
  let keyMeasuresMetadata: { url: string; file: RawFile } | undefined;
  let thresholdCountsMetadata: { url: string; file: RawFile } | undefined;

  for (const [url, file] of entries) {
    const identifier = `${url}|${file.finalUrl}|${file.path}`;
    const isJson = file.path.endsWith('.json') || url.endsWith('/metadata');

    if (isJson) {
      if (identifier.includes(KEY_MEASURES_DATASET_ID) || identifier.includes('acd9529c')) {
        keyMeasuresMetadata = { url, file };
      } else if (
        identifier.includes(THRESHOLD_COUNTS_DATASET_ID) ||
        identifier.includes('3ef3a1d8')
      ) {
        thresholdCountsMetadata = { url, file };
      }
    } else {
      if (identifier.includes(KEY_MEASURES_DATASET_ID) || identifier.includes('acd9529c')) {
        keyMeasures = { url, file };
      } else if (
        identifier.includes(THRESHOLD_COUNTS_DATASET_ID) ||
        identifier.includes('3ef3a1d8')
      ) {
        thresholdCounts = { url, file };
      }
    }
  }

  if (!keyMeasures || !thresholdCounts) {
    throw new Error(
      `Wales normalisation requires both Key Measures (${KEY_MEASURES_DATASET_ID}) and Threshold Counts (${THRESHOLD_COUNTS_DATASET_ID}) raw files`,
    );
  }

  return {
    keyMeasures,
    thresholdCounts,
    ...(keyMeasuresMetadata !== undefined ? { keyMeasuresMetadata } : {}),
    ...(thresholdCountsMetadata !== undefined ? { thresholdCountsMetadata } : {}),
  };
}

/**
 * Extracts the latest ReportingPeriod from parsed Wales raw values by finding the maximum DateCode.
 */
export function extractLatestPeriodFromRawWalesValues(
  values: readonly RawWalesValue[],
): ReportingPeriod {
  let maxDateCode: string | null = null;
  for (const row of values) {
    if (!maxDateCode || row.dateCode > maxDateCode) {
      maxDateCode = row.dateCode;
    }
  }

  if (!maxDateCode) {
    throw new SchemaChangeError('No valid DateCode found in Wales dataset');
  }

  return reportingPeriodFromDateCode(maxDateCode);
}

/**
 * Normalises raw Wales files into a validated Release<'wales'>.
 */
export async function normaliseWalesWithSources(
  raw: RawFiles,
  options?: Partial<NormaliseWalesOptions>,
): Promise<Release<'wales'>> {
  const {
    keyMeasures: kmEntry,
    thresholdCounts: tcEntry,
    keyMeasuresMetadata: kmMetaEntry,
  } = resolveWalesRawFiles(raw);

  const [kmContent, tcContent] = await Promise.all([
    fs.readFile(kmEntry.file.path, 'utf-8'),
    fs.readFile(tcEntry.file.path, 'utf-8'),
  ]);

  const keyMeasures = parseWalesKeyMeasuresCsv(kmContent);
  const thresholdCounts = parseWalesThresholdCountsCsv(tcContent);

  const reportingPeriod =
    options?.reportingPeriod ?? extractLatestPeriodFromRawWalesValues(keyMeasures);

  let officialPublicationDate: PublicationDate | undefined;
  if (kmMetaEntry) {
    try {
      const metaContent = await fs.readFile(kmMetaEntry.file.path, 'utf-8');
      const metaJson = JSON.parse(metaContent) as { published_revision?: { publish_at?: string } };
      if (metaJson.published_revision?.publish_at) {
        officialPublicationDate = publicationDate(
          metaJson.published_revision.publish_at.slice(0, 10),
        );
      }
    } catch {
      // Metadata read error ignored, fall back to fetchedAt
    }
  }

  const pubDateFallback = (kmEntry.file.fetchedAt || new Date().toISOString()).slice(0, 10);
  const derivedPublicationDate: PublicationDate =
    officialPublicationDate ?? publicationDate(pubDateFallback);
  const finalPublicationDate = options?.publicationDate ?? derivedPublicationDate;

  const kmUrl = kmEntry.file.finalUrl.startsWith('http')
    ? kmEntry.file.finalUrl
    : kmEntry.url.startsWith('http')
      ? kmEntry.url
      : `${STATSWALES_API_BASE}/${KEY_MEASURES_DATASET_ID}`;

  const tcUrl = tcEntry.file.finalUrl.startsWith('http')
    ? tcEntry.file.finalUrl
    : tcEntry.url.startsWith('http')
      ? tcEntry.url
      : `${STATSWALES_API_BASE}/${THRESHOLD_COUNTS_DATASET_ID}`;

  const normaliseOpts: NormaliseWalesOptions = {
    reportingPeriod,
    publicationDate: finalPublicationDate,
    retrievedAt: kmEntry.file.fetchedAt,
    keyMeasuresUrl: kmUrl,
    thresholdCountsUrl: tcUrl,
    keyMeasuresSha256: kmEntry.file.sha256,
    thresholdCountsSha256: tcEntry.file.sha256,
    ...(options?.revised !== undefined ? { revised: options.revised } : {}),
    ...(options?.sourceRef !== undefined ? { sourceRef: options.sourceRef } : {}),
  };

  return normaliseWalesRelease({ keyMeasures, thresholdCounts }, normaliseOpts);
}

/**
 * Creates a Wales NationSource adapter.
 */
export function createWalesSource(options: WalesSourceOptions = {}): NationSource<'wales'> {
  return {
    nation: 'wales',

    async discover(state: PipelineState): Promise<readonly ReleaseCandidate[]> {
      return discoverWalesReleases(state, options.discoverOptions);
    },

    async fetch(candidate: ReleaseCandidate): Promise<RawFiles> {
      const kmFilterBody = buildKeyMeasuresFilterBody(candidate.reportingPeriod);
      const kmFilterId = await postStatsWalesFilter(
        KEY_MEASURES_DATASET_ID,
        kmFilterBody,
        options.fetchOptions,
      );
      const kmCached = await fetchStatsWalesCodedCsv(
        KEY_MEASURES_DATASET_ID,
        kmFilterId,
        options.fetchOptions,
      );

      const tcFilterBody = buildThresholdCountsFilterBody(candidate.reportingPeriod);
      const tcFilterId = await postStatsWalesFilter(
        THRESHOLD_COUNTS_DATASET_ID,
        tcFilterBody,
        options.fetchOptions,
      );
      const tcCached = await fetchStatsWalesCodedCsv(
        THRESHOLD_COUNTS_DATASET_ID,
        tcFilterId,
        options.fetchOptions,
      );

      const kmUrl = `${STATSWALES_API_BASE}/${KEY_MEASURES_DATASET_ID}`;
      const tcUrl = `${STATSWALES_API_BASE}/${THRESHOLD_COUNTS_DATASET_ID}`;

      let kmMetaCached: RawFile | undefined;
      try {
        kmMetaCached = await fetchToCache(kmUrl, options.fetchOptions);
      } catch {
        // Metadata is optional for offline / mocked test runs
      }

      return {
        [kmUrl]: kmCached,
        [tcUrl]: tcCached,
        ...(kmMetaCached ? { [`${kmUrl}/metadata`]: kmMetaCached } : {}),
      };
    },

    async normalise(raw: RawFiles): Promise<Release<'wales'>> {
      return normaliseWalesWithSources(raw, {
        ...(options.defaultPublicationDate !== undefined
          ? { publicationDate: options.defaultPublicationDate }
          : {}),
        ...(options.sourceRef !== undefined ? { sourceRef: options.sourceRef } : {}),
      });
    },
  };
}

/**
 * Default singleton Wales source adapter instance.
 */
export const walesSource: NationSource<'wales'> = createWalesSource();
