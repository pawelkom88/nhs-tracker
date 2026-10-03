import { describe, expect, test } from 'vitest';
import { hospitalSiteId, reportingUnitId, specialtyId } from '../src/ids.js';
import {
  ENGLAND_REPORTING_UNIT_KINDS,
  SCOTLAND_REPORTING_UNIT_KINDS,
  WALES_REPORTING_UNIT_KINDS,
  hospitalSiteSchema,
  nhsRegionId,
  nhsRegionSchema,
  referenceDataSchema,
  reportingUnitSchema,
  specialtySchema,
} from '../src/reference.js';

describe('NhsRegion schemas and constructors', () => {
  test('creates valid nhsRegionId and validates with nhsRegionSchema', () => {
    const id = nhsRegionId('Y56');
    expect(id).toBe('england:Y56');

    const validRegion = {
      id,
      officialCode: 'Y56',
      name: 'London',
    };
    expect(nhsRegionSchema.parse(validRegion)).toEqual(validRegion);
  });

  test('nhsRegionSchema rejects extra fields or colons in official code', () => {
    expect(() => nhsRegionId('Y:56')).toThrow(/colon/);
    expect(() => nhsRegionId('')).toThrow(/non-empty/);

    const extraFields = {
      id: nhsRegionId('Y56'),
      officialCode: 'Y56',
      name: 'London',
      extra: true,
    };
    expect(() => nhsRegionSchema.parse(extraFields)).toThrow();
  });
});

describe('HospitalSite schema', () => {
  test('validates valid hospital site', () => {
    const site = {
      id: hospitalSiteId('england', 'R1A01'),
      officialCode: 'R1A01',
      name: 'Worcestershire Royal Hospital',
      town: 'Worcester',
      reportingUnit: reportingUnitId('england', 'R1A'),
    };
    expect(hospitalSiteSchema('england').parse(site)).toEqual(site);
  });

  test('allows null town', () => {
    const site = {
      id: hospitalSiteId('wales', '7A1A1'),
      officialCode: '7A1A1',
      name: 'Ysbyty Gwynedd',
      town: null,
      reportingUnit: reportingUnitId('wales', '7A1'),
    };
    expect(hospitalSiteSchema('wales').parse(site)).toEqual(site);
  });

  test('rejects extra fields such as postcode, latitude, longitude, distance', () => {
    const siteWithPostcode = {
      id: hospitalSiteId('england', 'R1A01'),
      officialCode: 'R1A01',
      name: 'Worcestershire Royal Hospital',
      town: 'Worcester',
      reportingUnit: reportingUnitId('england', 'R1A'),
      postcode: 'WR5 1DD',
    };
    expect(() => hospitalSiteSchema('england').parse(siteWithPostcode)).toThrow();

    const siteWithCoords = {
      id: hospitalSiteId('england', 'R1A01'),
      officialCode: 'R1A01',
      name: 'Worcestershire Royal Hospital',
      town: 'Worcester',
      reportingUnit: reportingUnitId('england', 'R1A'),
      latitude: 52.19,
      longitude: -2.18,
    };
    expect(() => hospitalSiteSchema('england').parse(siteWithCoords)).toThrow();
  });

  test('rejects mismatched nation id', () => {
    const site = {
      id: hospitalSiteId('wales', '7A1A1'),
      officialCode: '7A1A1',
      name: 'Ysbyty Gwynedd',
      town: 'Bangor',
      reportingUnit: reportingUnitId('wales', '7A1'),
    };
    expect(() => hospitalSiteSchema('england').parse(site)).toThrow();
  });
});

