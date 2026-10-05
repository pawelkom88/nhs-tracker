import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { canonicalJsonStringify } from '../src/io/json.js';
import { readCsv } from '../src/io/csv.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const FIXTURES_DIR = path.resolve(__dirname, '../fixtures/wales');
export const RAW_CACHE_DIR = path.resolve(__dirname, '../.cache/wales-raw');

export const STATSWALES_API_BASE = 'https://api.stats.gov.wales/v2';

export const KEY_MEASURES_DATASET_ID = 'acd9529c-979a-48ef-a773-870b3ebe4391';
export const THRESHOLD_COUNTS_DATASET_ID = '3ef3a1d8-1467-4afe-ad60-4fc3d92228a1';

export const TARGET_DATE_CODES = new Set(['202607', '202507']);

export const TARGET_BOARD_ONS_CODES = new Set([
  'W11000023', // Betsi Cadwaladr (7A1)
  'W11000024', // Powys (7A7)
  'W11000025', // Hywel Dda (7A2)
  'W11000031', // Swansea Bay (7A3)
  'W11000030', // Cwm Taf Morgannwg (7A5)
  'W11000028', // Aneurin Bevan (7A6)
  'W11000029', // Cardiff and Vale (7A4)
  'W92000004', // All Wales national total (non-reporting aggregate)
  'A1X', // South East Wales Region (non-reporting aggregate)
]);

export const TARGET_SPECIALTY_CODES = new Set([
  '1', // All specialties (Key Measures acd9529c)
  'T', // All specialties (Threshold Counts 3ef3a1d8)
  '110', // Trauma and Orthopaedic
  '130', // Ophthalmology
  '320', // Cardiology (includes Powys cell with total but suppressed median)
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
            `[StatsWales API] HTTP ${String(res.status)} from ${url}. Retrying in ${String(delay)}ms...`,
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
          `[StatsWales API] Error ${err instanceof Error ? err.message : String(err)}. Retrying in ${String(delay)}ms...`,
        );
        await new Promise((r) => setTimeout(r, delay));
        continue;
      }
      throw err;
    }
  }
  throw new Error(`Failed to fetch ${url} after ${String(maxRetries)} retries`);
}

async function fetchOrReadCachedText(
  cacheFilename: string,
  url: string,
  forceLive = false,
  postInit?: RequestInit,
): Promise<string> {
  await fs.mkdir(RAW_CACHE_DIR, { recursive: true });
  const cachePath = path.join(RAW_CACHE_DIR, cacheFilename);

  if (!forceLive) {
    try {
      return await fs.readFile(cachePath, 'utf-8');
    } catch {
      // cache miss
    }
  }

  console.warn(`[StatsWales] Fetching live: ${url}`);
  const res = await fetchWithRetry(url, postInit);
  const text = await res.text();
  await fs.writeFile(cachePath, text, 'utf-8');
  return text;
}

export interface WalesTrimResult {
  readonly keyMeasuresRows: number;
  readonly thresholdCountsRows: number;
  readonly keyMeasuresMetadataVersion: string;
  readonly thresholdCountsMetadataVersion: string;
  readonly totalFixtureBytes: number;
  readonly cardiffVale110Metrics: {
    readonly median: number | null;
    readonly withinStandardPercent: number | null;
    readonly totalWaiting: number | null;
    readonly longWaitCount: number | null;
  };
  readonly powysCardiology320HasSuppressedMedian: boolean;
}

function toCsvRow(cols: string[]): string {
  return cols.map((col) => `"${col.replace(/"/g, '""')}"`).join(',');
}

function findHeaderIndex(header: string[], name: string): number {
  const target = name.trim().toLowerCase();
  return header.findIndex((h) => h.trim().toLowerCase() === target);
}

