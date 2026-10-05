import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect, vi } from 'vitest';
import { reportingPeriod, publicationDate } from '@kyw/model/period';
import type { PipelineState } from '../../src/source.js';
import { SourceUnavailableError } from '../../src/errors.js';
import {
  SCOTLAND_CKAN_PACKAGE_SHOW_URL,
  STAGE_OF_TREATMENT_PERFORMANCE_RESOURCE_ID,
  STAGE_OF_TREATMENT_DISTRIBUTION_RESOURCE_ID,
  inferReportingPeriod,
  buildScotlandFingerprint,
  discoverScotlandReleases,
  type CkanPackageShowResponse,
} from '../../src/scotland/discover.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const FIXTURES_DIR = path.resolve(__dirname, '../../fixtures/scotland/stage-of-treatment');

describe('Scotland CKAN Discover (T-6.2)', () => {
  describe('inferReportingPeriod', () => {
    it('extracts reporting period from URL ending in _monYY.csv', () => {
      expect(
        inferReportingPeriod(
          'https://opendata.nhs.scot/.../sot_performance_ongoing_completed_waits_monthly_aug26.csv',
          '2026-09-29',
        ),
      ).toBe('2026-08-31');

      expect(
        inferReportingPeriod(
          'https://opendata.nhs.scot/.../sot_distribution_of_ongoing_completed_waits_monthly_feb24.csv',
          '2024-03-26',
        ),
      ).toBe('2024-02-29');
    });

    it('falls back to prior calendar month end when filename pattern is not found', () => {
      expect(
        inferReportingPeriod('https://opendata.nhs.scot/.../custom_filename.csv', '2026-09-29'),
      ).toBe('2026-08-31');

      expect(
        inferReportingPeriod('https://opendata.nhs.scot/.../custom_filename.csv', '2026-01-15'),
      ).toBe('2025-12-31');
    });
  });

  describe('buildScotlandFingerprint', () => {
    it('constructs deterministic fingerprint from both resources', () => {
      const period = reportingPeriod('2026-08-31');
      const fp = buildScotlandFingerprint(
        period,
        'https://example.com/perf.csv',
        '2026-09-29T12:55:00',
        'https://example.com/dist.csv',
        '2026-09-29T08:58:15',
      );
      expect(fp).toBe(
        '2026-08-31:https://example.com/perf.csv#2026-09-29T12:55:00|https://example.com/dist.csv#2026-09-29T08:58:15',
      );
    });
  });

  describe('discoverScotlandReleases', () => {
    async function loadFixturePackageShow(): Promise<CkanPackageShowResponse> {
      const raw = await fs.readFile(path.join(FIXTURES_DIR, 'package_show.json'), 'utf-8');
      return JSON.parse(raw) as CkanPackageShowResponse;
    }

    it('discovers a new release candidate when state is empty', async () => {
      const packageShow = await loadFixturePackageShow();
      const emptyState: PipelineState = {
        lastCheck: '2026-09-01T00:00:00.000Z',
        seenFiles: {},
      };

      const fetchJson = vi.fn().mockResolvedValue(packageShow);
      const candidates = await discoverScotlandReleases(emptyState, { fetchJson });

      expect(fetchJson).toHaveBeenCalledWith(SCOTLAND_CKAN_PACKAGE_SHOW_URL);
      expect(candidates).toHaveLength(1);

      const candidate = candidates[0];
      expect(candidate).toBeDefined();
      expect(candidate?.reportingPeriod).toBe(reportingPeriod('2026-08-31'));
      expect(candidate?.publicationDate).toBe(publicationDate('2026-09-29'));
      expect(candidate?.revised).toBe(false);
      expect(candidate?.performanceResourceId).toBe(STAGE_OF_TREATMENT_PERFORMANCE_RESOURCE_ID);
      expect(candidate?.distributionResourceId).toBe(STAGE_OF_TREATMENT_DISTRIBUTION_RESOURCE_ID);
      expect(candidate?.performanceLastModified).toBe('2026-09-29T12:55:00.368498');
      expect(candidate?.distributionLastModified).toBe('2026-09-29T08:58:15.493218');
      expect(candidate?.sourceUrls).toEqual([
        candidate?.performanceUrl,
        candidate?.distributionUrl,
      ]);
      expect(candidate?.fingerprint).toBe(
        buildScotlandFingerprint(
          candidate?.reportingPeriod ?? reportingPeriod('2026-08-31'),
          candidate?.performanceUrl ?? '',
          candidate?.performanceLastModified ?? '',
          candidate?.distributionUrl ?? '',
          candidate?.distributionLastModified ?? '',
        ),
      );
    });

    it('returns empty array when release fingerprint is already recorded in state', async () => {
      const packageShow = await loadFixturePackageShow();
      const perfResource = packageShow.result?.resources?.find(
        (r) => r.id === STAGE_OF_TREATMENT_PERFORMANCE_RESOURCE_ID,
      );
      const distResource = packageShow.result?.resources?.find(
        (r) => r.id === STAGE_OF_TREATMENT_DISTRIBUTION_RESOURCE_ID,
      );

      const fingerprint = buildScotlandFingerprint(
        reportingPeriod('2026-08-31'),
        perfResource?.url ?? '',
        perfResource?.last_modified ?? '',
        distResource?.url ?? '',
        distResource?.last_modified ?? '',
      );

      const state: PipelineState = {
        lastCheck: '2026-09-30T00:00:00.000Z',
        seenFiles: {
          [fingerprint]: {
            sha256: 'some-sha256',
            fetchedAt: '2026-09-30T00:00:00.000Z',
          },
        },
      };

      const fetchJson = vi.fn().mockResolvedValue(packageShow);
      const candidates = await discoverScotlandReleases(state, { fetchJson });

      expect(candidates).toHaveLength(0);
    });

    it('flags revised as true when period was seen before with a different fingerprint', async () => {
      const packageShow = await loadFixturePackageShow();
      const olderFingerprint = '2026-08-31:older-perf-url#older-time|older-dist-url#older-time';

      const state: PipelineState = {
        lastCheck: '2026-09-01T00:00:00.000Z',
        seenFiles: {
          [olderFingerprint]: {
            sha256: 'older-sha256',
            fetchedAt: '2026-09-01T00:00:00.000Z',
          },
        },
      };

      const fetchJson = vi.fn().mockResolvedValue(packageShow);
      const candidates = await discoverScotlandReleases(state, { fetchJson });

      expect(candidates).toHaveLength(1);
      expect(candidates[0]?.revised).toBe(true);
    });

    it('returns empty array and logs warning when last_modified dates mismatch (partial upload)', async () => {
      const packageShow = await loadFixturePackageShow();
      const warnSpy = vi.spyOn(console, 'warn').mockReturnValue(undefined);

      const currentResources = packageShow.result?.resources ?? [];
      const modifiedResources = currentResources.map((r) => {
        if (r.id === STAGE_OF_TREATMENT_DISTRIBUTION_RESOURCE_ID) {
          return {
            ...r,
            last_modified: '2026-09-28T08:58:15.493218', // previous day
          };
        }
        return r;
      });

      const mismatchedPackageShow: CkanPackageShowResponse = {
        ...packageShow,
        result: {
          ...packageShow.result,
          resources: modifiedResources,
        },
      };

      const emptyState: PipelineState = {
        lastCheck: '2026-09-01T00:00:00.000Z',
        seenFiles: {},
      };

      const fetchJson = vi.fn().mockResolvedValue(mismatchedPackageShow);
      const candidates = await discoverScotlandReleases(emptyState, { fetchJson });

      expect(candidates).toHaveLength(0);
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Scotland CKAN resources last_modified date mismatch'),
      );
      warnSpy.mockRestore();
    });

    it('throws SourceUnavailableError when required performance resource is missing', async () => {
      const packageShow = await loadFixturePackageShow();
      const currentResources = packageShow.result?.resources ?? [];
      const filteredResources = currentResources.filter(
        (r) => r.id !== STAGE_OF_TREATMENT_PERFORMANCE_RESOURCE_ID,
      );

      const invalidPackageShow: CkanPackageShowResponse = {
        ...packageShow,
        result: {
          ...packageShow.result,
          resources: filteredResources,
        },
      };

      const emptyState: PipelineState = {
        lastCheck: '2026-09-01T00:00:00.000Z',
        seenFiles: {},
      };

      const fetchJson = vi.fn().mockResolvedValue(invalidPackageShow);
      await expect(discoverScotlandReleases(emptyState, { fetchJson })).rejects.toThrow(
        SourceUnavailableError,
      );
    });

    it('throws SourceUnavailableError when required distribution resource is missing', async () => {
      const packageShow = await loadFixturePackageShow();
      const currentResources = packageShow.result?.resources ?? [];
      const filteredResources = currentResources.filter(
        (r) => r.id !== STAGE_OF_TREATMENT_DISTRIBUTION_RESOURCE_ID,
      );

      const invalidPackageShow: CkanPackageShowResponse = {
        ...packageShow,
        result: {
          ...packageShow.result,
          resources: filteredResources,
        },
      };

      const emptyState: PipelineState = {
        lastCheck: '2026-09-01T00:00:00.000Z',
        seenFiles: {},
      };

      const fetchJson = vi.fn().mockResolvedValue(invalidPackageShow);
      await expect(discoverScotlandReleases(emptyState, { fetchJson })).rejects.toThrow(
        SourceUnavailableError,
      );
    });

    it('throws SourceUnavailableError when resource has missing URL or last_modified', async () => {
      const packageShow = await loadFixturePackageShow();
      const currentResources = packageShow.result?.resources ?? [];
      const modifiedResources = currentResources.map((r) => {
        if (r.id === STAGE_OF_TREATMENT_PERFORMANCE_RESOURCE_ID) {
          return {
            ...r,
            last_modified: null,
          };
        }
        return r;
      });

      const invalidPackageShow: CkanPackageShowResponse = {
        ...packageShow,
        result: {
          ...packageShow.result,
          resources: modifiedResources,
        },
      };

      const emptyState: PipelineState = {
        lastCheck: '2026-09-01T00:00:00.000Z',
        seenFiles: {},
      };

      const fetchJson = vi.fn().mockResolvedValue(invalidPackageShow);
      await expect(discoverScotlandReleases(emptyState, { fetchJson })).rejects.toThrow(
        SourceUnavailableError,
      );
    });

    it('throws SourceUnavailableError when fetch fails', async () => {
      const emptyState: PipelineState = {
        lastCheck: '2026-09-01T00:00:00.000Z',
        seenFiles: {},
      };

      const fetchJson = vi.fn().mockRejectedValue(new Error('Network error 500'));
      await expect(discoverScotlandReleases(emptyState, { fetchJson })).rejects.toThrow(
        SourceUnavailableError,
      );
    });
  });
});
