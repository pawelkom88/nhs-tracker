import * as crypto from 'node:crypto';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { PublishingNation } from '@kyw/model/nation';
import { PUBLISHING_NATIONS } from '@kyw/model/nation';
import type { ReportingPeriod } from '@kyw/model/period';
import type {
  EnglandReferenceData,
  ReferenceData,
  ScotlandReferenceData,
  WalesReferenceData,
} from '@kyw/model/reference';
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
import type { NationSource, PipelineState, ReleaseCandidate, RawFiles } from './source.js';
import { validateRelease, type ValidationReport } from './validate/gate.js';
import type { ValidationThresholds } from './validate/thresholds.js';
import { renderValidationReport } from './validate/report.js';
import { assemblePublished } from './assemble/published.js';
import {
  createEnglandSource,
  englandSource,
  normaliseEnglandWithProviders,
} from './england/source.js';
import { buildEnglandReferenceData, loadEnglandReferenceOds } from './reference/england/build.js';
import { createWalesSource, walesSource } from './wales/source.js';
import { buildWalesReferenceData, writeWalesReferenceData } from './reference/wales/build.js';
import { createScotlandSource, scotlandSource } from './scotland/source.js';
import { buildScotlandReferenceData } from './reference/scotland/build.js';
import {
  KEY_MEASURES_DATASET_ID,
  THRESHOLD_COUNTS_DATASET_ID,
  type StatsWalesDatasetMetadata,
} from './wales/api.js';
import type { CkanPackageShowResponse } from './scotland/discover.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_FIXTURES_DIR = path.resolve(__dirname, '../fixtures');

export type NationRunStatus = 'no-change' | 'published' | 'blocked' | 'error';

export interface NationRunResult {
  readonly status: NationRunStatus;
  readonly reportingPeriod?: ReportingPeriod | undefined;
  readonly reportMarkdown?: string | undefined;
  readonly error?: string | undefined;
}

export type PipelineRunReport = Record<PublishingNation, NationRunResult>;

export interface PipelineRunOptions {
  readonly nation?: PublishingNation | undefined;
  readonly dryRun?: boolean | undefined;
  readonly fromFixtures?: boolean | undefined;
  readonly customDataRoot?: string | undefined;
  readonly fixturesDir?: string | undefined;
  readonly today?: string | undefined;
  readonly cacheDir?: string | undefined;
  readonly thresholds?: Partial<ValidationThresholds> | undefined;
}

export interface BuildReferenceOptions {
  readonly customDataRoot?: string | undefined;
  readonly fromFixtures?: boolean | undefined;
  readonly fixturesDir?: string | undefined;
  readonly rawFiles?: RawFiles | undefined;
}

/**
 * Creates a fixture-backed NationSource for England.
 */
export function createEnglandFixtureSource(
  fixturesDir: string = DEFAULT_FIXTURES_DIR,
): NationSource<'england'> {
  const englandFixtures = path.join(fixturesDir, 'england');
  const html2526 = path.join(englandFixtures, 'rtt-data-2025-26.html');
  const html2627 = path.join(englandFixtures, 'rtt-data-2026-27.html');

  const baseSource = createEnglandSource({
    discoverOptions: {
      currentDate: new Date('2026-09-15T12:00:00Z'),
      fetchHtml: async (url: string) => {
        if (url.includes('2025-26')) {
          return fs.readFile(html2526, 'utf-8');
        }
        return fs.readFile(html2627, 'utf-8');
      },
    },
    fetchOptions: {
      fetchImpl: async (input) => {
        const url =
          typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
        let fixtureFile: string;
        if (url.includes('Jul25')) {
          fixtureFile = path.join(englandFixtures, 'Incomplete-Provider-Jul25.xlsx');
        } else if (url.includes('Mar26')) {
          fixtureFile = path.join(englandFixtures, 'Incomplete-Provider-Mar26-revised.xlsx');
        } else if (url.includes('Jul26')) {
          fixtureFile = path.join(englandFixtures, 'Incomplete-Provider-Jul26.xlsx');
        } else {
          return new Response('Not found', { status: 404 });
        }
        const buffer = await fs.readFile(fixtureFile);
        return new Response(buffer, { status: 200 });
      },
    },
  });

  return {
    ...baseSource,
    async discover(state: PipelineState): Promise<readonly ReleaseCandidate[]> {
      const candidates = await baseSource.discover(state);
      return candidates.filter((c) =>
        c.sourceUrls.some(
          (url) => url.includes('Jul25') || url.includes('Mar26') || url.includes('Jul26'),
        ),
      );
    },
  };
}

