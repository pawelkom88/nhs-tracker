import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';
import { reportingPeriod } from '@kyw/model/period';
import { reportingUnitId } from '@kyw/model/ids';
import { englandReleaseSchema } from '@kyw/model/england/schema';
import type { PipelineState, ReleaseCandidate, RawFiles } from '../../src/source.js';
import {
  createEnglandSource,
  englandSource,
  filterEnglandCandidates,
  extractEnglandRttProviders,
  extractPeriodFromUrl,
  normaliseEnglandWithProviders,
} from '../../src/england/source.js';
import { parseEnglandXlsx } from '../../src/england/parse.js';
import { buildEnglandReferenceData } from '../../src/reference/england/build.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const FIXTURES_DIR = path.resolve(__dirname, '../../fixtures/england');

describe('England Source Adapter', () => {
  describe('filterEnglandCandidates', () => {
    const candidateJul26: ReleaseCandidate = {
      reportingPeriod: reportingPeriod('2026-07-31'),
      sourceUrls: [
        'https://www.england.nhs.uk/statistics/wp-content/uploads/sites/2/2026/09/Incomplete-Provider-Jul26-XLSX-9M-97ylx5.xlsx',
      ],
      revised: false,
      fingerprint:
        'https://www.england.nhs.uk/statistics/wp-content/uploads/sites/2/2026/09/Incomplete-Provider-Jul26-XLSX-9M-97ylx5.xlsx',
    };

    const candidateJun26: ReleaseCandidate = {
      reportingPeriod: reportingPeriod('2026-06-30'),
      sourceUrls: [
        'https://www.england.nhs.uk/statistics/wp-content/uploads/sites/2/2026/08/Incomplete-Provider-Jun26-XLSX-9M-old.xlsx',
      ],
      revised: false,
      fingerprint:
        'https://www.england.nhs.uk/statistics/wp-content/uploads/sites/2/2026/08/Incomplete-Provider-Jun26-XLSX-9M-old.xlsx',
    };

    const candidateMar26Revised: ReleaseCandidate = {
      reportingPeriod: reportingPeriod('2026-03-31'),
      sourceUrls: [
        'https://www.england.nhs.uk/statistics/wp-content/uploads/sites/2/2026/06/Incomplete-Provider-Mar26-XLSX-9M-revised.xlsx',
      ],
      revised: true,
      fingerprint:
        'https://www.england.nhs.uk/statistics/wp-content/uploads/sites/2/2026/06/Incomplete-Provider-Mar26-XLSX-9M-revised.xlsx',
    };

    const candidateMay25Revised: ReleaseCandidate = {
      reportingPeriod: reportingPeriod('2025-05-31'),
      sourceUrls: [
        'https://www.england.nhs.uk/statistics/wp-content/uploads/sites/2/2025/08/Incomplete-Provider-May25-XLSX-9M-revised.xlsx',
      ],
      revised: true,
      fingerprint:
        'https://www.england.nhs.uk/statistics/wp-content/uploads/sites/2/2025/08/Incomplete-Provider-May25-XLSX-9M-revised.xlsx',
    };

    const jul26Url = candidateJul26.sourceUrls[0] ?? '';
    const jun26Url = candidateJun26.sourceUrls[0] ?? '';

    it('returns all candidates when state.seenFiles is empty', () => {
      const state: PipelineState = {
        lastCheck: '2026-10-01T00:00:00.000Z',
        seenFiles: {},
      };
      const result = filterEnglandCandidates(
        [candidateJul26, candidateJun26, candidateMar26Revised],
        state,
      );
      expect(result.length).toBe(3);
      // Sorted by reportingPeriod ascending
      expect(result[0]?.reportingPeriod).toBe('2026-03-31');
      expect(result[1]?.reportingPeriod).toBe('2026-06-30');
      expect(result[2]?.reportingPeriod).toBe('2026-07-31');
    });

    it('returns empty list when all candidate URLs have already been seen', () => {
      const state: PipelineState = {
        lastCheck: '2026-10-01T00:00:00.000Z',
        seenFiles: {
          [jul26Url]: {
            sha256: 'a'.repeat(64),
            fetchedAt: '2026-10-01T00:00:00.000Z',
          },
          [jun26Url]: {
            sha256: 'b'.repeat(64),
            fetchedAt: '2026-09-01T00:00:00.000Z',
          },
        },
      };
      const result = filterEnglandCandidates([candidateJul26, candidateJun26], state);
      expect(result).toEqual([]);
    });

    it('discovers a newer period when state has older period', () => {
      const state: PipelineState = {
        lastCheck: '2026-10-01T00:00:00.000Z',
        seenFiles: {
          [jun26Url]: {
            sha256: 'b'.repeat(64),
            fetchedAt: '2026-09-01T00:00:00.000Z',
          },
        },
      };
      const result = filterEnglandCandidates([candidateJul26, candidateJun26], state);
      expect(result).toEqual([candidateJul26]);
    });

    it('detects a revised candidate URL within the 13-month window', () => {
      const state: PipelineState = {
        lastCheck: '2026-10-01T00:00:00.000Z',
        seenFiles: {
          [jul26Url]: {
            sha256: 'a'.repeat(64),
            fetchedAt: '2026-10-01T00:00:00.000Z',
          },
          // Original unrevised Mar 2026 URL
          'https://www.england.nhs.uk/statistics/wp-content/uploads/sites/2/2026/05/Incomplete-Provider-Mar26-XLSX-9M-original.xlsx':
            {
              sha256: 'c'.repeat(64),
              fetchedAt: '2026-05-15T00:00:00.000Z',
            },
        },
      };
      // Candidate has the revised URL for Mar 2026
      const result = filterEnglandCandidates([candidateJul26, candidateMar26Revised], state);
      expect(result).toEqual([candidateMar26Revised]);
    });

    it('ignores revisions older than 13 months from latest period', () => {
      // Latest seen is Jul 2026. May 2025 is 14 months prior (> 13 months).
      const state: PipelineState = {
        lastCheck: '2026-10-01T00:00:00.000Z',
        seenFiles: {
          [jul26Url]: {
            sha256: 'a'.repeat(64),
            fetchedAt: '2026-10-01T00:00:00.000Z',
          },
          'https://www.england.nhs.uk/statistics/wp-content/uploads/sites/2/2025/07/Incomplete-Provider-May25-XLSX-9M-orig.xlsx':
            {
              sha256: 'd'.repeat(64),
              fetchedAt: '2025-07-15T00:00:00.000Z',
            },
        },
      };
      const result = filterEnglandCandidates([candidateJul26, candidateMay25Revised], state);
      expect(result).toEqual([]);
    });

    it('discovers missed period within 13-month window when state already has newer period', () => {
      // State has Jul 2026, but Jun 2026 was missed (e.g. transient error during previous run)
      const state: PipelineState = {
        lastCheck: '2026-10-01T00:00:00.000Z',
        seenFiles: {
          [jul26Url]: {
            sha256: 'a'.repeat(64),
            fetchedAt: '2026-10-01T00:00:00.000Z',
          },
        },
      };
      const result = filterEnglandCandidates([candidateJul26, candidateJun26], state);
      // Jun 2026 is within 13 months and has not been seen -> should be discovered
      expect(result).toEqual([candidateJun26]);
    });
  });

  describe('extractPeriodFromUrl', () => {
    it('extracts reporting period from both standard and shortened URL patterns', () => {
      expect(
        extractPeriodFromUrl(
          'https://www.england.nhs.uk/statistics/wp-content/uploads/sites/2/2026/09/Incomplete-Provider-Jul26-XLSX-9M-97ylx5.xlsx',
        ),
      ).toBe('2026-07-31');
      expect(
        extractPeriodFromUrl(
          'https://www.england.nhs.uk/statistics/wp-content/uploads/sites/2/2026/09/Incomplete-Provider-Jul26.xlsx',
        ),
      ).toBe('2026-07-31');
      expect(extractPeriodFromUrl('Incomplete-Provider-Mar26-revised.xlsx')).toBe('2026-03-31');
      expect(extractPeriodFromUrl('https://example.com/other-file.xlsx')).toBeNull();
    });
  });

  describe('extractEnglandRttProviders', () => {
    it('extracts unique provider definitions from parsed rows', async () => {
      const filePath = path.join(FIXTURES_DIR, 'Incomplete-Provider-Jul26.xlsx');
      const parsed = await parseEnglandXlsx(filePath);
      const providers = extractEnglandRttProviders(parsed);

      expect(providers.length).toBeGreaterThan(0);

      const r1h = providers.find((p) => p.code === 'R1H');
      expect(r1h).toBeDefined();
      expect(r1h?.kind).toBe('nhs-trust');
      expect(r1h?.regionCode).toBe('Y56');

      const isp = providers.find((p) => p.code === 'A1D1B');
      expect(isp).toBeDefined();
      expect(isp?.kind).toBe('independent-sector-provider');
      expect(isp?.regionCode).toBe('Y56');
    });
  });

  describe('englandSource end-to-end adapter', () => {
    it('discovers candidates using injected html fetcher and state', async () => {
      const html2627 = await fs.readFile(path.join(FIXTURES_DIR, 'rtt-data-2026-27.html'), 'utf-8');
      const html2526 = await fs.readFile(path.join(FIXTURES_DIR, 'rtt-data-2025-26.html'), 'utf-8');

      const customSource = createEnglandSource({
        discoverOptions: {
          currentDate: new Date('2026-10-03T12:00:00Z'),
          fetchHtml: (url: string) => {
            if (url.includes('2026-27')) return Promise.resolve(html2627);
            if (url.includes('2025-26')) return Promise.resolve(html2526);
            return Promise.reject(new Error(`Unexpected URL: ${url}`));
          },
        },
      });

      const emptyState: PipelineState = {
        lastCheck: '2026-10-01T00:00:00.000Z',
        seenFiles: {},
      };

      const candidates = await customSource.discover(emptyState);
      expect(candidates.length).toBe(16);
      expect(candidates[0]?.reportingPeriod).toBe('2025-04-30');
      expect(candidates[candidates.length - 1]?.reportingPeriod).toBe('2026-07-31');
    });

    it('fetches candidate file with injected fetchImpl to cache', async () => {
      const fixtureBuffer = await fs.readFile(
        path.join(FIXTURES_DIR, 'Incomplete-Provider-Jul26.xlsx'),
      );
      const testUrl =
        'https://www.england.nhs.uk/statistics/wp-content/uploads/sites/2/2026/09/Incomplete-Provider-Jul26.xlsx';

      const mockFetch = (): Promise<Response> =>
        Promise.resolve(
          new Response(fixtureBuffer, {
            status: 200,
            headers: {
              'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            },
          }),
        );

      const customSource = createEnglandSource({
        fetchOptions: {
          fetchImpl: mockFetch,
        },
      });

      const candidate: ReleaseCandidate = {
        reportingPeriod: reportingPeriod('2026-07-31'),
        sourceUrls: [testUrl],
        revised: false,
        fingerprint: testUrl,
      };

      const raw = await customSource.fetch(candidate);
      expect(raw[testUrl]).toBeDefined();
      expect(raw[testUrl]?.bytes).toBe(fixtureBuffer.length);
      expect(raw[testUrl]?.sha256).toBeDefined();
      expect(raw[testUrl]?.path).toBeDefined();
    });

    it('normalises raw files into validated Release<"england"> passing schema', async () => {
      const fixturePath = path.join(FIXTURES_DIR, 'Incomplete-Provider-Jul26.xlsx');
      const testUrl =
        'https://www.england.nhs.uk/statistics/wp-content/uploads/sites/2/2026/09/Incomplete-Provider-Jul26.xlsx';

      const raw: RawFiles = {
        [testUrl]: {
          path: fixturePath,
          sha256: 'a'.repeat(64),
          bytes: 12345,
          fetchedAt: '2026-10-01T12:00:00.000Z',
          finalUrl: testUrl,
        },
      };

      // Create reference data
      const refData = await buildEnglandReferenceData({
        odsOptions: {
          fixtureDir: path.resolve(__dirname, '../../fixtures/ods'),
        },
      });

      const release = await englandSource.normalise(raw, refData);

      expect(release.nation).toBe('england');
      expect(release.reportingPeriod).toBe('2026-07-31');
      expect(release.publicationDate).toBe('2026-09-10');
      expect(release.figures.length).toBeGreaterThan(0);

      // Verify schema parse
      const validated = englandReleaseSchema.safeParse(release);
      expect(validated.success).toBe(true);
    });

    it('throws error when candidate has no URLs on fetch', async () => {
      const candidate: ReleaseCandidate = {
        reportingPeriod: reportingPeriod('2026-07-31'),
        sourceUrls: [],
        revised: false,
        fingerprint: 'empty',
      };
      await expect(englandSource.fetch(candidate)).rejects.toThrow(
        'Release candidate has no source URLs',
      );
    });

    it('throws error when normalise receives empty RawFiles', async () => {
      const emptyRaw: RawFiles = {};
      const refData = await buildEnglandReferenceData({
        odsOptions: {
          fixtureDir: path.resolve(__dirname, '../../fixtures/ods'),
        },
      });
      await expect(englandSource.normalise(emptyRaw, refData)).rejects.toThrow(
        'Cannot normalise empty RawFiles',
      );
    });

    it('normaliseEnglandWithProviders returns both validated release and provider inputs', async () => {
      const fixturePath = path.join(FIXTURES_DIR, 'Incomplete-Provider-Jul26.xlsx');
      const testUrl =
        'https://www.england.nhs.uk/statistics/wp-content/uploads/sites/2/2026/09/Incomplete-Provider-Jul26.xlsx';

      const raw: RawFiles = {
        [testUrl]: {
          path: fixturePath,
          sha256: 'a'.repeat(64),
          bytes: 12345,
          fetchedAt: '2026-10-01T12:00:00.000Z',
          finalUrl: testUrl,
        },
      };

      const result = await normaliseEnglandWithProviders(raw);
      expect(result.release.nation).toBe('england');
      expect(result.release.reportingPeriod).toBe('2026-07-31');
      expect(result.providers.length).toBeGreaterThan(0);
      expect(result.providers.some((p) => p.code === 'R1H')).toBe(true);

      // Verify that the providers can be passed to buildEnglandReferenceData
      const refData = await buildEnglandReferenceData({
        providers: result.providers,
        odsOptions: {
          fixtureDir: path.resolve(__dirname, '../../fixtures/ods'),
        },
      });
      expect(refData.reportingUnits.some((u) => u.id === reportingUnitId('england', 'R1H'))).toBe(
        true,
      );
    });
  });
});
