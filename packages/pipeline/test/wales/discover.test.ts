import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';
import { reportingPeriod } from '@kyw/model/period';
import type { PipelineState } from '../../src/source.js';
import { SourceUnavailableError } from '../../src/errors.js';
import {
  STATSWALES_API_BASE,
  KEY_MEASURES_DATASET_ID,
  THRESHOLD_COUNTS_DATASET_ID,
  dateCodeFromReportingPeriod,
  reportingPeriodFromDateCode,
  buildKeyMeasuresFilterBody,
  buildThresholdCountsFilterBody,
  getStatsWalesMetadata,
  postStatsWalesFilter,
  fetchStatsWalesCodedCsv,
  type StatsWalesDatasetMetadata,
} from '../../src/wales/api.js';
import { buildWalesFingerprint, discoverWalesReleases } from '../../src/wales/discover.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const FIXTURES_DIR = path.resolve(__dirname, '../../fixtures/wales');

function toUrlString(input: string | URL | Request): string {
  if (typeof input === 'string') return input;
  if (input instanceof URL) return input.toString();
  return input.url;
}

describe('Wales API & Discover', () => {
  describe('Filter body builders', () => {
    it('converts between ReportingPeriod and DateCode correctly', () => {
      const period = reportingPeriod('2026-07-31');
      expect(dateCodeFromReportingPeriod(period)).toBe('202607');
      expect(reportingPeriodFromDateCode('202607')).toBe('2026-07-31');
      expect(reportingPeriodFromDateCode('202402')).toBe('2024-02-29'); // leap year
      expect(reportingPeriodFromDateCode('202502')).toBe('2025-02-28');
    });

    it('builds Key Measures filter body with latest and year-earlier date codes', () => {
      const body = buildKeyMeasuresFilterBody(reportingPeriod('2026-07-31'));
      expect(body).toEqual({
        filters: [{ DateCode: ['202607', '202507'] }],
        options: { data_value_type: 'raw_extended' },
      });
    });

    it('builds Threshold Counts filter body with latest, year-earlier, stage T, and age T', () => {
      const body = buildThresholdCountsFilterBody(reportingPeriod('2026-07-31'));
      expect(body).toEqual({
        filters: [
          { DateCode: ['202607', '202507'] },
          { StageOfPathwayCode: ['T'] },
          { AgeGroupAtReferralCode: ['T'] },
        ],
        options: { data_value_type: 'raw_extended' },
      });
    });
  });

  describe('buildWalesFingerprint', () => {
    it('constructs deterministic fingerprint prefixed with reporting period', () => {
      const period = reportingPeriod('2026-07-31');
      const fp = buildWalesFingerprint(period, 'km-ver-1', 'tc-ver-2');
      expect(fp).toBe('2026-07-31:km-ver-1:tc-ver-2');
    });
  });

  describe('API client functions', () => {
    it('fetches and parses dataset metadata via injectable fetch', async () => {
      const kmMetaFixture = await fs.readFile(
        path.join(FIXTURES_DIR, 'acd9529c-metadata.json'),
        'utf-8',
      );

      const mockFetch: typeof fetch = (input) => {
        const urlStr = toUrlString(input);
        if (urlStr === `${STATSWALES_API_BASE}/${KEY_MEASURES_DATASET_ID}`) {
          return Promise.resolve(new Response(kmMetaFixture, { status: 200 }));
        }
        return Promise.resolve(new Response('Not Found', { status: 404 }));
      };

      const meta = await getStatsWalesMetadata(KEY_MEASURES_DATASET_ID, {
        fetchImpl: mockFetch,
        cacheDir: path.join(__dirname, '../../.cache/test-wales-api'),
      });

      expect(meta.id).toBe(KEY_MEASURES_DATASET_ID);
      expect(meta.published_revision?.id).toBe('25c7133b-288b-4d7f-87c1-d8b7258a7a49');
      expect(meta.published_revision?.coverage_end_date).toBe('2026-07-31');
    });

    it('posts filter and extracts filterId', async () => {
      const mockFetch: typeof fetch = (input, init) => {
        const urlStr = toUrlString(input);
        if (
          urlStr === `${STATSWALES_API_BASE}/${KEY_MEASURES_DATASET_ID}/data` &&
          init?.method === 'POST'
        ) {
          return Promise.resolve(
            new Response(JSON.stringify({ filterId: 'test-filter-12345' }), {
              status: 200,
              headers: { 'Content-Type': 'application/json' },
            }),
          );
        }
        return Promise.resolve(new Response('Error', { status: 400 }));
      };

      const filterBody = buildKeyMeasuresFilterBody(reportingPeriod('2026-07-31'));
      const filterId = await postStatsWalesFilter(KEY_MEASURES_DATASET_ID, filterBody, {
        fetchImpl: mockFetch,
        cacheDir: path.join(__dirname, '../../.cache/test-wales-api'),
      });

      expect(filterId).toBe('test-filter-12345');
    });

    it('downloads coded CSV to cache', async () => {
      const mockFetch: typeof fetch = (input) => {
        const urlStr = toUrlString(input);
        if (
          urlStr ===
          `${STATSWALES_API_BASE}/${KEY_MEASURES_DATASET_ID}/data/test-filter-12345?format=csv`
        ) {
          return Promise.resolve(
            new Response('Data values,Date_reference\n100,202607\n', { status: 200 }),
          );
        }
        return Promise.resolve(new Response('Error', { status: 404 }));
      };

      const result = await fetchStatsWalesCodedCsv(KEY_MEASURES_DATASET_ID, 'test-filter-12345', {
        fetchImpl: mockFetch,
        cacheDir: path.join(__dirname, '../../.cache/test-wales-api'),
      });

      expect(result.bytes).toBeGreaterThan(0);
      expect(result.sha256).toBeDefined();
    });
  });

  describe('discoverWalesReleases', () => {
    async function loadFixtureMetadata(): Promise<{
      kmMeta: StatsWalesDatasetMetadata;
      tcMeta: StatsWalesDatasetMetadata;
    }> {
      const km = await fs.readFile(path.join(FIXTURES_DIR, 'acd9529c-metadata.json'), 'utf-8');
      const tc = await fs.readFile(path.join(FIXTURES_DIR, '3ef3a1d8-metadata.json'), 'utf-8');
      return {
        kmMeta: JSON.parse(km) as StatsWalesDatasetMetadata,
        tcMeta: JSON.parse(tc) as StatsWalesDatasetMetadata,
      };
    }

    it('discovers a new release candidate when state is empty', async () => {
      const { kmMeta, tcMeta } = await loadFixtureMetadata();
      const emptyState: PipelineState = {
        lastCheck: '2026-09-01T00:00:00.000Z',
        seenFiles: {},
      };

      const metadataFetcher = (id: string): Promise<StatsWalesDatasetMetadata> => {
        if (id === KEY_MEASURES_DATASET_ID) return Promise.resolve(kmMeta);
        if (id === THRESHOLD_COUNTS_DATASET_ID) return Promise.resolve(tcMeta);
        return Promise.reject(new Error(`Unknown dataset: ${id}`));
      };

      const candidates = await discoverWalesReleases(emptyState, { metadataFetcher });

      expect(candidates).toHaveLength(1);
      const candidate = candidates[0];
      expect(candidate).toBeDefined();
      expect(candidate?.reportingPeriod).toBe('2026-07-31');
      expect(candidate?.publicationDate).toBe('2026-09-17');
      expect(candidate?.revised).toBe(false);
      expect(candidate?.keyMeasuresVersionId).toBe('25c7133b-288b-4d7f-87c1-d8b7258a7a49');
      expect(candidate?.thresholdCountsVersionId).toBe('a74af7bb-c186-4a69-9b62-3489cfd34e74');
      expect(candidate?.fingerprint).toBe(
        buildWalesFingerprint(
          reportingPeriod('2026-07-31'),
          '25c7133b-288b-4d7f-87c1-d8b7258a7a49',
          'a74af7bb-c186-4a69-9b62-3489cfd34e74',
        ),
      );
      expect(candidate?.sourceUrls).toEqual([
        `${STATSWALES_API_BASE}/${KEY_MEASURES_DATASET_ID}`,
        `${STATSWALES_API_BASE}/${THRESHOLD_COUNTS_DATASET_ID}`,
      ]);
    });

    it('returns empty array when release fingerprint is already in state', async () => {
      const { kmMeta, tcMeta } = await loadFixtureMetadata();
      const fingerprint = buildWalesFingerprint(
        reportingPeriod('2026-07-31'),
        '25c7133b-288b-4d7f-87c1-d8b7258a7a49',
        'a74af7bb-c186-4a69-9b62-3489cfd34e74',
      );

      const state: PipelineState = {
        lastCheck: '2026-09-18T00:00:00.000Z',
        seenFiles: {
          [fingerprint]: {
            sha256: 'dummy-sha256',
            fetchedAt: '2026-09-18T00:00:00.000Z',
          },
        },
      };

      const metadataFetcher = (id: string): Promise<StatsWalesDatasetMetadata> => {
        if (id === KEY_MEASURES_DATASET_ID) return Promise.resolve(kmMeta);
        if (id === THRESHOLD_COUNTS_DATASET_ID) return Promise.resolve(tcMeta);
        return Promise.reject(new Error(`Unknown dataset: ${id}`));
      };

      const candidates = await discoverWalesReleases(state, { metadataFetcher });
      expect(candidates).toHaveLength(0);
    });

    it('flags revised as true when period was seen before with a different version', async () => {
      const { kmMeta, tcMeta } = await loadFixtureMetadata();
      const olderFingerprint = '2026-07-31:older-km-id:older-tc-id';

      const state: PipelineState = {
        lastCheck: '2026-09-01T00:00:00.000Z',
        seenFiles: {
          [olderFingerprint]: {
            sha256: 'older-sha256',
            fetchedAt: '2026-09-01T00:00:00.000Z',
          },
        },
      };

      const metadataFetcher = (id: string): Promise<StatsWalesDatasetMetadata> => {
        if (id === KEY_MEASURES_DATASET_ID) return Promise.resolve(kmMeta);
        if (id === THRESHOLD_COUNTS_DATASET_ID) return Promise.resolve(tcMeta);
        return Promise.reject(new Error(`Unknown dataset: ${id}`));
      };

      const candidates = await discoverWalesReleases(state, { metadataFetcher });
      expect(candidates).toHaveLength(1);
      expect(candidates[0]?.revised).toBe(true);
    });

    it('throws SourceUnavailableError when coverage dates mismatch', async () => {
      const { kmMeta, tcMeta } = await loadFixtureMetadata();
      const mismatchedTcMeta: StatsWalesDatasetMetadata = {
        ...tcMeta,
        published_revision: {
          id: tcMeta.published_revision?.id ?? 'tc-id',
          publish_at: tcMeta.published_revision?.publish_at ?? '2026-09-17T08:30:00.000Z',
          coverage_end_date: '2026-06-30',
        },
      };

      const metadataFetcher = (id: string): Promise<StatsWalesDatasetMetadata> => {
        if (id === KEY_MEASURES_DATASET_ID) return Promise.resolve(kmMeta);
        if (id === THRESHOLD_COUNTS_DATASET_ID) return Promise.resolve(mismatchedTcMeta);
        return Promise.reject(new Error(`Unknown dataset: ${id}`));
      };

      const emptyState: PipelineState = {
        lastCheck: '2026-09-01T00:00:00.000Z',
        seenFiles: {},
      };

      await expect(discoverWalesReleases(emptyState, { metadataFetcher })).rejects.toThrow(
        SourceUnavailableError,
      );
    });

    it('throws SourceUnavailableError when metadata response is missing revision ID', async () => {
      const invalidKmMeta: StatsWalesDatasetMetadata = {
        id: KEY_MEASURES_DATASET_ID,
      };

      const metadataFetcher = (): Promise<StatsWalesDatasetMetadata> =>
        Promise.resolve(invalidKmMeta);

      const emptyState: PipelineState = {
        lastCheck: '2026-09-01T00:00:00.000Z',
        seenFiles: {},
      };

      await expect(discoverWalesReleases(emptyState, { metadataFetcher })).rejects.toThrow(
        SourceUnavailableError,
      );
    });
  });
});
