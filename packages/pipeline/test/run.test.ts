import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as os from 'node:os';
import { fileURLToPath } from 'node:url';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { publishedNationSchema } from '@kyw/model/published';
import { referenceDataSchema } from '@kyw/model/reference';
import { englandReleaseSchema } from '@kyw/model/england/schema';
import { walesReleaseSchema } from '@kyw/model/wales/schema';
import { scotlandReleaseSchema } from '@kyw/model/scotland/schema';
import type { PublishedNation } from '@kyw/model/published';
import { readJson } from '../src/io/json.js';
import {
  runPipeline,
  runNationPipeline,
  runReferenceBuild,
  runAssemble,
  type PipelineRunReport,
} from '../src/run.js';
import { publishedPath, referencePath, releasePath } from '../src/io/paths.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const FIXTURES_DIR = path.resolve(__dirname, '../fixtures');

describe('Pipeline Orchestrator (T-7.5)', () => {
  let tempDir: string;
  let cacheDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'kyw-pipeline-run-test-'));
    cacheDir = path.join(tempDir, 'cache');
    await fs.mkdir(cacheDir, { recursive: true });
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it('runs initial pipeline across all 3 nations from fixtures and publishes valid data', async () => {
    const report = await runPipeline({
      fromFixtures: true,
      customDataRoot: tempDir,
      cacheDir,
      fixturesDir: FIXTURES_DIR,
      today: '2026-10-01',
    });

    expect(report.england.status).toBe('published');
    expect(report.wales.status).toBe('published');
    expect(report.scotland.status).toBe('published');

    expect(report.england.reportingPeriod).toBe('2026-07-31');
    expect(report.wales.reportingPeriod).toBe('2026-07-31');
    expect(report.scotland.reportingPeriod).toBe('2026-08-31');

    // Verify England files exist and pass schemas
    const englandPub = await readJson(publishedPath('england', tempDir));
    expect(() => publishedNationSchema('england').parse(englandPub)).not.toThrow();
    const englandRef = await readJson(referencePath('england', tempDir));
    expect(() => referenceDataSchema('england').parse(englandRef)).not.toThrow();
    const englandRel = await readJson(releasePath('england', '2026-07-31', tempDir));
    expect(() => englandReleaseSchema.parse(englandRel)).not.toThrow();

    // Verify Wales files exist and pass schemas
    const walesPub = await readJson(publishedPath('wales', tempDir));
    expect(() => publishedNationSchema('wales').parse(walesPub)).not.toThrow();
    const walesRef = await readJson(referencePath('wales', tempDir));
    expect(() => referenceDataSchema('wales').parse(walesRef)).not.toThrow();
    const walesRel = await readJson(releasePath('wales', '2026-07-31', tempDir));
    expect(() => walesReleaseSchema.parse(walesRel)).not.toThrow();

    // Verify Scotland files exist and pass schemas
    const scotlandPub = await readJson(publishedPath('scotland', tempDir));
    expect(() => publishedNationSchema('scotland').parse(scotlandPub)).not.toThrow();
    const scotlandRef = await readJson(referencePath('scotland', tempDir));
    expect(() => referenceDataSchema('scotland').parse(scotlandRef)).not.toThrow();
    const scotlandRel = await readJson(releasePath('scotland', '2026-08-31', tempDir));
    expect(() => scotlandReleaseSchema.parse(scotlandRel)).not.toThrow();

    // Verify run report was cached
    const cachedReport = await readJson<PipelineRunReport>(path.join(cacheDir, 'run-report.json'));
    expect(cachedReport.england.status).toBe('published');
    expect(cachedReport.wales.status).toBe('published');
    expect(cachedReport.scotland.status).toBe('published');
  });

  it('second run returns no-change for all nations', async () => {
    // First run
    const firstReport = await runPipeline({
      fromFixtures: true,
      customDataRoot: tempDir,
      cacheDir,
      fixturesDir: FIXTURES_DIR,
      today: '2026-10-01',
    });
    expect(firstReport.england.status).toBe('published');
    expect(firstReport.wales.status).toBe('published');
    expect(firstReport.scotland.status).toBe('published');

    // Second run
    const secondReport = await runPipeline({
      fromFixtures: true,
      customDataRoot: tempDir,
      cacheDir,
      fixturesDir: FIXTURES_DIR,
      today: '2026-10-01',
    });

    expect(secondReport.england.status).toBe('no-change');
    expect(secondReport.wales.status).toBe('no-change');
    expect(secondReport.scotland.status).toBe('no-change');
  });

  it('dry-run mode validates releases but does not write files to data directory', async () => {
    const dryReport = await runPipeline({
      fromFixtures: true,
      dryRun: true,
      customDataRoot: tempDir,
      cacheDir,
      fixturesDir: FIXTURES_DIR,
      today: '2026-10-01',
    });

    expect(dryReport.england.status).toBe('published');
    expect(dryReport.wales.status).toBe('published');
    expect(dryReport.scotland.status).toBe('published');

    // No files should exist under tempDir for published.json
    await expect(fs.access(publishedPath('england', tempDir))).rejects.toThrow();
    await expect(fs.access(publishedPath('wales', tempDir))).rejects.toThrow();
    await expect(fs.access(publishedPath('scotland', tempDir))).rejects.toThrow();
  });

  it('isolates nation failures: validation failure in one nation does not stop another', async () => {
    // We run England and Scotland with a corrupted Wales metadata (invalid dates causing validation failure)
    const customFixturesDir = path.join(tempDir, 'corrupt-fixtures');
    await fs.cp(FIXTURES_DIR, customFixturesDir, { recursive: true });

    // Corrupt Wales metadata with future publish date to trigger validation gate 'dates' failure
    const corruptKmMeta = {
      dataset_id: 'acd9529c-569d-42bc-9d3a-1fb9c7fb4c5d',
      version_id: 'v-future',
      published_revision: {
        id: 'rev-future',
        coverage_end_date: '2026-07-31',
        publish_at: '2030-01-01T09:30:00Z', // Future date vs today (2026-10-01) -> fails validation dates check
      },
    };
    await fs.writeFile(
      path.join(customFixturesDir, 'wales', 'acd9529c-metadata.json'),
      JSON.stringify(corruptKmMeta, null, 2),
    );

    const report = await runPipeline({
      fromFixtures: true,
      customDataRoot: tempDir,
      cacheDir,
      fixturesDir: customFixturesDir,
      today: '2026-10-01',
    });

    // England and Scotland should still publish successfully!
    expect(report.england.status).toBe('published');
    expect(report.scotland.status).toBe('published');

    // Wales should be blocked and contain Markdown report
    expect(report.wales.status).toBe('blocked');
    expect(report.wales.reportMarkdown).toBeDefined();
    expect(report.wales.reportMarkdown).toContain('Pipeline Validation Report: Wales');
    expect(report.wales.reportMarkdown).toContain('`dates`');

    // Wales files should not have been written
    await expect(fs.access(publishedPath('wales', tempDir))).rejects.toThrow();

    // England and Scotland files should exist
    await expect(fs.access(publishedPath('england', tempDir))).resolves.toBeUndefined();
    await expect(fs.access(publishedPath('scotland', tempDir))).resolves.toBeUndefined();
  });

  it('isolates unexpected errors per nation without crashing the orchestrator', async () => {
    const report = await runNationPipeline('england', {
      fromFixtures: true,
      customDataRoot: tempDir,
      fixturesDir: path.join(tempDir, 'nonexistent-fixtures-dir'),
    });

    expect(report.status).toBe('error');
    expect(report.error).toBeDefined();
  });

  it('runs reference build independently for a single nation or all nations', async () => {
    await runReferenceBuild('wales', { customDataRoot: tempDir });
    const walesRef = await readJson(referencePath('wales', tempDir));
    expect(() => referenceDataSchema('wales').parse(walesRef)).not.toThrow();

    await runReferenceBuild(undefined, {
      customDataRoot: tempDir,
      fromFixtures: true,
      fixturesDir: FIXTURES_DIR,
    });
    const scotlandRef = await readJson(referencePath('scotland', tempDir));
    expect(() => referenceDataSchema('scotland').parse(scotlandRef)).not.toThrow();
  });

  it('runs assembly independently from existing releases', async () => {
    // Ingest Scotland first
    await runNationPipeline('scotland', {
      fromFixtures: true,
      customDataRoot: tempDir,
      fixturesDir: FIXTURES_DIR,
      today: '2026-10-01',
    });

    // Delete published.json
    await fs.rm(publishedPath('scotland', tempDir));

    // Run assemble
    await runAssemble('scotland', { customDataRoot: tempDir });

    const scotlandPub = await readJson(publishedPath('scotland', tempDir));
    expect(() => publishedNationSchema('scotland').parse(scotlandPub)).not.toThrow();
  });

  it('produces byte-stable deterministic output files', async () => {
    await runPipeline({
      fromFixtures: true,
      customDataRoot: tempDir,
      cacheDir,
      fixturesDir: FIXTURES_DIR,
      today: '2026-10-01',
    });

    const eng1 = await readJson<PublishedNation<'england'>>(publishedPath('england', tempDir));
    const wales1 = await readJson<PublishedNation<'wales'>>(publishedPath('wales', tempDir));
    const scot1 = await readJson<PublishedNation<'scotland'>>(publishedPath('scotland', tempDir));

    // Re-run assembly
    await runAssemble('england', { customDataRoot: tempDir });
    await runAssemble('wales', { customDataRoot: tempDir });
    await runAssemble('scotland', { customDataRoot: tempDir });

    const eng2 = await readJson<PublishedNation<'england'>>(publishedPath('england', tempDir));
    const wales2 = await readJson<PublishedNation<'wales'>>(publishedPath('wales', tempDir));
    const scot2 = await readJson<PublishedNation<'scotland'>>(publishedPath('scotland', tempDir));

    // Compare content structure
    expect(eng1.entries).toEqual(eng2.entries);
    expect(wales1.entries).toEqual(wales2.entries);
    expect(scot1.entries).toEqual(scot2.entries);
  });
});
