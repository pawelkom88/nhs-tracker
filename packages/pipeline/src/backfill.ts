import * as crypto from 'node:crypto';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import type { PublishingNation } from '@kyw/model/nation';
import { PUBLISHING_NATIONS } from '@kyw/model/nation';
import type { ReportingPeriod } from '@kyw/model/period';
import type { EnglandReferenceData, WalesReferenceData } from '@kyw/model/reference';
import type { Release } from '@kyw/model/release';
import {
  pipelineCacheDir,
  publishedPath,
  referencePath,
  releasePath,
  releasesDir,
  statePath,
} from './io/paths.js';
import { readJson, writeCanonicalJson } from './io/json.js';
import type { NationSource, PipelineState } from './source.js';
import { validateRelease, type ValidationReport } from './validate/gate.js';
import type { ValidationThresholds } from './validate/thresholds.js';
import { renderValidationReport } from './validate/report.js';
import { assemblePublished } from './assemble/published.js';
import {
  createEnglandFixtureSource,
  createWalesFixtureSource,
  createScotlandFixtureSource,
  buildReferenceForNation,
  type BuildReferenceOptions,
} from './run.js';
import { englandSource } from './england/source.js';
import { discoverEnglandReleases } from './england/discover.js';
import { walesSource } from './wales/source.js';
import { scotlandSource, resolveScotlandRawFiles } from './scotland/source.js';
import { parseScotlandPerformanceCsv, parseScotlandDistributionCsv } from './scotland/parse.js';
import { normaliseScotlandRelease } from './scotland/normalise.js';

export interface BackfillOptions {
  readonly nation?: PublishingNation | undefined;
  readonly months?: number | undefined;
  readonly fromFixtures?: boolean | undefined;
  readonly dryRun?: boolean | undefined;
  readonly customDataRoot?: string | undefined;
  readonly fixturesDir?: string | undefined;
  readonly cacheDir?: string | undefined;
  readonly thresholds?: Partial<ValidationThresholds> | undefined;
}

export interface BackfillNationResult {
  readonly status: 'backfilled' | 'no-change' | 'blocked' | 'error';
  readonly releasesCount: number;
  readonly earliestPeriod?: ReportingPeriod | undefined;
  readonly latestPeriod?: ReportingPeriod | undefined;
  readonly error?: string | undefined;
  readonly reportMarkdown?: string | undefined;
}

export type BackfillReport = Record<PublishingNation, BackfillNationResult>;

async function loadNationState(
  nation: PublishingNation,
  customDataRoot?: string,
): Promise<PipelineState> {
  const p = statePath(nation, customDataRoot);
  try {
    return await readJson<PipelineState>(p);
  } catch {
    return {
      lastCheck: '',
      seenFiles: {},
    };
  }
}

async function loadAllReleases<N extends 'england' | 'wales' | 'scotland'>(
  nation: N,
  customDataRoot?: string,
): Promise<Release<N>[]> {
  const dir = releasesDir(nation, customDataRoot);
  try {
    const entries = await fs.readdir(dir);
    const jsonFiles = entries.filter((f) => f.endsWith('.json')).sort();
    const releases: Release<N>[] = [];
    for (const f of jsonFiles) {
      const rel = await readJson<Release<N>>(path.join(dir, f));
      releases.push(rel);
    }
    return releases.sort((a, b) => a.reportingPeriod.localeCompare(b.reportingPeriod));
  } catch {
    return [];
  }
}

/**
 * Backfills England history by discovering releases across financial year pages
 * and ingesting oldest-to-newest through the validation gate.
 */