/**
 * Creates a fixture-backed NationSource for Wales.
 */
export function createWalesFixtureSource(
  fixturesDir: string = DEFAULT_FIXTURES_DIR,
): NationSource<'wales'> {
  const walesFixtures = path.join(fixturesDir, 'wales');
  const kmMetaPath = path.join(walesFixtures, 'acd9529c-metadata.json');
  const tcMetaPath = path.join(walesFixtures, '3ef3a1d8-metadata.json');
  const kmCsvPath = path.join(walesFixtures, 'acd9529c-data.csv');
  const tcCsvPath = path.join(walesFixtures, '3ef3a1d8-data.csv');

  return createWalesSource({
    discoverOptions: {
      metadataFetcher: async (datasetId: string) => {
        const filePath = datasetId.includes('3ef3a1d8') ? tcMetaPath : kmMetaPath;
        const text = await fs.readFile(filePath, 'utf-8');
        return JSON.parse(text) as StatsWalesDatasetMetadata;
      },
    },
    fetchOptions: {
      fetchImpl: async (input, init) => {
        const url =
          typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
        if (url.includes('/data') && init?.method === 'POST') {
          const filterId = url.includes(KEY_MEASURES_DATASET_ID)
            ? 'km-filter-123'
            : 'tc-filter-456';
          return new Response(JSON.stringify({ filterId }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          });
        }
        if (url.includes('km-filter-123')) {
          const content = await fs.readFile(kmCsvPath);
          return new Response(content, { status: 200, headers: { 'content-type': 'text/csv' } });
        }
        if (url.includes('tc-filter-456')) {
          const content = await fs.readFile(tcCsvPath);
          return new Response(content, { status: 200, headers: { 'content-type': 'text/csv' } });
        }
        if (url.includes(KEY_MEASURES_DATASET_ID)) {
          const content = await fs.readFile(kmMetaPath);
          return new Response(content, {
            status: 200,
            headers: { 'content-type': 'application/json' },
          });
        }
        if (url.includes(THRESHOLD_COUNTS_DATASET_ID)) {
          const content = await fs.readFile(tcMetaPath);
          return new Response(content, {
            status: 200,
            headers: { 'content-type': 'application/json' },
          });
        }
        return new Response('Not found', { status: 404 });
      },
    },
  });
}

/**
 * Creates a fixture-backed NationSource for Scotland.
 */
export function createScotlandFixtureSource(
  fixturesDir: string = DEFAULT_FIXTURES_DIR,
): NationSource<'scotland'> {
  const sotDir = path.join(fixturesDir, 'scotland', 'stage-of-treatment');
  const packageShowPath = path.join(sotDir, 'package_show.json');
  const perfCsvPath = path.join(sotDir, 'ac63b747-data.csv');
  const distCsvPath = path.join(sotDir, 'f9232c17-data.csv');

  return createScotlandSource({
    discoverOptions: {
      packageShowUrl: 'mock://scotland/package_show',
      fetchJson: async () => {
        const text = await fs.readFile(packageShowPath, 'utf-8');
        return JSON.parse(text) as CkanPackageShowResponse;
      },
    },
    fetchOptions: {
      fetchImpl: async (input) => {
        const url =
          typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
        if (url.includes('package_show') || url.includes('opendata.nhs.scot/api/3/action')) {
          const content = await fs.readFile(packageShowPath);
          return new Response(content, {
            status: 200,
            headers: { 'content-type': 'application/json' },
          });
        }
        const isDist = url.includes('f9232c17') || url.includes('distribution');
        const csvPath = isDist ? distCsvPath : perfCsvPath;
        const content = await fs.readFile(csvPath);
        return new Response(content, { status: 200, headers: { 'content-type': 'text/csv' } });
      },
    },
  });
}

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

