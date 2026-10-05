import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { canonicalJsonStringify } from '../src/io/json.js';
import { readCsv } from '../src/io/csv.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const FIXTURES_DIR = path.resolve(__dirname, '../fixtures/scotland/stage-of-treatment');
export const RAW_CACHE_DIR = path.resolve(__dirname, '../.cache/scotland-raw');

export const CKAN_PACKAGE_SHOW_URL =
  'https://www.opendata.nhs.scot/api/3/action/package_show?id=stage-of-treatment-waiting-times';

export const ONGOING_COMPLETED_RESOURCE_ID = 'ac63b747-fdcc-410c-ae43-de6fe3c46abf';
export const DISTRIBUTION_RESOURCE_ID = 'f9232c17-a90e-4d35-a863-11bdb3a748c0';

export const TARGET_MONTH_ENDINGS = new Set(['20260831', '20250831']);

export const TARGET_HBTS = new Set([
  'S08000024', // Lothian
  'S08000031', // Greater Glasgow and Clyde
  'SB0801', // Golden Jubilee
  'S08000025', // Orkney (small numbers / suppression)
  'S92000003', // Scotland national aggregate
  'S27000001', // Non-NHS Provider/Location
  'RA2702', // Rest-of-UK resident
]);

export const TARGET_SPECIALTIES = new Set([
  'Z9', // All specialties
  'C8', // Trauma and Orthopaedic Surgery
  'C7', // Ophthalmology
  'G1', // General Psychiatry (contains :u quality flag rows)
]);

const USER_AGENT = 'KnowYourWait-pipeline (+https://github.com/know-your-wait/know-your-wait)';

