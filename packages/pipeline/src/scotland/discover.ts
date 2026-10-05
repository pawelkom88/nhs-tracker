import {
  reportingPeriod,
  publicationDate,
  type ReportingPeriod,
  type PublicationDate,
} from '@kyw/model/period';
import type { PipelineState, ReleaseCandidate } from '../source.js';
import { SourceUnavailableError } from '../errors.js';
import { fetchText } from '../http/fetch.js';

export const SCOTLAND_CKAN_PACKAGE_SHOW_URL =
  'https://www.opendata.nhs.scot/api/3/action/package_show?id=stage-of-treatment-waiting-times';

export const STAGE_OF_TREATMENT_PERFORMANCE_RESOURCE_ID = 'ac63b747-fdcc-410c-ae43-de6fe3c46abf';

export const STAGE_OF_TREATMENT_DISTRIBUTION_RESOURCE_ID = 'f9232c17-a90e-4d35-a863-11bdb3a748c0';

export interface CkanResource {
  readonly id: string;
  readonly name?: string;
  readonly url?: string;
  readonly last_modified?: string | null;
  readonly format?: string;
  readonly size?: number;
}

export interface CkanPackageShowResult {
  readonly id?: string;
  readonly name?: string;
  readonly metadata_modified?: string;
  readonly resources?: readonly CkanResource[];
}

export interface CkanPackageShowResponse {
  readonly help?: string;
  readonly success?: boolean;
  readonly result?: CkanPackageShowResult;
}

export interface ScotlandReleaseCandidate extends ReleaseCandidate {
  readonly publicationDate: PublicationDate;
  readonly performanceResourceId: string;
  readonly distributionResourceId: string;
  readonly performanceLastModified: string;
  readonly distributionLastModified: string;
  readonly performanceUrl: string;
  readonly distributionUrl: string;
}

