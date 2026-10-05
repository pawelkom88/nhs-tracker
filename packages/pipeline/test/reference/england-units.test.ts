import { describe, expect, it } from 'vitest';
import { hospitalSiteSchema, reportingUnitSchema } from '@kyw/model/reference';
import { reportingUnitId, hospitalSiteId } from '@kyw/model/ids';
import { loadOdsReport } from '../../src/reference/ods/client.js';
import { toDisplayName } from '../../src/reference/names.js';
import {
  buildEnglandReportingUnitsAndSites,
  type EnglandRttProviderInput,
} from '../../src/reference/england/units.js';

describe('toDisplayName', () => {
  it('title-cases standard organisation names', () => {
    expect(toDisplayName('BARTS HEALTH NHS TRUST')).toBe('Barts Health NHS Trust');
    expect(toDisplayName('ROYAL FREE LONDON NHS FOUNDATION TRUST')).toBe(
      'Royal Free London NHS Foundation Trust',
    );
    expect(toDisplayName('NORTH MIDDX UNIVERSITY HOSPITAL NHS TRUST')).toBe(
      'North Middx University Hospital NHS Trust',
    );
  });

  it('preserves uppercase acronyms and initialisms', () => {
    expect(toDisplayName('PRACTICE PLUS GROUP MSK')).toBe('Practice Plus Group MSK');
    expect(toDisplayName('WEST MIDDLESEX ENT CLINIC')).toBe('West Middlesex ENT Clinic');
    expect(toDisplayName('NORTH CENTRAL LONDON OOH')).toBe('North Central London OOH');
    expect(toDisplayName('B&Q WAKEFIELD OPHTHALMOLOGY')).toBe('B&Q Wakefield Ophthalmology');
  });

  it('keeps prepositions and particles lowercase when in the middle of names', () => {
    expect(toDisplayName('KINGSTON UPON THAMES HOSPITALS')).toBe('Kingston upon Thames Hospitals');
    expect(toDisplayName('ASHTON-UNDER-LYNE GENERAL HOSPITAL')).toBe(
      'Ashton-under-Lyne General Hospital',
    );
    expect(toDisplayName('WESTON-SUPER-MARE HOSPITAL')).toBe('Weston-super-Mare Hospital');
    expect(toDisplayName('UNIVERSITY HOSPITALS OF NORTH MIDLANDS')).toBe(
      'University Hospitals of North Midlands',
    );
    expect(toDisplayName('THE ROYAL LONDON HOSPITAL')).toBe('The Royal London Hospital');
  });

  it('handles proper noun prefixes and brand casings', () => {
    expect(toDisplayName('ST. PANCRAS HOSPITAL')).toBe('St. Pancras Hospital');
    expect(toDisplayName('ST PANCRAS HOSPITAL')).toBe('St Pancras Hospital');
    expect(toDisplayName('SPAMEDICA WEMBLEY')).toBe('SpaMedica Wembley');
    expect(toDisplayName('INHEALTH ENDOSCOPY UNIT')).toBe('InHealth Endoscopy Unit');
    expect(toDisplayName("MCDONALD'S CHILDREN'S CLINIC")).toBe("McDonald's Children's Clinic");
    expect(toDisplayName("O'CONNOR REHABILITATION CENTRE")).toBe("O'Connor Rehabilitation Centre");
  });

  it('handles empty and whitespace-only strings', () => {
    expect(toDisplayName('')).toBe('');
    expect(toDisplayName('   ')).toBe('');
  });
});

