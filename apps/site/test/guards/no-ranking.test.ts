import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import React from 'react';
import { reportingUnitId, specialtyId } from '@kyw/model/ids';
import {
  nhsRegionId,
  type HospitalSite,
  type NhsRegion,
  type Specialty,
} from '@kyw/model/reference';
import { UnitList as EnglandUnitList } from '../../src/nations/england/UnitList';
import { UnitList as WalesUnitList } from '../../src/nations/wales/UnitList';
import { UnitList as ScotlandUnitList } from '../../src/nations/scotland/UnitList';
import type { EnglandUnitForSpecialty } from '../../src/data/england';
import type { WalesUnitForSpecialty } from '../../src/data/wales';
import type { ScotlandUnitForSpecialty } from '../../src/data/scotland';
import NotFound from '../../src/app/not-found';
import robots from '../../src/app/robots';
import sitemap from '../../src/app/sitemap';

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('T-8.17 — No-ranking order tests (ADR-0003 & ADR-0006)', () => {
  const collator = new Intl.Collator('en-GB', { sensitivity: 'base' });

  describe('England UnitList order invariant under data permutation', () => {
    const specialty: Specialty<'england'> = {
      id: specialtyId('england', '110'),
      officialCode: '110',
      officialName: 'Trauma and Orthopaedic Service',
      slug: 'trauma-and-orthopaedics',
      descriptionKey: 'england/trauma-and-orthopaedics',
      isAllSpecialties: false,
    };

    const regions: readonly NhsRegion[] = [
      { id: nhsRegionId('Y59'), officialCode: 'Y59', name: 'South East' },
      { id: nhsRegionId('Y56'), officialCode: 'Y56', name: 'London' },
      { id: nhsRegionId('Y60'), officialCode: 'Y60', name: 'Midlands' },
    ];

    const sampleUnits: readonly EnglandUnitForSpecialty[] = [
      {
        id: reportingUnitId('england', 'RJZ'),
        officialCode: 'RJZ',
        officialName: "King's College Hospital NHS Foundation Trust",
        displayName: "King's College Hospital NHS Foundation Trust",
        kind: 'nhs-trust',
        nhsRegion: nhsRegionId('Y56'),
        hospitalSites: [],
        operational: { from: null, to: null },
        predecessors: [],
        successors: [],
        notes: [],
        state: { kind: 'current' },
      },
      {
        id: reportingUnitId('england', 'RAL'),
        officialCode: 'RAL',
        officialName: 'Royal Free London NHS Foundation Trust',
        displayName: 'Royal Free London NHS Foundation Trust',
        kind: 'nhs-trust',
        nhsRegion: nhsRegionId('Y56'),
        hospitalSites: [],
        operational: { from: null, to: null },
        predecessors: [],
        successors: [],
        notes: [],
        state: { kind: 'current' },
      },
      {
        id: reportingUnitId('england', 'R1K'),
        officialCode: 'R1K',
        officialName: 'London North West University Healthcare NHS Trust',
        displayName: 'London North West University Healthcare NHS Trust',
        kind: 'nhs-trust',
        nhsRegion: nhsRegionId('Y56'),
        hospitalSites: [],
        operational: { from: null, to: null },
        predecessors: [],
        successors: [],
        notes: [],
        state: { kind: 'current' },
      },
      {
        id: reportingUnitId('england', 'RXK'),
        officialCode: 'RXK',
        officialName: 'Sandwell and West Birmingham Hospitals NHS Trust',
        displayName: 'Sandwell and West Birmingham NHS Trust',
        kind: 'nhs-trust',
        nhsRegion: nhsRegionId('Y60'),
        hospitalSites: [],
        operational: { from: null, to: null },
        predecessors: [],
        successors: [],
        notes: [],
        state: { kind: 'current' },
      },
      {
        id: reportingUnitId('england', 'RL4'),
        officialCode: 'RL4',
        officialName: 'The Royal Wolverhampton NHS Trust',
        displayName: 'The Royal Wolverhampton NHS Trust',
        kind: 'nhs-trust',
        nhsRegion: nhsRegionId('Y60'),
        hospitalSites: [],
        operational: { from: null, to: null },
        predecessors: [],
        successors: [],
        notes: [],
        state: { kind: 'current' },
      },
      {
        id: reportingUnitId('england', 'RTH'),
        officialCode: 'RTH',
        officialName: 'Oxford University Hospitals NHS Foundation Trust',
        displayName: 'Oxford University Hospitals NHS Foundation Trust',
        kind: 'nhs-trust',
        nhsRegion: nhsRegionId('Y59'),
        hospitalSites: [],
        operational: { from: null, to: null },
        predecessors: [],
        successors: [],
        notes: [],
        state: { kind: 'current' },
      },
    ];

    const sites: readonly HospitalSite<'england'>[] = [];

    it('renders identical DOM order when units input array is permuted or shuffled', () => {
      // Forward order
      const { container: container1, unmount: unmount1 } = render(
        React.createElement(EnglandUnitList, {
          specialty,
          units: sampleUnits,
          regions,
          hospitalSites: sites,
        }),
      );
      const links1 = Array.from(container1.querySelectorAll('.unit-item a')).map((a) =>
        a.textContent.trim(),
      );
      unmount1();

      // Reversed order
      const reversedUnits = [...sampleUnits].reverse();
      const { container: container2, unmount: unmount2 } = render(
        React.createElement(EnglandUnitList, {
          specialty,
          units: reversedUnits,
          regions,
          hospitalSites: sites,
        }),
      );
      const links2 = Array.from(container2.querySelectorAll('.unit-item a')).map((a) =>
        a.textContent.trim(),
      );
      unmount2();

      // Arbitrary permuted order
      const permutedUnits = [
        sampleUnits[3],
        sampleUnits[0],
        sampleUnits[4],
        sampleUnits[1],
        sampleUnits[5],
        sampleUnits[2],
      ].filter((u): u is EnglandUnitForSpecialty => u !== undefined);

      const { container: container3, unmount: unmount3 } = render(
        React.createElement(EnglandUnitList, {
          specialty,
          units: permutedUnits,
          regions,
          hospitalSites: sites,
        }),
      );
      const links3 = Array.from(container3.querySelectorAll('.unit-item a')).map((a) =>
        a.textContent.trim(),
      );
      unmount3();

      expect(links1).toEqual(links2);
      expect(links1).toEqual(links3);
    });

    it('renders regions in alphabetical order and units in Intl.Collator(en-GB) alphabetical order within each region', () => {
      const { container } = render(
        React.createElement(EnglandUnitList, {
          specialty,
          units: sampleUnits,
          regions,
          hospitalSites: sites,
        }),
      );

      const regionHeadings = Array.from(container.querySelectorAll('.region-section h2')).map((h) =>
        h.textContent.trim(),
      );
      const sortedRegionNames = [...regions]
        .map((r) => r.name)
        .sort((a, b) => collator.compare(a, b));
      expect(regionHeadings).toEqual(sortedRegionNames);

      const regionSections = Array.from(container.querySelectorAll('.region-section'));
      for (const section of regionSections) {
        const regionH2 = section.querySelector('h2');
        const regionName = regionH2 ? regionH2.textContent.trim() : '';
        const regionObj = regions.find((r) => r.name === regionName);
        expect(regionObj).toBeDefined();
        if (!regionObj) continue;

        const renderedUnitNames = Array.from(section.querySelectorAll('.unit-item a')).map((a) =>
          a.textContent.trim(),
        );

        const expectedUnitNames = sampleUnits
          .filter((u) => u.nhsRegion === regionObj.id)
          .map((u) => u.displayName)
          .sort((a, b) => collator.compare(a, b));

        expect(renderedUnitNames).toEqual(expectedUnitNames);
      }
    });
  });

  describe('Wales UnitList order invariant under data permutation', () => {
    const specialty: Specialty<'wales'> = {
      id: specialtyId('wales', '110'),
      officialCode: '110',
      officialName: 'Trauma and Orthopaedic Service',
      slug: 'trauma-and-orthopaedics',
      descriptionKey: 'wales/trauma-and-orthopaedics',
      isAllSpecialties: false,
    };

    const sampleUnits: readonly WalesUnitForSpecialty[] = [
      {
        id: reportingUnitId('wales', '7A7'),
        officialCode: '7A7',
        officialName: 'Swansea Bay University Local Health Board',
        displayName: 'Swansea Bay University Health Board',
        kind: 'health-board',
        hospitalSites: [],
        operational: { from: null, to: null },
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
        hospitalSites: [],
        operational: { from: null, to: null },
        predecessors: [],
        successors: [],
        notes: [],
        state: { kind: 'current' },
      },
      {
        id: reportingUnitId('wales', '7A4'),
        officialCode: '7A4',
        officialName: 'Cardiff and Vale University Local Health Board',
        displayName: 'Cardiff and Vale University Health Board',
        kind: 'health-board',
        hospitalSites: [],
        operational: { from: null, to: null },
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
        operational: { from: null, to: null },
        predecessors: [],
        successors: [],
        notes: [],
        state: { kind: 'current' },
      },
    ];

    const sites: readonly HospitalSite<'wales'>[] = [];

    it('renders identical DOM order equal to Intl.Collator(en-GB) alphabetical sort', () => {
      const { container: c1, unmount: u1 } = render(
        React.createElement(WalesUnitList, {
          specialty,
          units: sampleUnits,
          hospitalSites: sites,
        }),
      );
      const links1 = Array.from(c1.querySelectorAll('.unit-item a')).map((a) =>
        a.textContent.trim(),
      );
      u1();

      const reversed = [...sampleUnits].reverse();
      const { container: c2, unmount: u2 } = render(
        React.createElement(WalesUnitList, {
          specialty,
          units: reversed,
          hospitalSites: sites,
        }),
      );
      const links2 = Array.from(c2.querySelectorAll('.unit-item a')).map((a) =>
        a.textContent.trim(),
      );
      u2();

      expect(links1).toEqual(links2);

      const expectedAlphabetical = [...sampleUnits]
        .map((u) => u.displayName)
        .sort((a, b) => collator.compare(a, b));

      expect(links1).toEqual(expectedAlphabetical);
    });
  });

  describe('Scotland UnitList order invariant under data permutation', () => {
    const specialty: Specialty<'scotland'> = {
      id: specialtyId('scotland', 'C8'),
      officialCode: 'C8',
      officialName: 'Trauma and Orthopaedic Surgery',
      slug: 'trauma-and-orthopaedics',
      descriptionKey: 'scotland/trauma-and-orthopaedics',
      isAllSpecialties: false,
    };

    const sampleUnits: readonly ScotlandUnitForSpecialty[] = [
      {
        id: reportingUnitId('scotland', 'S08000031'),
        officialCode: 'S08000031',
        officialName: 'Greater Glasgow and Clyde Health Board',
        displayName: 'NHS Greater Glasgow and Clyde',
        kind: 'health-board',
        hospitalSites: [],
        operational: { from: null, to: null },
        predecessors: [],
        successors: [],
        notes: [],
        state: { kind: 'current' },
      },
      {
        id: reportingUnitId('scotland', 'S08000015'),
        officialCode: 'S08000015',
        officialName: 'Ayrshire and Arran Health Board',
        displayName: 'NHS Ayrshire and Arran',
        kind: 'health-board',
        hospitalSites: [],
        operational: { from: null, to: null },
        predecessors: [],
        successors: [],
        notes: [],
        state: { kind: 'current' },
      },
      {
        id: reportingUnitId('scotland', 'S08000024'),
        officialCode: 'S08000024',
        officialName: 'Lothian Health Board',
        displayName: 'NHS Lothian',
        kind: 'health-board',
        hospitalSites: [],
        operational: { from: null, to: null },
        predecessors: [],
        successors: [],
        notes: [],
        state: { kind: 'current' },
      },
      {
        id: reportingUnitId('scotland', 'SB0002'),
        officialCode: 'SB0002',
        officialName: 'National Waiting Times Centre Board',
        displayName: 'Golden Jubilee University National Hospital',
        kind: 'special-health-board',
        hospitalSites: [],
        operational: { from: null, to: null },
        predecessors: [],
        successors: [],
        notes: [],
        state: { kind: 'current' },
      },
    ];

    const sites: readonly HospitalSite<'scotland'>[] = [];

    it('renders identical DOM order equal to Intl.Collator(en-GB) alphabetical sort', () => {
      const { container: c1, unmount: u1 } = render(
        React.createElement(ScotlandUnitList, {
          specialty,
          units: sampleUnits,
          hospitalSites: sites,
        }),
      );
      const links1 = Array.from(c1.querySelectorAll('.unit-item a')).map((a) =>
        a.textContent.trim(),
      );
      u1();

      const reversed = [...sampleUnits].reverse();
      const { container: c2, unmount: u2 } = render(
        React.createElement(ScotlandUnitList, {
          specialty,
          units: reversed,
          hospitalSites: sites,
        }),
      );
      const links2 = Array.from(c2.querySelectorAll('.unit-item a')).map((a) =>
        a.textContent.trim(),
      );
      u2();

      expect(links1).toEqual(links2);

      const expectedAlphabetical = [...sampleUnits]
        .map((u) => u.displayName)
        .sort((a, b) => collator.compare(a, b));

      expect(links1).toEqual(expectedAlphabetical);
    });
  });

  describe('404 not-found page, robots, and sitemap static export', () => {
    it('renders 404 page with navigation links to all three nations and home', () => {
      render(React.createElement(NotFound));

      expect(screen.getByRole('heading', { level: 1, name: /page not found/i })).not.toBeNull();
      expect(screen.getByRole('heading', { level: 2, name: /choose your nation/i })).not.toBeNull();

      const englandLinks = screen.getAllByRole('link', { name: /england waiting times/i });
      expect(englandLinks.length).toBeGreaterThanOrEqual(1);
      const firstEnglandLink = englandLinks[0];
      expect(firstEnglandLink?.getAttribute('href')).toBe('/england');

      const walesLinks = screen.getAllByRole('link', { name: /wales waiting times/i });
      expect(walesLinks.length).toBeGreaterThanOrEqual(1);
      const firstWalesLink = walesLinks[0];
      expect(firstWalesLink?.getAttribute('href')).toBe('/wales');

      const scotlandLinks = screen.getAllByRole('link', { name: /scotland waiting times/i });
      expect(scotlandLinks.length).toBeGreaterThanOrEqual(1);
      const firstScotlandLink = scotlandLinks[0];
      expect(firstScotlandLink?.getAttribute('href')).toBe('/scotland');

      expect(screen.getByRole('link', { name: /return to homepage/i }).getAttribute('href')).toBe(
        '/',
      );
    });

    it('generates robots metadata with sitemap url', () => {
      const robotsConfig = robots();
      expect(robotsConfig.rules).toEqual({
        userAgent: '*',
        allow: '/',
      });
      expect(robotsConfig.sitemap).toBe('https://knowyourwait.org/sitemap.xml');
    });

    it('generates sitemap metadata containing core pages and nation routes', async () => {
      const items = await sitemap();
      expect(items.length).toBeGreaterThan(10);

      const urls = items.map((i) => i.url);
      expect(urls).toContain('https://knowyourwait.org');
      expect(urls).toContain('https://knowyourwait.org/about');
      expect(urls).toContain('https://knowyourwait.org/sources');
      expect(urls).toContain('https://knowyourwait.org/privacy');
      expect(urls).toContain('https://knowyourwait.org/accessibility');
      expect(urls).toContain('https://knowyourwait.org/england');
      expect(urls).toContain('https://knowyourwait.org/wales');
      expect(urls).toContain('https://knowyourwait.org/scotland');
      expect(urls).toContain('https://knowyourwait.org/england/trauma-and-orthopaedics');
    });
  });
});