function safeString(value: unknown): string {
  if (typeof value === 'string') {
    return value;
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  return '';
}

async function fetchWithRetry(url: string, init?: RequestInit, maxRetries = 3): Promise<Response> {
  let attempt = 0;
  while (attempt <= maxRetries) {
    attempt++;
    try {
      const headers: Record<string, string> = {
        'User-Agent': USER_AGENT,
      };
      if (init?.headers) {
        if (init.headers instanceof Headers) {
          init.headers.forEach((val, key) => {
            headers[key] = val;
          });
        } else if (Array.isArray(init.headers)) {
          for (const [k, v] of init.headers) {
            headers[k] = v;
          }
        } else {
          Object.assign(headers, init.headers);
        }
      }

      const res = await fetch(url, {
        ...init,
        headers,
      });
      if (res.ok) {
        return res;
      }
      if (res.status === 429 || (res.status >= 500 && res.status <= 599)) {
        if (attempt <= maxRetries) {
          const delay = 500 * Math.pow(2, attempt - 1);
          console.warn(
            `[PHS CKAN API] HTTP ${String(res.status)} from ${url}. Retrying in ${String(delay)}ms...`,
          );
          await new Promise((r) => setTimeout(r, delay));
          continue;
        }
      }
      throw new Error(`HTTP ${String(res.status)} ${res.statusText} from ${url}`);
    } catch (err) {
      if (attempt <= maxRetries) {
        const delay = 500 * Math.pow(2, attempt - 1);
        console.warn(
          `[PHS CKAN API] Error ${err instanceof Error ? err.message : String(err)}. Retrying in ${String(delay)}ms...`,
        );
        await new Promise((r) => setTimeout(r, delay));
        continue;
      }
      throw err;
    }
  }
  throw new Error(`Failed to fetch ${url} after ${String(maxRetries)} retries`);
}

export interface TrimScotlandOptions {
  forceLive?: boolean;
}

export interface TrimScotlandResult {
  packageId: string;
  ongoingCompletedRows: number;
  distributionRows: number;
  totalFixtureBytes: number;
  hasSuppressedMedian: boolean;
  hasColonUQualityFlag: boolean;
  scotlandAugust2026OutpatientTotal: string;
  scotlandAugust2026InpatientTotal: string;
}

export async function trimScotlandFixtures(
  options: TrimScotlandOptions = {},
): Promise<TrimScotlandResult> {
  const { forceLive = false } = options;

  await fs.mkdir(FIXTURES_DIR, { recursive: true });
  await fs.mkdir(RAW_CACHE_DIR, { recursive: true });

  const cachedPackageShowPath = path.join(RAW_CACHE_DIR, 'package_show.json');
  const cachedOngoingCompletedPath = path.join(RAW_CACHE_DIR, 'ac63b747.csv');
  const cachedDistributionPath = path.join(RAW_CACHE_DIR, 'f9232c17.csv');

  let packageShowRaw: string;
  if (!forceLive) {
    try {
      packageShowRaw = await fs.readFile(cachedPackageShowPath, 'utf8');
    } catch {
      packageShowRaw = '';
    }
  } else {
    packageShowRaw = '';
  }

  if (!packageShowRaw) {
    console.warn(`Fetching live package_show from ${CKAN_PACKAGE_SHOW_URL}...`);
    const res = await fetchWithRetry(CKAN_PACKAGE_SHOW_URL);
    packageShowRaw = await res.text();
    await fs.writeFile(cachedPackageShowPath, packageShowRaw, 'utf8');
  }

  const packageShowJson = JSON.parse(packageShowRaw) as {
    success: boolean;
    result?: {
      id: string;
      resources: {
        id: string;
        name: string;
        url: string;
        last_modified: string;
      }[];
    };
  };

  if (!packageShowJson.success || !packageShowJson.result) {
    throw new Error('Invalid package_show response from CKAN API');
  }

  const ongoingCompletedResource = packageShowJson.result.resources.find(
    (r) => r.id === ONGOING_COMPLETED_RESOURCE_ID,
  );
  if (!ongoingCompletedResource) {
    throw new Error(
      `Resource ${ONGOING_COMPLETED_RESOURCE_ID} (Ongoing and Completed Waits) not found in package_show`,
    );
  }

  const distributionResource = packageShowJson.result.resources.find(
    (r) => r.id === DISTRIBUTION_RESOURCE_ID,
  );
  if (!distributionResource) {
    throw new Error(
      `Resource ${DISTRIBUTION_RESOURCE_ID} (Distribution of Waits) not found in package_show`,
    );
  }

  // 1. Write package_show.json fixture
  const formattedPackageShow = canonicalJsonStringify(packageShowJson) + '\n';
  await fs.writeFile(path.join(FIXTURES_DIR, 'package_show.json'), formattedPackageShow, 'utf8');

  // 2. Load Ongoing and Completed CSV
  let ongoingCompletedRaw: string;
  if (!forceLive) {
    try {
      ongoingCompletedRaw = await fs.readFile(cachedOngoingCompletedPath, 'utf8');
    } catch {
      ongoingCompletedRaw = '';
    }
  } else {
    ongoingCompletedRaw = '';
  }

  if (!ongoingCompletedRaw) {
    console.warn(`Fetching live Ongoing and Completed CSV from ${ongoingCompletedResource.url}...`);
    const res = await fetchWithRetry(ongoingCompletedResource.url);
    ongoingCompletedRaw = await res.text();
    await fs.writeFile(cachedOngoingCompletedPath, ongoingCompletedRaw, 'utf8');
  }

  // 3. Load Distribution CSV
  let distributionRaw: string;
  if (!forceLive) {
    try {
      distributionRaw = await fs.readFile(cachedDistributionPath, 'utf8');
    } catch {
      distributionRaw = '';
    }
  } else {
    distributionRaw = '';
  }

  if (!distributionRaw) {
    console.warn(`Fetching live Distribution CSV from ${distributionResource.url}...`);
    const res = await fetchWithRetry(distributionResource.url);
    distributionRaw = await res.text();
    await fs.writeFile(cachedDistributionPath, distributionRaw, 'utf8');
  }

  // 4. Parse and filter Ongoing and Completed CSV
  const ongoingCompletedRows = readCsv<Record<string, string>>(ongoingCompletedRaw, {
    columns: true,
  });
  const ocHeaders = Object.keys(ongoingCompletedRows[0] ?? {});

  const trimmedOcRows: string[][] = [ocHeaders];
  let hasSuppressedMedian = false;
  let hasColonUQualityFlag = false;
  let scotlandAugust2026OutpatientTotal = '';
  let scotlandAugust2026InpatientTotal = '';

  for (const row of ongoingCompletedRows) {
    const month = safeString(row.MonthEnding);
    const hbt = safeString(row.HBT);
    const specialty = safeString(row.Specialty);
    const patientType = safeString(row.PatientType);
    const waitType = safeString(row.WaitType);
    const medianQf = safeString(row.MedianQF);

    if (
      TARGET_MONTH_ENDINGS.has(month) &&
      TARGET_HBTS.has(hbt) &&
      TARGET_SPECIALTIES.has(specialty)
    ) {
      const rowValues = ocHeaders.map((header) => safeString(row[header]));
      trimmedOcRows.push(rowValues);

      if (medianQf === ':') {
        hasSuppressedMedian = true;
      }
      if (rowValues.some((v) => v === ':u')) {
        hasColonUQualityFlag = true;
      }

      if (
        month === '20260831' &&
        hbt === 'S92000003' &&
        specialty === 'Z9' &&
        waitType === 'Ongoing'
      ) {
        if (patientType === 'New Outpatient') {
          scotlandAugust2026OutpatientTotal = safeString(row.Waits);
        } else if (patientType === 'Inpatient/Day case') {
          scotlandAugust2026InpatientTotal = safeString(row.Waits);
        }
      }
    }
  }

  // Format CSV with quotes for string fields
  const formatCsvRows = (rows: string[][]): string => {
    return (
      rows
        .map((row) =>
          row
            .map((val) => {
              if (val === '') return '';
              if (/^[0-9]+(\.[0-9]+)?$/.test(val)) return val;
              return `"${val.replace(/"/g, '""')}"`;
            })
            .join(','),
        )
        .join('\n') + '\n'
    );
  };

  const formattedOcCsv = formatCsvRows(trimmedOcRows);
  await fs.writeFile(path.join(FIXTURES_DIR, 'ac63b747-data.csv'), formattedOcCsv, 'utf8');

  // 5. Parse and filter Distribution CSV
  const distributionRows = readCsv<Record<string, string>>(distributionRaw, {
    columns: true,
  });
  const distHeaders = Object.keys(distributionRows[0] ?? {});

  const trimmedDistRows: string[][] = [distHeaders];
  for (const row of distributionRows) {
    const month = safeString(row.MonthEnding);
    const hbt = safeString(row.HBT);
    const specialty = safeString(row.Specialty);

    if (
      TARGET_MONTH_ENDINGS.has(month) &&
      TARGET_HBTS.has(hbt) &&
      TARGET_SPECIALTIES.has(specialty)
    ) {
      const rowValues = distHeaders.map((header) => safeString(row[header]));
      trimmedDistRows.push(rowValues);
    }
  }

  const formattedDistCsv = formatCsvRows(trimmedDistRows);
  await fs.writeFile(path.join(FIXTURES_DIR, 'f9232c17-data.csv'), formattedDistCsv, 'utf8');

  // 6. Calculate fixture file sizes
  const fixtureFiles = ['package_show.json', 'ac63b747-data.csv', 'f9232c17-data.csv'];
  let totalBytes = 0;
  for (const file of fixtureFiles) {
    const stat = await fs.stat(path.join(FIXTURES_DIR, file));
    totalBytes += stat.size;
  }

  return {
    packageId: packageShowJson.result.id,
    ongoingCompletedRows: trimmedOcRows.length - 1,
    distributionRows: trimmedDistRows.length - 1,
    totalFixtureBytes: totalBytes,
    hasSuppressedMedian,
    hasColonUQualityFlag,
    scotlandAugust2026OutpatientTotal,
    scotlandAugust2026InpatientTotal,
  };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const forceLive = process.argv.includes('--live');
  trimScotlandFixtures({ forceLive })
    .then((result) => {
      console.warn('Trim Scotland fixtures completed successfully:');
      console.warn(`  Package ID: ${result.packageId}`);
      console.warn(`  Ongoing and Completed rows: ${String(result.ongoingCompletedRows)}`);
      console.warn(`  Distribution rows: ${String(result.distributionRows)}`);
      console.warn(`  Total fixtures size: ${(result.totalFixtureBytes / 1024).toFixed(1)} KB`);
      console.warn(`  Has suppressed median (':'): ${String(result.hasSuppressedMedian)}`);
      console.warn(`  Has quality flag (':u'): ${String(result.hasColonUQualityFlag)}`);
      console.warn(
        `  Scotland Aug 2026 New Outpatient ongoing total: ${result.scotlandAugust2026OutpatientTotal}`,
      );
      console.warn(
        `  Scotland Aug 2026 Inpatient/Day case ongoing total: ${result.scotlandAugust2026InpatientTotal}`,
      );
    })
    .catch((err: unknown) => {
      console.error('Error trimming Scotland fixtures:', err);
      process.exit(1);
    });
}