export async function backfillEngland(
  options: BackfillOptions = {},
): Promise<BackfillNationResult> {
  const {
    fromFixtures = false,
    dryRun = false,
    customDataRoot,
    fixturesDir,
    months = 13,
  } = options;

  let currentState = await loadNationState('england', customDataRoot);
  const source: NationSource<'england'> = fromFixtures
    ? createEnglandFixtureSource(fixturesDir)
    : {
        ...englandSource,
        discover: async () => {
          // Discover across multiple financial years to guarantee requested history
          const yearsBack = Math.ceil(months / 12) + 1;
          return discoverEnglandReleases({ yearsBack });
        },
      };

  const allCandidates = await source.discover(currentState);
  if (allCandidates.length === 0) {
    return { status: 'no-change', releasesCount: 0 };
  }

  // Slices the most recent `months` candidates, ordered chronologically (oldest first)
  const sorted = [...allCandidates].sort((a, b) =>
    a.reportingPeriod.localeCompare(b.reportingPeriod),
  );
  const candidatesToIngest = sorted.slice(-months);

  let processedCount = 0;
  let earliestPeriod: ReportingPeriod | undefined;
  let latestPeriod: ReportingPeriod | undefined;

  for (const candidate of candidatesToIngest) {
    const rawFiles = await source.fetch(candidate);
    const candidateRelease = await source.normalise(rawFiles, {} as EnglandReferenceData);

    const refOptions: BuildReferenceOptions = {
      ...(customDataRoot !== undefined ? { customDataRoot } : {}),
      fromFixtures,
      ...(fixturesDir !== undefined ? { fixturesDir } : {}),
      rawFiles,
    };
    const reference = await buildReferenceForNation('england', refOptions);

    const existingReleases = await loadAllReleases('england', customDataRoot);
    const priorReleases = existingReleases.filter(
      (r) => r.reportingPeriod < candidate.reportingPeriod,
    );
    const previousRelease: Release<'england'> | null =
      priorReleases.length > 0 ? (priorReleases[priorReleases.length - 1] ?? null) : null;

    const validationThresholds =
      options.thresholds ??
      (fromFixtures ? { figureCountMinRatio: 0.7, englandUnitCountMinRatio: 0.8 } : undefined);
    const validationReport: ValidationReport = validateRelease(
      candidateRelease,
      previousRelease,
      reference,
      {
        ...(validationThresholds !== undefined ? { thresholds: validationThresholds } : {}),
      },
    );

    if (!validationReport.ok) {
      const reportMarkdown = renderValidationReport(validationReport);
      return {
        status: 'blocked',
        releasesCount: processedCount,
        ...(earliestPeriod !== undefined ? { earliestPeriod } : {}),
        ...(latestPeriod !== undefined ? { latestPeriod } : {}),
        reportMarkdown,
      };
    }

    if (!dryRun) {
      const releaseTarget = releasePath('england', candidate.reportingPeriod, customDataRoot);
      await writeCanonicalJson(releaseTarget, candidateRelease);

      const referenceTarget = referencePath('england', customDataRoot);
      await writeCanonicalJson(referenceTarget, reference);

      const updatedHistory: Release<'england'>[] = [
        ...existingReleases.filter((r) => r.reportingPeriod !== candidate.reportingPeriod),
        candidateRelease,
      ].sort((a, b) => a.reportingPeriod.localeCompare(b.reportingPeriod));

      const latest = updatedHistory[updatedHistory.length - 1];
      if (!latest) throw new Error('Failed to find latest England release');

      const published = assemblePublished(latest, updatedHistory, reference);
      await writeCanonicalJson(publishedPath('england', customDataRoot), published);

      const newSeenFiles = { ...currentState.seenFiles };
      for (const [url, file] of Object.entries(rawFiles)) {
        newSeenFiles[url] = { sha256: file.sha256, fetchedAt: file.fetchedAt };
      }
      for (const url of candidate.sourceUrls) {
        newSeenFiles[url] ??= {
          sha256: rawFiles[url]?.sha256 ?? '',
          fetchedAt: new Date().toISOString(),
        };
      }
      if (candidate.fingerprint) {
        newSeenFiles[candidate.fingerprint] = {
          sha256: crypto.createHash('sha256').update(candidate.fingerprint).digest('hex'),
          fetchedAt: new Date().toISOString(),
        };
      }

      currentState = {
        lastCheck: new Date().toISOString(),
        seenFiles: newSeenFiles,
      };
      await writeCanonicalJson(statePath('england', customDataRoot), currentState);
    }

    processedCount++;
    earliestPeriod ??= candidate.reportingPeriod;
    latestPeriod = candidate.reportingPeriod;
  }

  return {
    status: 'backfilled',
    releasesCount: processedCount,
    earliestPeriod,
    latestPeriod,
  };
}

