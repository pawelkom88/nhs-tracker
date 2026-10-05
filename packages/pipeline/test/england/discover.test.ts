import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';
import {
  parseYearlyPage,
  getFinancialYearSlug,
  discoverEnglandReleases,
} from '../../src/england/discover.js';
import { SourceUnavailableError } from '../../src/errors.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const FIXTURES_DIR = path.resolve(__dirname, '../../fixtures/england');

describe('England Discover', () => {
  describe('getFinancialYearSlug', () => {
    it('computes financial year slug from Date correctly', () => {
      expect(getFinancialYearSlug(new Date('2026-10-03T12:00:00Z'))).toBe('2026-27');
      expect(getFinancialYearSlug(new Date('2026-04-01T00:00:00Z'))).toBe('2026-27');
      expect(getFinancialYearSlug(new Date('2026-03-31T23:59:59Z'))).toBe('2025-26');
      expect(getFinancialYearSlug(new Date('2027-01-15T00:00:00Z'))).toBe('2026-27');
    });

    it('computes financial year slug from year number', () => {
      expect(getFinancialYearSlug(2025)).toBe('2025-26');
      expect(getFinancialYearSlug(2026)).toBe('2026-27');
    });
  });

  describe('parseYearlyPage', () => {
    it('discovers candidate releases from committed 2026-27 HTML fixture', async () => {
      const html = await fs.readFile(path.join(FIXTURES_DIR, 'rtt-data-2026-27.html'), 'utf-8');
      const candidates = parseYearlyPage(
        html,
        'https://www.england.nhs.uk/statistics/statistical-work-areas/rtt-waiting-times/rtt-data-2026-27/',
      );

      expect(candidates.length).toBe(4);

      const jul26 = candidates.find((c) => c.reportingPeriod === '2026-07-31');
      expect(jul26).toBeDefined();
      expect(jul26?.revised).toBe(false);
      expect(jul26?.fingerprint).toBe(
        'https://www.england.nhs.uk/statistics/wp-content/uploads/sites/2/2026/09/Incomplete-Provider-Jul26-XLSX-9M-97ylx5.xlsx',
      );
      expect(jul26?.sourceUrls).toEqual([
        'https://www.england.nhs.uk/statistics/wp-content/uploads/sites/2/2026/09/Incomplete-Provider-Jul26-XLSX-9M-97ylx5.xlsx',
      ]);

      const apr26 = candidates.find((c) => c.reportingPeriod === '2026-04-30');
      expect(apr26).toBeDefined();
      expect(apr26?.revised).toBe(false);
    });

    it('discovers candidates and detects revised files from committed 2025-26 HTML fixture', async () => {
      const html = await fs.readFile(path.join(FIXTURES_DIR, 'rtt-data-2025-26.html'), 'utf-8');
      const candidates = parseYearlyPage(
        html,
        'https://www.england.nhs.uk/statistics/statistical-work-areas/rtt-waiting-times/rtt-data-2025-26/',
      );

      expect(candidates.length).toBe(12);

      const mar26 = candidates.find((c) => c.reportingPeriod === '2026-03-31');
      expect(mar26).toBeDefined();
      expect(mar26?.revised).toBe(true);
      expect(mar26?.fingerprint).toContain('-revised.xlsx');

      const jul25 = candidates.find((c) => c.reportingPeriod === '2025-07-31');
      expect(jul25).toBeDefined();
      expect(jul25?.revised).toBe(true);
      expect(jul25?.fingerprint).toContain('-revised-2.xlsx');
    });

    it('throws SourceUnavailableError when no Incomplete Provider releases are found in page', () => {
      const emptyHtml =
        '<html><head><title>No data</title></head><body><h1>Under construction</h1></body></html>';
      expect(() => parseYearlyPage(emptyHtml, 'https://example.com/rtt-data-2026-27/')).toThrow(
        SourceUnavailableError,
      );
    });
  });

  describe('discoverEnglandReleases', () => {
    it('merges current and previous financial year candidates with injected fetcher', async () => {
      const html2627 = await fs.readFile(path.join(FIXTURES_DIR, 'rtt-data-2026-27.html'), 'utf-8');
      const html2526 = await fs.readFile(path.join(FIXTURES_DIR, 'rtt-data-2025-26.html'), 'utf-8');

      const fetchHtml = (url: string): Promise<string> => {
        if (url.includes('2026-27')) return Promise.resolve(html2627);
        if (url.includes('2025-26')) return Promise.resolve(html2526);
        return Promise.reject(new Error(`Unexpected URL: ${url}`));
      };

      const candidates = await discoverEnglandReleases({
        currentDate: new Date('2026-10-03T12:00:00Z'),
        fetchHtml,
      });

      // 12 months from 2025-26 + 4 months from 2026-27 = 16 distinct periods
      expect(candidates.length).toBe(16);

      const periods = candidates.map((c) => c.reportingPeriod);
      const uniquePeriods = new Set(periods);
      expect(uniquePeriods.size).toBe(candidates.length);

      // Verify specific periods
      expect(periods).toContain('2026-07-31');
      expect(periods).toContain('2026-03-31');
      expect(periods).toContain('2025-07-31');

      // Verify candidates are sorted by reportingPeriod ascending
      for (let i = 1; i < candidates.length; i++) {
        expect(
          (candidates[i]?.reportingPeriod ?? '').localeCompare(
            candidates[i - 1]?.reportingPeriod ?? '',
          ),
        ).toBeGreaterThanOrEqual(0);
      }
    });

    it('tolerates empty current year page during early financial year (months 4-5)', async () => {
      const html2526 = await fs.readFile(path.join(FIXTURES_DIR, 'rtt-data-2025-26.html'), 'utf-8');

      const fetchHtml = (url: string): Promise<string> => {
        if (url.includes('2026-27')) {
          return Promise.resolve('<html><body><h1>No data published yet</h1></body></html>');
        }
        if (url.includes('2025-26')) return Promise.resolve(html2526);
        return Promise.reject(new Error(`Unexpected URL: ${url}`));
      };

      // In May 2026 (month 5), before April data is released in June
      const candidates = await discoverEnglandReleases({
        currentDate: new Date('2026-05-15T12:00:00Z'),
        fetchHtml,
      });

      // Should return the 12 candidates from the previous financial year without throwing
      expect(candidates.length).toBe(12);
    });

    it('tolerates empty current year page during early June before first FY release', async () => {
      const html2526 = await fs.readFile(path.join(FIXTURES_DIR, 'rtt-data-2025-26.html'), 'utf-8');

      const fetchHtml = (url: string): Promise<string> => {
        if (url.includes('2026-27')) {
          return Promise.resolve('<html><body><h1>No data published yet</h1></body></html>');
        }
        if (url.includes('2025-26')) return Promise.resolve(html2526);
        return Promise.reject(new Error(`Unexpected URL: ${url}`));
      };

      const candidates = await discoverEnglandReleases({
        currentDate: new Date('2026-06-05T12:00:00Z'),
        fetchHtml,
      });

      expect(candidates.length).toBe(12);
    });

    it('throws SourceUnavailableError when current year page is empty in late June', async () => {
      const html2526 = await fs.readFile(path.join(FIXTURES_DIR, 'rtt-data-2025-26.html'), 'utf-8');

      const fetchHtml = (url: string): Promise<string> => {
        if (url.includes('2026-27')) {
          return Promise.resolve('<html><body><h1>No data published yet</h1></body></html>');
        }
        if (url.includes('2025-26')) return Promise.resolve(html2526);
        return Promise.reject(new Error(`Unexpected URL: ${url}`));
      };

      await expect(
        discoverEnglandReleases({
          currentDate: new Date('2026-06-25T12:00:00Z'),
          fetchHtml,
        }),
      ).rejects.toThrow(SourceUnavailableError);
    });

    it('resolves relative URLs to absolute NHS England domain', () => {
      const htmlWithRelative = `
        <a href="/statistics/wp-content/uploads/sites/2/2026/09/Incomplete-Provider-Jul26-XLSX-9M-relative.xlsx">Jul26</a>
      `;
      const candidates = parseYearlyPage(htmlWithRelative);
      expect(candidates[0]?.sourceUrls[0]).toBe(
        'https://www.england.nhs.uk/statistics/wp-content/uploads/sites/2/2026/09/Incomplete-Provider-Jul26-XLSX-9M-relative.xlsx',
      );
    });
  });
});