describe('Specialty schema', () => {
  test('validates valid specialty', () => {
    const spec = {
      id: specialtyId('england', '100'),
      officialCode: '100',
      officialName: 'General Surgery',
      slug: 'general-surgery',
      descriptionKey: 'specialties.general-surgery',
      isAllSpecialties: false,
    };
    expect(specialtySchema('england').parse(spec)).toEqual(spec);
  });

  test('rejects invalid slug patterns', () => {
    const invalidSlugs = ['General-Surgery', 'general_surgery', 'general--surgery', 'general '];
    for (const slug of invalidSlugs) {
      const spec = {
        id: specialtyId('scotland', 'C1'),
        officialCode: 'C1',
        officialName: 'General Surgery',
        slug,
        descriptionKey: 'specialties.general-surgery',
        isAllSpecialties: false,
      };
      expect(() => specialtySchema('scotland').parse(spec)).toThrow();
    }
  });
});

describe('ReportingUnit schema', () => {
  test('validates England reporting unit with nhsRegion and valid kinds', () => {
    for (const kind of ENGLAND_REPORTING_UNIT_KINDS) {
      const ru = {
        id: reportingUnitId('england', 'R1A'),
        officialCode: 'R1A',
        officialName: 'Worcestershire Acute Hospitals NHS Trust',
        displayName: 'Worcestershire Acute Hospitals',
        kind,
        hospitalSites: [hospitalSiteId('england', 'R1A01')],
        operational: { from: '2000-04-01', to: null },
        predecessors: [],
        successors: [],
        notes: [],
        nhsRegion: nhsRegionId('Y56'),
      };
      expect(reportingUnitSchema('england').parse(ru)).toEqual(ru);
    }
  });

  test('rejects England reporting unit missing nhsRegion', () => {
    const ru = {
      id: reportingUnitId('england', 'R1A'),
      officialCode: 'R1A',
      officialName: 'Worcestershire Acute Hospitals NHS Trust',
      displayName: 'Worcestershire Acute Hospitals',
      kind: 'nhs-trust',
      hospitalSites: [],
      operational: { from: null, to: null },
      predecessors: [],
      successors: [],
      notes: [],
    };
    expect(() => reportingUnitSchema('england').parse(ru)).toThrow();
  });

  test('validates Wales reporting unit and rejects nhsRegion property', () => {
    for (const kind of WALES_REPORTING_UNIT_KINDS) {
      const ru = {
        id: reportingUnitId('wales', '7A1'),
        officialCode: '7A1',
        officialName: 'Betsi Cadwaladr University Health Board',
        displayName: 'Betsi Cadwaladr',
        kind,
        hospitalSites: [hospitalSiteId('wales', '7A101')],
        operational: { from: '2009-10-01', to: null },
        predecessors: [reportingUnitId('wales', '6A1')],
        successors: [],
        notes: [],
      };
      expect(reportingUnitSchema('wales').parse(ru)).toEqual(ru);

      const ruWithRegion = {
        ...ru,
        nhsRegion: nhsRegionId('Y56'),
      };
      expect(() => reportingUnitSchema('wales').parse(ruWithRegion)).toThrow();
    }
  });

  test('validates Scotland reporting unit and handles notes', () => {
    for (const kind of SCOTLAND_REPORTING_UNIT_KINDS) {
      const ru = {
        id: reportingUnitId('scotland', 'SB0101'),
        officialCode: 'SB0101',
        officialName: 'Golden Jubilee National Hospital',
        displayName: 'Golden Jubilee',
        kind,
        hospitalSites: [hospitalSiteId('scotland', 'SB0101-1')],
        operational: { from: '2002-06-01', to: null },
        predecessors: [],
        successors: [],
        notes: ['treats-patients-from-all-boards'],
      };
      expect(reportingUnitSchema('scotland').parse(ru)).toEqual(ru);

      const ruWithRegion = {
        ...ru,
        nhsRegion: nhsRegionId('Y56'),
      };
      expect(() => reportingUnitSchema('scotland').parse(ruWithRegion)).toThrow();
    }
  });

  test('rejects invalid operational date formats', () => {
    const ru = {
      id: reportingUnitId('england', 'R1A'),
      officialCode: 'R1A',
      officialName: 'Worcestershire Acute Hospitals NHS Trust',
      displayName: 'Worcestershire Acute Hospitals',
      kind: 'nhs-trust',
      hospitalSites: [],
      operational: { from: '2000-02-30', to: null }, // invalid date
      predecessors: [],
      successors: [],
      notes: [],
      nhsRegion: nhsRegionId('Y56'),
    };
    expect(() => reportingUnitSchema('england').parse(ru)).toThrow();
  });
});