export async function buildReferenceForNation(
  nation: 'england',
  options?: BuildReferenceOptions,
): Promise<EnglandReferenceData>;
export async function buildReferenceForNation(
  nation: 'wales',
  options?: BuildReferenceOptions,
): Promise<WalesReferenceData>;
export async function buildReferenceForNation(
  nation: 'scotland',
  options?: BuildReferenceOptions,
): Promise<ScotlandReferenceData>;
export async function buildReferenceForNation(
  nation: PublishingNation,
  options?: BuildReferenceOptions,
): Promise<EnglandReferenceData | WalesReferenceData | ScotlandReferenceData>;
export async function buildReferenceForNation(
  nation: PublishingNation,
  options: BuildReferenceOptions = {},
): Promise<EnglandReferenceData | WalesReferenceData | ScotlandReferenceData> {
  const fixturesDir = options.fixturesDir ?? DEFAULT_FIXTURES_DIR;

  if (nation === 'england') {
    let providers = undefined;
    if (options.rawFiles) {
      const { providers: extracted } = await normaliseEnglandWithProviders(options.rawFiles);
      providers = extracted;
    }

    if (options.fromFixtures) {
      const odsDir = path.join(fixturesDir, 'ods');
      const ods = await loadEnglandReferenceOds({
        fixtureDir: odsDir,
        source: 'fixture',
      });
      return buildEnglandReferenceData({
        ...(providers ? { providers } : {}),
        ods,
      });
    }

    return buildEnglandReferenceData({
      ...(providers ? { providers } : {}),
    });
  }

  if (nation === 'wales') {
    return buildWalesReferenceData();
  }

  // Scotland
  if (options.fromFixtures) {
    const lookupsDir = path.join(fixturesDir, 'scotland', 'lookups');
    return buildScotlandReferenceData({
      boardsCsvPath: path.join(lookupsDir, 'health-boards.csv'),
      specialBoardsCsvPath: path.join(lookupsDir, 'special-health-boards.csv'),
      hospitalsCsvPath: path.join(lookupsDir, 'hospitals.csv'),
    });
  }

  return buildScotlandReferenceData();
}

function getNationSource<N extends 'england' | 'wales' | 'scotland'>(
  nation: N,
  fromFixtures: boolean,
  fixturesDir?: string,
): NationSource<N> {
  if (nation === 'england') {
    return (fromFixtures
      ? createEnglandFixtureSource(fixturesDir)
      : englandSource) as unknown as NationSource<N>;
  }
  if (nation === 'wales') {
    return (fromFixtures
      ? createWalesFixtureSource(fixturesDir)
      : walesSource) as unknown as NationSource<N>;
  }
  return (fromFixtures
    ? createScotlandFixtureSource(fixturesDir)
    : scotlandSource) as unknown as NationSource<N>;
}