const MONTH_NAME_MAP: Readonly<Record<string, number>> = {
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

/**
 * Extracts provisional ReportingPeriod from filename slug (e.g. `..._aug26.csv`)
 * or falls back to the calendar month preceding the publication date.
 */
export function inferReportingPeriod(
  urlOrFilename: string,
  publicationIsoDate: string,
): ReportingPeriod {
  const match = /_([a-z]{3})(\d{2})\.csv/i.exec(urlOrFilename);
  if (match) {
    const monthStr = match[1]?.toLowerCase();
    const yearStr = match[2];
    if (monthStr && yearStr && monthStr in MONTH_NAME_MAP) {
      const monthNum = MONTH_NAME_MAP[monthStr];
      if (monthNum) {
        const year = 2000 + Number(yearStr);
        const lastDay = new Date(Date.UTC(year, monthNum, 0)).getUTCDate();
        const pad = (n: number): string => String(n).padStart(2, '0');
        return reportingPeriod(`${String(year)}-${pad(monthNum)}-${pad(lastDay)}`);
      }
    }
  }

  // Fallback: previous month ending relative to publication date
  const pubDateObj = new Date(`${publicationIsoDate}T00:00:00Z`);
  const pubYear = pubDateObj.getUTCFullYear();
  const pubMonth = pubDateObj.getUTCMonth(); // 0-indexed: month of publication
  // Last day of month before publication
  const prevMonthEnd = new Date(Date.UTC(pubYear, pubMonth, 0));
  const year = prevMonthEnd.getUTCFullYear();
  const monthNum = prevMonthEnd.getUTCMonth() + 1;
  const lastDay = prevMonthEnd.getUTCDate();
  const pad = (n: number): string => String(n).padStart(2, '0');
  return reportingPeriod(`${String(year)}-${pad(monthNum)}-${pad(lastDay)}`);
}

/**
 * Builds a deterministic release fingerprint combining reporting period, URLs and last_modified timestamps.
 */
export function buildScotlandFingerprint(
  period: ReportingPeriod,
  perfUrl: string,
  perfLastModified: string,
  distUrl: string,
  distLastModified: string,
): string {
  return `${period}:${perfUrl}#${perfLastModified}|${distUrl}#${distLastModified}`;
}

export interface DiscoverScotlandOptions {
  readonly fetchJson?: (url: string) => Promise<CkanPackageShowResponse>;
  readonly packageShowUrl?: string;
}

/**
 * Discovers Scotland release candidates via the CKAN package_show API.
 *
 * @see GLOSSARY.md Reporting Period
 * @see GLOSSARY.md Publication Date
 * @see ADR-0007
 */
export async function discoverScotlandReleases(
  state: PipelineState,
  options: DiscoverScotlandOptions = {},
): Promise<readonly ScotlandReleaseCandidate[]> {
  const apiUrl = options.packageShowUrl ?? SCOTLAND_CKAN_PACKAGE_SHOW_URL;
  const fetcher =
    options.fetchJson ??
    (async (url: string): Promise<CkanPackageShowResponse> => {
      const text = await fetchText(url);
      try {
        const parsed = JSON.parse(text) as unknown;
        return parsed as CkanPackageShowResponse;
      } catch (err) {
        throw new SourceUnavailableError(
          `Failed to parse CKAN package_show response as JSON: ${err instanceof Error ? err.message : String(err)}`,
          { url },
        );
      }
    });

  let response: CkanPackageShowResponse;
  try {
    response = await fetcher(apiUrl);
  } catch (err) {
    if (err instanceof SourceUnavailableError) {
      throw err;
    }
    throw new SourceUnavailableError(
      `Failed to fetch CKAN package_show metadata: ${err instanceof Error ? err.message : String(err)}`,
      { url: apiUrl },
    );
  }

  const resources: readonly CkanResource[] | undefined = response.result?.resources;
  if (!resources) {
    throw new SourceUnavailableError('CKAN response missing resources array', { url: apiUrl });
  }

  const perfResource = resources.find((r) => r.id === STAGE_OF_TREATMENT_PERFORMANCE_RESOURCE_ID);
  const distResource = resources.find((r) => r.id === STAGE_OF_TREATMENT_DISTRIBUTION_RESOURCE_ID);

  if (!perfResource) {
    throw new SourceUnavailableError(
      `Missing required performance resource ID: ${STAGE_OF_TREATMENT_PERFORMANCE_RESOURCE_ID}`,
      { url: apiUrl },
    );
  }

  if (!distResource) {
    throw new SourceUnavailableError(
      `Missing required distribution resource ID: ${STAGE_OF_TREATMENT_DISTRIBUTION_RESOURCE_ID}`,
      { url: apiUrl },
    );
  }

  const perfUrl = perfResource.url;
  const perfLastModified = perfResource.last_modified;
  const distUrl = distResource.url;
  const distLastModified = distResource.last_modified;

  if (!perfUrl || !perfLastModified) {
    throw new SourceUnavailableError(
      'Performance resource is missing URL or last_modified timestamp',
      { url: apiUrl },
    );
  }

  if (!distUrl || !distLastModified) {
    throw new SourceUnavailableError(
      'Distribution resource is missing URL or last_modified timestamp',
      { url: apiUrl },
    );
  }

  const perfDatePart = perfLastModified.slice(0, 10);
  const distDatePart = distLastModified.slice(0, 10);

  // Both resources must share the same publication/last_modified date, else wait for partial upload to finish.
  if (perfDatePart !== distDatePart) {
    console.warn(
      `Scotland CKAN resources last_modified date mismatch: performance=${perfDatePart} (${perfLastModified}) vs distribution=${distDatePart} (${distLastModified}). Waiting for partial upload to complete.`,
    );
    return [];
  }

  const pubDate = publicationDate(perfDatePart);
  const period = inferReportingPeriod(perfUrl, perfDatePart);
  const fingerprint = buildScotlandFingerprint(
    period,
    perfUrl,
    perfLastModified,
    distUrl,
    distLastModified,
  );

  const seenKeys = Object.keys(state.seenFiles);
  if (seenKeys.includes(fingerprint)) {
    return [];
  }

  const isRevised = seenKeys.some((k) => k.includes(period) || k.startsWith(`${period}:`));

  const candidate: ScotlandReleaseCandidate = {
    reportingPeriod: period,
    publicationDate: pubDate,
    sourceUrls: [perfUrl, distUrl],
    revised: isRevised,
    fingerprint,
    performanceResourceId: perfResource.id,
    distributionResourceId: distResource.id,
    performanceLastModified: perfLastModified,
    distributionLastModified: distLastModified,
    performanceUrl: perfUrl,
    distributionUrl: distUrl,
  };

  return [candidate];
}