/**
 * Backfills Wales history using StatsWales API.
 */
export async function backfillWales(options: BackfillOptions = {}): Promise<BackfillNationResult> {
  const { fromFixtures = false, dryRun = false, customDataRoot, fixturesDir } = options;

  let currentState = await loadNationState('wales', customDataRoot);
  const source: NationSource<'wales'> = fromFixtures
    ? createWalesFixtureSource(fixturesDir)
    : walesSource;

  const candidates = await source.discover(currentState);
  if (candidates.length === 0) {
    return { status: 'no-change', releasesCount: 0 };
  }

  let processedCount = 0;
  let earliestPeriod: ReportingPeriod | undefined;
  let latestPeriod: ReportingPeriod | undefined;

  for (const candidate of candidates) {
    const rawFiles = await source.fetch(candidate);
    const candidateRelease = await source.normalise(rawFiles, {} as WalesReferenceData);

    const refOptions: BuildReferenceOptions = {
      ...(customDataRoot !== undefined ? { customDataRoot } : {}),
      fromFixtures,
      ...(fixturesDir !== undefined ? { fixturesDir } : {}),
      rawFiles,
    };
    const reference = await buildReferenceForNation('wales', refOptions);

    const existingReleases = await loadAllReleases('wales', customDataRoot);
    const priorReleases = existingReleases.filter(
      (r) => r.reportingPeriod < candidate.reportingPeriod,
    );
    const previousRelease: Release<'wales'> | null =
      priorReleases.length > 0 ? (priorReleases[priorReleases.length - 1] ?? null) : null;

    const validationThresholds =
      options.thresholds ?? (fromFixtures ? { figureCountMinRatio: 0.7 } : undefined);
    const validationReport: ValidationReport = validateRelease(
      candidateRelease,
      previousRelease,
      reference,
      {
        ...(validationThresholds !== undefined ? { thresholds: validationThresholds } : {}),
      },
    );

    if (!validationReport.ok) {
      const reportMarkdown = renderValidationReport(validationReport);
      return {
        status: 'blocked',
        releasesCount: processedCount,
        ...(earliestPeriod !== undefined ? { earliestPeriod } : {}),
        ...(latestPeriod !== undefined ? { latestPeriod } : {}),
        reportMarkdown,
      };
    }

    if (!dryRun) {
      const releaseTarget = releasePath('wales', candidate.reportingPeriod, customDataRoot);
      await writeCanonicalJson(releaseTarget, candidateRelease);

      const referenceTarget = referencePath('wales', customDataRoot);
      await writeCanonicalJson(referenceTarget, reference);

      const updatedHistory: Release<'wales'>[] = [
        ...existingReleases.filter((r) => r.reportingPeriod !== candidate.reportingPeriod),
        candidateRelease,
      ].sort((a, b) => a.reportingPeriod.localeCompare(b.reportingPeriod));

      const latest = updatedHistory[updatedHistory.length - 1];
      if (!latest) throw new Error('Failed to find latest Wales release');

      const published = assemblePublished(latest, updatedHistory, reference);
      await writeCanonicalJson(publishedPath('wales', customDataRoot), published);

      const newSeenFiles = { ...currentState.seenFiles };
      for (const [url, file] of Object.entries(rawFiles)) {
        newSeenFiles[url] = { sha256: file.sha256, fetchedAt: file.fetchedAt };
      }
      for (const url of candidate.sourceUrls) {
        newSeenFiles[url] ??= {
          sha256: rawFiles[url]?.sha256 ?? '',
          fetchedAt: new Date().toISOString(),
        };
      }
      if (candidate.fingerprint) {
        newSeenFiles[candidate.fingerprint] = {
          sha256: crypto.createHash('sha256').update(candidate.fingerprint).digest('hex'),
          fetchedAt: new Date().toISOString(),
        };
      }

      currentState = {
        lastCheck: new Date().toISOString(),
        seenFiles: newSeenFiles,
      };
      await writeCanonicalJson(statePath('wales', customDataRoot), currentState);
    }

    processedCount++;
    earliestPeriod ??= candidate.reportingPeriod;
    latestPeriod = candidate.reportingPeriod;
  }

  return {
    status: 'backfilled',
    releasesCount: processedCount,
    earliestPeriod,
    latestPeriod,
  };
}

