import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';
import { reportingPeriod, publicationDate } from '@kyw/model/period';
import { reportingUnitId, statisticId, waitStageId, specialtyId } from '@kyw/model/ids';
import { walesReleaseSchema } from '@kyw/model/wales/schema';
import type { PipelineState, ReleaseCandidate, RawFiles } from '../../src/source.js';
import {
  STATSWALES_API_BASE,
  KEY_MEASURES_DATASET_ID,
  THRESHOLD_COUNTS_DATASET_ID,
  type StatsWalesDatasetMetadata,
} from '../../src/wales/api.js';
import { buildWalesFingerprint } from '../../src/wales/discover.js';
import {
  createWalesSource,
  walesSource,
  resolveWalesRawFiles,
  extractLatestPeriodFromRawWalesValues,
  normaliseWalesWithSources,
} from '../../src/wales/source.js';
import { parseWalesKeyMeasuresCsv } from '../../src/wales/parse.js';
import { buildWalesReferenceData } from '../../src/reference/wales/build.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const FIXTURES_DIR = path.resolve(__dirname, '../../fixtures/wales');

describe('Wales Source Adapter (T-5.5)', () => {
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

  describe('resolveWalesRawFiles', () => {
    it('resolves Key Measures and Threshold Counts raw files by URL/ID match', () => {
      const kmUrl = `${STATSWALES_API_BASE}/${KEY_MEASURES_DATASET_ID}`;
      const tcUrl = `${STATSWALES_API_BASE}/${THRESHOLD_COUNTS_DATASET_ID}`;

      const raw: RawFiles = {
        [kmUrl]: {
          path: '/path/to/acd9529c.csv',
          sha256: 'a'.repeat(64),
          bytes: 100,
          fetchedAt: '2026-09-17T12:00:00.000Z',
          finalUrl: kmUrl,
        },
        [tcUrl]: {
          path: '/path/to/3ef3a1d8.csv',
          sha256: 'b'.repeat(64),
          bytes: 200,
          fetchedAt: '2026-09-17T12:00:00.000Z',
          finalUrl: tcUrl,
        },
      };

      const resolved = resolveWalesRawFiles(raw);
      expect(resolved.keyMeasures.url).toBe(kmUrl);
      expect(resolved.thresholdCounts.url).toBe(tcUrl);
    });

    it('throws error when RawFiles is empty', () => {
      expect(() => resolveWalesRawFiles({})).toThrow('Cannot resolve empty Wales RawFiles');
    });

    it('throws error when one dataset is missing', () => {
      const kmUrl = `${STATSWALES_API_BASE}/${KEY_MEASURES_DATASET_ID}`;
      const raw: RawFiles = {
        [kmUrl]: {
          path: '/path/to/acd9529c.csv',
          sha256: 'a'.repeat(64),
          bytes: 100,
          fetchedAt: '2026-09-17T12:00:00.000Z',
          finalUrl: kmUrl,
        },
      };
      expect(() => resolveWalesRawFiles(raw)).toThrow(
        `Wales normalisation requires both Key Measures (${KEY_MEASURES_DATASET_ID}) and Threshold Counts (${THRESHOLD_COUNTS_DATASET_ID}) raw files`,
      );
    });
  });

  describe('extractLatestPeriodFromRawWalesValues', () => {
    it('extracts latest period from parsed raw values', async () => {
      const kmCsv = await fs.readFile(path.join(FIXTURES_DIR, 'acd9529c-data.csv'), 'utf-8');
      const parsed = parseWalesKeyMeasuresCsv(kmCsv);
      const period = extractLatestPeriodFromRawWalesValues(parsed);
      expect(period).toBe('2026-07-31');
    });

    it('throws SchemaChangeError when values array has no valid dates', () => {
      expect(() => extractLatestPeriodFromRawWalesValues([])).toThrow(
        'No valid DateCode found in Wales dataset',
      );
    });
  });

  describe('createWalesSource adapter end-to-end', () => {
    it('discovers release candidate when state is empty', async () => {
      const { kmMeta, tcMeta } = await loadFixtureMetadata();
      const customSource = createWalesSource({
        discoverOptions: {
          metadataFetcher: (id: string) => {
            if (id === KEY_MEASURES_DATASET_ID) return Promise.resolve(kmMeta);
            if (id === THRESHOLD_COUNTS_DATASET_ID) return Promise.resolve(tcMeta);
            return Promise.reject(new Error(`Unknown dataset: ${id}`));
          },
        },
      });

      const emptyState: PipelineState = {
        lastCheck: '2026-09-01T00:00:00.000Z',
        seenFiles: {},
      };

      const candidates = await customSource.discover(emptyState);
      expect(candidates).toHaveLength(1);
      expect(candidates[0]?.reportingPeriod).toBe('2026-07-31');
      expect(candidates[0]?.sourceUrls).toEqual([
        `${STATSWALES_API_BASE}/${KEY_MEASURES_DATASET_ID}`,
        `${STATSWALES_API_BASE}/${THRESHOLD_COUNTS_DATASET_ID}`,
      ]);
    });

    it('discovers no candidates when version fingerprint is already seen', async () => {
      const { kmMeta, tcMeta } = await loadFixtureMetadata();
      const fingerprint = buildWalesFingerprint(
        reportingPeriod('2026-07-31'),
        kmMeta.published_revision?.id ?? '',
        tcMeta.published_revision?.id ?? '',
      );

      const customSource = createWalesSource({
        discoverOptions: {
          metadataFetcher: (id: string) => {
            if (id === KEY_MEASURES_DATASET_ID) return Promise.resolve(kmMeta);
            if (id === THRESHOLD_COUNTS_DATASET_ID) return Promise.resolve(tcMeta);
            return Promise.reject(new Error(`Unknown dataset: ${id}`));
          },
        },
      });

      const seenState: PipelineState = {
        lastCheck: '2026-09-18T00:00:00.000Z',
        seenFiles: {
          [fingerprint]: {
            sha256: 'a'.repeat(64),
            fetchedAt: '2026-09-18T00:00:00.000Z',
          },
        },
      };

      const candidates = await customSource.discover(seenState);
      expect(candidates).toEqual([]);
    });

    it('fetches candidate datasets with mock fetchImpl', async () => {
      const kmCsvFixture = await fs.readFile(path.join(FIXTURES_DIR, 'acd9529c-data.csv'));
      const tcCsvFixture = await fs.readFile(path.join(FIXTURES_DIR, '3ef3a1d8-data.csv'));

      const mockFetch: typeof fetch = (input, init) => {
        const urlStr =
          typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;

        if (
          urlStr === `${STATSWALES_API_BASE}/${KEY_MEASURES_DATASET_ID}/data` &&
          init?.method === 'POST'
        ) {
          return Promise.resolve(
            new Response(JSON.stringify({ filterId: 'km-filter-123' }), {
              status: 200,
              headers: { 'Content-Type': 'application/json' },
            }),
          );
        }
        if (
          urlStr === `${STATSWALES_API_BASE}/${THRESHOLD_COUNTS_DATASET_ID}/data` &&
          init?.method === 'POST'
        ) {
          return Promise.resolve(
            new Response(JSON.stringify({ filterId: 'tc-filter-456' }), {
              status: 200,
              headers: { 'Content-Type': 'application/json' },
            }),
          );
        }
        if (
          urlStr ===
          `${STATSWALES_API_BASE}/${KEY_MEASURES_DATASET_ID}/data/km-filter-123?format=csv`
        ) {
          return Promise.resolve(new Response(kmCsvFixture, { status: 200 }));
        }
        if (
          urlStr ===
          `${STATSWALES_API_BASE}/${THRESHOLD_COUNTS_DATASET_ID}/data/tc-filter-456?format=csv`
        ) {
          return Promise.resolve(new Response(tcCsvFixture, { status: 200 }));
        }

        return Promise.resolve(new Response('Not Found', { status: 404 }));
      };

      const customSource = createWalesSource({
        fetchOptions: {
          fetchImpl: mockFetch,
        },
      });

      const candidate: ReleaseCandidate = {
        reportingPeriod: reportingPeriod('2026-07-31'),
        sourceUrls: [
          `${STATSWALES_API_BASE}/${KEY_MEASURES_DATASET_ID}`,
          `${STATSWALES_API_BASE}/${THRESHOLD_COUNTS_DATASET_ID}`,
        ],
        revised: false,
        fingerprint: 'test-fingerprint',
      };

      const raw = await customSource.fetch(candidate);

      const kmKey = `${STATSWALES_API_BASE}/${KEY_MEASURES_DATASET_ID}`;
      const tcKey = `${STATSWALES_API_BASE}/${THRESHOLD_COUNTS_DATASET_ID}`;

      expect(raw[kmKey]).toBeDefined();
      expect(raw[tcKey]).toBeDefined();
      expect(raw[kmKey]?.bytes).toBe(kmCsvFixture.length);
      expect(raw[tcKey]?.bytes).toBe(tcCsvFixture.length);
    });

    it('normalises raw fixture files into a valid Release<"wales"> passing schema', async () => {
      const kmPath = path.join(FIXTURES_DIR, 'acd9529c-data.csv');
      const tcPath = path.join(FIXTURES_DIR, '3ef3a1d8-data.csv');

      const kmUrl = `${STATSWALES_API_BASE}/${KEY_MEASURES_DATASET_ID}`;
      const tcUrl = `${STATSWALES_API_BASE}/${THRESHOLD_COUNTS_DATASET_ID}`;

      const raw: RawFiles = {
        [kmUrl]: {
          path: kmPath,
          sha256: 'a'.repeat(64),
          bytes: 77052,
          fetchedAt: '2026-09-17T12:00:00.000Z',
          finalUrl: kmUrl,
        },
        [tcUrl]: {
          path: tcPath,
          sha256: 'b'.repeat(64),
          bytes: 73439,
          fetchedAt: '2026-09-17T12:00:00.000Z',
          finalUrl: tcUrl,
        },
      };

      const customSource = createWalesSource({
        defaultPublicationDate: publicationDate('2026-09-17'),
      });

      const refData = buildWalesReferenceData();
      const release = await customSource.normalise(raw, refData);

      // Schema verification
      expect(() => walesReleaseSchema.parse(release)).not.toThrow();

      expect(release.nation).toBe('wales');
      expect(release.reportingPeriod).toBe('2026-07-31');
      expect(release.publicationDate).toBe('2026-09-17');
      expect(release.figures.length).toBeGreaterThan(0);
      expect(release.comparisonFigures.length).toBeGreaterThan(0);

      // Verify reporting units: 7A1 through 7A7
      expect(release.reportingUnits).toEqual([
        reportingUnitId('wales', '7A1'),
        reportingUnitId('wales', '7A2'),
        reportingUnitId('wales', '7A3'),
        reportingUnitId('wales', '7A4'),
        reportingUnitId('wales', '7A5'),
        reportingUnitId('wales', '7A6'),
        reportingUnitId('wales', '7A7'),
      ]);

      // Cardiff and Vale (7A4) Trauma & Orthopaedics (110)
      const cav7A4 = reportingUnitId('wales', '7A4');
      const toSpec = specialtyId('wales', '110');
      const cavFigures = release.figures.filter(
        (f) => f.reportingUnit === cav7A4 && f.specialty === toSpec,
      );
      expect(cavFigures).toHaveLength(4);

      const median = cavFigures.find(
        (f) => f.statistic === statisticId('wales', 'median-ongoing-wait'),
      );
      expect(median?.value).toEqual({ status: 'published', value: 29.5, provisional: false });

      const within = cavFigures.find(
        (f) => f.statistic === statisticId('wales', 'within-waiting-standard'),
      );
      expect(within?.value).toEqual({ status: 'published', value: 45.9, provisional: false });

      const longWait = cavFigures.find(
        (f) => f.statistic === statisticId('wales', 'long-wait-count'),
      );
      expect(longWait?.value).toEqual({ status: 'published', value: 4341, provisional: false });

      const total = cavFigures.find((f) => f.statistic === statisticId('wales', 'total-waiting'));
      expect(median?.waitStage).toBe(waitStageId('wales', 'rtt-pathway'));
      expect(total?.value).toEqual({ status: 'published', value: 14090, provisional: false });
    });

    it('normaliseWalesWithSources works directly with default singleton adapter', async () => {
      expect(walesSource.nation).toBe('wales');
      const kmPath = path.join(FIXTURES_DIR, 'acd9529c-data.csv');
      const tcPath = path.join(FIXTURES_DIR, '3ef3a1d8-data.csv');

      const raw: RawFiles = {
        acd9529c: {
          path: kmPath,
          sha256: 'a'.repeat(64),
          bytes: 77052,
          fetchedAt: '2026-09-17T12:00:00.000Z',
          finalUrl: `${STATSWALES_API_BASE}/${KEY_MEASURES_DATASET_ID}`,
        },
        '3ef3a1d8': {
          path: tcPath,
          sha256: 'b'.repeat(64),
          bytes: 73439,
          fetchedAt: '2026-09-17T12:00:00.000Z',
          finalUrl: `${STATSWALES_API_BASE}/${THRESHOLD_COUNTS_DATASET_ID}`,
        },
      };

      const release = await normaliseWalesWithSources(raw, {
        publicationDate: publicationDate('2026-09-17'),
      });
      expect(release.nation).toBe('wales');
      expect(release.reportingPeriod).toBe('2026-07-31');
      expect(release.figures.length).toBeGreaterThan(0);
    });

    it('extracts official publication date from metadata JSON without explicit option', async () => {
      const kmPath = path.join(FIXTURES_DIR, 'acd9529c-data.csv');
      const tcPath = path.join(FIXTURES_DIR, '3ef3a1d8-data.csv');
      const metaPath = path.join(FIXTURES_DIR, 'acd9529c-metadata.json');

      const rawWithMeta: RawFiles = {
        acd9529c: {
          path: kmPath,
          sha256: 'a'.repeat(64),
          bytes: 77052,
          fetchedAt: '2026-10-04T12:00:00.000Z',
          finalUrl: `${STATSWALES_API_BASE}/${KEY_MEASURES_DATASET_ID}/data`,
        },
        '3ef3a1d8': {
          path: tcPath,
          sha256: 'b'.repeat(64),
          bytes: 73439,
          fetchedAt: '2026-10-04T12:00:00.000Z',
          finalUrl: `${STATSWALES_API_BASE}/${THRESHOLD_COUNTS_DATASET_ID}/data`,
        },
        'acd9529c-meta': {
          path: metaPath,
          sha256: 'c'.repeat(64),
          bytes: 10935,
          fetchedAt: '2026-10-04T12:00:00.000Z',
          finalUrl: `${STATSWALES_API_BASE}/${KEY_MEASURES_DATASET_ID}`,
        },
      };

      const refData = buildWalesReferenceData();
      const release = await walesSource.normalise(rawWithMeta, refData);
      expect(release.nation).toBe('wales');
      expect(release.reportingPeriod).toBe('2026-07-31');
      // Must reflect the official StatsWales publish date from metadata, not fetchedAt (2026-10-04)
      expect(release.publicationDate).toBe('2026-09-17');
    });
  });
});
