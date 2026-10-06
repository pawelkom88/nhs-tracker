import { afterEach, describe, expect, test } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import React from 'react';
import AboutPage from '../../src/app/about/page';
import SourcesPage from '../../src/app/sources/page';
import PrivacyPage from '../../src/app/privacy/page';
import AccessibilityPage from '../../src/app/accessibility/page';
import { siteConfig } from '../../src/config/site';

afterEach(() => {
  cleanup();
});

describe('Static information pages (T-8.15)', () => {
  describe('AboutPage (/about)', () => {
    test('renders h1 heading and project description', () => {
      render(<AboutPage />);

      const heading = screen.getByRole('heading', { level: 1, name: 'About Know Your Wait' });
      expect(heading).not.toBeNull();

      expect(
        screen.getByText(
          'Know Your Wait is a free, independent, open-source website that explains official NHS waiting-time statistics for England, Wales and Scotland in plain English.',
        ),
      ).not.toBeNull();
    });

    test('lists project principles including snapshots, exact figures, and no ranking', () => {
      render(<AboutPage />);

      expect(
        screen.getByText(
          /Never compare across nations: each publishing nation's figures are shown separately/,
        ),
      ).not.toBeNull();
      expect(
        screen.getByText(
          /Snapshots, not predictions: figures describe people already on waiting lists/,
        ),
      ).not.toBeNull();
      expect(
        screen.getByText(
          /Official or exact sums only: we republish official figures as released by official bodies/,
        ),
      ).not.toBeNull();
      expect(
        screen.getByText(
          /No ranking or nudging: we never sort hospital trusts or health boards by waiting time/,
        ),
      ).not.toBeNull();
    });

    test('links to GitHub repository and data directory', () => {
      render(<AboutPage />);

      const repoLink = screen.getByRole('link', { name: 'View source code on GitHub' });
      expect(repoLink.getAttribute('href')).toBe(siteConfig.repoUrl);

      const dataLink = screen.getByRole('link', {
        name: 'Browse normalised data directory on GitHub',
      });
      expect(dataLink.getAttribute('href')).toBe(`${siteConfig.repoUrl}/tree/main/data`);
    });

    test('includes contact email', () => {
      render(<AboutPage />);

      expect(screen.getByText(new RegExp(siteConfig.contactEmail))).not.toBeNull();
    });
  });

  describe('SourcesPage (/sources)', () => {
    test('renders h1 heading and introduces official vs derived figures', () => {
      render(<SourcesPage />);

      const heading = screen.getByRole('heading', { level: 1, name: 'Sources and licences' });
      expect(heading).not.toBeNull();

      expect(
        screen.getByText(
          /An Official Figure is a statistic republished unchanged from an official publishing nation release/,
        ),
      ).not.toBeNull();
      expect(
        screen.getByText(
          /A Derived Figure is calculated by Know Your Wait by exactly adding official figure bands/,
        ),
      ).not.toBeNull();
    });

    test('renders England publisher, dataset, and verbatim OGL attribution statement', () => {
      render(<SourcesPage />);

      expect(screen.getByRole('heading', { level: 2, name: 'England' })).not.toBeNull();
      expect(screen.getByText('NHS England')).not.toBeNull();
      expect(
        screen.getByText(
          'Contains public sector information licensed under the Open Government Licence v3.0. Source: NHS England, Consultant-led Referral to Treatment Waiting Times.',
        ),
      ).not.toBeNull();
      const link = screen.getByRole('link', { name: 'NHS England RTT statistical work area' });
      expect(link.getAttribute('href')).toBe(
        'https://www.england.nhs.uk/statistics/statistical-work-areas/rtt-waiting-times/',
      );
    });

    test('renders Wales publisher, dataset, and verbatim OGL attribution statement', () => {
      render(<SourcesPage />);

      expect(screen.getByRole('heading', { level: 2, name: 'Wales' })).not.toBeNull();
      expect(
        screen.getByText('Welsh Government (data provider: Digital Health and Care Wales)'),
      ).not.toBeNull();
      expect(
        screen.getByText(
          'Source: Welsh Government, StatsWales (data provider: Digital Health and Care Wales). Contains public sector information licensed under the Open Government Licence v3.0.',
        ),
      ).not.toBeNull();
      const link = screen.getByRole('link', {
        name: 'StatsWales performance and waiting times portal',
      });
      expect(link.getAttribute('href')).toBe('https://stats.gov.wales');
    });

    test('renders Scotland publisher, dataset, and verbatim OGL attribution statement', () => {
      render(<SourcesPage />);

      expect(screen.getByRole('heading', { level: 2, name: 'Scotland' })).not.toBeNull();
      expect(screen.getByText('Public Health Scotland')).not.toBeNull();
      expect(
        screen.getByText(
          'Source: Public Health Scotland, Stage of Treatment Waiting Times (opendata.nhs.scot). Contains public sector information licensed under the Open Government Licence v3.0.',
        ),
      ).not.toBeNull();
      const link = screen.getByRole('link', { name: 'Public Health Scotland open data resource' });
      expect(link.getAttribute('href')).toBe(
        'https://www.opendata.nhs.scot/dataset/stage-of-treatment-waiting-times',
      );
    });

    test('renders NHS ODS publisher and verbatim attribution statement', () => {
      render(<SourcesPage />);

      expect(
        screen.getByRole('heading', { level: 2, name: 'Organisation Data Service (ODS)' }),
      ).not.toBeNull();
      expect(screen.getByText('NHS England Organisation Data Service')).not.toBeNull();
      expect(
        screen.getByText(
          'Contains information from NHS England, licenced under the current version of the Open Government Licence.',
        ),
      ).not.toBeNull();
      const link = screen.getByRole('link', { name: 'NHS England ODS data downloads' });
      expect(link.getAttribute('href')).toBe(
        'https://digital.nhs.uk/services/organisation-data-service',
      );
    });

    test('links to Open Government Licence v3.0 and data folder', () => {
      render(<SourcesPage />);

      const oglLink = screen.getByRole('link', { name: 'Read the Open Government Licence v3.0' });
      expect(oglLink.getAttribute('href')).toBe(
        'https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/',
      );

      const dataLink = screen.getByRole('link', { name: 'View data folder on GitHub' });
      expect(dataLink.getAttribute('href')).toBe(`${siteConfig.repoUrl}/tree/main/data`);
    });
  });

  describe('PrivacyPage (/privacy)', () => {
    test('renders h1 heading and confirms cookieless analytics and no user tracking', () => {
      render(<PrivacyPage />);

      const heading = screen.getByRole('heading', { level: 1, name: 'Privacy' });
      expect(heading).not.toBeNull();

      expect(
        screen.getByText(
          'Know Your Wait is built to respect your privacy. We collect no personal information and use no tracking cookies.',
        ),
      ).not.toBeNull();

      expect(
        screen.getByRole('heading', { level: 2, name: 'Cookieless web analytics' }),
      ).not.toBeNull();
      expect(
        screen.getByText(
          /We use Cloudflare Web Analytics to measure site traffic and aggregate page views/,
        ),
      ).not.toBeNull();

      expect(
        screen.getByRole('heading', { level: 2, name: 'No accounts, no user data' }),
      ).not.toBeNull();
      expect(
        screen.getByText(
          /Know Your Wait does not have user accounts, logins, or tracking identifiers/,
        ),
      ).not.toBeNull();
    });
  });

  describe('AccessibilityPage (/accessibility)', () => {
    test('renders h1 heading and WCAG 2.2 AA target', () => {
      render(<AccessibilityPage />);

      const heading = screen.getByRole('heading', { level: 1, name: 'Accessibility' });
      expect(heading).not.toBeNull();

      expect(
        screen.getByText(
          'Know Your Wait is designed to be accessible to everyone. We aim to conform to the Web Content Accessibility Guidelines (WCAG) 2.2 Level AA standard.',
        ),
      ).not.toBeNull();
    });

    test('lists core accessibility features including semantic HTML and no-JS baseline', () => {
      render(<AccessibilityPage />);

      expect(
        screen.getByText(
          /Semantic HTML: pages use standard landmarks, headings, and semantic elements/,
        ),
      ).not.toBeNull();
      expect(
        screen.getByText(
          /Works without JavaScript: all content, national waiting statistics, and navigation are fully accessible/,
        ),
      ).not.toBeNull();
      expect(
        screen.getByText(/Keyboard navigation: all links and interactive controls can be accessed/),
      ).not.toBeNull();
      expect(
        screen.getByText(
          /Clear contrast and typography: text meets or exceeds WCAG 2.2 AA contrast requirements/,
        ),
      ).not.toBeNull();
    });

    test('provides barrier reporting link to GitHub issues and contact email', () => {
      render(<AccessibilityPage />);

      const issueLink = screen.getByRole('link', {
        name: 'Report an accessibility issue on GitHub',
      });
      expect(issueLink.getAttribute('href')).toBe(`${siteConfig.repoUrl}/issues`);
      expect(screen.getByText(new RegExp(siteConfig.contactEmail))).not.toBeNull();
    });
  });
});