async function runNationPipelineInternal<N extends 'england' | 'wales' | 'scotland'>(
  nation: N,
  options: PipelineRunOptions = {},
): Promise<{ readonly nation: N; readonly result: NationRunResult }> {
  try {
    const { fromFixtures = false, dryRun = false, customDataRoot, fixturesDir, today } = options;
    let currentState = await loadNationState(nation, customDataRoot);
    const source = getNationSource(nation, fromFixtures, fixturesDir);

    const candidates = await source.discover(currentState);
    if (candidates.length === 0) {
      return { nation, result: { status: 'no-change' } };
    }

    let latestPublishedPeriod: ReportingPeriod | undefined;

    // Process each candidate chronologically (oldest first)
    for (const candidate of candidates) {
      const rawFiles = await source.fetch(candidate);
      const candidateRelease = await source.normalise(rawFiles, {} as ReferenceData<N>);

      // Build or reload reference data
      const refOptions: BuildReferenceOptions = {
        ...(customDataRoot !== undefined ? { customDataRoot } : {}),
        fromFixtures: options.fromFixtures,
        ...(fixturesDir !== undefined ? { fixturesDir } : {}),
        rawFiles,
      };
      const reference = (await buildReferenceForNation(nation, refOptions)) as ReferenceData<N>;

      // Load previous releases to find previous for validation
      const existingReleases = await loadAllReleases(nation, customDataRoot);
      const priorReleases = existingReleases.filter(
        (r) => r.reportingPeriod < candidate.reportingPeriod,
      );
      const previousRelease: Release<N> | null =
        priorReleases.length > 0 ? (priorReleases[priorReleases.length - 1] ?? null) : null;

      // Validate release
      const validationThresholds =
        options.thresholds ??
        (fromFixtures ? { figureCountMinRatio: 0.7, englandUnitCountMinRatio: 0.8 } : undefined);
      const validationReport: ValidationReport = validateRelease(
        candidateRelease,
        previousRelease,
        reference,
        {
          ...(today !== undefined ? { today } : {}),
          ...(validationThresholds !== undefined ? { thresholds: validationThresholds } : {}),
        },
      );

      if (!validationReport.ok) {
        const reportMarkdown = renderValidationReport(validationReport);
        return {
          nation,
          result: {
            status: 'blocked',
            reportingPeriod: candidate.reportingPeriod,
            reportMarkdown,
          },
        };
      }

      // Passed validation gate
      if (!dryRun) {
        // 1. Write release file
        const releaseTarget = releasePath(nation, candidate.reportingPeriod, customDataRoot);
        await writeCanonicalJson(releaseTarget, candidateRelease);

        // 2. Write reference data
        const referenceTarget = referencePath(nation, customDataRoot);
        await writeCanonicalJson(referenceTarget, reference);

        // 3. Assemble published.json
        const updatedHistory: Release<N>[] = [
          ...existingReleases.filter((r) => r.reportingPeriod !== candidate.reportingPeriod),
          candidateRelease,
        ];
        updatedHistory.sort((a, b) =>
          String(a.reportingPeriod).localeCompare(String(b.reportingPeriod)),
        );
        const latest = updatedHistory[updatedHistory.length - 1];
        if (!latest) {
          throw new Error(`Failed to determine latest release for ${nation}`);
        }
        const publishedNation = assemblePublished(latest, updatedHistory, reference);
        const publishedTarget = publishedPath(nation, customDataRoot);
        await writeCanonicalJson(publishedTarget, publishedNation);

        // 4. Update state.json
        const newSeenFiles: Record<
          string,
          { readonly sha256: string; readonly fetchedAt: string }
        > = {
          ...currentState.seenFiles,
        };

        for (const [url, file] of Object.entries(rawFiles)) {
          newSeenFiles[url] = {
            sha256: file.sha256,
            fetchedAt: file.fetchedAt,
          };
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

        const stateTarget = statePath(nation, customDataRoot);
        await writeCanonicalJson(stateTarget, currentState);
      }

      latestPublishedPeriod = candidate.reportingPeriod;
    }

    return {
      nation,
      result: {
        status: 'published',
        ...(latestPublishedPeriod !== undefined ? { reportingPeriod: latestPublishedPeriod } : {}),
      },
    };
  } catch (err) {
    return {
      nation,
      result: {
        status: 'error',
        error: err instanceof Error ? (err.stack ?? err.message) : String(err),
      },
    };
  }
}

/**
 * Runs the ingestion, validation, and assembly pipeline for a single nation.
 * Failure in one nation never crashes or rolls back another nation.
 */
export async function runNationPipeline(
  nation: PublishingNation,
  options: PipelineRunOptions = {},
): Promise<NationRunResult> {
  if (nation === 'england') {
    return (await runNationPipelineInternal('england', options)).result;
  }
  if (nation === 'wales') {
    return (await runNationPipelineInternal('wales', options)).result;
  }
  return (await runNationPipelineInternal('scotland', options)).result;
}

/**
 * Writes the pipeline run report to `packages/pipeline/.cache/run-report.json`.
 */
export async function writeRunReport(
  report: PipelineRunReport,
  options: { cacheDir?: string; customDataRoot?: string } = {},
): Promise<string> {
  const targetDir = options.cacheDir ?? pipelineCacheDir(options.customDataRoot);
  const targetFile = path.join(targetDir, 'run-report.json');
  await writeCanonicalJson(targetFile, report);
  return targetFile;
}

/**
 * Rebuilds and writes reference data for a single nation or all nations.
 */
export async function runReferenceBuild(
  nation?: PublishingNation,
  options: {
    customDataRoot?: string;
    fromFixtures?: boolean;
    fixturesDir?: string;
  } = {},
): Promise<void> {
  const nations: readonly PublishingNation[] = nation ? [nation] : PUBLISHING_NATIONS;

  for (const n of nations) {
    const target = referencePath(n, options.customDataRoot);
    if (n === 'england') {
      const ref = await buildReferenceForNation('england', options);
      await writeCanonicalJson(target, ref);
    } else if (n === 'wales') {
      await writeWalesReferenceData(target);
    } else {
      const ref = await buildReferenceForNation('scotland', options);
      await writeCanonicalJson(target, ref);
    }
  }
}

async function runAssembleInternal<N extends 'england' | 'wales' | 'scotland'>(
  nation: N,
  customDataRoot?: string,
): Promise<{ readonly nation: N }> {
  const releases = await loadAllReleases(nation, customDataRoot);
  if (releases.length === 0) {
    throw new Error(`No releases found in ${releasesDir(nation, customDataRoot)} for ${nation}`);
  }
  const refFile = referencePath(nation, customDataRoot);
  const reference = await readJson<ReferenceData<N>>(refFile);
  const latest = releases[releases.length - 1];
  if (!latest) {
    throw new Error(`No latest release found for ${nation}`);
  }
  const publishedNation = assemblePublished(latest, releases, reference);
  const target = publishedPath(nation, customDataRoot);
  await writeCanonicalJson(target, publishedNation);
  return { nation };
}

/**
 * Assembles and writes published.json for a single nation or all nations.
 */
export async function runAssemble(
  nation?: PublishingNation,
  options: { customDataRoot?: string } = {},
): Promise<void> {
  const nations: readonly PublishingNation[] = nation ? [nation] : PUBLISHING_NATIONS;

  for (const n of nations) {
    if (n === 'england') {
      await runAssembleInternal('england', options.customDataRoot);
    } else if (n === 'wales') {
      await runAssembleInternal('wales', options.customDataRoot);
    } else {
      await runAssembleInternal('scotland', options.customDataRoot);
    }
  }
}

/**
 * Runs the full pipeline orchestrator across all or specified publishing nations.
 */
export async function runPipeline(options: PipelineRunOptions = {}): Promise<PipelineRunReport> {
  const nations: readonly PublishingNation[] = options.nation
    ? [options.nation]
    : PUBLISHING_NATIONS;

  const report: Partial<PipelineRunReport> = {};

  for (const nation of nations) {
    report[nation] = await runNationPipeline(nation, options);
  }

  // Ensure full report structure
  const completeReport: PipelineRunReport = {
    england: report.england ?? { status: 'no-change' },
    wales: report.wales ?? { status: 'no-change' },
    scotland: report.scotland ?? { status: 'no-change' },
  };

  await writeRunReport(completeReport, {
    ...(options.cacheDir !== undefined ? { cacheDir: options.cacheDir } : {}),
    ...(options.customDataRoot !== undefined ? { customDataRoot: options.customDataRoot } : {}),
  });

  return completeReport;
}