describe('buildEnglandReportingUnitsAndSites', () => {
  async function loadOdsFixtureData() {
    const [etr, ets, ephp, ephpsite] = await Promise.all([
      loadOdsReport('etr', { source: 'fixture' }),
      loadOdsReport('ets', { source: 'fixture' }),
      loadOdsReport('ephp', { source: 'fixture' }),
      loadOdsReport('ephpsite', { source: 'fixture' }),
    ]);
    return { etr, ets, ephp, ephpsite };
  }

  it('builds NHS trust reporting units and hospital sites from fixtures', async () => {
    const ods = await loadOdsFixtureData();

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
    ];

    const result = buildEnglandReportingUnitsAndSites(providers, ods);

    expect(result.reportingUnits).toHaveLength(2);
    expect(result.warnings).toHaveLength(0);

    const r1h = result.reportingUnits.find((u) => u.officialCode === 'R1H');
    expect(r1h).toBeDefined();
    expect(r1h?.id).toBe(reportingUnitId('england', 'R1H'));
    expect(r1h?.displayName).toBe('Barts Health NHS Trust');
    expect(r1h?.officialName).toBe('BARTS HEALTH NHS TRUST');
    expect(r1h?.kind).toBe('nhs-trust');
    expect(r1h?.nhsRegion).toBe('england:Y56');
    expect(r1h?.operational).toEqual({ from: '2012-04-01', to: null });
    expect(r1h?.hospitalSites.length).toBeGreaterThan(0);

    // Validate with model schema
    expect(() => reportingUnitSchema('england').parse(r1h)).not.toThrow();

    // Check sites under R1H
    const r1hUnitId = reportingUnitId('england', 'R1H');
    const r1hSites = result.hospitalSites.filter((s) => s.reportingUnit === r1hUnitId);
    expect(r1hSites.length).toBeGreaterThan(0);

    for (const site of r1hSites) {
      expect(() => hospitalSiteSchema('england').parse(site)).not.toThrow();
      expect(site.id.startsWith('england:')).toBe(true);
      expect(site.reportingUnit).toBe(r1hUnitId);
      // No postcode property
      expect('postcode' in site).toBe(false);
    }
  });

  it('excludes RO31 ePACT pseudo-sites and filters non-hospital sites', async () => {
    const ods = await loadOdsFixtureData();

    const providers: EnglandRttProviderInput[] = [
      {
        code: 'RRK',
        rttName: 'UNIVERSITY HOSPITALS BIRMINGHAM NHS FOUNDATION TRUST',
        kind: 'nhs-trust',
        regionCode: 'Y60',
      },
    ];

    const result = buildEnglandReportingUnitsAndSites(providers, ods);
    const rrkUnitId = reportingUnitId('england', 'RRK');
    const rrkSites = result.hospitalSites.filter((s) => s.reportingUnit === rrkUnitId);

    // Make sure known RO31 sites like A0D0W, A0D3T are excluded
    const siteCodes = rrkSites.map((s) => s.officialCode);
    expect(siteCodes).not.toContain('A0D0W');
    expect(siteCodes).not.toContain('A0D3T');
    expect(siteCodes).not.toContain('A0D4C');

    // Confirm Queen Elizabeth Hospital (RRK02 / RRK97) or other eligible hospital is present
    expect(rrkSites.some((s) => s.name.includes('Hospital') || s.name.includes('Clinic'))).toBe(
      true,
    );
  });

  it('builds parent independent sector providers with child sites', async () => {
    const ods = await loadOdsFixtureData();

    const providers: EnglandRttProviderInput[] = [
      {
        code: 'NT3',
        rttName: 'SPIRE HEALTHCARE',
        kind: 'independent-sector-provider',
        regionCode: 'Y56',
      },
    ];

    const result = buildEnglandReportingUnitsAndSites(providers, ods);
    const nt3 = result.reportingUnits.find((u) => u.officialCode === 'NT3');
    expect(nt3).toBeDefined();
    expect(nt3?.kind).toBe('independent-sector-provider');
    expect(nt3?.operational).toEqual({ from: '2003-10-01', to: null });

    const nt3UnitId = reportingUnitId('england', 'NT3');
    const nt3Sites = result.hospitalSites.filter((s) => s.reportingUnit === nt3UnitId);
    expect(nt3Sites.length).toBeGreaterThan(0);

    for (const site of nt3Sites) {
      expect(() => hospitalSiteSchema('england').parse(site)).not.toThrow();
    }
  });

  it('resolves site-level ISP codes with no children to themselves as a site', async () => {
    const ods = await loadOdsFixtureData();

    const providers: EnglandRttProviderInput[] = [
      {
        code: 'A1D1B',
        rttName: 'SPAMEDICA WEMBLEY',
        kind: 'independent-sector-provider',
        regionCode: 'Y56',
      },
    ];

    const result = buildEnglandReportingUnitsAndSites(providers, ods);
    const unit = result.reportingUnits[0];
    expect(unit).toBeDefined();
    if (!unit) throw new Error('Unit should exist');

    const expectedUnitId = reportingUnitId('england', 'A1D1B');
    const expectedSiteId = hospitalSiteId('england', 'A1D1B');

    expect(unit.id).toBe(expectedUnitId);
    expect(unit.displayName).toBe('SpaMedica Wembley');
    expect(unit.hospitalSites).toEqual([expectedSiteId]);

    const site = result.hospitalSites.find((s) => s.id === expectedSiteId);
    expect(site).toBeDefined();
    expect(site?.officialCode).toBe('A1D1B');
    expect(site?.name).toBe('SpaMedica Wembley');
    expect(site?.town).toBe('Wembley');
    expect(site?.reportingUnit).toBe(expectedUnitId);

    expect(() => reportingUnitSchema('england').parse(unit)).not.toThrow();
    expect(() => hospitalSiteSchema('england').parse(site)).not.toThrow();
  });

  it('handles units not found in ODS gracefully with empty sites and warnings', async () => {
    const ods = await loadOdsFixtureData();

    const providers: EnglandRttProviderInput[] = [
      {
        code: 'UNKNOWN99',
        rttName: 'UNKNOWN COMMUNITY HEALTHCARE PROVIDER',
        kind: 'nhs-trust',
        regionCode: 'Y58',
      },
    ];

    const result = buildEnglandReportingUnitsAndSites(providers, ods);

    expect(result.reportingUnits).toHaveLength(1);
    const unit = result.reportingUnits[0];
    expect(unit).toBeDefined();
    if (!unit) throw new Error('Unit should exist');

    expect(unit.id).toBe(reportingUnitId('england', 'UNKNOWN99'));
    expect(unit.hospitalSites).toEqual([]);
    expect(unit.operational).toEqual({ from: null, to: null });
    expect(result.warnings).toContain(
      'Unit "UNKNOWN99" (UNKNOWN COMMUNITY HEALTHCARE PROVIDER) not found in ODS data',
    );

    expect(() => reportingUnitSchema('england').parse(unit)).not.toThrow();
  });

  it('throws on invalid region code', async () => {
    const ods = await loadOdsFixtureData();

    const providers: EnglandRttProviderInput[] = [
      {
        code: 'R1H',
        rttName: 'BARTS HEALTH NHS TRUST',
        kind: 'nhs-trust',
        regionCode: 'INVALID_REGION',
      },
    ];

    expect(() => buildEnglandReportingUnitsAndSites(providers, ods)).toThrow(
      /Unknown England NHS Region code/i,
    );
  });
});
