import { afterEach, describe, expect, test } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import React from 'react';
import { Footer } from '../../src/components/Footer';
import { SiteHeader } from '../../src/components/SiteHeader';
import { MistakeLink } from '../../src/components/MistakeLink';
import RootLayout from '../../src/app/layout';
import { siteConfig } from '../../src/config/site';

afterEach(() => {
  cleanup();
});

describe('Footer (T-8.4)', () => {
  test('renders the exact PRD independence statement verbatim with bold first sentence', () => {
    const { container } = render(<Footer />);

    const expectedFirstSentence = 'Know Your Wait is an independent information site.';
    const expectedDisclaimer =
      'We are not part of, or endorsed by, the NHS, NHS England, NHS Wales, NHS Scotland or any government. We republish official statistics and link to official sources; always check the source before making decisions. Nothing on this site is medical advice. Speak to your GP or care team about your own care.';
    const expectedFullText = `${expectedFirstSentence} ${expectedDisclaimer}`;

    // Verify first sentence is bold
    const strongElement = container.querySelector('strong');
    expect(strongElement).not.toBeNull();
    expect(strongElement?.textContent).toBe(expectedFirstSentence);

    // Verify full paragraph text matches verbatim
    const paragraph = container.querySelector('footer p');
    expect(paragraph?.textContent).toBe(expectedFullText);
  });

  test('renders all required navigation and contact links', () => {
    render(<Footer />);

    const aboutLink = screen.getByRole('link', { name: /About Know Your Wait/i });
    expect(aboutLink.getAttribute('href')).toBe('/about');

    const sourcesLink = screen.getByRole('link', { name: /Sources and licences/i });
    expect(sourcesLink.getAttribute('href')).toBe('/sources');

    const privacyLink = screen.getByRole('link', { name: /Privacy/i });
    expect(privacyLink.getAttribute('href')).toBe('/privacy');

    const a11yLink = screen.getByRole('link', { name: /Accessibility/i });
    expect(a11yLink.getAttribute('href')).toBe('/accessibility');

    const contactLink = screen.getByRole('link', { name: /Contact us/i });
    expect(contactLink.getAttribute('href')).toBe(`mailto:${siteConfig.contactEmail}`);
  });
});

describe('MistakeLink (T-8.4)', () => {
  test('renders a link to the GitHub issue template with template and page parameters', () => {
    render(<MistakeLink pagePath="/england/trauma-and-orthopaedics" />);

    const link = screen.getByRole('link', { name: /Spotted a mistake\?/i });
    expect(link).not.toBeNull();

    const href = link.getAttribute('href');
    expect(href).toContain('template=spotted-a-mistake.yml');
    expect(href).toContain(`page=${encodeURIComponent('/england/trauma-and-orthopaedics')}`);
    expect(href).toContain(siteConfig.repoUrl);
  });

  test('defaults page parameter to empty when omitted', () => {
    render(<MistakeLink />);

    const link = screen.getByRole('link', { name: /Spotted a mistake\?/i });
    const href = link.getAttribute('href');
    expect(href).toBe(`${siteConfig.repoUrl}/issues/new?template=spotted-a-mistake.yml&page=`);
  });
});

describe('SiteHeader & Branding (T-8.4 / ADR-0004)', () => {
  test('renders site name linking to home without NHS branding', () => {
    render(<SiteHeader />);

    const homeLink = screen.getByRole('link', { name: 'Know Your Wait' });
    expect(homeLink.getAttribute('href')).toBe('/');

    // ADR-0004 check: no element in SiteHeader contains "NHS"
    expect(homeLink.textContent).not.toContain('NHS');
    expect(homeLink.textContent).toBe('Know Your Wait');
  });
});

describe('RootLayout (T-8.4)', () => {
  test('renders html lang="en-GB", skip link to #main, header, main landmark, and footer', () => {
    const { container } = render(
      <RootLayout>
        <div data-testid="page-content">Hello World</div>
      </RootLayout>,
    );

    // Skip link exists and points to #main
    const skipLink = screen.getByRole('link', { name: /Skip to main content/i });
    expect(skipLink.getAttribute('href')).toBe('#main');

    // Main landmark with id="main"
    const main = container.querySelector('main#main');
    expect(main).not.toBeNull();
    expect(screen.getByTestId('page-content')).not.toBeNull();

    // Header and footer are present
    expect(container.querySelector('header')).not.toBeNull();
    expect(container.querySelector('footer')).not.toBeNull();
  });
});
