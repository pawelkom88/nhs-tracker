import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { fetchToCache } from '../../http/fetch.js';
import { readCsv } from '../../io/csv.js';
import {
  type OdsReportName,
  type OdsRowFor,
  mapOdsStandardRow,
  mapOdsSuccessionRow,
} from './columns.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const DEFAULT_ODS_FIXTURES_DIR = path.resolve(__dirname, '../../../fixtures/ods');

export const ODS_REPORT_URLS: Readonly<Record<OdsReportName, string>> = {
  etr: 'https://www.odsdatasearchandexport.nhs.uk/api/getReport?report=etr',
  ets: 'https://www.odsdatasearchandexport.nhs.uk/api/getReport?report=ets',
  ephp: 'https://www.odsdatasearchandexport.nhs.uk/api/getReport?report=ephp',
  ephpsite: 'https://www.odsdatasearchandexport.nhs.uk/api/getReport?report=ephpsite',
  succ: 'https://www.odsdatasearchandexport.nhs.uk/api/getReport?report=succ',
  wlhb: 'https://www.odsdatasearchandexport.nhs.uk/api/getReport?report=wlhb',
};

export interface LoadOdsReportOptions {
  readonly source?: 'fixture' | 'live';
  readonly fixtureDir?: string;
  readonly cacheDir?: string;
  readonly fetchImpl?: typeof fetch;
}

/**
 * Loads and parses an ODS bulk report from committed fixtures or live ODS downloads.
 * Validates column counts and discards postcode data.
 */
export async function loadOdsReport<R extends OdsReportName>(
  report: R,
  options: LoadOdsReportOptions = {},
): Promise<OdsRowFor<R>[]> {
  const source = options.source ?? 'fixture';
  let csvText: string;

  if (source === 'fixture') {
    const fixtureDir = options.fixtureDir ?? DEFAULT_ODS_FIXTURES_DIR;
    const filePath = path.join(fixtureDir, `${report}.csv`);
    csvText = await fs.readFile(filePath, 'utf-8');
  } else {
    const url = ODS_REPORT_URLS[report];
    const fetchResult = await fetchToCache(url, {
      ...(options.cacheDir ? { cacheDir: options.cacheDir } : {}),
      ...(options.fetchImpl ? { fetchImpl: options.fetchImpl } : {}),
    });
    csvText = await fs.readFile(fetchResult.path, 'utf-8');
  }

  const rawRows = readCsv<string[]>(csvText, {
    columns: false,
    trim: true,
    skipEmptyLines: true,
    relaxColumnCount: true,
  });

  if (report === 'succ') {
    return rawRows.map((raw, idx) => mapOdsSuccessionRow(raw, idx)) as unknown as OdsRowFor<R>[];
  }

  return rawRows.map((raw, idx) =>
    mapOdsStandardRow(raw, idx, report),
  ) as unknown as OdsRowFor<R>[];
}
