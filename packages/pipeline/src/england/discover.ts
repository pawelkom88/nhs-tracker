import { reportingPeriod, type ReportingPeriod } from '@kyw/model/period';
import type { ReleaseCandidate } from '../source.js';
import { SourceUnavailableError } from '../errors.js';
import { fetchText } from '../http/fetch.js';

const MONTH_MAP: Readonly<Record<string, number>> = {
  jan: 1,
  feb: 2,
  mar: 3,
  apr: 4,
  may: 5,
  jun: 6,
  jul: 7,
  aug: 8,
  sep: 9,
  oct: 10,
  nov: 11,
  dec: 12,
};

function getMonthEndReportingPeriod(monthAbbr: string, yearTwoDigits: string): ReportingPeriod {
  const monthNum = MONTH_MAP[monthAbbr.toLowerCase()];
  if (!monthNum) {
    throw new Error(`Invalid month abbreviation: ${monthAbbr}`);
  }
  const year = 2000 + Number(yearTwoDigits);
  // Last day of calendar month in UTC
  const lastDay = new Date(Date.UTC(year, monthNum, 0)).getUTCDate();
  const pad = (n: number): string => String(n).padStart(2, '0');
  return reportingPeriod(`${String(year)}-${pad(monthNum)}-${pad(lastDay)}`);
}

/**
 * Derives financial year string (e.g. `2026-27`) for a given date or financial year start year.
 */
export function getFinancialYearSlug(yearOrDate: number | Date): string {
  let startYear: number;
  if (typeof yearOrDate === 'number') {
    startYear = yearOrDate;
  } else {
    const month = yearOrDate.getUTCMonth() + 1; // 1-12
    const fullYear = yearOrDate.getUTCFullYear();
    startYear = month >= 4 ? fullYear : fullYear - 1;
  }
  const endYearShort = String((startYear + 1) % 100).padStart(2, '0');
  return `${String(startYear)}-${endYearShort}`;
}

export function getYearlyPageUrl(fySlug: string): string {
  return `https://www.england.nhs.uk/statistics/statistical-work-areas/rtt-waiting-times/rtt-data-${fySlug}/`;
}

/**
 * Extracts candidate Incomplete Provider XLSX links from NHS England yearly page HTML.
 */
export function parseYearlyPage(html: string, pageUrl?: string): readonly ReleaseCandidate[] {
  // Matches URLs like https://.../Incomplete-Provider-Jul26-XLSX-9M-97ylx5.xlsx or Incomplete-Provider-Mar26-XLSX-9M-revised.xlsx
  const linkRegex =
    /href=["']([^"']*Incomplete-Provider-([A-Za-z]{3})(\d{2})-XLSX-[^"']*\.xlsx)["']/gi;
  const candidatesByPeriod = new Map<ReportingPeriod, ReleaseCandidate>();

  for (const match of html.matchAll(linkRegex)) {
    const rawUrl = match[1];
    const monthStr = match[2];
    const yearStr = match[3];

    if (!rawUrl || !monthStr || !yearStr) continue;

    const url = rawUrl.startsWith('http')
      ? rawUrl
      : new URL(rawUrl, 'https://www.england.nhs.uk').toString();
    const period = getMonthEndReportingPeriod(monthStr, yearStr);
    const revised = /-revised(?:-\d+)?\.xlsx$/i.test(url);

    const existing = candidatesByPeriod.get(period);
    // If not seen yet, or if existing is unrevised, or if this is a newer revision: update
    if (!existing || !existing.revised || revised) {
      candidatesByPeriod.set(period, {
        reportingPeriod: period,
        sourceUrls: [url],
        revised,
        fingerprint: url,
      });
    }
  }

  const results = Array.from(candidatesByPeriod.values());

  // If page contains no valid Incomplete Provider files but was expected to have releases
  if (results.length === 0) {
    throw new SourceUnavailableError(
      `Zero Incomplete Provider releases discovered from yearly page`,
      pageUrl !== undefined ? { url: pageUrl } : undefined,
    );
  }

  return results;
}

export interface DiscoverEnglandOptions {
  readonly currentDate?: Date;
  readonly fetchHtml?: (url: string) => Promise<string>;
  readonly yearsBack?: number;
}

/**
 * Discovers England release candidates by fetching current and previous financial-year pages.
 */
export async function discoverEnglandReleases(
  options: DiscoverEnglandOptions = {},
): Promise<readonly ReleaseCandidate[]> {
  const now = options.currentDate ?? new Date();
  const fetcher = options.fetchHtml ?? ((url: string) => fetchText(url));
  const yearsBack = Math.max(1, options.yearsBack ?? 1);

  const currentFy = getFinancialYearSlug(now);
  const currentStartYear = Number(currentFy.split('-')[0]);

  const candidatesByYear: (readonly ReleaseCandidate[])[] = [];

  // Fetch older financial years first
  for (let i = yearsBack; i >= 1; i--) {
    const fy = getFinancialYearSlug(currentStartYear - i);
    const url = getYearlyPageUrl(fy);
    try {
      const html = await fetcher(url);
      const candidates = parseYearlyPage(html, url);
      candidatesByYear.push(candidates);
    } catch {
      // Prior financial year page might not exist or be reachable; ignore
    }
  }

  // Fetch current financial year
  const currentUrl = getYearlyPageUrl(currentFy);
  try {
    const currentHtml = await fetcher(currentUrl);
    const currentCandidates = parseYearlyPage(currentHtml, currentUrl);
    candidatesByYear.push(currentCandidates);
  } catch (err) {
    const month = now.getUTCMonth() + 1; // 1-12
    const day = now.getUTCDate();
    const isEarlyFinancialYear = month === 4 || month === 5 || (month === 6 && day < 18);
    if (!isEarlyFinancialYear) {
      throw err;
    }
  }

  const merged = new Map<ReportingPeriod, ReleaseCandidate>();

  for (const yearCandidates of candidatesByYear) {
    for (const c of yearCandidates) {
      merged.set(c.reportingPeriod, c);
    }
  }

  return Array.from(merged.values()).sort((a, b) =>
    a.reportingPeriod.localeCompare(b.reportingPeriod),
  );
}
