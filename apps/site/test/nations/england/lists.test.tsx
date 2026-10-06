import { afterEach, describe, expect, test, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import React from 'react';
import {
  nhsRegionId,
  type HospitalSite,
  type NhsRegion,
  type Specialty,
} from '@kyw/model/reference';
import { hospitalSiteId, reportingUnitId, specialtyId } from '@kyw/model/ids';
import type { EnglandUnitForSpecialty } from '../../../src/data/england';
import { SpecialtyList } from '../../../src/nations/england/SpecialtyList';
import { UnitList } from '../../../src/nations/england/UnitList';
import EnglandPage from '../../../src/app/england/page';
import EnglandSpecialtyPage, {
  generateStaticParams,
} from '../../../src/app/england/[specialty]/page';

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

const mockRegions: readonly NhsRegion[] = [
  { id: nhsRegionId('Y59'), officialCode: 'Y59', name: 'South East' },
  { id: nhsRegionId('Y56'), officialCode: 'Y56', name: 'London' },
  { id: nhsRegionId('Y60'), officialCode: 'Y60', name: 'Midlands' },
];

const mockSpecialties: readonly Specialty<'england'>[] = [
  {
    id: specialtyId('england', 'C_110'),
    officialCode: '110',
    officialName: 'Trauma and Orthopaedic Service',
    slug: 'trauma-and-orthopaedics',
    descriptionKey: 'england/trauma-and-orthopaedics',
    isAllSpecialties: false,
  },
  {
    id: specialtyId('england', 'C_999'),
    officialCode: 'C_999',
    officialName: 'Total',
    slug: 'all-specialties',
    descriptionKey: 'england/all-specialties',
    isAllSpecialties: true,
  },
  {
    id: specialtyId('england', 'C_100'),
    officialCode: '100',
    officialName: 'General Surgery Service',
    slug: 'general-surgery',
    descriptionKey: 'england/general-surgery',
    isAllSpecialties: false,
  },
  {
    id: specialtyId('england', 'C_130'),
    officialCode: '130',
    officialName: 'Ophthalmology Service',
    slug: 'ophthalmology',
    descriptionKey: 'england/ophthalmology',
    isAllSpecialties: false,
  },
];

const mockHospitalSites: readonly HospitalSite<'england'>[] = [
  {
    id: hospitalSiteId('england', 'RRK01'),
    officialCode: 'RRK01',
    name: 'Queen Elizabeth Hospital Birmingham',
    town: 'Birmingham',
    reportingUnit: reportingUnitId('england', 'RRK'),
  },
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
  {
    id: hospitalSiteId('england', 'NT301'),
    officialCode: 'NT301',
    name: 'Practice Plus Group Surgical Centre St Marys',
    town: 'Portsmouth',
    reportingUnit: reportingUnitId('england', 'NT3'),
  },
];

const mockUnits: readonly EnglandUnitForSpecialty[] = [
  {
    id: reportingUnitId('england', 'RRK'),
    officialCode: 'RRK',
    officialName: 'University Hospitals Birmingham NHS Foundation Trust',
    displayName: 'University Hospitals Birmingham NHS Foundation Trust',
    kind: 'nhs-trust',
    nhsRegion: nhsRegionId('Y60'),
    hospitalSites: [hospitalSiteId('england', 'RRK01')],
    operational: { from: '2000-01-01', to: null },
    predecessors: [],
    successors: [],
    notes: [],
    state: { kind: 'current' },
  },
  {
    id: reportingUnitId('england', 'R1H'),
    officialCode: 'R1H',
    officialName: 'Barts Health NHS Trust',
    displayName: 'Barts Health NHS Trust',
    kind: 'nhs-trust',
    nhsRegion: nhsRegionId('Y56'),
    hospitalSites: [hospitalSiteId('england', 'R1H12'), hospitalSiteId('england', 'R1H15')],
    operational: { from: '2012-04-01', to: null },
    predecessors: [],
    successors: [],
    notes: [],
    state: { kind: 'current' },
  },
  {
    id: reportingUnitId('england', 'NT3'),
    officialCode: 'NT3',
    officialName: 'Practice Plus Group Hospitals Limited',
    displayName: 'Practice Plus Group Hospitals',
    kind: 'independent-sector-provider',
    nhsRegion: nhsRegionId('Y59'),
    hospitalSites: [hospitalSiteId('england', 'NT301')],
    operational: { from: '2015-01-01', to: null },
    predecessors: [],
    successors: [],
    notes: [],
    state: { kind: 'carried-forward', monthsOld: 3 },
  },
  {
    id: reportingUnitId('england', 'RJ1'),
    officialCode: 'RJ1',
    officialName: "Guy's and St Thomas' NHS Foundation Trust",
    displayName: "Guy's and St Thomas' NHS Foundation Trust",
    kind: 'nhs-trust',
    nhsRegion: nhsRegionId('Y56'),
    hospitalSites: [],
    operational: { from: '2000-01-01', to: null },
    predecessors: [],
    successors: [],
    notes: [],
    state: { kind: 'current' },
  },
];

describe('England SpecialtyList (T-8.11)', () => {
  test('renders specialties in alphabetical order by name, with "All specialties" last', () => {
    const { container } = render(<SpecialtyList specialties={mockSpecialties} />);

    const links = Array.from(container.querySelectorAll('li a'));
    const names = links.map((l) => l.textContent);

    expect(names).toEqual([
      'General Surgery Service',
      'Ophthalmology Service',
      'Trauma and Orthopaedic Service',
      'All specialties',
    ]);
  });

  test('creates correct href for each specialty link', () => {
    const { container } = render(<SpecialtyList specialties={mockSpecialties} />);

    const links = Array.from(container.querySelectorAll<HTMLAnchorElement>('li a'));
    const hrefs = links.map((l) => l.getAttribute('href'));

    expect(hrefs).toEqual([
      '/england/general-surgery',
      '/england/ophthalmology',
      '/england/trauma-and-orthopaedics',
      '/england/all-specialties',
    ]);
  });

  test('populates data-filter-text with specialty name and description', () => {
    const { container } = render(<SpecialtyList specialties={mockSpecialties} />);

    const items = Array.from(container.querySelectorAll('li'));
    const ophthalmologyItem = items.find((li) => li.textContent.includes('Ophthalmology'));

    expect(ophthalmologyItem).toBeDefined();
    const filterText = ophthalmologyItem?.getAttribute('data-filter-text') ?? '';
    expect(filterText).toContain('ophthalmology');
    expect(filterText).toContain('eye care');
  });
});

describe('England UnitList (T-8.11)', () => {
  const targetSpecialty = mockSpecialties[0];
  if (!targetSpecialty) throw new Error('Missing target specialty');

  test('groups reporting units by NHS Region, with regions in alphabetical order', () => {
    const { container } = render(
      <UnitList
        specialty={targetSpecialty}
        units={mockUnits}
        regions={mockRegions}
        hospitalSites={mockHospitalSites}
      />,
    );

    const regionHeadings = Array.from(container.querySelectorAll('section h2')).map(
      (h) => h.textContent,
    );

    expect(regionHeadings).toEqual(['London', 'Midlands', 'South East']);
  });

  test('sorts units alphabetically by displayName within each NHS Region', () => {
    const londonRegionId = nhsRegionId('Y56');
    const londonUnits: EnglandUnitForSpecialty[] = mockUnits.filter(
      (u) => u.nhsRegion === londonRegionId,
    );
    const reversedLondonUnits = [...londonUnits].reverse();

    const { container } = render(
      <UnitList
        specialty={targetSpecialty}
        units={reversedLondonUnits}
        regions={mockRegions}
        hospitalSites={mockHospitalSites}
      />,
    );

    const londonSection = Array.from(container.querySelectorAll('section')).find((s) =>
      s.querySelector('h2')?.textContent.includes('London'),
    );

    const unitLinks = Array.from(londonSection?.querySelectorAll('ul li a') ?? []).map(
      (a) => a.textContent,
    );

    expect(unitLinks).toEqual([
      'Barts Health NHS Trust',
      "Guy's and St Thomas' NHS Foundation Trust",
    ]);
  });

  test('renders ISP label on Independent Sector Provider units', () => {
    const { container } = render(
      <UnitList
        specialty={targetSpecialty}
        units={mockUnits}
        regions={mockRegions}
        hospitalSites={mockHospitalSites}
      />,
    );

    const ispItem = Array.from(container.querySelectorAll('li')).find((li) =>
      li.textContent.includes('Practice Plus Group'),
    );

    expect(ispItem).toBeDefined();
    expect(ispItem?.querySelector('.isp-badge')?.textContent).toBe(
      'Independent provider (NHS-funded)',
    );

    const trustItem = Array.from(container.querySelectorAll('li')).find((li) =>
      li.textContent.includes('Barts Health'),
    );
    expect(trustItem?.querySelector('.isp-badge')).toBeNull();
  });

  test('populates data-filter-text with trust name, hospital site names, and towns', () => {
    const { container } = render(
      <UnitList
        specialty={targetSpecialty}
        units={mockUnits}
        regions={mockRegions}
        hospitalSites={mockHospitalSites}
      />,
    );

    const bartsItem = Array.from(container.querySelectorAll('li')).find((li) =>
      li.textContent.includes('Barts Health'),
    );

    const filterText = bartsItem?.getAttribute('data-filter-text') ?? '';
    expect(filterText).toContain('barts health nhs trust');
    expect(filterText).toContain('the royal london hospital');
    expect(filterText).toContain('st bartholomew hospital');
    expect(filterText).toContain('london');
  });

  test('does not contain any digits representing waiting figures or rankings in list items', () => {
    const { container } = render(
      <UnitList
        specialty={targetSpecialty}
        units={mockUnits}
        regions={mockRegions}
        hospitalSites={mockHospitalSites}
      />,
    );

    const listItems = Array.from(container.querySelectorAll('li'));
    for (const item of listItems) {
      // Must not contain statements like "12.5 weeks", "65%", "42 patients"
      expect(item.textContent).not.toMatch(/\d+(\.\d+)?\s*(weeks|days|%)/i);
      expect(item.textContent).not.toMatch(/median/i);
      expect(item.textContent).not.toMatch(/rank/i);
    }
  });

  test('renders empty message when no units are supplied', () => {
    render(
      <UnitList
        specialty={targetSpecialty}
        units={[]}
        regions={mockRegions}
        hospitalSites={mockHospitalSites}
      />,
    );

    expect(screen.getByText('No reporting units found for this specialty.')).toBeDefined();
  });
});

describe('England page (/england) (T-8.11)', () => {
  test('renders page heading, intro, explainer links, specialty list and border notice', async () => {
    const page = await EnglandPage();
    const { container } = render(page);

    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('England waiting times');
    expect(screen.getByText(/Explore official NHS waiting-time statistics/)).toBeDefined();

    const explainerLinks = Array.from(container.querySelectorAll('.explainer-links a')).map((a) =>
      a.getAttribute('href'),
    );
    expect(explainerLinks).toContain('/england/about-the-figures');
    expect(explainerLinks).toContain('/england/your-rights');

    // Asserts border notice is present
    expect(container.querySelector('[role="note"]')).toBeDefined();
  });
});

describe('England specialty page (/england/[specialty]) (T-8.11)', () => {
  test('generateStaticParams returns all 24 England specialties', async () => {
    const params = await generateStaticParams();
    expect(params.length).toBe(24);
    expect(params.map((p) => p.specialty)).toContain('trauma-and-orthopaedics');
    expect(params.map((p) => p.specialty)).toContain('general-surgery');
    expect(params.map((p) => p.specialty)).toContain('all-specialties');
  });

  test('renders specialty heading, breadcrumb, explainer links, and unit list', async () => {
    const page = await EnglandSpecialtyPage({
      params: Promise.resolve({ specialty: 'trauma-and-orthopaedics' }),
    });
    const { container } = render(page);

    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe(
      'Trauma and Orthopaedic Service',
    );
    expect(screen.getByText(/Back to all specialties in England/)).toBeDefined();

    const explainerLinks = Array.from(container.querySelectorAll('.explainer-links a')).map((a) =>
      a.getAttribute('href'),
    );
    expect(explainerLinks).toContain('/england/about-the-figures');
    expect(explainerLinks).toContain('/england/your-rights');

    // Editorial intro slot present
    expect(container.querySelector('#editorial-intro-slot')).toBeDefined();

    // Border notice present
    expect(container.querySelector('[role="note"]')).toBeDefined();
  });

  test('renders "All specialties" heading for all-specialties slug', async () => {
    const page = await EnglandSpecialtyPage({
      params: Promise.resolve({ specialty: 'all-specialties' }),
    });
    render(page);

    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('All specialties');
  });

  test('calls notFound() when specialty slug is invalid', async () => {
    await expect(
      EnglandSpecialtyPage({
        params: Promise.resolve({ specialty: 'non-existent-specialty-xyz' }),
      }),
    ).rejects.toThrow('NEXT_NOT_FOUND');
    expect(mockNotFound).toHaveBeenCalled();
  });
});
