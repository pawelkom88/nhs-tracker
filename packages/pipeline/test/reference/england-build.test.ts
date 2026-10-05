import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { referenceDataSchema } from '@kyw/model/reference';
import { reportingUnitId } from '@kyw/model/ids';
import {
  buildEnglandReferenceData,
  DEFAULT_ENGLAND_REFERENCE_OUTPUT_PATH,
  loadEnglandReferenceOds,
  writeEnglandReferenceData,
} from '../../src/reference/england/build.js';
import { ENGLAND_NHS_REGIONS } from '../../src/reference/england/regions.js';
import { ENGLAND_SPECIALTIES } from '../../src/reference/england/specialties.js';
import type { EnglandRttProviderInput } from '../../src/reference/england/units.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const FIXTURE_DIR = path.resolve(__dirname, '../../fixtures/ods');

describe('England Reference Data Builder (T-3.9)', () => {
  it('builds valid England reference data from fixture ODS files', async () => {
    const data = await buildEnglandReferenceData({
      odsOptions: { fixtureDir: FIXTURE_DIR },
      retrievedAt: '2026-10-01T00:00:00.000Z',
    });

    // Validate with strict model schema
    const parsed = referenceDataSchema('england').parse(data);
    expect(parsed.nation).toBe('england');
    expect(parsed.retrievedAt).toBe('2026-10-01T00:00:00.000Z');
    expect(parsed.nhsRegions).toEqual(
      ENGLAND_NHS_REGIONS.map((r) => ({
        id: r.id,
        officialCode: r.officialCode,
        name: r.name,
      })),
    );
    expect(parsed.specialties).toEqual(ENGLAND_SPECIALTIES);

    // Verify reporting units exist and conform to rules
    expect(parsed.reportingUnits.length).toBeGreaterThan(0);
    for (const unit of parsed.reportingUnits) {
      expect(unit.id).toMatch(/^england:[A-Z0-9]+$/);
      expect(unit.nhsRegion).toMatch(/^england:Y\d{2}$/);
      expect(['nhs-trust', 'independent-sector-provider']).toContain(unit.kind);
      expect(Array.isArray(unit.hospitalSites)).toBe(true);
      expect(Array.isArray(unit.predecessors)).toBe(true);
      expect(Array.isArray(unit.successors)).toBe(true);
    }

    // Verify hospital sites exist
    expect(parsed.hospitalSites.length).toBeGreaterThan(0);
    for (const site of parsed.hospitalSites) {
      expect(site.id).toMatch(/^england:[A-Z0-9]+$/);
      expect(site.reportingUnit).toMatch(/^england:[A-Z0-9]+$/);
      expect(site.name.length).toBeGreaterThan(0);
    }
  });

  it('correctly categorises trusts and ISPs and links succession', async () => {
    const ods = await loadEnglandReferenceOds({ fixtureDir: FIXTURE_DIR });

    const providers: EnglandRttProviderInput[] = [
      {
        code: 'R1H',
        rttName: 'BARTS HEALTH NHS TRUST',
        kind: 'nhs-trust',
        regionCode: 'Y56',
      },
      {
        code: 'RAL',
        rttName: 'ROYAL FREE LONDON NHS FOUNDATION TRUST',
        kind: 'nhs-trust',
        regionCode: 'Y56',
      },
      {
        code: 'RAP',
        rttName: 'NORTH MIDDLESEX UNIVERSITY HOSPITAL NHS TRUST',
        kind: 'nhs-trust',
        regionCode: 'Y56',
      },
      {
        code: 'NT3',
        rttName: 'SPIRE HEALTHCARE',
        kind: 'independent-sector-provider',
        regionCode: 'Y56',
      },
      {
        code: 'A1D1B',
        rttName: 'SPAMEDICA WEMBLEY',
        kind: 'independent-sector-provider',
        regionCode: 'Y56',
      },
    ];

    const data = await buildEnglandReferenceData({
      providers,
      ods,
      retrievedAt: '2026-10-01T00:00:00.000Z',
    });

    const r1h = data.reportingUnits.find((u) => u.officialCode === 'R1H');
    expect(r1h).toBeDefined();
    expect(r1h?.kind).toBe('nhs-trust');
    expect(r1h?.nhsRegion).toBe('england:Y56');
    expect(r1h?.displayName).toBe('Barts Health NHS Trust');
    expect(r1h?.hospitalSites.length).toBeGreaterThan(0);

    const ral = data.reportingUnits.find((u) => u.officialCode === 'RAL');
    expect(ral).toBeDefined();
    expect(ral?.kind).toBe('nhs-trust');
    // RAL absorbed RAP in succ.csv
    expect(ral?.predecessors).toContain(reportingUnitId('england', 'RAP'));

    const rap = data.reportingUnits.find((u) => u.officialCode === 'RAP');
    expect(rap).toBeDefined();
    expect(rap?.successors).toContain(reportingUnitId('england', 'RAL'));

    const isParent = data.reportingUnits.find((u) => u.officialCode === 'NT3');
    expect(isParent).toBeDefined();
    expect(isParent?.kind).toBe('independent-sector-provider');
    expect(isParent?.nhsRegion).toBe('england:Y56');

    const isSite = data.reportingUnits.find((u) => u.officialCode === 'A1D1B');
    expect(isSite).toBeDefined();
    expect(isSite?.kind).toBe('independent-sector-provider');
    expect(isSite?.displayName).toBe('SpaMedica Wembley');
  });

  it('deduplicates provider inputs across multiple releases', async () => {
    const ods = await loadEnglandReferenceOds({ fixtureDir: FIXTURE_DIR });

    const duplicateProviders: EnglandRttProviderInput[] = [
      {
        code: 'R1H',
        rttName: 'BARTS HEALTH NHS TRUST',
        kind: 'nhs-trust',
        regionCode: 'Y56',
      },
      {
        code: 'R1H',
        rttName: 'BARTS HEALTH NHS TRUST',
        kind: 'nhs-trust',
        regionCode: 'Y56',
      },
      {
        code: 'RRK',
        rttName: 'UNIVERSITY HOSPITALS BIRMINGHAM NHS FOUNDATION TRUST',
        kind: 'nhs-trust',
        regionCode: 'Y60',
      },
    ];

    const data = await buildEnglandReferenceData({
      providers: duplicateProviders,
      ods,
    });

    expect(data.reportingUnits).toHaveLength(2);
    expect(data.reportingUnits.map((u) => u.officialCode)).toEqual(['R1H', 'RRK']);
  });

  it('produces deterministic output across multiple builds', async () => {
    const ods = await loadEnglandReferenceOds({ fixtureDir: FIXTURE_DIR });

    const build1 = await buildEnglandReferenceData({
      ods,
      retrievedAt: '2026-10-01T00:00:00.000Z',
    });
    const build2 = await buildEnglandReferenceData({
      ods,
      retrievedAt: '2026-10-01T00:00:00.000Z',
    });

    expect(JSON.stringify(build1)).toBe(JSON.stringify(build2));
  });

  it('writes canonical JSON reference file to disk and validates structure', async () => {
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'kyw-england-ref-test-'));
    const tmpPath = path.join(tmpDir, 'test-england-reference.json');

    await writeEnglandReferenceData(tmpPath, {
      odsOptions: { fixtureDir: FIXTURE_DIR },
      retrievedAt: '2026-10-01T00:00:00.000Z',
    });

    const writtenContent = await fs.readFile(tmpPath, 'utf-8');
    const parsed = JSON.parse(writtenContent) as {
      nation: string;
      reportingUnits: unknown[];
      nhsRegions: unknown[];
      specialties: unknown[];
    };

    expect(parsed.nation).toBe('england');
    expect(parsed.reportingUnits.length).toBeGreaterThan(0);
    expect(parsed.nhsRegions.length).toBe(7);
    expect(parsed.specialties.length).toBe(24);

    // Clean up temporary directory
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it('committed data/england/reference.json validates against schema', async () => {
    const raw = await fs.readFile(DEFAULT_ENGLAND_REFERENCE_OUTPUT_PATH, 'utf-8');
    const parsed = JSON.parse(raw) as unknown;
    const validated = referenceDataSchema('england').parse(parsed);

    expect(validated.nation).toBe('england');
    expect(validated.reportingUnits.length).toBeGreaterThan(400);
    expect(validated.nhsRegions).toHaveLength(7);
    expect(validated.specialties).toHaveLength(24);
  });
});
