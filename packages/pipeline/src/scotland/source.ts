import * as fs from 'node:fs/promises';
import type { Release } from '@kyw/model/release';
import { publicationDate, type PublicationDate } from '@kyw/model/period';
import type { SourceRef } from '@kyw/model/source';
import type {
  NationSource,
  ReleaseCandidate,
  RawFiles,
  RawFile,
  PipelineState,
} from '../source.js';
import { fetchToCache, type FetchToCacheOptions } from '../http/fetch.js';
import {
  discoverScotlandReleases,
  STAGE_OF_TREATMENT_PERFORMANCE_RESOURCE_ID,
  STAGE_OF_TREATMENT_DISTRIBUTION_RESOURCE_ID,
  SCOTLAND_CKAN_PACKAGE_SHOW_URL,
  type DiscoverScotlandOptions,
} from './discover.js';
import { parseScotlandPerformanceCsv, parseScotlandDistributionCsv } from './parse.js';
import { normaliseScotlandRelease, type NormaliseScotlandOptions } from './normalise.js';

export interface ScotlandSourceOptions {
  readonly discoverOptions?: DiscoverScotlandOptions;
  readonly fetchOptions?: FetchToCacheOptions;
  readonly defaultPublicationDate?: PublicationDate;
  readonly sourceRef?: SourceRef<'scotland'>;
}

export interface ScotlandResolvedRawFiles {
  readonly performance: { readonly url: string; readonly file: RawFile };
  readonly distribution: { readonly url: string; readonly file: RawFile };
  readonly packageShowMetadata?: { readonly url: string; readonly file: RawFile };
}

/**
 * Resolves Ongoing Performance and Distribution raw files from a RawFiles dictionary.
 */
export function resolveScotlandRawFiles(raw: RawFiles): ScotlandResolvedRawFiles {
  const entries = Object.entries(raw);
  if (entries.length === 0) {
    throw new Error('Cannot resolve empty Scotland RawFiles');
  }

  let performance: { url: string; file: RawFile } | undefined;
  let distribution: { url: string; file: RawFile } | undefined;
  let packageShowMetadata: { url: string; file: RawFile } | undefined;

  for (const [url, file] of entries) {
    const identifier = `${url}|${file.finalUrl}|${file.path}`;
    const isJson = file.path.endsWith('.json') || url.includes('package_show');

    if (isJson) {
      if (identifier.includes('package_show') || identifier.includes('stage-of-treatment')) {
        packageShowMetadata = { url, file };
      }
    } else {
      if (
        identifier.includes(STAGE_OF_TREATMENT_PERFORMANCE_RESOURCE_ID) ||
        identifier.includes('ac63b747') ||
        identifier.includes('sot_performance')
      ) {
        performance = { url, file };
      } else if (
        identifier.includes(STAGE_OF_TREATMENT_DISTRIBUTION_RESOURCE_ID) ||
        identifier.includes('f9232c17') ||
        identifier.includes('sot_distribution')
      ) {
        distribution = { url, file };
      }
    }
  }

  if (!performance || !distribution) {
    throw new Error(
      `Scotland normalisation requires both Ongoing Performance (${STAGE_OF_TREATMENT_PERFORMANCE_RESOURCE_ID}) and Distribution (${STAGE_OF_TREATMENT_DISTRIBUTION_RESOURCE_ID}) raw files`,
    );
  }

  return {
    performance,
    distribution,
    ...(packageShowMetadata !== undefined ? { packageShowMetadata } : {}),
  };
}

/**
 * Normalises raw Scotland files into a validated Release<'scotland'>.
 */
export async function normaliseScotlandWithSources(
  raw: RawFiles,
  options?: Partial<NormaliseScotlandOptions>,
): Promise<Release<'scotland'>> {
  const {
    performance: perfEntry,
    distribution: distEntry,
    packageShowMetadata: metaEntry,
  } = resolveScotlandRawFiles(raw);

  const [perfContent, distContent] = await Promise.all([
    fs.readFile(perfEntry.file.path, 'utf-8'),
    fs.readFile(distEntry.file.path, 'utf-8'),
  ]);

  const performance = parseScotlandPerformanceCsv(perfContent);
  const distribution = parseScotlandDistributionCsv(distContent);

  let officialPublicationDate: PublicationDate | undefined;
  if (metaEntry) {
    try {
      const metaContent = await fs.readFile(metaEntry.file.path, 'utf-8');
      const metaJson = JSON.parse(metaContent) as {
        result?: { resources?: readonly { id?: string; last_modified?: string }[] };
      };
      const perfResource = metaJson.result?.resources?.find(
        (r) => r.id === STAGE_OF_TREATMENT_PERFORMANCE_RESOURCE_ID,
      );
      if (perfResource?.last_modified) {
        officialPublicationDate = publicationDate(perfResource.last_modified.slice(0, 10));
      }
    } catch {
      // Ignore unparseable metadata
    }
  }

  const pubDateFallback = (perfEntry.file.fetchedAt || new Date().toISOString()).slice(0, 10);
  const derivedPublicationDate: PublicationDate =
    officialPublicationDate ?? publicationDate(pubDateFallback);
  const finalPublicationDate = options?.publicationDate ?? derivedPublicationDate;

  const normaliseOpts: NormaliseScotlandOptions = {
    publicationDate: finalPublicationDate,
    retrievedAt: perfEntry.file.fetchedAt,
    performanceUrl: perfEntry.file.finalUrl || perfEntry.url,
    distributionUrl: distEntry.file.finalUrl || distEntry.url,
    performanceSha256: perfEntry.file.sha256,
    distributionSha256: distEntry.file.sha256,
    ...(options?.revised !== undefined ? { revised: options.revised } : {}),
    ...(options?.sourceRef !== undefined ? { sourceRef: options.sourceRef } : {}),
  };

  return normaliseScotlandRelease({ performance, distribution }, normaliseOpts);
}

/**
 * Creates a Scotland NationSource adapter.
 */
export function createScotlandSource(
  options: ScotlandSourceOptions = {},
): NationSource<'scotland'> {
  return {
    nation: 'scotland',

    async discover(state: PipelineState): Promise<readonly ReleaseCandidate[]> {
      return discoverScotlandReleases(state, options.discoverOptions);
    },

    async fetch(candidate: ReleaseCandidate): Promise<RawFiles> {
      let metaCached: RawFile | undefined;
      try {
        metaCached = await fetchToCache(SCOTLAND_CKAN_PACKAGE_SHOW_URL, options.fetchOptions);
      } catch {
        // Metadata is optional for offline / mocked test runs
      }

      const results = await Promise.all(
        candidate.sourceUrls.map(async (url) => {
          const cached = await fetchToCache(url, options.fetchOptions);
          return [url, cached] as const;
        }),
      );

      const rawFiles: Record<string, RawFile> = {};
      for (const [url, file] of results) {
        rawFiles[url] = file;
      }
      if (metaCached) {
        rawFiles[SCOTLAND_CKAN_PACKAGE_SHOW_URL] = metaCached;
      }
      return rawFiles;
    },

    async normalise(raw: RawFiles): Promise<Release<'scotland'>> {
      return normaliseScotlandWithSources(raw, {
        ...(options.defaultPublicationDate !== undefined
          ? { publicationDate: options.defaultPublicationDate }
          : {}),
        ...(options.sourceRef !== undefined ? { sourceRef: options.sourceRef } : {}),
      });
    },
  };
}

/**
 * Default singleton Scotland source adapter instance.
 */
export const scotlandSource: NationSource<'scotland'> = createScotlandSource();
