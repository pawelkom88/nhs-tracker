import { afterEach, describe, expect, test, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import React from 'react';
import { hospitalSiteId, reportingUnitId, specialtyId } from '@kyw/model/ids';
import type { PublicationDate, ReportingPeriod } from '@kyw/model/period';
import {
  nhsRegionId,
  type HospitalSite,
  type NhsRegion,
  type ReportingUnit,
  type Specialty,
} from '@kyw/model/reference';
import type { PublishedFigure, PublishedLatestRelease } from '@kyw/model/published';
import {
  ENGLAND_STATISTIC_LONG_WAIT_COUNT,
  ENGLAND_STATISTIC_MEDIAN_ONGOING_WAIT,
  ENGLAND_STATISTIC_WITHIN_WAITING_STANDARD,
  ENGLAND_WAIT_STAGE_RTT_INCOMPLETE_PATHWAY,
} from '@kyw/model/england/definitions';
import type { EnglandUnitDetail } from '../../../src/data/england';
import { UnitDetail } from '../../../src/nations/england/UnitDetail';
import EnglandUnitPage, {
  generateStaticParams,
} from '../../../src/app/england/[specialty]/[unit]/page';

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

const mockRegion: NhsRegion = {
  id: nhsRegionId('Y56'),
  officialCode: 'Y56',
  name: 'London',
};

const mockSpecialty: Specialty<'england'> = {
  id: specialtyId('england', 'C_110'),
  officialCode: '110',
  officialName: 'Trauma and Orthopaedic Service',
  slug: 'trauma-and-orthopaedics',
  descriptionKey: 'england/trauma-and-orthopaedics',
  isAllSpecialties: false,
};

const mockAllSpecialties: Specialty<'england'> = {
  id: specialtyId('england', 'C_999'),
  officialCode: 'C_999',
  officialName: 'Total',
  slug: 'all-specialties',
  descriptionKey: 'england/all-specialties',
  isAllSpecialties: true,
};

const mockNhsUnit: ReportingUnit<'england'> = {
  id: reportingUnitId('england', 'R1H'),
  officialCode: 'R1H',
  officialName: 'BARTS HEALTH NHS TRUST',
  displayName: 'Barts Health NHS Trust',
  kind: 'nhs-trust',
  nhsRegion: nhsRegionId('Y56'),
  hospitalSites: [hospitalSiteId('england', 'R1H12'), hospitalSiteId('england', 'R1H15')],
  operational: { from: '2012-04-01', to: null },
  predecessors: [],
  successors: [],
  notes: [],
};

const mockIspUnit: ReportingUnit<'england'> = {
  id: reportingUnitId('england', 'A1D1B'),
  officialCode: 'A1D1B',
  officialName: 'SPAMEDICA WEMBLEY',
  displayName: 'SpaMedica Wembley',
  kind: 'independent-sector-provider',
  nhsRegion: nhsRegionId('Y56'),
  hospitalSites: [hospitalSiteId('england', 'A1D1B')],
  operational: { from: '2025-04-02', to: null },
  predecessors: [],
  successors: [],
  notes: [],
};

const mockHospitalSites: readonly HospitalSite<'england'>[] = [
  {
    id: hospitalSiteId('england', 'R1H12'),
    officialCode: 'R1H12',
    name: 'The Royal London Hospital',
    town: 'London',
    reportingUnit: reportingUnitId('england', 'R1H'),
  },
  {
    id: hospitalSiteId('england', 'R1H15'),
    officialCode: 'R1H15',
    name: 'St Bartholomew Hospital',
    town: 'London',
    reportingUnit: reportingUnitId('england', 'R1H'),
  },
];

const mockLatestRelease: PublishedLatestRelease<'england'> = {
  reportingPeriod: '2026-07-31' as ReportingPeriod,
  publicationDate: '2026-09-10' as PublicationDate,
  source: {
    licence: 'OGL-3.0',
    attribution:
      'Contains public sector information licensed under the Open Government Licence v3.0. Source: NHS England, Consultant-led Referral to Treatment Waiting Times.',
    nation: 'england',
    publisher: 'NHS England',
    title: 'NHS Consultant-led Referral to Treatment Waiting Times',
    url: 'https://www.england.nhs.uk/statistics/statistical-work-areas/rtt-waiting-times/',
  },
};

const mockFigures: readonly PublishedFigure<'england'>[] = [
  {
    nation: 'england',
    reportingUnit: mockNhsUnit.id,
    specialty: mockSpecialty.id,
    waitStage: ENGLAND_WAIT_STAGE_RTT_INCOMPLETE_PATHWAY.id,
    statistic: ENGLAND_STATISTIC_MEDIAN_ONGOING_WAIT.id,
    value: { status: 'published', value: 12.5, provisional: false },
    unit: 'weeks',
    reportingPeriod: '2026-07-31' as ReportingPeriod,
    publicationDate: '2026-09-10' as PublicationDate,
    provenance: { kind: 'official', sourceField: 'Average (median) waiting time (in weeks)' },
    source: mockLatestRelease.source,
    yearEarlier: {
      status: 'shown',
      value: { status: 'published', value: 11.2, provisional: false },
      reportingPeriod: '2025-07-31' as ReportingPeriod,
      publicationDate: '2025-09-11' as PublicationDate,
    },
  },
  {
    nation: 'england',
    reportingUnit: mockNhsUnit.id,
    specialty: mockSpecialty.id,
    waitStage: ENGLAND_WAIT_STAGE_RTT_INCOMPLETE_PATHWAY.id,
    statistic: ENGLAND_STATISTIC_WITHIN_WAITING_STANDARD.id,
    value: { status: 'published', value: 0.65, provisional: false },
    unit: 'proportion',
    reportingPeriod: '2026-07-31' as ReportingPeriod,
    publicationDate: '2026-09-10' as PublicationDate,
    provenance: { kind: 'official', sourceField: '% within 18 weeks' },
    source: mockLatestRelease.source,
    yearEarlier: { status: 'omitted', reason: 'not-median' },
  },
  {
    nation: 'england',
    reportingUnit: mockNhsUnit.id,
    specialty: mockSpecialty.id,
    waitStage: ENGLAND_WAIT_STAGE_RTT_INCOMPLETE_PATHWAY.id,
    statistic: ENGLAND_STATISTIC_LONG_WAIT_COUNT.id,
    value: { status: 'published', value: 420, provisional: false },
    unit: 'count',
    reportingPeriod: '2026-07-31' as ReportingPeriod,
    publicationDate: '2026-09-10' as PublicationDate,
    provenance: { kind: 'official', sourceField: 'Total > 52 weeks' },
    source: mockLatestRelease.source,
    yearEarlier: { status: 'omitted', reason: 'not-median' },
  },
];

describe('England Unit Detail Component (T-8.12)', () => {
  test('renders standard NHS Trust with figures, metadata, and hospital sites', () => {
    const detail: EnglandUnitDetail = {
      unit: mockNhsUnit,
      specialty: mockSpecialty,
      state: { kind: 'current' },
      figures: mockFigures,
      hospitalSites: mockHospitalSites,
      latestRelease: mockLatestRelease,
      nhsRegion: mockRegion,
    };

    render(<UnitDetail detail={detail} />);

    // <h1> display name
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Barts Health NHS Trust');

    // Specialty name
    expect(screen.getByText('Trauma and Orthopaedic Service')).toBeDefined();

    // Region and code
    expect(screen.getByText('NHS region: London')).toBeDefined();
    expect(screen.getByText('Organisation code: R1H')).toBeDefined();

    // Explainer links
    expect(screen.getByRole('link', { name: 'About the figures' }).getAttribute('href')).toBe(
      '/england/about-the-figures',
    );
    expect(
      screen
        .getByRole('link', { name: 'Your rights to choose where you are treated' })
        .getAttribute('href'),
    ).toBe('/england/your-rights');

    // Figure statements rendered
    expect(
      screen.getByText(/Half of people waiting at 31 July 2026 had waited 12.5 weeks or less/),
    ).toBeDefined();
    expect(
      screen.getByText(/About 7 in 10 \(65\.0%\) had waited less than 18 weeks/),
    ).toBeDefined();
    expect(screen.getByText(/420 people had waited over a year/)).toBeDefined();

    // Hospital sites list
    expect(screen.getByRole('heading', { level: 2, name: 'Hospital sites' })).toBeDefined();
    expect(screen.getByText('The Royal London Hospital (London)')).toBeDefined();
    expect(screen.getByText('St Bartholomew Hospital (London)')).toBeDefined();

    // No ISP badge or notice for NHS trust
    expect(screen.queryByText('Independent Sector Provider')).toBeNull();
  });

  test('renders ISP unit with ISP badge and explanatory notice', () => {
    const detail: EnglandUnitDetail = {
      unit: mockIspUnit,
      specialty: mockSpecialty,
      state: { kind: 'current' },
      figures: mockFigures,
      hospitalSites: [],
      latestRelease: mockLatestRelease,
      nhsRegion: mockRegion,
    };

    render(<UnitDetail detail={detail} />);

    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('SpaMedica Wembley');
    expect(screen.getByText('Independent Sector Provider')).toBeDefined();
    expect(
      screen.getByText(
        'This is an independent provider treating NHS-funded patients, free to the patient.',
      ),
    ).toBeDefined();
    expect(screen.getByText('No hospital sites recorded for this organisation.')).toBeDefined();
  });

  test('renders All Specialties display text correctly', () => {
    const detail: EnglandUnitDetail = {
      unit: mockNhsUnit,
      specialty: mockAllSpecialties,
      state: { kind: 'current' },
      figures: mockFigures,
      hospitalSites: mockHospitalSites,
      latestRelease: mockLatestRelease,
      nhsRegion: mockRegion,
    };

    render(<UnitDetail detail={detail} />);

    expect(screen.getByText('All specialties')).toBeDefined();
  });

  test('renders carried-forward warning with older period and latest period', () => {
    const olderPeriod = '2026-05-31' as ReportingPeriod;
    const carriedForwardFigures: readonly PublishedFigure<'england'>[] = mockFigures.map((f) => ({
      ...f,
      reportingPeriod: olderPeriod,
    }));

    const detail: EnglandUnitDetail = {
      unit: mockNhsUnit,
      specialty: mockSpecialty,
      state: { kind: 'carried-forward', monthsOld: 2 },
      figures: carriedForwardFigures,
      hospitalSites: mockHospitalSites,
      latestRelease: mockLatestRelease,
      nhsRegion: mockRegion,
    };

    render(<UnitDetail detail={detail} />);

    // Carried forward warning is shown
    expect(
      screen.getByText(/These are the most recent figures for Barts Health NHS Trust, as at/),
    ).toBeDefined();
    expect(screen.getAllByText('31 May 2026').length).toBeGreaterThan(0);
    expect(screen.getByText('31 July 2026')).toBeDefined();

    // Figures still rendered
    expect(
      screen.getByText(/Half of people waiting at 31 May 2026 had waited 12.5 weeks or less/),
    ).toBeDefined();
  });

  test('renders no-recent-figures warning and omits figure statements', () => {
    const lastPeriod = '2025-01-31' as ReportingPeriod;

    const detail: EnglandUnitDetail = {
      unit: mockNhsUnit,
      specialty: mockSpecialty,
      state: { kind: 'no-recent-figures', lastReportingPeriod: lastPeriod },
      figures: [],
      hospitalSites: mockHospitalSites,
      latestRelease: mockLatestRelease,
      nhsRegion: mockRegion,
    };

    render(<UnitDetail detail={detail} />);

    // No recent figures message
    expect(screen.getByText(/No figures published since/)).toBeDefined();
    expect(screen.getByText('31 January 2025')).toBeDefined();

    // Figures section does NOT render any figure statements
    expect(screen.queryByLabelText(/Waiting time figures/)).toBeDefined();
    expect(screen.queryByText(/Half of people waiting/)).toBeNull();
    expect(screen.queryByText(/had waited less than 18 weeks/)).toBeNull();
  });

  test('never links to provider websites or non-whitelisted domains', () => {
    const detail: EnglandUnitDetail = {
      unit: mockNhsUnit,
      specialty: mockSpecialty,
      state: { kind: 'current' },
      figures: mockFigures,
      hospitalSites: mockHospitalSites,
      latestRelease: mockLatestRelease,
      nhsRegion: mockRegion,
    };

    const { container } = render(<UnitDetail detail={detail} />);

    const allowedDomains = ['gov.uk', 'nhs.uk', 'gov.wales', 'nhs.scot', 'nhsinform.scot'];

    const links = Array.from(container.querySelectorAll('a'));
    expect(links.length).toBeGreaterThan(0);

    for (const link of links) {
      const href = link.getAttribute('href');
      expect(href).toBeTruthy();
      if (!href) continue;

      if (href.startsWith('/')) {
        // Internal link
        expect(href).toMatch(/^\/[a-zA-Z0-9_\-/]*$/);
      } else {
        const url = new URL(href);
        const host = url.hostname;
        const isAllowed = allowedDomains.some((d) => host === d || host.endsWith(`.${d}`));
        expect(isAllowed).toBe(true);
      }
    }

    // Assert hospital sites section contains no <a> tags
    const hospitalSection = container.querySelector('.hospital-sites-section');
    expect(hospitalSection).toBeDefined();
    const siteLinks = hospitalSection?.querySelectorAll('a') ?? [];
    expect(siteLinks.length).toBe(0);
  });
});

describe('England Unit Detail Page Route (T-8.12)', () => {
  test('generateStaticParams returns valid array of (specialty, unit) pairs', async () => {
    const params = await generateStaticParams();

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
    const page = await EnglandUnitPage({
      params: Promise.resolve({
        specialty: 'trauma-and-orthopaedics',
        unit: 'r1h',
      }),
    });

    const { container } = render(page);

    // Breadcrumb navigation back to specialty
    const backLink = screen.getByRole('link', {
      name: '← Back to Trauma and Orthopaedic Service',
    });
    expect(backLink.getAttribute('href')).toBe('/england/trauma-and-orthopaedics');

    // Page header
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Barts Health NHS Trust');

    // Border notice present and links to other nations
    const borderNotice = container.querySelector('aside[aria-labelledby="border-notice-title"]');
    expect(borderNotice).not.toBeNull();
    const borderLinks = Array.from(borderNotice?.querySelectorAll('a') ?? []).map((a) =>
      a.getAttribute('href'),
    );
    expect(borderLinks).toEqual(['/wales', '/scotland']);
    expect(borderLinks).not.toContain('/england');
  });

  test('triggers notFound for unknown specialty', async () => {
    await expect(
      EnglandUnitPage({
        params: Promise.resolve({
          specialty: 'non-existent-specialty',
          unit: 'r1h',
        }),
      }),
    ).rejects.toThrow('NEXT_NOT_FOUND');

    expect(mockNotFound).toHaveBeenCalled();
  });

  test('triggers notFound for unknown reporting unit', async () => {
    await expect(
      EnglandUnitPage({
        params: Promise.resolve({
          specialty: 'trauma-and-orthopaedics',
          unit: 'non-existent-unit',
        }),
      }),
    ).rejects.toThrow('NEXT_NOT_FOUND');

    expect(mockNotFound).toHaveBeenCalled();
  });
});