export async function trimWalesFixtures(
  options: { forceLive?: boolean } = {},
): Promise<WalesTrimResult> {
  const forceLive = options.forceLive ?? false;
  await fs.mkdir(FIXTURES_DIR, { recursive: true });

  // 1. Fetch metadata for both datasets
  const kmMetaUrl = `${STATSWALES_API_BASE}/${KEY_MEASURES_DATASET_ID}`;
  const tcMetaUrl = `${STATSWALES_API_BASE}/${THRESHOLD_COUNTS_DATASET_ID}`;

  const kmMetaRaw = await fetchOrReadCachedText('acd9529c-metadata.json', kmMetaUrl, forceLive);
  const tcMetaRaw = await fetchOrReadCachedText('3ef3a1d8-metadata.json', tcMetaUrl, forceLive);

  const kmMeta = JSON.parse(kmMetaRaw) as Record<string, unknown>;
  const tcMeta = JSON.parse(tcMetaRaw) as Record<string, unknown>;

  const kmPublishedRevision = kmMeta.published_revision as Record<string, unknown> | undefined;
  const tcPublishedRevision = tcMeta.published_revision as Record<string, unknown> | undefined;

  const kmMetaVersion = safeString(kmPublishedRevision?.id ?? kmMeta.version_id ?? 'unknown');
  const tcMetaVersion = safeString(tcPublishedRevision?.id ?? tcMeta.version_id ?? 'unknown');

  await fs.writeFile(
    path.join(FIXTURES_DIR, 'acd9529c-metadata.json'),
    canonicalJsonStringify(kmMeta),
    'utf-8',
  );
  await fs.writeFile(
    path.join(FIXTURES_DIR, '3ef3a1d8-metadata.json'),
    canonicalJsonStringify(tcMeta),
    'utf-8',
  );

  // 2. Fetch filters for both datasets
  const kmFiltersUrl = `${STATSWALES_API_BASE}/${KEY_MEASURES_DATASET_ID}/filters`;
  const tcFiltersUrl = `${STATSWALES_API_BASE}/${THRESHOLD_COUNTS_DATASET_ID}/filters`;

  const kmFiltersRaw = await fetchOrReadCachedText(
    'acd9529c-filters.json',
    kmFiltersUrl,
    forceLive,
  );
  const tcFiltersRaw = await fetchOrReadCachedText(
    '3ef3a1d8-filters.json',
    tcFiltersUrl,
    forceLive,
  );

  const kmFilters = JSON.parse(kmFiltersRaw) as unknown;
  const tcFilters = JSON.parse(tcFiltersRaw) as unknown;

  await fs.writeFile(
    path.join(FIXTURES_DIR, 'acd9529c-filters.json'),
    canonicalJsonStringify(kmFilters),
    'utf-8',
  );
  await fs.writeFile(
    path.join(FIXTURES_DIR, '3ef3a1d8-filters.json'),
    canonicalJsonStringify(tcFilters),
    'utf-8',
  );

  // 3. Request coded CSV download for acd9529c (Key Measures)
  const kmBody = {
    filters: [{ DateCode: ['202607', '202507'] }],
    options: { data_value_type: 'raw_extended' },
  };

  const kmDataPostUrl = `${STATSWALES_API_BASE}/${KEY_MEASURES_DATASET_ID}/data`;
  let kmFilterId: string;
  try {
    const postResText = await fetchOrReadCachedText(
      'acd9529c-filter-id.json',
      kmDataPostUrl,
      forceLive,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(kmBody),
      },
    );
    const postJson = JSON.parse(postResText) as Record<string, unknown>;
    kmFilterId = safeString(postJson.filterId ?? postJson.filter_id ?? postJson.id);
  } catch (err) {
    console.error('Failed to post filter for Key Measures:', err);
    throw err;
  }

  const kmCsvUrl = `${STATSWALES_API_BASE}/${KEY_MEASURES_DATASET_ID}/data/${kmFilterId}?format=csv`;
  const kmCsvRaw = await fetchOrReadCachedText('acd9529c-raw.csv', kmCsvUrl, forceLive);

  // 4. Request coded CSV download for 3ef3a1d8 (Threshold Counts)
  const tcBody = {
    filters: [
      { DateCode: ['202607', '202507'] },
      { StageOfPathwayCode: ['T'] },
      { AgeGroupAtReferralCode: ['T'] },
    ],
    options: { data_value_type: 'raw_extended' },
  };

  const tcDataPostUrl = `${STATSWALES_API_BASE}/${THRESHOLD_COUNTS_DATASET_ID}/data`;
  let tcFilterId: string;
  try {
    const postResText = await fetchOrReadCachedText(
      '3ef3a1d8-filter-id.json',
      tcDataPostUrl,
      forceLive,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tcBody),
      },
    );
    const postJson = JSON.parse(postResText) as Record<string, unknown>;
    tcFilterId = safeString(postJson.filterId ?? postJson.filter_id ?? postJson.id);
  } catch (err) {
    console.error('Failed to post filter for Threshold Counts:', err);
    throw err;
  }

  const tcCsvUrl = `${STATSWALES_API_BASE}/${THRESHOLD_COUNTS_DATASET_ID}/data/${tcFilterId}?format=csv`;
  const tcCsvRaw = await fetchOrReadCachedText('3ef3a1d8-raw.csv', tcCsvUrl, forceLive);

  // 5. Trim CSVs
  const kmParsed = readCsv<string[]>(kmCsvRaw, { columns: false, relaxColumnCount: true });
  const kmHeader = kmParsed[0];
  if (!kmHeader) {
    throw new Error('Key Measures CSV is empty');
  }

  const kmDateRefIdx = findHeaderIndex(kmHeader, 'Date_reference');
  const kmOrgRefIdx = findHeaderIndex(kmHeader, 'Local health board provider_reference');
  const kmSpecRefIdx = findHeaderIndex(kmHeader, 'Specialty_reference');
  const kmDescRefIdx = findHeaderIndex(kmHeader, 'Data description_reference');
  const kmValIdx = findHeaderIndex(kmHeader, 'Data values');

  if (
    kmDateRefIdx === -1 ||
    kmOrgRefIdx === -1 ||
    kmSpecRefIdx === -1 ||
    kmDescRefIdx === -1 ||
    kmValIdx === -1
  ) {
    throw new Error(
      `Key Measures CSV header missing required reference columns: ${kmHeader.join(', ')}`,
    );
  }

  const trimmedKmRows: string[][] = [kmHeader];
  for (let i = 1; i < kmParsed.length; i++) {
    const row = kmParsed[i];
    if (!row) {
      continue;
    }
    const dateRef = row[kmDateRefIdx]?.trim();
    const orgRef = row[kmOrgRefIdx]?.trim();
    const specRef = row[kmSpecRefIdx]?.trim();

    if (
      dateRef &&
      TARGET_DATE_CODES.has(dateRef) &&
      orgRef &&
      TARGET_BOARD_ONS_CODES.has(orgRef) &&
      specRef &&
      TARGET_SPECIALTY_CODES.has(specRef)
    ) {
      trimmedKmRows.push(row);
    }
  }

  const trimmedKmCsv = trimmedKmRows.map(toCsvRow).join('\n') + '\n';
  await fs.writeFile(path.join(FIXTURES_DIR, 'acd9529c-data.csv'), trimmedKmCsv, 'utf-8');

  // Trim Threshold Counts CSV
  const tcParsed = readCsv<string[]>(tcCsvRaw, { columns: false, relaxColumnCount: true });
  const tcHeader = tcParsed[0];
  if (!tcHeader) {
    throw new Error('Threshold Counts CSV is empty');
  }

  const tcDateRefIdx = findHeaderIndex(tcHeader, 'Date_reference');
  const tcOrgRefIdx = findHeaderIndex(tcHeader, 'Local health board provider_reference');
  const tcSpecRefIdx = findHeaderIndex(tcHeader, 'Specialty_reference');
  const tcDescRefIdx = findHeaderIndex(tcHeader, 'Data description_reference');
  const tcValIdx = findHeaderIndex(tcHeader, 'Data values');

  if (
    tcDateRefIdx === -1 ||
    tcOrgRefIdx === -1 ||
    tcSpecRefIdx === -1 ||
    tcDescRefIdx === -1 ||
    tcValIdx === -1
  ) {
    throw new Error(
      `Threshold Counts CSV header missing required reference columns: ${tcHeader.join(', ')}`,
    );
  }

  const trimmedTcRows: string[][] = [tcHeader];
  for (let i = 1; i < tcParsed.length; i++) {
    const row = tcParsed[i];
    if (!row) {
      continue;
    }
    const dateRef = row[tcDateRefIdx]?.trim();
    const orgRef = row[tcOrgRefIdx]?.trim();
    const specRef = row[tcSpecRefIdx]?.trim();

    if (
      dateRef &&
      TARGET_DATE_CODES.has(dateRef) &&
      orgRef &&
      TARGET_BOARD_ONS_CODES.has(orgRef) &&
      specRef &&
      TARGET_SPECIALTY_CODES.has(specRef)
    ) {
      trimmedTcRows.push(row);
    }
  }

  const trimmedTcCsv = trimmedTcRows.map(toCsvRow).join('\n') + '\n';
  await fs.writeFile(path.join(FIXTURES_DIR, '3ef3a1d8-data.csv'), trimmedTcCsv, 'utf-8');

  // 6. Verify calibration and suppression criteria
  // Calibration: Cardiff and Vale (W11000029) × 110 (Trauma & Orthopaedic) July 2026
  let cardiffMedian: number | null = null;
  let cardiffWithin: number | null = null;
  let cardiffTotal: number | null = null;
  let cardiffLongWait: number | null = null;

  for (let i = 1; i < trimmedKmRows.length; i++) {
    const row = trimmedKmRows[i];
    if (!row) {
      continue;
    }
    if (
      row[kmDateRefIdx]?.trim() === '202607' &&
      row[kmOrgRefIdx]?.trim() === 'W11000029' &&
      row[kmSpecRefIdx]?.trim() === '110'
    ) {
      const measure = row[kmDescRefIdx]?.trim();
      const val = parseFloat(row[kmValIdx]?.trim() ?? '');
      if (!Number.isNaN(val)) {
        if (measure === '4') cardiffMedian = val;
        if (measure === '2') cardiffWithin = val;
        if (measure === '1') cardiffTotal = val;
      }
    }
  }

  for (let i = 1; i < trimmedTcRows.length; i++) {
    const row = trimmedTcRows[i];
    if (!row) {
      continue;
    }
    if (
      row[tcDateRefIdx]?.trim() === '202607' &&
      row[tcOrgRefIdx]?.trim() === 'W11000029' &&
      row[tcSpecRefIdx]?.trim() === '110'
    ) {
      const measure = row[tcDescRefIdx]?.trim();
      const val = parseFloat(row[tcValIdx]?.trim() ?? '');
      if (!Number.isNaN(val) && measure === '52') {
        cardiffLongWait = val;
      }
    }
  }

  // Check Powys (W11000024) Cardiology (320) July 2026 suppression
  let powys320HasTotal = false;
  let powys320HasMedian = false;
  for (let i = 1; i < trimmedKmRows.length; i++) {
    const row = trimmedKmRows[i];
    if (!row) {
      continue;
    }
    if (
      row[kmDateRefIdx]?.trim() === '202607' &&
      row[kmOrgRefIdx]?.trim() === 'W11000024' &&
      row[kmSpecRefIdx]?.trim() === '320'
    ) {
      const measure = row[kmDescRefIdx]?.trim();
      if (measure === '1') powys320HasTotal = true;
      if (measure === '4') powys320HasMedian = true;
    }
  }

  // Calculate total fixture file size
  const fixtureFiles = [
    'acd9529c-metadata.json',
    '3ef3a1d8-metadata.json',
    'acd9529c-filters.json',
    '3ef3a1d8-filters.json',
    'acd9529c-data.csv',
    '3ef3a1d8-data.csv',
  ];
  let totalBytes = 0;
  for (const file of fixtureFiles) {
    const stat = await fs.stat(path.join(FIXTURES_DIR, file));
    totalBytes += stat.size;
  }

  return {
    keyMeasuresRows: trimmedKmRows.length - 1,
    thresholdCountsRows: trimmedTcRows.length - 1,
    keyMeasuresMetadataVersion: kmMetaVersion,
    thresholdCountsMetadataVersion: tcMetaVersion,
    totalFixtureBytes: totalBytes,
    cardiffVale110Metrics: {
      median: cardiffMedian,
      withinStandardPercent: cardiffWithin,
      totalWaiting: cardiffTotal,
      longWaitCount: cardiffLongWait,
    },
    powysCardiology320HasSuppressedMedian: powys320HasTotal && !powys320HasMedian,
  };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const forceLive = process.argv.includes('--live');
  trimWalesFixtures({ forceLive })
    .then((result) => {
      console.warn('Trim Wales fixtures completed successfully:');
      console.warn(`  Key Measures rows: ${String(result.keyMeasuresRows)}`);
      console.warn(`  Threshold Counts rows: ${String(result.thresholdCountsRows)}`);
      console.warn(`  Total fixtures size: ${(result.totalFixtureBytes / 1024).toFixed(1)} KB`);
      console.warn(`  Cardiff and Vale x 110 July 2026:`, result.cardiffVale110Metrics);
      console.warn(
        `  Powys x 320 July 2026 suppressed median: ${String(result.powysCardiology320HasSuppressedMedian)}`,
      );
    })
    .catch((err: unknown) => {
      console.error('Error trimming Wales fixtures:', err);
      process.exit(1);
    });
}
