import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import ExcelJS from 'exceljs';
import { normalizeCellValue } from '../src/io/xlsx.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const FIXTURES_DIR = path.resolve(__dirname, '../fixtures/england');
const RAW_CACHE_DIR = path.resolve(__dirname, '../.cache/england-raw');

export const ENGLAND_SOURCE_URLS = {
  'rtt-data-2026-27.html':
    'https://www.england.nhs.uk/statistics/statistical-work-areas/rtt-waiting-times/rtt-data-2026-27/',
  'rtt-data-2025-26.html':
    'https://www.england.nhs.uk/statistics/statistical-work-areas/rtt-waiting-times/rtt-data-2025-26/',
  'Incomplete-Provider-Jul26.xlsx':
    'https://www.england.nhs.uk/statistics/wp-content/uploads/sites/2/2026/09/Incomplete-Provider-Jul26-XLSX-9M-97ylx5.xlsx',
  'Incomplete-Provider-Jul25.xlsx':
    'https://www.england.nhs.uk/statistics/wp-content/uploads/sites/2/2026/02/Incomplete-Provider-Jul25-XLSX-9M-revised-2.xlsx',
  'Incomplete-Provider-Mar26-revised.xlsx':
    'https://www.england.nhs.uk/statistics/wp-content/uploads/sites/2/2026/07/Incomplete-Provider-Mar26-XLSX-9M-revised.xlsx',
} as const;

export type EnglandFixtureKey = keyof typeof ENGLAND_SOURCE_URLS;

export const TARGET_TRUST_CODES = new Set([
  'R1H', // Barts Health NHS Trust (large trust)
  'RRK', // University Hospitals Birmingham NHS Foundation Trust
  'RAL', // Royal Free London NHS Foundation Trust (absorbed RAP 2025-01-01)
  'RAP', // North Middlesex University Hospital NHS Trust (absorbed by RAL)
  'RA9', // Torbay and South Devon NHS Foundation Trust (non-submitter in Jul 2026, present in Jul 2025)
]);

export const TARGET_ISP_CODES = new Set([
  'A1D1B', // SpaMedica Wembley (site-level Independent Sector Provider with Suppressed Figure median)
  'NT314', // Spire London East (Independent Sector Provider)
]);

const DETERMINISTIC_DATE = new Date('2026-10-03T00:00:00.000Z');

/**
 * Sets fixed DOS timestamps on all ZIP local and central directory headers
 * to guarantee byte-for-byte deterministic XLSX output across runs.
 */
function normalizeZipBufferTimestamps(buf: Buffer): Buffer {
  const result = Buffer.from(buf);
  let pos = 0;
  const FIXED_TIME = 0;
  const FIXED_DATE = 0x0021; // 1980-01-01

  while (pos < result.length - 4) {
    const sig = result.readUInt32LE(pos);
    if (sig === 0x04034b50) {
      // Local file header (sig: 4, ver: 2, flags: 2, comp: 2, time: 2, date: 2, crc: 4, compSize: 4, uncompSize: 4, nameLen: 2, extraLen: 2)
      result.writeUInt16LE(FIXED_TIME, pos + 10);
      result.writeUInt16LE(FIXED_DATE, pos + 12);
      const nameLen = result.readUInt16LE(pos + 26);
      const extraLen = result.readUInt16LE(pos + 28);
      pos += 30 + nameLen + extraLen;
    } else if (sig === 0x02014b50) {
      // Central directory header (sig: 4, verMade: 2, verNeeded: 2, flags: 2, comp: 2, time: 2, date: 2, ...)
      result.writeUInt16LE(FIXED_TIME, pos + 12);
      result.writeUInt16LE(FIXED_DATE, pos + 14);
      const nameLen = result.readUInt16LE(pos + 28);
      const extraLen = result.readUInt16LE(pos + 30);
      const commentLen = result.readUInt16LE(pos + 32);
      pos += 46 + nameLen + extraLen + commentLen;
    } else {
      pos++;
    }
  }
  return result;
}

