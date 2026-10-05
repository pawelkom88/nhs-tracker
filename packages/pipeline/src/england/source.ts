import type { Release } from '@kyw/model/release';
import type { ReportingPeriod } from '@kyw/model/period';
import type { NationSource, ReleaseCandidate, RawFiles, PipelineState } from '../source.js';
import { fetchToCache, type FetchToCacheOptions } from '../http/fetch.js';
import { discoverEnglandReleases, type DiscoverEnglandOptions } from './discover.js';
import { parseEnglandXlsx, extractPeriodFromFilename, type ParsedEnglandXlsx } from './parse.js';
import { normaliseEnglandRelease } from './normalise.js';
import type { EnglandRttProviderInput } from '../reference/england/units.js';

export function extractPeriodFromUrl(url: string): ReportingPeriod | null {
  return extractPeriodFromFilename(url);
}

function getMonthDistance(fromPeriod: ReportingPeriod, toPeriod: ReportingPeriod): number {
  const [fromY, fromM] = fromPeriod.split('-').map(Number);
  const [toY, toM] = toPeriod.split('-').map(Number);
  if (fromY === undefined || fromM === undefined || toY === undefined || toM === undefined) {
    return 0;
  }
  return (toY - fromY) * 12 + (toM - fromM);
}

/**
 * Filters discovered England release candidates against the persistent pipeline state.
 *
 * Discovers:
 * 1. Candidates whose reporting period is newer than the latest committed release in state.
 * 2. Candidates whose URL differs from the stored URL for an already-committed period (revision within last 13 months).
 */
export function filterEnglandCandidates(
  candidates: readonly ReleaseCandidate[],
  state: PipelineState,
): readonly ReleaseCandidate[] {
  const seenUrls = new Set(Object.keys(state.seenFiles));
  if (seenUrls.size === 0) {
    return [...candidates].sort((a, b) => a.reportingPeriod.localeCompare(b.reportingPeriod));
  }

  // Identify all known periods and the latest period from state
  const seenPeriods = new Set<ReportingPeriod>();
  let latestSeenPeriod: ReportingPeriod | null = null;

  for (const url of seenUrls) {
    const period = extractPeriodFromUrl(url);
    if (period) {
      seenPeriods.add(period);
      if (!latestSeenPeriod || period > latestSeenPeriod) {
        latestSeenPeriod = period;
      }
    }
  }

  const results: ReleaseCandidate[] = [];

  for (const candidate of candidates) {
    const candidateUrl = candidate.sourceUrls[0];
    if (!candidateUrl) continue;

    // If this exact URL has already been processed and cached, skip
    if (seenUrls.has(candidateUrl)) {
      continue;
    }

    if (!latestSeenPeriod) {
      results.push(candidate);
      continue;
    }

    if (candidate.reportingPeriod > latestSeenPeriod) {
      // Newer period than any seen before
      results.push(candidate);
    } else {
      // Revision or unseen release within the 13-month window
      const monthDist = getMonthDistance(candidate.reportingPeriod, latestSeenPeriod);
      if (monthDist <= 13) {
        results.push(candidate);
      }
    }
  }

  return results.sort((a, b) => a.reportingPeriod.localeCompare(b.reportingPeriod));
}

/**
 * Extracts unique provider descriptors from parsed England rows for reference data building.
 *
 * @see docs/plan/phase-04-pipeline-england.md § T-4.5
 * @see docs/plan/phase-03-reference-data.md § T-3.9
 */
export function extractEnglandRttProviders(parsed: ParsedEnglandXlsx): EnglandRttProviderInput[] {
  const map = new Map<string, EnglandRttProviderInput>();

  for (const row of parsed.rows) {
    if (!map.has(row.providerCode)) {
      map.set(row.providerCode, {
        code: row.providerCode,
        rttName: row.providerName,
        kind: row.sheet === 'Provider' ? 'nhs-trust' : 'independent-sector-provider',
        regionCode: row.regionCode,
      });
    }
  }

  return Array.from(map.values()).sort((a, b) => a.code.localeCompare(b.code));
}

export interface EnglandSourceOptions {
  readonly discoverOptions?: DiscoverEnglandOptions;
  readonly fetchOptions?: FetchToCacheOptions;
}

/**
 * Creates an England NationSource adapter.
 */
export function createEnglandSource(options: EnglandSourceOptions = {}): NationSource<'england'> {
  return {
    nation: 'england',

    async discover(state: PipelineState): Promise<readonly ReleaseCandidate[]> {
      const candidates = await discoverEnglandReleases(options.discoverOptions);
      return filterEnglandCandidates(candidates, state);
    },

    async fetch(candidate: ReleaseCandidate): Promise<RawFiles> {
      const url = candidate.sourceUrls[0];
      if (!url) {
        throw new Error('Release candidate has no source URLs');
      }
      const cached = await fetchToCache(url, options.fetchOptions);
      return { [url]: cached };
    },

    async normalise(raw: RawFiles): Promise<Release<'england'>> {
      const { release } = await normaliseEnglandWithProviders(raw);
      return release;
    },
  };
}

export interface EnglandNormaliseResult {
  readonly release: Release<'england'>;
  readonly providers: readonly EnglandRttProviderInput[];
}

/**
 * Normalises raw England files into a validated Release<'england'> and extracts the provider list
 * needed to build England reference data.
 *
 * @see docs/plan/phase-04-pipeline-england.md § T-4.5
 */
export async function normaliseEnglandWithProviders(
  raw: RawFiles,
): Promise<EnglandNormaliseResult> {
  const entries = Object.entries(raw);
  const firstEntry = entries[0];
  if (!firstEntry) {
    throw new Error('Cannot normalise empty RawFiles');
  }

  const [sourceUrl, rawFile] = firstEntry;
  const expectedPeriod = extractPeriodFromUrl(rawFile.finalUrl || sourceUrl);
  const parsed = await parseEnglandXlsx(rawFile.path, expectedPeriod ? { expectedPeriod } : {});

  const release = normaliseEnglandRelease(parsed, {
    sourceUrl: rawFile.finalUrl || sourceUrl,
    sourceSha256: rawFile.sha256,
    retrievedAt: rawFile.fetchedAt,
  });

  const providers = extractEnglandRttProviders(parsed);

  return { release, providers };
}

/**
 * Default singleton England source adapter instance.
 */
export const englandSource: NationSource<'england'> = createEnglandSource();