/**
 * Backfills Scotland history by extracting all available months in the 25-month rolling file.
 */
export async function backfillScotland(
  options: BackfillOptions = {},
): Promise<BackfillNationResult> {
  const {
    fromFixtures = false,
    dryRun = false,
    customDataRoot,
    fixturesDir,
    months = 25,
  } = options;

  let currentState = await loadNationState('scotland', customDataRoot);
  const source: NationSource<'scotland'> = fromFixtures
    ? createScotlandFixtureSource(fixturesDir)
    : scotlandSource;

  const candidates = await source.discover(currentState);
  if (candidates.length === 0) {
    return { status: 'no-change', releasesCount: 0 };
  }

  // Fetch the rolling monthly data
  const candidate = candidates[0];
  if (!candidate) throw new Error('No Scotland release candidate discovered');

  const rawFiles = await source.fetch(candidate);
  const { performance: perfEntry, distribution: distEntry } = resolveScotlandRawFiles(rawFiles);

  const [perfContent, distContent] = await Promise.all([
    fs.readFile(perfEntry.file.path, 'utf-8'),
    fs.readFile(distEntry.file.path, 'utf-8'),
  ]);

  const perfRows = parseScotlandPerformanceCsv(perfContent);
  const distRows = parseScotlandDistributionCsv(distContent);

  // Collect distinct reporting periods
  const periodSet = new Set<ReportingPeriod>();
  for (const r of perfRows) {
    periodSet.add(r.reportingPeriod);
  }

  const sortedPeriods = Array.from(periodSet).sort();
  const periodsToIngest = sortedPeriods.slice(-months);

  const refOptions: BuildReferenceOptions = {
    ...(customDataRoot !== undefined ? { customDataRoot } : {}),
    fromFixtures,
    ...(fixturesDir !== undefined ? { fixturesDir } : {}),
    rawFiles,
  };
  const reference = await buildReferenceForNation('scotland', refOptions);

  let processedCount = 0;
  let earliestPeriod: ReportingPeriod | undefined;
  let latestPeriod: ReportingPeriod | undefined;

  const scotCandidate = candidate as Partial<{ readonly publicationDate: string }>;
  const pubDate = scotCandidate.publicationDate
    ? (scotCandidate.publicationDate as ReturnType<
        typeof normaliseScotlandRelease
      >['publicationDate'])
    : undefined;

  for (const period of periodsToIngest) {
    const candidateRelease = normaliseScotlandRelease(
      { performance: perfRows, distribution: distRows },
      {
        reportingPeriod: period,
        ...(pubDate !== undefined ? { publicationDate: pubDate } : {}),
        performanceUrl: perfEntry.file.finalUrl || perfEntry.url,
        distributionUrl: distEntry.file.finalUrl || distEntry.url,
        performanceSha256: perfEntry.file.sha256,
        distributionSha256: distEntry.file.sha256,
        retrievedAt: perfEntry.file.fetchedAt,
      },
    );

    const existingReleases = await loadAllReleases('scotland', customDataRoot);
    const priorReleases = existingReleases.filter((r) => r.reportingPeriod < period);
    const previousRelease: Release<'scotland'> | null =
      priorReleases.length > 0 ? (priorReleases[priorReleases.length - 1] ?? null) : null;

    const validationThresholds =
      options.thresholds ?? (fromFixtures ? { figureCountMinRatio: 0.7 } : undefined);
    const validationReport: ValidationReport = validateRelease(
      candidateRelease,
      previousRelease,
      reference,
      {
        ...(validationThresholds !== undefined ? { thresholds: validationThresholds } : {}),
      },
    );

    if (!validationReport.ok) {
      const reportMarkdown = renderValidationReport(validationReport);
      return {
        status: 'blocked',
        releasesCount: processedCount,
        ...(earliestPeriod !== undefined ? { earliestPeriod } : {}),
        ...(latestPeriod !== undefined ? { latestPeriod } : {}),
        reportMarkdown,
      };
    }

    if (!dryRun) {
      const releaseTarget = releasePath('scotland', period, customDataRoot);
      await writeCanonicalJson(releaseTarget, candidateRelease);

      const referenceTarget = referencePath('scotland', customDataRoot);
      await writeCanonicalJson(referenceTarget, reference);

      const updatedHistory: Release<'scotland'>[] = [
        ...existingReleases.filter((r) => r.reportingPeriod !== period),
        candidateRelease,
      ].sort((a, b) => a.reportingPeriod.localeCompare(b.reportingPeriod));

      const latest = updatedHistory[updatedHistory.length - 1];
      if (!latest) throw new Error('Failed to find latest Scotland release');

      const published = assemblePublished(latest, updatedHistory, reference);
      await writeCanonicalJson(publishedPath('scotland', customDataRoot), published);
    }

    processedCount++;
    earliestPeriod ??= period;
    latestPeriod = period;
  }

  if (!dryRun && processedCount > 0) {
    const newSeenFiles = { ...currentState.seenFiles };
    for (const [url, file] of Object.entries(rawFiles)) {
      newSeenFiles[url] = { sha256: file.sha256, fetchedAt: file.fetchedAt };
    }
    for (const url of candidate.sourceUrls) {
      newSeenFiles[url] ??= {
        sha256: rawFiles[url]?.sha256 ?? '',
        fetchedAt: new Date().toISOString(),
      };
    }
    if (candidate.fingerprint) {
      newSeenFiles[candidate.fingerprint] = {
        sha256: crypto.createHash('sha256').update(candidate.fingerprint).digest('hex'),
        fetchedAt: new Date().toISOString(),
      };
    }

    currentState = {
      lastCheck: new Date().toISOString(),
      seenFiles: newSeenFiles,
    };
    await writeCanonicalJson(statePath('scotland', customDataRoot), currentState);
  }

  return {
    status: 'backfilled',
    releasesCount: processedCount,
    earliestPeriod,
    latestPeriod,
  };
}

/**
 * Runs historical backfill across all or specified publishing nations.
 */
export async function runBackfill(options: BackfillOptions = {}): Promise<BackfillReport> {
  const nations: readonly PublishingNation[] = options.nation
    ? [options.nation]
    : PUBLISHING_NATIONS;

  const report: Partial<BackfillReport> = {};

  for (const nation of nations) {
    if (nation === 'england') {
      report.england = await backfillEngland(options);
    } else if (nation === 'wales') {
      report.wales = await backfillWales(options);
    } else {
      report.scotland = await backfillScotland(options);
    }
  }

  const completeReport: BackfillReport = {
    england: report.england ?? { status: 'no-change', releasesCount: 0 },
    wales: report.wales ?? { status: 'no-change', releasesCount: 0 },
    scotland: report.scotland ?? { status: 'no-change', releasesCount: 0 },
  };

  const cacheDir = options.cacheDir ?? pipelineCacheDir(options.customDataRoot);
  const targetFile = path.join(cacheDir, 'run-report.json');
  await writeCanonicalJson(targetFile, completeReport);

  return completeReport;
}