async function fetchOrReadRaw(filename: EnglandFixtureKey, forceLive = false): Promise<Buffer> {
  await fs.mkdir(RAW_CACHE_DIR, { recursive: true });
  const rawPath = path.join(RAW_CACHE_DIR, filename);

  if (!forceLive) {
    try {
      return await fs.readFile(rawPath);
    } catch {
      // cache miss -> fall through to fetch
    }
  }

  const url = ENGLAND_SOURCE_URLS[filename];
  console.warn(`Downloading live source for ${filename} from ${url}`);
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'KnowYourWait-pipeline (+https://github.com/know-your-wait)',
    },
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch ${url}: HTTP ${String(res.status)} ${res.statusText}`);
  }

  const buf = Buffer.from(await res.arrayBuffer());
  await fs.writeFile(rawPath, buf);
  return buf;
}

export async function trimEnglandXlsx(inputBuf: Buffer): Promise<Buffer> {
  const src = new ExcelJS.Workbook();
  type LoadBufferParam = Parameters<typeof src.xlsx.load>[0];
  await src.xlsx.load(inputBuf as unknown as LoadBufferParam);

  const dest = new ExcelJS.Workbook();
  dest.creator = 'Know Your Wait Pipeline';
  dest.lastModifiedBy = 'Know Your Wait Pipeline';
  dest.created = DETERMINISTIC_DATE;
  dest.modified = DETERMINISTIC_DATE;
  dest.lastPrinted = DETERMINISTIC_DATE;

  for (const sheet of src.worksheets) {
    if (!['Provider', 'IS Provider', 'Notes', 'Guidance'].includes(sheet.name)) {
      continue;
    }

    const destSheet = dest.addWorksheet(sheet.name);
    const isDataSheet = sheet.name === 'Provider' || sheet.name === 'IS Provider';
    const filterSet = sheet.name === 'Provider' ? TARGET_TRUST_CODES : TARGET_ISP_CODES;

    sheet.eachRow({ includeEmpty: true }, (row, rowNumber) => {
      if (!isDataSheet || rowNumber <= 14) {
        const rowVals: (string | number | boolean | Date | null)[] = [];
        for (let col = 1; col <= row.cellCount; col++) {
          rowVals.push(normalizeCellValue(row.getCell(col).value, { trim: false }));
        }
        destSheet.addRow(rowVals);
        return;
      }

      // Column C / 3 is the ReportingUnit Provider Code
      const rawCode = row.getCell(3).value;
      const code =
        typeof rawCode === 'string'
          ? rawCode.trim()
          : typeof rawCode === 'number'
            ? String(rawCode)
            : '';
      if (filterSet.has(code)) {
        const rowVals: (string | number | boolean | Date | null)[] = [];
        for (let col = 1; col <= row.cellCount; col++) {
          rowVals.push(normalizeCellValue(row.getCell(col).value, { trim: false }));
        }
        destSheet.addRow(rowVals);
      }
    });
  }

  const outRawBuf = await dest.xlsx.writeBuffer();
  return normalizeZipBufferTimestamps(Buffer.from(outRawBuf));
}

export interface FixtureInfo {
  readonly url: string;
  readonly rawSha256: string;
  readonly rawBytes: number;
  readonly fixtureBytes: number;
}

export async function trimEnglandFixtures(options: { forceLive?: boolean } = {}): Promise<void> {
  await fs.mkdir(FIXTURES_DIR, { recursive: true });

  const hashes = new Map<EnglandFixtureKey, FixtureInfo>();

  // 1. HTML Pages
  for (const htmlFile of ['rtt-data-2026-27.html', 'rtt-data-2025-26.html'] as const) {
    const rawBuf = await fetchOrReadRaw(htmlFile, options.forceLive);
    const rawSha256 = createHash('sha256').update(rawBuf).digest('hex');
    const outPath = path.join(FIXTURES_DIR, htmlFile);
    await fs.writeFile(outPath, rawBuf);
    hashes.set(htmlFile, {
      url: ENGLAND_SOURCE_URLS[htmlFile],
      rawSha256,
      rawBytes: rawBuf.byteLength,
      fixtureBytes: rawBuf.byteLength,
    });
    console.warn(`Saved fixture ${htmlFile} (${String(rawBuf.byteLength)} bytes)`);
  }

  // 2. XLSX Files
  for (const xlsxFile of [
    'Incomplete-Provider-Jul26.xlsx',
    'Incomplete-Provider-Jul25.xlsx',
    'Incomplete-Provider-Mar26-revised.xlsx',
  ] as const) {
    const rawBuf = await fetchOrReadRaw(xlsxFile, options.forceLive);
    const rawSha256 = createHash('sha256').update(rawBuf).digest('hex');
    const trimmedBuf = await trimEnglandXlsx(rawBuf);
    const outPath = path.join(FIXTURES_DIR, xlsxFile);
    await fs.writeFile(outPath, trimmedBuf);
    hashes.set(xlsxFile, {
      url: ENGLAND_SOURCE_URLS[xlsxFile],
      rawSha256,
      rawBytes: rawBuf.byteLength,
      fixtureBytes: trimmedBuf.byteLength,
    });
    console.warn(`Saved trimmed fixture ${xlsxFile} (${String(trimmedBuf.byteLength)} bytes)`);
  }

  // 3. Generate README.md
  let totalBytes = 0;
  for (const info of hashes.values()) {
    totalBytes += info.fixtureBytes;
  }

  const getInfo = (key: EnglandFixtureKey): FixtureInfo => {
    const found = hashes.get(key);
    if (!found) throw new Error(`Missing info for ${key}`);
    return found;
  };

  const h2627 = getInfo('rtt-data-2026-27.html');
  const h2526 = getInfo('rtt-data-2025-26.html');
  const xJul26 = getInfo('Incomplete-Provider-Jul26.xlsx');
  const xJul25 = getInfo('Incomplete-Provider-Jul25.xlsx');
  const xMar26 = getInfo('Incomplete-Provider-Mar26-revised.xlsx');

  const readmeContent = `# England RTT Fixtures

