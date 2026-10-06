import { afterEach, describe, expect, test } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import React from 'react';
import HomePage from '../../src/app/page';

afterEach(() => {
  cleanup();
});

describe('HomePage (T-8.5)', () => {
  test('renders "Where do you live?" heading', () => {
    render(<HomePage />);

    const heading = screen.getByRole('heading', { level: 1, name: 'Where do you live?' });
    expect(heading).not.toBeNull();
  });

  test('renders three nation links in exact fixed order: England, Wales, Scotland', () => {
    const { container } = render(<HomePage />);

    const nav = container.querySelector('nav');
    expect(nav).not.toBeNull();
    if (!nav) throw new Error('nav not found');

    const links = nav.querySelectorAll('a');
    expect(links).toHaveLength(3);

    const linkData = Array.from(links).map((a) => ({
      text: a.textContent.trim(),
      href: a.getAttribute('href'),
    }));

    expect(linkData).toEqual([
      { text: 'England', href: '/england' },
      { text: 'Wales', href: '/wales' },
      { text: 'Scotland', href: '/scotland' },
    ]);
  });

  test('renders one-sentence product description', () => {
    render(<HomePage />);

    expect(
      screen.getByText(
        'Know Your Wait explains official NHS waiting-time statistics for England, Wales and Scotland in plain English.',
      ),
    ).not.toBeNull();
  });

  test('mentions Northern Ireland is not covered', () => {
    render(<HomePage />);

    expect(
      screen.getByText(
        'Know Your Wait covers England, Wales and Scotland. It does not cover Northern Ireland, Jersey, Guernsey or the Isle of Man.',
      ),
    ).not.toBeNull();
  });

  test('renders BorderNotice component on home page', () => {
    render(<HomePage />);

    const borderHeading = screen.getByRole('heading', {
      level: 2,
      name: 'Live near the border?',
    });
    expect(borderHeading).not.toBeNull();
  });
});
