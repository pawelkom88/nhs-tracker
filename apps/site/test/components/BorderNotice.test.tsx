import { afterEach, describe, expect, test } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import React from 'react';
import { BorderNotice } from '../../src/components/BorderNotice';

afterEach(() => {
  cleanup();
});

describe('BorderNotice (T-8.5 / ADR-0001)', () => {
  test('renders semantic aside landmark with aria-labelledby matching heading id', () => {
    const { container } = render(<BorderNotice />);

    const aside = container.querySelector('aside');
    expect(aside).not.toBeNull();
    expect(aside?.getAttribute('aria-labelledby')).toBe('border-notice-title');

    const heading = container.querySelector('h2#border-notice-title');
    expect(heading).not.toBeNull();
    expect(heading?.textContent).toBe('Live near the border?');
  });

  test('renders exact PRD body text verbatim', () => {
    const { container } = render(<BorderNotice />);

    const expectedBody =
      "Your NHS care usually follows where your GP practice is. If you live near a border, check each nation's pages separately and talk to your GP.";

    const bodyParagraph = container.querySelector('aside p');
    expect(bodyParagraph?.textContent).toBe(expectedBody);
  });

  test('links to other two nations when current nation is wales', () => {
    render(<BorderNotice current="wales" />);

    const links = screen.getAllByRole('link');
    const hrefs = links.map((link) => link.getAttribute('href'));

    expect(hrefs).toEqual(['/england', '/scotland']);
    expect(hrefs).not.toContain('/wales');
  });

  test('links to other two nations when current nation is england', () => {
    render(<BorderNotice current="england" />);

    const links = screen.getAllByRole('link');
    const hrefs = links.map((link) => link.getAttribute('href'));

    expect(hrefs).toEqual(['/wales', '/scotland']);
    expect(hrefs).not.toContain('/england');
  });

  test('links to other two nations when current nation is scotland', () => {
    render(<BorderNotice current="scotland" />);

    const links = screen.getAllByRole('link');
    const hrefs = links.map((link) => link.getAttribute('href'));

    expect(hrefs).toEqual(['/england', '/wales']);
    expect(hrefs).not.toContain('/scotland');
  });

  test('links to all three nations in fixed order when current nation is omitted', () => {
    render(<BorderNotice />);

    const links = screen.getAllByRole('link');
    const hrefs = links.map((link) => link.getAttribute('href'));

    expect(hrefs).toEqual(['/england', '/wales', '/scotland']);
  });

  test('contains no digits in rendered output', () => {
    const { container } = render(<BorderNotice current="wales" />);
    const text = container.textContent;

    expect(text).not.toMatch(/\d/);
  });
});