Trimmed real published NHS England RTT data files used for unit tests in \`@kyw/pipeline\`.
All fixtures are created deterministically from official NHS England releases by \`packages/pipeline/scripts/trim-england-fixture.ts\`.

## Sources and Hashes

Downloaded: 3 October 2026

| Fixture file | Source URL | Original SHA-256 | Original Size | Fixture Size |
|---|---|---|---|---|
| \`rtt-data-2026-27.html\` | ${h2627.url} | \`${h2627.rawSha256}\` | ${String(h2627.rawBytes)} B | ${String(h2627.fixtureBytes)} B |
| \`rtt-data-2025-26.html\` | ${h2526.url} | \`${h2526.rawSha256}\` | ${String(h2526.rawBytes)} B | ${String(h2526.fixtureBytes)} B |
| \`Incomplete-Provider-Jul26.xlsx\` | ${xJul26.url} | \`${xJul26.rawSha256}\` | ${(xJul26.rawBytes / (1024 * 1024)).toFixed(2)} MB | ${(xJul26.fixtureBytes / 1024).toFixed(1)} KB |
| \`Incomplete-Provider-Jul25.xlsx\` | ${xJul25.url} | \`${xJul25.rawSha256}\` | ${(xJul25.rawBytes / (1024 * 1024)).toFixed(2)} MB | ${(xJul25.fixtureBytes / 1024).toFixed(1)} KB |
| \`Incomplete-Provider-Mar26-revised.xlsx\` | ${xMar26.url} | \`${xMar26.rawSha256}\` | ${(xMar26.rawBytes / (1024 * 1024)).toFixed(2)} MB | ${(xMar26.fixtureBytes / 1024).toFixed(1)} KB |

**Total fixture size**: ${(totalBytes / 1024).toFixed(1)} KB (budget $\\le 500\\text{ KB}$).

## Content Retained

- **Metadata and Headers**: Rows 1–14 kept intact on sheets \`Provider\` and \`IS Provider\`. Header row 14 structure and column names untouched.
- **Reference Text**: Sheet \`Notes\` and \`Guidance\` kept intact.
- **Reporting Units (NHS Trusts)**:
  - \`R1H\` — Barts Health NHS Trust (large London trust).
  - \`RRK\` — University Hospitals Birmingham NHS Foundation Trust.
  - \`RAL\` — Royal Free London NHS Foundation Trust (absorbed RAP on 2025-01-01).
  - \`RAP\` — North Middlesex University Hospital NHS Trust (predecessor to RAL).
  - \`RA9\` — Torbay and South Devon NHS Foundation Trust (present in Jul 2025 / Mar 2026, non-submitter in Jul 2026).
- **Independent Sector Providers (ISPs)**:
  - \`A1D1B\` — SpaMedica Wembley (site-level ISP code with Suppressed Figure medians \`-\` on small/zero pathway rows).
  - \`NT314\` — Spire London East (ISP with active pathways across surgical specialties).
- **Specialties**: All 24 treatment functions retained per provider.

## How to Reproduce

\`\`\`bash
pnpm --filter @kyw/pipeline exec tsx scripts/trim-england-fixture.ts
\`\`\`

Pass \`--live\` to re-download originals from NHS England:
\`\`\`bash
pnpm --filter @kyw/pipeline exec tsx scripts/trim-england-fixture.ts --live
\`\`\`
`;

  await fs.writeFile(path.join(FIXTURES_DIR, 'README.md'), readmeContent, 'utf-8');
  console.warn(`Generated README.md in fixtures/england/`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const forceLive = process.argv.includes('--live');
  trimEnglandFixtures({ forceLive }).catch((err: unknown) => {
    console.error('Error trimming England fixtures:', err);
    process.exit(1);
  });
}
