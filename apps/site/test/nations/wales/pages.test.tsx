import { afterEach, describe, expect, test, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import React from 'react';
import { hospitalSiteId, reportingUnitId, specialtyId } from '@kyw/model/ids';
import type { PublicationDate, ReportingPeriod } from '@kyw/model/period';
import type { HospitalSite, Specialty } from '@kyw/model/reference';
import type { PublishedFigure, PublishedLatestRelease } from '@kyw/model/published';
import {
  WALES_STATISTIC_LONG_WAIT_COUNT,
  WALES_STATISTIC_MEDIAN_ONGOING_WAIT,
  WALES_STATISTIC_WITHIN_WAITING_STANDARD,
  WALES_WAIT_STAGE_RTT_PATHWAY,
} from '@kyw/model/wales/definitions';
import type { WalesUnitDetail, WalesUnitForSpecialty } from '../../../src/data/wales';
import { SpecialtyList } from '../../../src/nations/wales/SpecialtyList';
import { UnitList } from '../../../src/nations/wales/UnitList';
import { UnitDetail } from '../../../src/nations/wales/UnitDetail';
import WalesPage from '../../../src/app/wales/page';
import WalesSpecialtyPage, {
  generateStaticParams as generateSpecialtyParams,
} from '../../../src/app/wales/[specialty]/page';
import WalesUnitPage, {
  generateStaticParams as generateUnitParams,
} from '../../../src/app/wales/[specialty]/[unit]/page';

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

const mockSpecialties: readonly Specialty<'wales'>[] = [
  {
    id: specialtyId('wales', '110'),
    officialCode: '110',
    officialName: 'Trauma and Orthopaedics',
    slug: 'trauma-and-orthopaedics',
    descriptionKey: 'wales/trauma-and-orthopaedics',
    isAllSpecialties: false,
  },
  {
    id: specialtyId('wales', 'all'),
    officialCode: 'all',
    officialName: 'All specialties',
    slug: 'all-specialties',
    descriptionKey: 'wales/all-specialties',
    isAllSpecialties: true,
  },
  {
    id: specialtyId('wales', '100'),
    officialCode: '100',
    officialName: 'General Surgery',
    slug: 'general-surgery',
    descriptionKey: 'wales/general-surgery',
    isAllSpecialties: false,
  },
  {
    id: specialtyId('wales', '120'),
    officialCode: '120',
    officialName: 'ENT',
    slug: 'ear-nose-and-throat',
    descriptionKey: 'wales/ear-nose-and-throat',
    isAllSpecialties: false,
  },
];

const mockHospitalSites: readonly HospitalSite<'wales'>[] = [
  {
    id: hospitalSiteId('wales', '7A1A1'),
    officialCode: '7A1A1',
    name: 'Ysbyty Gwynedd',
    town: 'Bangor',
    reportingUnit: reportingUnitId('wales', '7A1'),
  },
  {
    id: hospitalSiteId('wales', '7A1A2'),
    officialCode: '7A1A2',
    name: 'Glan Clwyd Hospital',
    town: 'Rhyl',
    reportingUnit: reportingUnitId('wales', '7A1'),
  },
  {
    id: hospitalSiteId('wales', '7A4A1'),
    officialCode: '7A4A1',
    name: 'University Hospital of Wales',
    town: 'Cardiff',
    reportingUnit: reportingUnitId('wales', '7A4'),
  },
];

const mockUnits: readonly WalesUnitForSpecialty[] = [
  {
    id: reportingUnitId('wales', '7A4'),
    officialCode: '7A4',
    officialName: 'Cardiff and Vale University Local Health Board',
    displayName: 'Cardiff and Vale University Health Board',
    kind: 'health-board',
    hospitalSites: [hospitalSiteId('wales', '7A4A1')],
    operational: { from: '2009-10-01', to: null },
    predecessors: [],
    successors: [],
    notes: [],
    state: { kind: 'current' },
  },
  {
    id: reportingUnitId('wales', '7A1'),
    officialCode: '7A1',
    officialName: 'Betsi Cadwaladr University Local Health Board',
    displayName: 'Betsi Cadwaladr University Health Board',
    kind: 'health-board',
    hospitalSites: [hospitalSiteId('wales', '7A1A1'), hospitalSiteId('wales', '7A1A2')],
    operational: { from: '2009-10-01', to: null },
    predecessors: [],
    successors: [],
    notes: [],
    state: { kind: 'current' },
  },
  {
    id: reportingUnitId('wales', '7A2'),
    officialCode: '7A2',
    officialName: 'Hywel Dda University Local Health Board',
    displayName: 'Hywel Dda University Health Board',
    kind: 'health-board',
    hospitalSites: [],
    operational: { from: '2009-10-01', to: null },
    predecessors: [],
    successors: [],
    notes: [],
    state: { kind: 'current' },
  },
];

const mockLatestRelease: PublishedLatestRelease<'wales'> = {
  reportingPeriod: '2026-07-31' as ReportingPeriod,
  publicationDate: '2026-09-17' as PublicationDate,
  source: {
    licence: 'OGL-3.0',
    attribution:
      'Source: Welsh Government, StatsWales (data provider: Digital Health and Care Wales). Contains public sector information licensed under the Open Government Licence v3.0.',
    nation: 'wales',
    publisher: 'Welsh Government / StatsWales',
    title: 'NHS Activity and Performance Summary (Referral to Treatment)',
    url: 'https://stats.gov.wales/en-GB/topic/50/performance-and-waiting-times',
  },
};

const mockFigures: readonly PublishedFigure<'wales'>[] = [
  {
    nation: 'wales',
    reportingUnit: reportingUnitId('wales', '7A1'),
    specialty: specialtyId('wales', '110'),
    waitStage: WALES_WAIT_STAGE_RTT_PATHWAY.id,
    statistic: WALES_STATISTIC_MEDIAN_ONGOING_WAIT.id,
    value: { status: 'published', value: 30, provisional: false },
    unit: 'weeks',
    reportingPeriod: '2026-07-31' as ReportingPeriod,
    publicationDate: '2026-09-17' as PublicationDate,
    provenance: { kind: 'official', sourceField: 'Median waiting time (in weeks)' },
    source: mockLatestRelease.source,
    yearEarlier: {
      status: 'shown',
      value: { status: 'published', value: 28, provisional: false },
      reportingPeriod: '2025-07-31' as ReportingPeriod,
      publicationDate: '2025-09-18' as PublicationDate,
    },
  },
  {
    nation: 'wales',
    reportingUnit: reportingUnitId('wales', '7A1'),
    specialty: specialtyId('wales', '110'),
    waitStage: WALES_WAIT_STAGE_RTT_PATHWAY.id,
    statistic: WALES_STATISTIC_WITHIN_WAITING_STANDARD.id,
    value: { status: 'published', value: 48.5, provisional: false },
    unit: 'percent',
    reportingPeriod: '2026-07-31' as ReportingPeriod,
    publicationDate: '2026-09-17' as PublicationDate,
    provenance: { kind: 'official', sourceField: 'Percentage within 26 weeks' },
    source: mockLatestRelease.source,
    yearEarlier: { status: 'omitted', reason: 'not-median' },
  },
  {
    nation: 'wales',
    reportingUnit: reportingUnitId('wales', '7A1'),
    specialty: specialtyId('wales', '110'),
    waitStage: WALES_WAIT_STAGE_RTT_PATHWAY.id,
    statistic: WALES_STATISTIC_LONG_WAIT_COUNT.id,
    value: { status: 'published', value: 4797, provisional: false },
    unit: 'count',
    reportingPeriod: '2026-07-31' as ReportingPeriod,
    publicationDate: '2026-09-17' as PublicationDate,
    provenance: { kind: 'official', sourceField: 'Waiting more than 52 weeks' },
    source: mockLatestRelease.source,
    yearEarlier: { status: 'omitted', reason: 'not-median' },
  },
];

describe('Wales SpecialtyList (T-8.13)', () => {
  test('renders specialties in alphabetical order by name, with "All specialties" last', () => {
    const { container } = render(<SpecialtyList specialties={mockSpecialties} />);

    const links = Array.from(container.querySelectorAll('li a'));
    const names = links.map((l) => l.textContent);

    expect(names).toEqual(['ENT', 'General Surgery', 'Trauma and Orthopaedics', 'All specialties']);
  });

  test('creates correct href for each specialty link', () => {
    const { container } = render(<SpecialtyList specialties={mockSpecialties} />);

    const links = Array.from(container.querySelectorAll<HTMLAnchorElement>('li a'));
    const hrefs = links.map((l) => l.getAttribute('href'));

    expect(hrefs).toEqual([
      '/wales/ear-nose-and-throat',
      '/wales/general-surgery',
      '/wales/trauma-and-orthopaedics',
      '/wales/all-specialties',
    ]);
  });

  test('populates data-filter-text with specialty name and description', () => {
    const { container } = render(<SpecialtyList specialties={mockSpecialties} />);

    const items = Array.from(container.querySelectorAll('li'));
    const traumaItem = items.find((li) => li.textContent.includes('Trauma'));

    expect(traumaItem).toBeDefined();
    const filterText = traumaItem?.getAttribute('data-filter-text') ?? '';
    expect(filterText).toContain('trauma and orthopaedics');
    expect(filterText).toContain('replacements');
  });
});

describe('Wales UnitList (T-8.13)', () => {
  const targetSpecialty = mockSpecialties[0];
  if (!targetSpecialty) throw new Error('Missing target specialty');

  test('renders health boards in plain alphabetical order by displayName', () => {
    const { container } = render(
      <UnitList specialty={targetSpecialty} units={mockUnits} hospitalSites={mockHospitalSites} />,
    );

    const unitLinks = Array.from(container.querySelectorAll('ul li a')).map((a) => a.textContent);

    expect(unitLinks).toEqual([
      'Betsi Cadwaladr University Health Board',
      'Cardiff and Vale University Health Board',
      'Hywel Dda University Health Board',
    ]);
  });

  test('renders official health board directory finder link (B-5)', () => {
    render(
      <UnitList specialty={targetSpecialty} units={mockUnits} hospitalSites={mockHospitalSites} />,
    );

    const finderNotice = screen.getByRole('note');
    expect(finderNotice.textContent).toContain("Not sure which board you're in?");

    const finderLink = screen.getByRole('link', { name: 'See the official list of health boards' });
    expect(finderLink.getAttribute('href')).toBe(
      'https://www.gov.wales/nhs-wales-health-boards-and-trusts',
    );
  });

  test('populates data-filter-text with board name, hospital site names, and towns', () => {
    const { container } = render(
      <UnitList specialty={targetSpecialty} units={mockUnits} hospitalSites={mockHospitalSites} />,
    );

    const betsiItem = Array.from(container.querySelectorAll('li')).find((li) =>
      li.textContent.includes('Betsi Cadwaladr'),
    );

    const filterText = betsiItem?.getAttribute('data-filter-text') ?? '';
    expect(filterText).toContain('betsi cadwaladr university health board');
    expect(filterText).toContain('ysbyty gwynedd');
    expect(filterText).toContain('glan clwyd hospital');
    expect(filterText).toContain('bangor');
    expect(filterText).toContain('rhyl');
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

describe('Wales UnitDetail Component (T-8.13)', () => {
  const targetSpecialty = mockSpecialties[0];
  const targetUnit = mockUnits[1];
  if (!targetSpecialty || !targetUnit) throw new Error('Missing target specialty/unit');

  test('renders health board detail with figures, metadata, and hospital sites', () => {
    const detail: WalesUnitDetail = {
      unit: targetUnit,
      specialty: targetSpecialty,
      state: { kind: 'current' },
      figures: mockFigures,
      hospitalSites: mockHospitalSites.filter((s) => s.reportingUnit === targetUnit.id),
      latestRelease: mockLatestRelease,
    };

    render(<UnitDetail detail={detail} />);

    // <h1> display name
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe(
      'Betsi Cadwaladr University Health Board',
    );

    // Specialty name
    expect(screen.getByText('Trauma and Orthopaedics')).toBeDefined();

    // Organisation code
    expect(screen.getByText('Organisation code: 7A1')).toBeDefined();

    // Explainer links
    expect(screen.getByRole('link', { name: 'About the figures' }).getAttribute('href')).toBe(
      '/wales/about-the-figures',
    );
    expect(screen.getByRole('link', { name: 'Your rights' }).getAttribute('href')).toBe(
      '/wales/your-rights',
    );

    // Figure statements rendered
    expect(
      screen.getByText(/Half of people waiting at 31 July 2026 had waited 30 weeks or less/),
    ).toBeDefined();
    expect(
      screen.getByText(/About 5 in 10 \(48\.5%\) had waited less than 26 weeks/),
    ).toBeDefined();
    expect(screen.getByText(/4,797 people had waited over a year/)).toBeDefined();

    // Hospital sites list
    expect(screen.getByRole('heading', { level: 2, name: 'Hospital sites' })).toBeDefined();
    expect(screen.getByText('Ysbyty Gwynedd (Bangor)')).toBeDefined();
    expect(screen.getByText('Glan Clwyd Hospital (Rhyl)')).toBeDefined();
  });

  test('renders All Specialties display text correctly', () => {
    const allSpec = mockSpecialties.find((s) => s.isAllSpecialties);
    if (!allSpec) throw new Error('Missing all-specialties fixture');

    const detail: WalesUnitDetail = {
      unit: targetUnit,
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
    const carriedForwardFigures: readonly PublishedFigure<'wales'>[] = mockFigures.map((f) => ({
      ...f,
      reportingPeriod: olderPeriod,
    }));

    const detail: WalesUnitDetail = {
      unit: targetUnit,
      specialty: targetSpecialty,
      state: { kind: 'carried-forward', monthsOld: 2 },
      figures: carriedForwardFigures,
      hospitalSites: [],
      latestRelease: mockLatestRelease,
    };

    render(<UnitDetail detail={detail} />);

    expect(
      screen.getByText(
        /These are the most recent figures for Betsi Cadwaladr University Health Board, as at/,
      ),
    ).toBeDefined();
    expect(screen.getAllByText('31 May 2026').length).toBeGreaterThan(0);
    expect(screen.getByText('31 July 2026')).toBeDefined();
  });

  test('renders no-recent-figures warning and omits figure statements', () => {
    const lastPeriod = '2025-01-31' as ReportingPeriod;

    const detail: WalesUnitDetail = {
      unit: targetUnit,
      specialty: targetSpecialty,
      state: { kind: 'no-recent-figures', lastReportingPeriod: lastPeriod },
      figures: [],
      hospitalSites: [],
      latestRelease: mockLatestRelease,
    };

    render(<UnitDetail detail={detail} />);

    expect(screen.getByText(/No figures published since/)).toBeDefined();
    expect(screen.getByText('31 January 2025')).toBeDefined();
    expect(screen.queryByText(/Half of people waiting/)).toBeNull();
  });

  test('never links to provider websites or non-whitelisted domains', () => {
    const detail: WalesUnitDetail = {
      unit: targetUnit,
      specialty: targetSpecialty,
      state: { kind: 'current' },
      figures: mockFigures,
      hospitalSites: mockHospitalSites,
      latestRelease: mockLatestRelease,
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

describe('Wales Page Route (/wales) (T-8.13)', () => {
  test('renders page heading, intro, explainer links, specialty list, and border notice', async () => {
    const page = await WalesPage();
    const { container } = render(page);

    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Wales waiting times');
    expect(screen.getByText(/Explore official NHS waiting-time statistics/)).toBeDefined();

    const explainerLinks = Array.from(container.querySelectorAll('.explainer-links a')).map((a) =>
      a.getAttribute('href'),
    );
    expect(explainerLinks).toContain('/wales/about-the-figures');
    expect(explainerLinks).toContain('/wales/your-rights');

    const borderNotice = container.querySelector('aside[aria-labelledby="border-notice-title"]');
    expect(borderNotice).not.toBeNull();
    const borderLinks = Array.from(borderNotice?.querySelectorAll('a') ?? []).map((a) =>
      a.getAttribute('href'),
    );
    expect(borderLinks).toEqual(['/england', '/scotland']);
    expect(borderLinks).not.toContain('/wales');
  });
});

describe('Wales Specialty Page Route (/wales/[specialty]) (T-8.13)', () => {
  test('generateStaticParams returns all 52 Wales specialties', async () => {
    const params = await generateSpecialtyParams();
    expect(params.length).toBe(52);
    expect(params.map((p) => p.specialty)).toContain('trauma-and-orthopaedics');
    expect(params.map((p) => p.specialty)).toContain('general-surgery');
    expect(params.map((p) => p.specialty)).toContain('all-specialties');
  });

  test('renders specialty heading, breadcrumb, explainer links, and unit list', async () => {
    const page = await WalesSpecialtyPage({
      params: Promise.resolve({ specialty: 'trauma-and-orthopaedics' }),
    });
    const { container } = render(page);

    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Trauma and Orthopaedic');
    expect(screen.getByText(/Back to all specialties in Wales/)).toBeDefined();

    const explainerLinks = Array.from(container.querySelectorAll('.explainer-links a')).map((a) =>
      a.getAttribute('href'),
    );
    expect(explainerLinks).toContain('/wales/about-the-figures');
    expect(explainerLinks).toContain('/wales/your-rights');

    expect(container.querySelector('#editorial-intro-slot')).toBeDefined();
    const borderNotice = container.querySelector('aside[aria-labelledby="border-notice-title"]');
    expect(borderNotice).not.toBeNull();
    const borderLinks = Array.from(borderNotice?.querySelectorAll('a') ?? []).map((a) =>
      a.getAttribute('href'),
    );
    expect(borderLinks).toEqual(['/england', '/scotland']);
    expect(borderLinks).not.toContain('/wales');
  });

  test('renders "All specialties" heading for all-specialties slug', async () => {
    const page = await WalesSpecialtyPage({
      params: Promise.resolve({ specialty: 'all-specialties' }),
    });
    render(page);

    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('All specialties');
  });

  test('calls notFound() when specialty slug is invalid', async () => {
    await expect(
      WalesSpecialtyPage({
        params: Promise.resolve({ specialty: 'non-existent-specialty-xyz' }),
      }),
    ).rejects.toThrow('NEXT_NOT_FOUND');
    expect(mockNotFound).toHaveBeenCalled();
  });
});

describe('Wales Unit Detail Page Route (/wales/[specialty]/[unit]) (T-8.13)', () => {
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
    const page = await WalesUnitPage({
      params: Promise.resolve({
        specialty: 'trauma-and-orthopaedics',
        unit: '7a1',
      }),
    });

    const { container } = render(page);

    const backLink = screen.getByRole('link', {
      name: '← Back to Trauma and Orthopaedic',
    });
    expect(backLink.getAttribute('href')).toBe('/wales/trauma-and-orthopaedics');

    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe(
      'Betsi Cadwaladr University Health Board',
    );
    const borderNotice = container.querySelector('aside[aria-labelledby="border-notice-title"]');
    expect(borderNotice).not.toBeNull();
    const borderLinks = Array.from(borderNotice?.querySelectorAll('a') ?? []).map((a) =>
      a.getAttribute('href'),
    );
    expect(borderLinks).toEqual(['/england', '/scotland']);
    expect(borderLinks).not.toContain('/wales');
  });

  test('triggers notFound for unknown specialty', async () => {
    await expect(
      WalesUnitPage({
        params: Promise.resolve({
          specialty: 'non-existent-specialty',
          unit: '7a1',
        }),
      }),
    ).rejects.toThrow('NEXT_NOT_FOUND');

    expect(mockNotFound).toHaveBeenCalled();
  });

  test('triggers notFound for unknown reporting unit', async () => {
    await expect(
      WalesUnitPage({
        params: Promise.resolve({
          specialty: 'trauma-and-orthopaedics',
          unit: 'non-existent-unit',
        }),
      }),
    ).rejects.toThrow('NEXT_NOT_FOUND');

    expect(mockNotFound).toHaveBeenCalled();
  });
});
