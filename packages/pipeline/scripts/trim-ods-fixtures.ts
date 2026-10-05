import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readCsv } from '../src/io/csv.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const FIXTURES_DIR = path.resolve(__dirname, '../fixtures/ods');
const RAW_CACHE_DIR = path.resolve(__dirname, '../.cache/ods-raw');

const TARGET_TRUST_CODES = new Set([
  'R1H', // Barts Health NHS Trust
  'RRK', // University Hospitals Birmingham NHS Foundation Trust
  'RAL', // Royal Free London NHS Foundation Trust
  'RAP', // North Middlesex University Hospital NHS Trust (absorbed by RAL)
  'RA7', // University Hospitals Bristol and Weston NHS Foundation Trust
  'RVJ', // North Bristol NHS Trust (absorbed by RA7)
  'RQF', // Cwm Taf Morgannwg University Health Board / Welsh trust in etr
  'NT3', // Sample ISP / Trust
  'R1C', // Merged trusts
  'RW1',
  'RY9',
  'RAX',
  'RNK',
  'G6V2S',
  'RY2',
  'RWW',
  'RYV',
  'RY3',
]);

const TARGET_ISP_CODES = new Set(['NT3', 'A1D1B', 'NTP', 'NV3']);

const ODS_URLS: Record<string, string> = {
  etr: 'https://www.odsdatasearchandexport.nhs.uk/api/getReport?report=etr',
  ets: 'https://www.odsdatasearchandexport.nhs.uk/api/getReport?report=ets',
  ephp: 'https://www.odsdatasearchandexport.nhs.uk/api/getReport?report=ephp',
  ephpsite: 'https://www.odsdatasearchandexport.nhs.uk/api/getReport?report=ephpsite',
  succ: 'https://www.odsdatasearchandexport.nhs.uk/api/getReport?report=succ',
  wlhb: 'https://www.odsdatasearchandexport.nhs.uk/api/getReport?report=wlhb',
};

async function fetchOrReadRaw(report: string): Promise<string> {
  await fs.mkdir(RAW_CACHE_DIR, { recursive: true });
  const rawFile = path.join(RAW_CACHE_DIR, `${report}.csv`);
  try {
    return await fs.readFile(rawFile, 'utf-8');
  } catch {
    const url = ODS_URLS[report] ?? '';
    console.warn(`Downloading live ODS report: ${report} from ${url}`);
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'KnowYourWait-pipeline (+https://github.com/know-your-wait)',
      },
    });
    if (!res.ok) {
      throw new Error(`Failed to download ${report}: ${String(res.status)} ${res.statusText}`);
    }
    const text = await res.text();
    await fs.writeFile(rawFile, text, 'utf-8');
    return text;
  }
}

function toCsvLine(cols: string[]): string {
  return cols.map((val) => `"${val.replace(/"/g, '""')}"`).join(',');
}

export async function trimOdsFixtures(): Promise<void> {
  await fs.mkdir(FIXTURES_DIR, { recursive: true });

  // 1. etr
  const etrText = await fetchOrReadRaw('etr');
  const etrRows = readCsv<string[]>(etrText, { columns: false, relaxColumnCount: true });
  const trimmedEtr = etrRows.filter((row) => TARGET_TRUST_CODES.has(row[0]?.trim() ?? ''));
  await fs.writeFile(
    path.join(FIXTURES_DIR, 'etr.csv'),
    trimmedEtr.map(toCsvLine).join('\n') + '\n',
    'utf-8',
  );
  console.warn(`Trimmed etr: ${String(trimmedEtr.length)} rows written`);

  // 2. ets (sites whose parent is in target trusts)
  const etsText = await fetchOrReadRaw('ets');
  const etsRows = readCsv<string[]>(etsText, { columns: false, relaxColumnCount: true });
  const trimmedEts = etsRows.filter((row) => {
    const parent = row[14]?.trim() ?? '';
    const code = row[0]?.trim() ?? '';
    return TARGET_TRUST_CODES.has(parent) || TARGET_TRUST_CODES.has(code);
  });
  await fs.writeFile(
    path.join(FIXTURES_DIR, 'ets.csv'),
    trimmedEts.map(toCsvLine).join('\n') + '\n',
    'utf-8',
  );
  console.warn(`Trimmed ets: ${String(trimmedEts.length)} rows written`);

  // 3. ephp
  const ephpText = await fetchOrReadRaw('ephp');
  const ephpRows = readCsv<string[]>(ephpText, { columns: false, relaxColumnCount: true });
  const trimmedEphp = ephpRows.filter((row) => TARGET_ISP_CODES.has(row[0]?.trim() ?? ''));
  await fs.writeFile(
    path.join(FIXTURES_DIR, 'ephp.csv'),
    trimmedEphp.map(toCsvLine).join('\n') + '\n',
    'utf-8',
  );
  console.warn(`Trimmed ephp: ${String(trimmedEphp.length)} rows written`);

  // 4. ephpsite
  const ephpsiteText = await fetchOrReadRaw('ephpsite');
  const ephpsiteRows = readCsv<string[]>(ephpsiteText, { columns: false, relaxColumnCount: true });
  const trimmedEphpsite = ephpsiteRows.filter((row) => {
    const parent = row[14]?.trim() ?? '';
    const code = row[0]?.trim() ?? '';
    return TARGET_ISP_CODES.has(parent) || TARGET_ISP_CODES.has(code);
  });
  await fs.writeFile(
    path.join(FIXTURES_DIR, 'ephpsite.csv'),
    trimmedEphpsite.map(toCsvLine).join('\n') + '\n',
    'utf-8',
  );
  console.warn(`Trimmed ephpsite: ${String(trimmedEphpsite.length)} rows written`);

  // 5. succ
  const succText = await fetchOrReadRaw('succ');
  const succRows = readCsv<string[]>(succText, { columns: false, relaxColumnCount: true });
  const trimmedSucc = succRows.filter((row) => {
    const pred = row[0]?.trim() ?? '';
    const succ = row[1]?.trim() ?? '';
    return TARGET_TRUST_CODES.has(pred) || TARGET_TRUST_CODES.has(succ);
  });
  await fs.writeFile(
    path.join(FIXTURES_DIR, 'succ.csv'),
    trimmedSucc.map(toCsvLine).join('\n') + '\n',
    'utf-8',
  );
  console.warn(`Trimmed succ: ${String(trimmedSucc.length)} rows written`);

  // 6. wlhb (keep all 7 LHBs)
  const wlhbText = await fetchOrReadRaw('wlhb');
  const wlhbRows = readCsv<string[]>(wlhbText, { columns: false, relaxColumnCount: true });
  await fs.writeFile(
    path.join(FIXTURES_DIR, 'wlhb.csv'),
    wlhbRows.map(toCsvLine).join('\n') + '\n',
    'utf-8',
  );
  console.warn(`Trimmed wlhb: ${String(wlhbRows.length)} rows written`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  trimOdsFixtures().catch((err: unknown) => {
    console.error('Error trimming ODS fixtures:', err);
    process.exit(1);
  });
}
