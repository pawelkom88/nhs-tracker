import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';
import { publicationDate, reportingPeriod } from '@kyw/model/period';
import { reportingUnitId, specialtyId, statisticId, waitStageId } from '@kyw/model/ids';
import { scotlandReleaseSchema } from '@kyw/model/scotland/schema';
import type { PipelineState, ReleaseCandidate, RawFiles } from '../../src/source.js';
import {
  STAGE_OF_TREATMENT_PERFORMANCE_RESOURCE_ID,
  STAGE_OF_TREATMENT_DISTRIBUTION_RESOURCE_ID,
  SCOTLAND_CKAN_PACKAGE_SHOW_URL,
  buildScotlandFingerprint,
  inferReportingPeriod,
  type CkanPackageShowResponse,
} from '../../src/scotland/discover.js';
import {
  createScotlandSource,
  scotlandSource,
  resolveScotlandRawFiles,
  normaliseScotlandWithSources,
} from '../../src/scotland/source.js';
import { buildScotlandReferenceData } from '../../src/reference/scotland/build.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const FIXTURES_DIR = path.resolve(__dirname, '../../fixtures/scotland/stage-of-treatment');

describe('Scotland Source Adapter (T-6.5)', () => {
  async function loadFixturePackageShow(): Promise<CkanPackageShowResponse> {
    const rawJson = await fs.readFile(path.join(FIXTURES_DIR, 'package_show.json'), 'utf-8');
    return JSON.parse(rawJson) as CkanPackageShowResponse;
  }

  describe('resolveScotlandRawFiles', () => {
    it('resolves performance and distribution raw files by resource ID / filename', () => {
      const perfUrl = `https://www.opendata.nhs.scot/dataset/e9dbef36/resource/${STAGE_OF_TREATMENT_PERFORMANCE_RESOURCE_ID}/download/sot_performance_ongoing_completed_waits_monthly_aug26.csv`;
      const distUrl = `https://www.opendata.nhs.scot/dataset/e9dbef36/resource/${STAGE_OF_TREATMENT_DISTRIBUTION_RESOURCE_ID}/download/sot_distribution_of_ongoing_completed_waits_monthly_aug26.csv`;

      const raw: RawFiles = {
        [perfUrl]: {
          path: '/path/to/ac63b747-data.csv',
          sha256: 'a'.repeat(64),
          bytes: 14000,
          fetchedAt: '2026-09-29T12:55:00.000Z',
          finalUrl: perfUrl,
        },
        [distUrl]: {
          path: '/path/to/f9232c17-data.csv',
          sha256: 'b'.repeat(64),
          bytes: 23000,
          fetchedAt: '2026-09-29T12:55:00.000Z',
          finalUrl: distUrl,
        },
      };

      const resolved = resolveScotlandRawFiles(raw);
      expect(resolved.performance.url).toBe(perfUrl);
      expect(resolved.distribution.url).toBe(distUrl);
    });

    it('throws error when RawFiles is empty', () => {
      expect(() => resolveScotlandRawFiles({})).toThrow('Cannot resolve empty Scotland RawFiles');
    });

    it('throws error when distribution dataset is missing', () => {
      const perfUrl = `https://www.opendata.nhs.scot/dataset/e9dbef36/resource/${STAGE_OF_TREATMENT_PERFORMANCE_RESOURCE_ID}/download/sot_performance.csv`;
      const raw: RawFiles = {
        [perfUrl]: {
          path: '/path/to/ac63b747.csv',
          sha256: 'a'.repeat(64),
          bytes: 14000,
          fetchedAt: '2026-09-29T12:55:00.000Z',
          finalUrl: perfUrl,
        },
      };

      expect(() => resolveScotlandRawFiles(raw)).toThrow(
        `Scotland normalisation requires both Ongoing Performance (${STAGE_OF_TREATMENT_PERFORMANCE_RESOURCE_ID}) and Distribution (${STAGE_OF_TREATMENT_DISTRIBUTION_RESOURCE_ID}) raw files`,
      );
    });

    it('throws error when performance dataset is missing', () => {
      const distUrl = `https://www.opendata.nhs.scot/dataset/e9dbef36/resource/${STAGE_OF_TREATMENT_DISTRIBUTION_RESOURCE_ID}/download/sot_distribution.csv`;
      const raw: RawFiles = {
        [distUrl]: {
          path: '/path/to/f9232c17.csv',
          sha256: 'b'.repeat(64),
          bytes: 23000,
          fetchedAt: '2026-09-29T12:55:00.000Z',
          finalUrl: distUrl,
        },
      };

      expect(() => resolveScotlandRawFiles(raw)).toThrow(
        `Scotland normalisation requires both Ongoing Performance (${STAGE_OF_TREATMENT_PERFORMANCE_RESOURCE_ID}) and Distribution (${STAGE_OF_TREATMENT_DISTRIBUTION_RESOURCE_ID}) raw files`,
      );
    });
  });

  describe('createScotlandSource adapter end-to-end', () => {
    it('discovers release candidate when state is empty', async () => {
      const packageShowMeta = await loadFixturePackageShow();
      const customSource = createScotlandSource({
        discoverOptions: {
          fetchJson: () => Promise.resolve(packageShowMeta),
        },
      });

      const emptyState: PipelineState = {
        lastCheck: '2026-09-01T00:00:00.000Z',
        seenFiles: {},
      };

      const candidates = await customSource.discover(emptyState);
      expect(candidates).toHaveLength(1);
      expect(candidates[0]?.reportingPeriod).toBe('2026-08-31');
      expect(candidates[0]?.sourceUrls).toHaveLength(2);
      expect(candidates[0]?.sourceUrls[0]).toContain(STAGE_OF_TREATMENT_PERFORMANCE_RESOURCE_ID);
      expect(candidates[0]?.sourceUrls[1]).toContain(STAGE_OF_TREATMENT_DISTRIBUTION_RESOURCE_ID);
    });

    it('discovers no candidates when release fingerprint is already seen', async () => {
      const packageShowMeta = await loadFixturePackageShow();
      const resources = packageShowMeta.result?.resources ?? [];
      const perfRes = resources.find((r) => r.id === STAGE_OF_TREATMENT_PERFORMANCE_RESOURCE_ID);
      const distRes = resources.find((r) => r.id === STAGE_OF_TREATMENT_DISTRIBUTION_RESOURCE_ID);

      const perfLastMod = perfRes?.last_modified ?? '';
      const perfUrl = perfRes?.url ?? '';
      const distLastMod = distRes?.last_modified ?? '';
      const distUrl = distRes?.url ?? '';
      const period = inferReportingPeriod(perfUrl, perfLastMod.slice(0, 10));

      const fingerprint = buildScotlandFingerprint(
        period,
        perfUrl,
        perfLastMod,
        distUrl,
        distLastMod,
      );

      const customSource = createScotlandSource({
        discoverOptions: {
          fetchJson: () => Promise.resolve(packageShowMeta),
        },
      });

      const seenState: PipelineState = {
        lastCheck: '2026-09-29T13:00:00.000Z',
        seenFiles: {
          [fingerprint]: {
            sha256: 'a'.repeat(64),
            fetchedAt: '2026-09-29T13:00:00.000Z',
          },
        },
      };

      const candidates = await customSource.discover(seenState);
      expect(candidates).toEqual([]);
    });

    it('fetches candidate datasets with mock fetchImpl', async () => {
      const perfCsvFixture = await fs.readFile(path.join(FIXTURES_DIR, 'ac63b747-data.csv'));
      const distCsvFixture = await fs.readFile(path.join(FIXTURES_DIR, 'f9232c17-data.csv'));

      const perfUrl = `https://www.opendata.nhs.scot/dataset/e9dbef36/resource/${STAGE_OF_TREATMENT_PERFORMANCE_RESOURCE_ID}/download/perf.csv`;
      const distUrl = `https://www.opendata.nhs.scot/dataset/e9dbef36/resource/${STAGE_OF_TREATMENT_DISTRIBUTION_RESOURCE_ID}/download/dist.csv`;

      const mockFetch: typeof fetch = (input) => {
        const urlStr =
          typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;

        if (urlStr === perfUrl) {
          return Promise.resolve(new Response(perfCsvFixture, { status: 200 }));
        }
        if (urlStr === distUrl) {
          return Promise.resolve(new Response(distCsvFixture, { status: 200 }));
        }
        return Promise.resolve(new Response('Not Found', { status: 404 }));
      };

      const customSource = createScotlandSource({
        fetchOptions: {
          fetchImpl: mockFetch,
        },
      });

      const candidate: ReleaseCandidate = {
        reportingPeriod: reportingPeriod('2026-08-31'),
        sourceUrls: [perfUrl, distUrl],
        revised: false,
        fingerprint: 'test-fingerprint',
      };

      const raw = await customSource.fetch(candidate);

      expect(raw[perfUrl]).toBeDefined();
      expect(raw[distUrl]).toBeDefined();
      expect(raw[perfUrl]?.bytes).toBe(perfCsvFixture.length);
      expect(raw[distUrl]?.bytes).toBe(distCsvFixture.length);
    });

    it('normalises raw fixture files into a valid Release<"scotland"> passing schema', async () => {
      const perfPath = path.join(FIXTURES_DIR, 'ac63b747-data.csv');
      const distPath = path.join(FIXTURES_DIR, 'f9232c17-data.csv');

      const perfUrl = `https://www.opendata.nhs.scot/dataset/e9dbef36/resource/${STAGE_OF_TREATMENT_PERFORMANCE_RESOURCE_ID}/download/perf.csv`;
      const distUrl = `https://www.opendata.nhs.scot/dataset/e9dbef36/resource/${STAGE_OF_TREATMENT_DISTRIBUTION_RESOURCE_ID}/download/dist.csv`;

      const raw: RawFiles = {
        [perfUrl]: {
          path: perfPath,
          sha256: 'a'.repeat(64),
          bytes: 14227,
          fetchedAt: '2026-09-29T12:55:00.000Z',
          finalUrl: perfUrl,
        },
        [distUrl]: {
          path: distPath,
          sha256: 'b'.repeat(64),
          bytes: 23450,
          fetchedAt: '2026-09-29T12:55:00.000Z',
          finalUrl: distUrl,
        },
      };

      const customSource = createScotlandSource({
        defaultPublicationDate: publicationDate('2026-09-29'),
      });

      const refData = buildScotlandReferenceData();
      const release = await customSource.normalise(raw, refData);

      // Schema verification
      expect(() => scotlandReleaseSchema.parse(release)).not.toThrow();

      expect(release.nation).toBe('scotland');
      expect(release.reportingPeriod).toBe('2026-08-31');
      expect(release.publicationDate).toBe('2026-09-29');
      expect(release.figures.length).toBeGreaterThan(0);
      expect(release.comparisonFigures.length).toBeGreaterThan(0);

      // Verify reporting units: Lothian (S08000024), GG&C (S08000031), Orkney (S08000025), Golden Jubilee (SB0801)
      expect(release.reportingUnits).toEqual([
        reportingUnitId('scotland', 'S08000024'),
        reportingUnitId('scotland', 'S08000025'),
        reportingUnitId('scotland', 'S08000031'),
        reportingUnitId('scotland', 'SB0801'),
      ]);

      // Check Wait Stages are strictly New Outpatient and Inpatient/Day case (ADR-0002)
      const outStage = waitStageId('scotland', 'new-outpatient');
      const inStage = waitStageId('scotland', 'inpatient-day-case');
      for (const fig of release.figures) {
        expect([outStage, inStage]).toContain(fig.waitStage);
      }

      // Check Lothian (S08000024) All specialties (Z9) New Outpatient
      const lothianUnit = reportingUnitId('scotland', 'S08000024');
      const z9Spec = specialtyId('scotland', 'Z9');
      const lothianOutFigures = release.figures.filter(
        (f) =>
          f.reportingUnit === lothianUnit && f.specialty === z9Spec && f.waitStage === outStage,
      );
      expect(lothianOutFigures).toHaveLength(4);

      const median = lothianOutFigures.find(
        (f) => f.statistic === statisticId('scotland', 'median-ongoing-wait'),
      );
      expect(median?.unit).toBe('days');
      expect(median?.value).toEqual({ status: 'published', value: 88, provisional: false });

      const within = lothianOutFigures.find(
        (f) => f.statistic === statisticId('scotland', 'within-waiting-standard-count'),
      );
      expect(within?.provenance.kind).toBe('derived');
      expect(within?.value).toEqual({ status: 'published', value: 39039, provisional: false });

      const longWait = lothianOutFigures.find(
        (f) => f.statistic === statisticId('scotland', 'long-wait-count'),
      );
      expect(longWait?.value).toEqual({ status: 'published', value: 3188, provisional: false });

      const total = lothianOutFigures.find(
        (f) => f.statistic === statisticId('scotland', 'total-waiting'),
      );
      expect(total?.value).toEqual({ status: 'published', value: 79598, provisional: false });

      // Check Lothian (S08000024) General Psychiatry (G1) Inpatient suppression (:u quality flag)
      const g1Spec = specialtyId('scotland', 'G1');
      const lothianG1InMedian = release.figures.find(
        (f) =>
          f.reportingUnit === lothianUnit &&
          f.specialty === g1Spec &&
          f.waitStage === inStage &&
          f.statistic === statisticId('scotland', 'median-ongoing-wait'),
      );
      expect(lothianG1InMedian?.value).toEqual({ status: 'suppressed', provisional: false });
    });

    it('normaliseScotlandWithSources works directly with default singleton adapter', async () => {
      expect(scotlandSource.nation).toBe('scotland');
      const perfPath = path.join(FIXTURES_DIR, 'ac63b747-data.csv');
      const distPath = path.join(FIXTURES_DIR, 'f9232c17-data.csv');

      const raw: RawFiles = {
        ac63b747: {
          path: perfPath,
          sha256: 'a'.repeat(64),
          bytes: 14227,
          fetchedAt: '2026-09-29T12:55:00.000Z',
          finalUrl:
            'https://www.opendata.nhs.scot/dataset/e9dbef36/resource/ac63b747-fdcc-410c-ae43-de6fe3c46abf/download/perf.csv',
        },
        f9232c17: {
          path: distPath,
          sha256: 'b'.repeat(64),
          bytes: 23450,
          fetchedAt: '2026-09-29T12:55:00.000Z',
          finalUrl:
            'https://www.opendata.nhs.scot/dataset/e9dbef36/resource/f9232c17-a90e-4d35-a863-11bdb3a748c0/download/dist.csv',
        },
      };

      const release = await normaliseScotlandWithSources(raw, {
        publicationDate: publicationDate('2026-09-29'),
      });
      expect(release.nation).toBe('scotland');
      expect(release.reportingPeriod).toBe('2026-08-31');
      expect(release.figures.length).toBeGreaterThan(0);
    });

    it('extracts official publication date from package_show metadata JSON without explicit option', async () => {
      const perfPath = path.join(FIXTURES_DIR, 'ac63b747-data.csv');
      const distPath = path.join(FIXTURES_DIR, 'f9232c17-data.csv');
      const metaPath = path.join(FIXTURES_DIR, 'package_show.json');

      const rawWithMeta: RawFiles = {
        ac63b747: {
          path: perfPath,
          sha256: 'a'.repeat(64),
          bytes: 14227,
          fetchedAt: '2026-10-04T12:00:00.000Z',
          finalUrl:
            'https://www.opendata.nhs.scot/dataset/e9dbef36/resource/ac63b747-fdcc-410c-ae43-de6fe3c46abf/download/perf.csv',
        },
        f9232c17: {
          path: distPath,
          sha256: 'b'.repeat(64),
          bytes: 23450,
          fetchedAt: '2026-10-04T12:00:00.000Z',
          finalUrl:
            'https://www.opendata.nhs.scot/dataset/e9dbef36/resource/f9232c17-a90e-4d35-a863-11bdb3a748c0/download/dist.csv',
        },
        'package-show-meta': {
          path: metaPath,
          sha256: 'c'.repeat(64),
          bytes: 34021,
          fetchedAt: '2026-10-04T12:00:00.000Z',
          finalUrl: SCOTLAND_CKAN_PACKAGE_SHOW_URL,
        },
      };

      const refData = buildScotlandReferenceData();
      const release = await scotlandSource.normalise(rawWithMeta, refData);
      expect(release.nation).toBe('scotland');
      expect(release.reportingPeriod).toBe('2026-08-31');
      // Must reflect the official PHS publish date from metadata (2026-09-29), not fetchedAt (2026-10-04)
      expect(release.publicationDate).toBe('2026-09-29');
    });
  });
});
