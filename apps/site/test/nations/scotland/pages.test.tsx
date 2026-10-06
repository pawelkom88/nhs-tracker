import { afterEach, describe, expect, test, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import React from 'react';
import { hospitalSiteId, reportingUnitId, specialtyId } from '@kyw/model/ids';
import type { PublicationDate, ReportingPeriod } from '@kyw/model/period';
import type { HospitalSite, Specialty } from '@kyw/model/reference';
import type { PublishedFigure, PublishedLatestRelease } from '@kyw/model/published';
import {
  SCOTLAND_STATISTIC_LONG_WAIT_COUNT,
  SCOTLAND_STATISTIC_MEDIAN_ONGOING_WAIT,
  SCOTLAND_STATISTIC_TOTAL_WAITING,
  SCOTLAND_STATISTIC_WITHIN_WAITING_STANDARD_COUNT,
  SCOTLAND_WAIT_STAGE_INPATIENT_DAY_CASE,
  SCOTLAND_WAIT_STAGE_NEW_OUTPATIENT,
} from '@kyw/model/scotland/definitions';
import type { ScotlandUnitDetail, ScotlandUnitForSpecialty } from '../../../src/data/scotland';
import { SpecialtyList } from '../../../src/nations/scotland/SpecialtyList';
import { UnitList } from '../../../src/nations/scotland/UnitList';
import { UnitDetail } from '../../../src/nations/scotland/UnitDetail';
import ScotlandPage from '../../../src/app/scotland/page';
import ScotlandSpecialtyPage, {
  generateStaticParams as generateSpecialtyParams,
} from '../../../src/app/scotland/[specialty]/page';
import ScotlandUnitPage, {
  generateStaticParams as generateUnitParams,
} from '../../../src/app/scotland/[specialty]/[unit]/page';

// Mock next/navigation
const mockNotFound = vi.fn();
vi.mock('next/navigation', () => ({
  notFound: () => {
    mockNotFound();
    throw new Error('NEXT_NOT_FOUND');
  },
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const mockSpecialties: readonly Specialty<'scotland'>[] = [
  {
    id: specialtyId('scotland', 'C8'),
    officialCode: 'C8',
    officialName: 'Trauma and Orthopaedic Surgery',
    slug: 'trauma-and-orthopaedics',
    descriptionKey: 'scotland/trauma-and-orthopaedics',
    isAllSpecialties: false,
  },
  {
    id: specialtyId('scotland', 'all'),
    officialCode: 'all',
    officialName: 'All specialties',
    slug: 'all-specialties',
    descriptionKey: 'scotland/all-specialties',
    isAllSpecialties: true,
  },
  {
    id: specialtyId('scotland', 'C1'),
    officialCode: 'C1',
    officialName: 'General Surgery',
    slug: 'general-surgery',
    descriptionKey: 'scotland/general-surgery',
    isAllSpecialties: false,
  },
  {
    id: specialtyId('scotland', 'D3'),
    officialCode: 'D3',
    officialName: 'Ear, Nose & Throat (ENT)',
    slug: 'ent',
    descriptionKey: 'scotland/ent',
    isAllSpecialties: false,
  },
];

const mockHospitalSites: readonly HospitalSite<'scotland'>[] = [
  {
    id: hospitalSiteId('scotland', 'SB080101'),
    officialCode: 'SB080101',
    name: 'Golden Jubilee University National Hospital',
    town: 'Clydebank',
    reportingUnit: reportingUnitId('scotland', 'SB0801'),
  },
  {
    id: hospitalSiteId('scotland', 'S0800001501'),
    officialCode: 'S0800001501',
    name: 'University Hospital Crosshouse',
    town: 'Kilmarnock',
    reportingUnit: reportingUnitId('scotland', 'S08000015'),
  },
  {
    id: hospitalSiteId('scotland', 'S0800001502'),
    officialCode: 'S0800001502',
    name: 'University Hospital Ayr',
    town: 'Ayr',
    reportingUnit: reportingUnitId('scotland', 'S08000015'),
  },
];

const mockUnits: readonly ScotlandUnitForSpecialty[] = [
  {
    id: reportingUnitId('scotland', 'S08000015'),
    officialCode: 'S08000015',
    officialName: 'NHS Ayrshire and Arran',
    displayName: 'NHS Ayrshire and Arran',
    kind: 'health-board',
    hospitalSites: [
      hospitalSiteId('scotland', 'S0800001501'),
      hospitalSiteId('scotland', 'S0800001502'),
    ],
    operational: { from: '2004-01-01', to: null },
    predecessors: [],
    successors: [],
    notes: [],
    state: { kind: 'current' },
  },
  {
    id: reportingUnitId('scotland', 'SB0801'),
    officialCode: 'SB0801',
    officialName: 'Golden Jubilee National Hospital',
    displayName: 'Golden Jubilee National Hospital',
    kind: 'special-health-board',
    hospitalSites: [hospitalSiteId('scotland', 'SB080101')],
    operational: { from: '2002-06-01', to: null },
    predecessors: [],
    successors: [],
    notes: ['treats-patients-from-all-boards'],
    state: { kind: 'current' },
  },
  {
    id: reportingUnitId('scotland', 'S08000017'),
    officialCode: 'S08000017',
    officialName: 'NHS Borders',
    displayName: 'NHS Borders',
    kind: 'health-board',
    hospitalSites: [],
    operational: { from: '2004-01-01', to: null },
    predecessors: [],
    successors: [],
    notes: [],
    state: { kind: 'current' },
  },
];

const mockLatestRelease: PublishedLatestRelease<'scotland'> = {
  reportingPeriod: '2026-08-31' as ReportingPeriod,
  publicationDate: '2026-11-24' as PublicationDate,
  source: {
    licence: 'OGL-3.0',
    attribution:
      'Contains Public Health Scotland data licensed under the Open Government Licence v3.0.',
    nation: 'scotland',
    publisher: 'Public Health Scotland',
    title: 'Stage of Treatment Waiting Times',
    url: 'https://publichealthscotland.scot/publications/stage-of-treatment-waiting-times/',
  },
};

const mockFigures: readonly PublishedFigure<'scotland'>[] = [
  // Stage 1: New Outpatient
  {
    nation: 'scotland',
    reportingUnit: reportingUnitId('scotland', 'SB0801'),
    specialty: specialtyId('scotland', 'C8'),
    waitStage: SCOTLAND_WAIT_STAGE_NEW_OUTPATIENT.id,
    statistic: SCOTLAND_STATISTIC_MEDIAN_ONGOING_WAIT.id,
    value: { status: 'published', value: 126, provisional: false },
    unit: 'days',
    reportingPeriod: '2026-08-31' as ReportingPeriod,
    publicationDate: '2026-11-24' as PublicationDate,
    provenance: { kind: 'official', sourceField: 'Median' },
    source: mockLatestRelease.source,
    yearEarlier: {
      status: 'shown',
      value: { status: 'published', value: 133, provisional: false },
      reportingPeriod: '2025-08-31' as ReportingPeriod,
      publicationDate: '2025-11-25' as PublicationDate,
    },
  },
  {
    nation: 'scotland',
    reportingUnit: reportingUnitId('scotland', 'SB0801'),
    specialty: specialtyId('scotland', 'C8'),
    waitStage: SCOTLAND_WAIT_STAGE_NEW_OUTPATIENT.id,
    statistic: SCOTLAND_STATISTIC_WITHIN_WAITING_STANDARD_COUNT.id,
    value: { status: 'published', value: 850, provisional: false },
    unit: 'count',
    reportingPeriod: '2026-08-31' as ReportingPeriod,
    publicationDate: '2026-11-24' as PublicationDate,
    provenance: {
      kind: 'derived',
      method: 'exact-sum',
      inputs: ['LessThan4WeekWait', '4To8WeekWait', '8To12WeekWait'],
    },
    source: mockLatestRelease.source,
    yearEarlier: { status: 'omitted', reason: 'not-median' },
  },
  {
    nation: 'scotland',
    reportingUnit: reportingUnitId('scotland', 'SB0801'),
    specialty: specialtyId('scotland', 'C8'),
    waitStage: SCOTLAND_WAIT_STAGE_NEW_OUTPATIENT.id,
    statistic: SCOTLAND_STATISTIC_TOTAL_WAITING.id,
    value: { status: 'published', value: 1200, provisional: false },
    unit: 'count',
    reportingPeriod: '2026-08-31' as ReportingPeriod,
    publicationDate: '2026-11-24' as PublicationDate,
    provenance: { kind: 'official', sourceField: 'Waits' },
    source: mockLatestRelease.source,
    yearEarlier: { status: 'omitted', reason: 'not-median' },
  },
  {
    nation: 'scotland',
    reportingUnit: reportingUnitId('scotland', 'SB0801'),
    specialty: specialtyId('scotland', 'C8'),
    waitStage: SCOTLAND_WAIT_STAGE_NEW_OUTPATIENT.id,
    statistic: SCOTLAND_STATISTIC_LONG_WAIT_COUNT.id,
    value: { status: 'published', value: 14, provisional: false },
    unit: 'count',
    reportingPeriod: '2026-08-31' as ReportingPeriod,
    publicationDate: '2026-11-24' as PublicationDate,
    provenance: { kind: 'official', sourceField: 'WaitsOver52Weeks' },
    source: mockLatestRelease.source,
    yearEarlier: { status: 'omitted', reason: 'not-median' },
  },
  // Stage 2: Inpatient / Day case
  {
    nation: 'scotland',
    reportingUnit: reportingUnitId('scotland', 'SB0801'),
    specialty: specialtyId('scotland', 'C8'),
    waitStage: SCOTLAND_WAIT_STAGE_INPATIENT_DAY_CASE.id,
    statistic: SCOTLAND_STATISTIC_MEDIAN_ONGOING_WAIT.id,
    value: { status: 'published', value: 98, provisional: false },
    unit: 'days',
    reportingPeriod: '2026-08-31' as ReportingPeriod,
    publicationDate: '2026-11-24' as PublicationDate,
    provenance: { kind: 'official', sourceField: 'Median' },
    source: mockLatestRelease.source,
    yearEarlier: { status: 'omitted', reason: 'not-in-release' },
  },
  {
    nation: 'scotland',
    reportingUnit: reportingUnitId('scotland', 'SB0801'),
    specialty: specialtyId('scotland', 'C8'),
    waitStage: SCOTLAND_WAIT_STAGE_INPATIENT_DAY_CASE.id,
    statistic: SCOTLAND_STATISTIC_WITHIN_WAITING_STANDARD_COUNT.id,
    value: { status: 'published', value: 320, provisional: false },
    unit: 'count',
    reportingPeriod: '2026-08-31' as ReportingPeriod,
    publicationDate: '2026-11-24' as PublicationDate,
    provenance: {
      kind: 'derived',
      method: 'exact-sum',
      inputs: ['LessThan4WeekWait', '4To8WeekWait', '8To12WeekWait'],
    },
    source: mockLatestRelease.source,
    yearEarlier: { status: 'omitted', reason: 'not-median' },
  },
  {
    nation: 'scotland',
    reportingUnit: reportingUnitId('scotland', 'SB0801'),
    specialty: specialtyId('scotland', 'C8'),
    waitStage: SCOTLAND_WAIT_STAGE_INPATIENT_DAY_CASE.id,
    statistic: SCOTLAND_STATISTIC_TOTAL_WAITING.id,
    value: { status: 'published', value: 500, provisional: false },
    unit: 'count',
    reportingPeriod: '2026-08-31' as ReportingPeriod,
    publicationDate: '2026-11-24' as PublicationDate,
    provenance: { kind: 'official', sourceField: 'Waits' },
    source: mockLatestRelease.source,
    yearEarlier: { status: 'omitted', reason: 'not-median' },
  },
  {
    nation: 'scotland',
    reportingUnit: reportingUnitId('scotland', 'SB0801'),
    specialty: specialtyId('scotland', 'C8'),
    waitStage: SCOTLAND_WAIT_STAGE_INPATIENT_DAY_CASE.id,
    statistic: SCOTLAND_STATISTIC_LONG_WAIT_COUNT.id,
    value: { status: 'published', value: 5, provisional: false },
    unit: 'count',
    reportingPeriod: '2026-08-31' as ReportingPeriod,
    publicationDate: '2026-11-24' as PublicationDate,
    provenance: { kind: 'official', sourceField: 'WaitsOver52Weeks' },
    source: mockLatestRelease.source,
    yearEarlier: { status: 'omitted', reason: 'not-median' },
  },
];

describe('Scotland SpecialtyList (T-8.14)', () => {
  test('renders specialties in alphabetical order by name, with "All specialties" last', () => {
    const { container } = render(<SpecialtyList specialties={mockSpecialties} />);

    const links = Array.from(container.querySelectorAll('li a'));
    const names = links.map((l) => l.textContent);

    expect(names).toEqual([
      'Ear, Nose & Throat (ENT)',
      'General Surgery',
      'Trauma and Orthopaedic Surgery',
      'All specialties',
    ]);
  });

  test('creates correct href for each specialty link', () => {
    const { container } = render(<SpecialtyList specialties={mockSpecialties} />);

    const links = Array.from(container.querySelectorAll<HTMLAnchorElement>('li a'));
    const hrefs = links.map((l) => l.getAttribute('href'));

    expect(hrefs).toEqual([
      '/scotland/ent',
      '/scotland/general-surgery',
      '/scotland/trauma-and-orthopaedics',
      '/scotland/all-specialties',
    ]);
  });

  test('populates data-filter-text with specialty name and description', () => {
    const { container } = render(<SpecialtyList specialties={mockSpecialties} />);

    const items = Array.from(container.querySelectorAll('li'));
    const traumaItem = items.find((li) => li.textContent.includes('Trauma'));

    expect(traumaItem).toBeDefined();
    const filterText = traumaItem?.getAttribute('data-filter-text') ?? '';
    expect(filterText).toContain('trauma and orthopaedic surgery');
    expect(filterText).toContain('joint replacements');
  });
});

describe('Scotland UnitList (T-8.14)', () => {
  const targetSpecialty = mockSpecialties[0];
  if (!targetSpecialty) throw new Error('Missing target specialty');

  test('renders health boards in plain alphabetical order by displayName', () => {
    const { container } = render(
      <UnitList specialty={targetSpecialty} units={mockUnits} hospitalSites={mockHospitalSites} />,
    );

    const unitLinks = Array.from(container.querySelectorAll('ul li a')).map((a) => a.textContent);

    expect(unitLinks).toEqual([
      'Golden Jubilee National Hospital',
      'NHS Ayrshire and Arran',
      'NHS Borders',
    ]);
  });

  test('renders official health board directory finder link (B-5)', () => {
    render(
      <UnitList specialty={targetSpecialty} units={mockUnits} hospitalSites={mockHospitalSites} />,
    );

    const finderNotice = screen.getByRole('note');
    expect(finderNotice.textContent).toContain("Not sure which board you're in?");

    const finderLink = screen.getByRole('link', { name: 'See the official list of health boards' });
    expect(finderLink.getAttribute('href')).toBe('https://www.scot.nhs.uk/organisations/');
  });

  test('populates data-filter-text with board name, hospital site names, and towns', () => {
    const { container } = render(
      <UnitList specialty={targetSpecialty} units={mockUnits} hospitalSites={mockHospitalSites} />,
    );

    const ayrshireItem = Array.from(container.querySelectorAll('li')).find((li) =>
      li.textContent.includes('NHS Ayrshire and Arran'),
    );

    const filterText = ayrshireItem?.getAttribute('data-filter-text') ?? '';
    expect(filterText).toContain('nhs ayrshire and arran');
    expect(filterText).toContain('university hospital crosshouse');
    expect(filterText).toContain('university hospital ayr');
    expect(filterText).toContain('kilmarnock');
    expect(filterText).toContain('ayr');
  });

  test('does not contain any digits representing waiting figures or rankings in list items', () => {
    const { container } = render(
      <UnitList specialty={targetSpecialty} units={mockUnits} hospitalSites={mockHospitalSites} />,
    );

    const listItems = Array.from(container.querySelectorAll('li'));
    for (const item of listItems) {
      expect(item.textContent).not.toMatch(/\d+(\.\d+)?\s*(weeks|days|%)/i);
      expect(item.textContent).not.toMatch(/median/i);
      expect(item.textContent).not.toMatch(/rank/i);
    }
  });

  test('renders empty message when no units are supplied', () => {
    render(<UnitList specialty={targetSpecialty} units={[]} hospitalSites={mockHospitalSites} />);

    expect(screen.getByText('No health boards found for this specialty.')).toBeDefined();
  });
});

describe('Scotland UnitDetail Component (T-8.14)', () => {
  const targetSpecialty = mockSpecialties[0];
  const goldenJubileeUnit = mockUnits[1];
  const ayrshireUnit = mockUnits[0];
  if (!targetSpecialty || !goldenJubileeUnit || !ayrshireUnit) {
    throw new Error('Missing target fixtures');
  }

  test('renders Golden Jubilee detail with note, two wait stages, and hospital sites', () => {
    const detail: ScotlandUnitDetail = {
      unit: goldenJubileeUnit,
      specialty: targetSpecialty,
      state: { kind: 'current' },
      figures: mockFigures,
      hospitalSites: mockHospitalSites.filter((s) => s.reportingUnit === goldenJubileeUnit.id),
      latestRelease: mockLatestRelease,
    };

    render(<UnitDetail detail={detail} />);

    // <h1> display name
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe(
      'Golden Jubilee National Hospital',
    );

    // Golden Jubilee note rendered
    expect(
      screen.getByText('Treats patients referred from all health boards in Scotland.'),
    ).toBeDefined();

    // Specialty name
    expect(screen.getByText('Trauma and Orthopaedic Surgery')).toBeDefined();

    // Organisation code
    expect(screen.getByText('Organisation code: SB0801')).toBeDefined();

    // Explainer links
    expect(screen.getByRole('link', { name: 'About the figures' }).getAttribute('href')).toBe(
      '/scotland/about-the-figures',
    );
    expect(screen.getByRole('link', { name: 'Your rights' }).getAttribute('href')).toBe(
      '/scotland/your-rights',
    );

    // Two wait stages rendered with distinct headings
    expect(screen.getByRole('heading', { level: 2, name: 'New Outpatient' })).toBeDefined();
    expect(screen.getByRole('heading', { level: 2, name: 'Inpatient/Day case' })).toBeDefined();

    // Stage 1: New Outpatient figures
    expect(
      screen.getByText(
        /Half of people waiting at 31 August 2026 had waited about 18 weeks \(126 days\) or less\./,
      ),
    ).toBeDefined();
    expect(screen.getByText(/850 of 1,200 people had waited less than 12 weeks\./)).toBeDefined();
    expect(screen.getByText(/14 people had waited over a year\./)).toBeDefined();

    // Stage 2: Inpatient / Day case figures
    expect(
      screen.getByText(
        /Half of people waiting at 31 August 2026 had waited about 14 weeks \(98 days\) or less\./,
      ),
    ).toBeDefined();
    expect(screen.getByText(/320 of 500 people had waited less than 12 weeks\./)).toBeDefined();
    expect(screen.getByText(/5 people had waited over a year\./)).toBeDefined();

    // No summed numbers (ADR-0002)
    // 126 + 98 = 224 days
    // 850 + 320 = 1170
    // 1200 + 500 = 1700
    // 14 + 5 = 19
    const fullText = document.body.textContent;
    expect(fullText).not.toContain('224 days');
    expect(fullText).not.toContain('1,170');
    expect(fullText).not.toContain('1,700');
    expect(fullText).not.toContain('19 people');

    // Derived label present for within standard figure
    expect(
      screen.getAllByText(
        /Calculated by Know Your Wait by adding published figures from the same release\./,
      ).length,
    ).toBe(2);

    // No % character anywhere in Scotland output (B-1)
    expect(fullText).not.toContain('%');

    // Hospital sites list
    expect(screen.getByRole('heading', { level: 2, name: 'Hospital sites' })).toBeDefined();
    expect(
      screen.getByText('Golden Jubilee University National Hospital (Clydebank)'),
    ).toBeDefined();
  });

  test('does not render Golden Jubilee note for standard health board', () => {
    const detail: ScotlandUnitDetail = {
      unit: ayrshireUnit,
      specialty: targetSpecialty,
      state: { kind: 'current' },
      figures: mockFigures,
      hospitalSites: mockHospitalSites.filter((s) => s.reportingUnit === ayrshireUnit.id),
      latestRelease: mockLatestRelease,
    };

    render(<UnitDetail detail={detail} />);

    expect(
      screen.queryByText('Treats patients referred from all health boards in Scotland.'),
    ).toBeNull();
  });

  test('renders All Specialties display text correctly', () => {
    const allSpec = mockSpecialties.find((s) => s.isAllSpecialties);
    if (!allSpec) throw new Error('Missing all-specialties fixture');

    const detail: ScotlandUnitDetail = {
      unit: ayrshireUnit,
      specialty: allSpec,
      state: { kind: 'current' },
      figures: mockFigures,
      hospitalSites: [],
      latestRelease: mockLatestRelease,
    };

    render(<UnitDetail detail={detail} />);

    expect(screen.getByText('All specialties')).toBeDefined();
  });

  test('renders carried-forward warning with older period and latest period', () => {
    const olderPeriod = '2026-05-31' as ReportingPeriod;
    const carriedForwardFigures: readonly PublishedFigure<'scotland'>[] = mockFigures.map((f) => ({
      ...f,
      reportingPeriod: olderPeriod,
    }));

    const detail: ScotlandUnitDetail = {
      unit: ayrshireUnit,
      specialty: targetSpecialty,
      state: { kind: 'carried-forward', monthsOld: 3 },
      figures: carriedForwardFigures,
      hospitalSites: [],
      latestRelease: mockLatestRelease,
    };

    render(<UnitDetail detail={detail} />);

    expect(
      screen.getByText(/These are the most recent figures for NHS Ayrshire and Arran, as at/),
    ).toBeDefined();
    expect(screen.getAllByText('31 May 2026').length).toBeGreaterThan(0);
    expect(screen.getByText('31 August 2026')).toBeDefined();
  });

  test('renders no-recent-figures warning and omits figure statements', () => {
    const lastPeriod = '2025-02-28' as ReportingPeriod;

    const detail: ScotlandUnitDetail = {
      unit: ayrshireUnit,
      specialty: targetSpecialty,
      state: { kind: 'no-recent-figures', lastReportingPeriod: lastPeriod },
      figures: [],
      hospitalSites: [],
      latestRelease: mockLatestRelease,
    };

    render(<UnitDetail detail={detail} />);

    expect(screen.getByText(/No figures published since/)).toBeDefined();
    expect(screen.getByText('28 February 2025')).toBeDefined();
    expect(screen.queryByText(/Half of people waiting/)).toBeNull();
  });

  test('never links to provider websites or non-whitelisted domains', () => {
    const detail: ScotlandUnitDetail = {
      unit: goldenJubileeUnit,
      specialty: targetSpecialty,
      state: { kind: 'current' },
      figures: mockFigures,
      hospitalSites: mockHospitalSites,
      latestRelease: mockLatestRelease,
    };

    const { container } = render(<UnitDetail detail={detail} />);

    const allowedDomains = [
      'gov.uk',
      'nhs.uk',
      'gov.wales',
      'nhs.scot',
      'nhsinform.scot',
      'publichealthscotland.scot',
    ];

    const links = Array.from(container.querySelectorAll('a'));
    expect(links.length).toBeGreaterThan(0);

    for (const link of links) {
      const href = link.getAttribute('href');
      expect(href).toBeTruthy();
      if (!href) continue;

      if (href.startsWith('/')) {
        expect(href).toMatch(/^\/[a-zA-Z0-9_\-/]*$/);
      } else {
        const url = new URL(href);
        const host = url.hostname;
        const isAllowed = allowedDomains.some((d) => host === d || host.endsWith(`.${d}`));
        expect(isAllowed).toBe(true);
      }
    }

    const hospitalSection = container.querySelector('.hospital-sites-section');
    expect(hospitalSection).toBeDefined();
    const siteLinks = hospitalSection?.querySelectorAll('a') ?? [];
    expect(siteLinks.length).toBe(0);
  });
});

describe('Scotland Page Route (/scotland) (T-8.14)', () => {
  test('renders page heading, intro, explainer links, specialty list, and border notice', async () => {
    const page = await ScotlandPage();
    const { container } = render(page);

    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Scotland waiting times');
    expect(screen.getByText(/Explore official NHS waiting-time statistics/)).toBeDefined();

    const explainerLinks = Array.from(container.querySelectorAll('.explainer-links a')).map((a) =>
      a.getAttribute('href'),
    );
    expect(explainerLinks).toContain('/scotland/about-the-figures');
    expect(explainerLinks).toContain('/scotland/your-rights');

    expect(container.querySelector('[role="note"]')).toBeDefined();
  });
});

describe('Scotland Specialty Page Route (/scotland/[specialty]) (T-8.14)', () => {
  test('generateStaticParams returns all 42 Scotland specialties', async () => {
    const params = await generateSpecialtyParams();
    expect(params.length).toBe(42);
    expect(params.map((p) => p.specialty)).toContain('trauma-and-orthopaedics');
    expect(params.map((p) => p.specialty)).toContain('general-surgery');
    expect(params.map((p) => p.specialty)).toContain('all-specialties');
  });

  test('renders specialty heading, breadcrumb, explainer links, and unit list', async () => {
    const page = await ScotlandSpecialtyPage({
      params: Promise.resolve({ specialty: 'trauma-and-orthopaedics' }),
    });
    const { container } = render(page);

    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe(
      'Trauma and Orthopaedic Surgery',
    );
    expect(screen.getByText(/Back to all specialties in Scotland/)).toBeDefined();

    const explainerLinks = Array.from(container.querySelectorAll('.explainer-links a')).map((a) =>
      a.getAttribute('href'),
    );
    expect(explainerLinks).toContain('/scotland/about-the-figures');
    expect(explainerLinks).toContain('/scotland/your-rights');

    expect(container.querySelector('#editorial-intro-slot')).toBeDefined();
    expect(container.querySelector('[role="note"]')).toBeDefined();
  });

  test('renders "All specialties" heading for all-specialties slug', async () => {
    const page = await ScotlandSpecialtyPage({
      params: Promise.resolve({ specialty: 'all-specialties' }),
    });
    render(page);

    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('All specialties');
  });

  test('calls notFound() when specialty slug is invalid', async () => {
    await expect(
      ScotlandSpecialtyPage({
        params: Promise.resolve({ specialty: 'non-existent-specialty-xyz' }),
      }),
    ).rejects.toThrow('NEXT_NOT_FOUND');
    expect(mockNotFound).toHaveBeenCalled();
  });
});

describe('Scotland Unit Detail Page Route (/scotland/[specialty]/[unit]) (T-8.14)', () => {
  test('generateStaticParams returns valid array of (specialty, unit) pairs', async () => {
    const params = await generateUnitParams();

    expect(Array.isArray(params)).toBe(true);
    expect(params.length).toBeGreaterThan(0);

    const first = params[0];
    expect(first).toBeDefined();
    if (!first) return;

    expect(first).toHaveProperty('specialty');
    expect(first).toHaveProperty('unit');
    expect(typeof first.specialty).toBe('string');
    expect(typeof first.unit).toBe('string');
    expect(first.unit).toBe(first.unit.toLowerCase());
  });

  test('renders full page with breadcrumb navigation and border notice', async () => {
    const page = await ScotlandUnitPage({
      params: Promise.resolve({
        specialty: 'trauma-and-orthopaedics',
        unit: 'sb0801',
      }),
    });

    render(page);

    const backLink = screen.getByRole('link', {
      name: '← Back to Trauma and Orthopaedic Surgery',
    });
    expect(backLink.getAttribute('href')).toBe('/scotland/trauma-and-orthopaedics');

    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe(
      'Golden Jubilee National Hospital',
    );
    expect(screen.getByRole('complementary')).toBeDefined();
  });

  test('triggers notFound for unknown specialty', async () => {
    await expect(
      ScotlandUnitPage({
        params: Promise.resolve({
          specialty: 'non-existent-specialty',
          unit: 'sb0801',
        }),
      }),
    ).rejects.toThrow('NEXT_NOT_FOUND');

    expect(mockNotFound).toHaveBeenCalled();
  });

  test('triggers notFound for unknown reporting unit', async () => {
    await expect(
      ScotlandUnitPage({
        params: Promise.resolve({
          specialty: 'trauma-and-orthopaedics',
          unit: 'non-existent-unit',
        }),
      }),
    ).rejects.toThrow('NEXT_NOT_FOUND');

    expect(mockNotFound).toHaveBeenCalled();
  });
});
