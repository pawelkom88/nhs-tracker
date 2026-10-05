import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { publishedNationSchema } from '@kyw/model/published';
import { backfillEngland, backfillWales, backfillScotland, runBackfill } from '../src/backfill.js';
import { readJson } from '../src/io/json.js';
import { publishedPath, releasesDir, statePath } from '../src/io/paths.js';

describe('Pipeline Backfill (T-7.7)', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'kyw-backfill-test-'));
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  describe('England backfill', () => {
    it('backfills England releases from fixtures, validates schema, and writes deterministic published.json', async () => {
      const result = await backfillEngland({
        fromFixtures: true,
        customDataRoot: tempDir,
        months: 13,
      });

      expect(result.status).toBe('backfilled');
      expect(result.releasesCount).toBe(3); // Jul25, Mar26, Jul26 in fixtures
      expect(result.earliestPeriod).toBe('2025-07-31');
      expect(result.latestPeriod).toBe('2026-07-31');

      // Assert all 3 release files exist
      const releases = await fs.readdir(releasesDir('england', tempDir));
      expect(releases.sort()).toEqual(['2025-07-31.json', '2026-03-31.json', '2026-07-31.json']);

      // Assert published.json matches schema
      const published = await readJson(publishedPath('england', tempDir));
      const parsed = publishedNationSchema('england').safeParse(published);
      expect(parsed.success).toBe(true);

      // Assert state.json updated
      const state = await readJson<{ seenFiles: Record<string, unknown> }>(
        statePath('england', tempDir),
      );
      expect(Object.keys(state.seenFiles).length).toBeGreaterThan(0);
    });

    it('handles dry-run mode without writing files to disk', async () => {
      const result = await backfillEngland({
        fromFixtures: true,
        customDataRoot: tempDir,
        dryRun: true,
        months: 13,
      });

      expect(result.status).toBe('backfilled');
      expect(result.releasesCount).toBe(3);

      await expect(fs.readdir(releasesDir('england', tempDir))).rejects.toThrow();
    });
  });

  describe('Wales backfill', () => {
    it('backfills Wales from fixtures and validates schema', async () => {
      const result = await backfillWales({
        fromFixtures: true,
        customDataRoot: tempDir,
      });

      expect(result.status).toBe('backfilled');
      expect(result.releasesCount).toBe(1);
      expect(result.latestPeriod).toBe('2026-07-31');

      const published = await readJson(publishedPath('wales', tempDir));
      const parsed = publishedNationSchema('wales').safeParse(published);
      expect(parsed.success).toBe(true);
    });
  });

  describe('Scotland backfill', () => {
    it('backfills Scotland releases from fixtures and validates schema', async () => {
      const result = await backfillScotland({
        fromFixtures: true,
        customDataRoot: tempDir,
      });

      expect(result.status).toBe('backfilled');
      expect(result.releasesCount).toBeGreaterThanOrEqual(1);

      const published = await readJson(publishedPath('scotland', tempDir));
      const parsed = publishedNationSchema('scotland').safeParse(published);
      expect(parsed.success).toBe(true);
    });
  });

  describe('runBackfill orchestrator', () => {
    it('runs backfill across all nations with fixtures into custom data directory', async () => {
      const report = await runBackfill({
        fromFixtures: true,
        customDataRoot: tempDir,
        cacheDir: path.join(tempDir, '.cache'),
      });

      expect(report.england.status).toBe('backfilled');
      expect(report.wales.status).toBe('backfilled');
      expect(report.scotland.status).toBe('backfilled');

      // Verify published.json for all 3 nations
      const engPub = await readJson(publishedPath('england', tempDir));
      const walPub = await readJson(publishedPath('wales', tempDir));
      const scoPub = await readJson(publishedPath('scotland', tempDir));

      expect(publishedNationSchema('england').safeParse(engPub).success).toBe(true);
      expect(publishedNationSchema('wales').safeParse(walPub).success).toBe(true);
      expect(publishedNationSchema('scotland').safeParse(scoPub).success).toBe(true);

      // Verify run-report.json
      const reportFile = path.join(tempDir, '.cache', 'run-report.json');
      const savedReport = await readJson<typeof report>(reportFile);
      expect(savedReport.england.status).toBe('backfilled');
    });
  });
});