describe('ReferenceData bundle schema', () => {
  const sampleEnglandRef = {
    nation: 'england' as const,
    reportingUnits: [
      {
        id: reportingUnitId('england', 'R1A'),
        officialCode: 'R1A',
        officialName: 'Worcestershire Acute Hospitals NHS Trust',
        displayName: 'Worcestershire Acute Hospitals',
        kind: 'nhs-trust' as const,
        hospitalSites: [hospitalSiteId('england', 'R1A01')],
        operational: { from: '2000-04-01', to: null },
        predecessors: [],
        successors: [],
        notes: [],
        nhsRegion: nhsRegionId('Y56'),
      },
    ],
    hospitalSites: [
      {
        id: hospitalSiteId('england', 'R1A01'),
        officialCode: 'R1A01',
        name: 'Worcestershire Royal Hospital',
        town: 'Worcester',
        reportingUnit: reportingUnitId('england', 'R1A'),
      },
    ],
    specialties: [
      {
        id: specialtyId('england', '100'),
        officialCode: '100',
        officialName: 'General Surgery',
        slug: 'general-surgery',
        descriptionKey: 'specialties.general-surgery',
        isAllSpecialties: false,
      },
    ],
    nhsRegions: [
      {
        id: nhsRegionId('Y56'),
        officialCode: 'Y56',
        name: 'London',
      },
    ],
    retrievedAt: '2026-10-01T12:00:00Z',
    sources: [
      {
        nation: 'england' as const,
        publisher: 'NHS England',
        title: 'Organisation Data Service',
        url: 'https://digital.nhs.uk/services/organisation-data-service',
        licence: 'OGL-3.0' as const,
        attribution: 'Contains NHS England information © 2026',
      },
    ],
  };

  test('validates valid England reference data bundle', () => {
    expect(referenceDataSchema('england').parse(sampleEnglandRef)).toEqual(sampleEnglandRef);
  });

  test('validates valid Scotland reference data bundle (no nhsRegions)', () => {
    const scotlandRef = {
      nation: 'scotland' as const,
      reportingUnits: [
        {
          id: reportingUnitId('scotland', 'S08000015'),
          officialCode: 'S08000015',
          officialName: 'NHS Ayrshire and Arran',
          displayName: 'Ayrshire & Arran',
          kind: 'health-board' as const,
          hospitalSites: [],
          operational: { from: '1974-04-01', to: null },
          predecessors: [],
          successors: [],
          notes: [],
        },
      ],
      hospitalSites: [],
      specialties: [
        {
          id: specialtyId('scotland', 'C1'),
          officialCode: 'C1',
          officialName: 'General Surgery',
          slug: 'general-surgery',
          descriptionKey: 'specialties.general-surgery',
          isAllSpecialties: false,
        },
      ],
      retrievedAt: '2026-10-01T12:00:00Z',
      sources: [
        {
          nation: 'scotland' as const,
          publisher: 'Public Health Scotland',
          title: 'Geography and Organisation Reference',
          url: 'https://publichealthscotland.scot/publications/organisation-codes/',
          licence: 'OGL-3.0' as const,
          attribution: 'Contains Public Health Scotland information © 2026',
        },
      ],
    };
    expect(referenceDataSchema('scotland').parse(scotlandRef)).toEqual(scotlandRef);

    const invalidScotlandRefWithRegion = {
      ...scotlandRef,
      nhsRegions: [{ id: nhsRegionId('Y56'), officialCode: 'Y56', name: 'London' }],
    };
    expect(() => referenceDataSchema('scotland').parse(invalidScotlandRefWithRegion)).toThrow();
  });
});
