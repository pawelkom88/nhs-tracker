import { afterEach, describe, expect, test } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import React from 'react';
import EnglandAboutTheFiguresPage from '../../src/app/england/about-the-figures/page.js';
import EnglandYourRightsPage from '../../src/app/england/your-rights/page.js';
import WalesAboutTheFiguresPage from '../../src/app/wales/about-the-figures/page.js';
import WalesYourRightsPage from '../../src/app/wales/your-rights/page.js';
import ScotlandAboutTheFiguresPage from '../../src/app/scotland/about-the-figures/page.js';
import ScotlandYourRightsPage from '../../src/app/scotland/your-rights/page.js';
import { ExplainerPage } from '../../src/components/ExplainerPage.js';
import type { LoadedContent } from '../../src/content/load.js';
import type { AboutTheFiguresFrontMatter } from '../../src/content/schema.js';

afterEach(() => {
  cleanup();
});

describe('Explainer pages (T-9.4)', () => {
  describe('Route pages', () => {
    test('renders England "About the figures" page', async () => {
      const page = await EnglandAboutTheFiguresPage();
      render(page);

      expect(
        screen.getByRole('heading', { level: 1, name: 'About the figures: England' }),
      ).not.toBeNull();
      expect(
        screen.getByText(
          'This page is being written. The sections below outline what will be covered.',
        ),
      ).not.toBeNull();
      expect(
        screen.getByText(
          'This is not medical advice. Speak to your GP or care team about your own care.',
        ),
      ).not.toBeNull();
      expect(
        screen.getByRole('heading', { level: 2, name: "What 'people already waiting' means" }),
      ).not.toBeNull();
      // Border notice exists
      expect(
        screen.getByRole('heading', { level: 2, name: 'Live near the border?' }),
      ).not.toBeNull();
    });

    test('renders England "Your rights" page', async () => {
      const page = await EnglandYourRightsPage();
      render(page);

      expect(
        screen.getByRole('heading', { level: 1, name: 'Your rights: England' }),
      ).not.toBeNull();
      expect(
        screen.getByText(
          'This is not medical advice. Speak to your GP or care team about your own care.',
        ),
      ).not.toBeNull();
      expect(screen.getByRole('heading', { level: 2, name: 'How referral works' })).not.toBeNull();
      expect(
        screen.getByRole('heading', { level: 2, name: 'Patient Rights in England' }),
      ).not.toBeNull();
    });

    test('renders Wales "About the figures" page', async () => {
      const page = await WalesAboutTheFiguresPage();
      render(page);

      expect(
        screen.getByRole('heading', { level: 1, name: 'About the figures: Wales' }),
      ).not.toBeNull();
      expect(
        screen.getByText(
          'This is not medical advice. Speak to your GP or care team about your own care.',
        ),
      ).not.toBeNull();
      expect(
        screen.getByRole('heading', { level: 2, name: 'The Waiting Standard in Wales' }),
      ).not.toBeNull();
    });

    test('renders Wales "Your rights" page', async () => {
      const page = await WalesYourRightsPage();
      render(page);

      expect(screen.getByRole('heading', { level: 1, name: 'Your rights: Wales' })).not.toBeNull();
      expect(
        screen.getByText(
          'This is not medical advice. Speak to your GP or care team about your own care.',
        ),
      ).not.toBeNull();
      expect(
        screen.getByRole('heading', { level: 2, name: 'Patient Rights in Wales' }),
      ).not.toBeNull();
    });

    test('renders Scotland "About the figures" page', async () => {
      const page = await ScotlandAboutTheFiguresPage();
      render(page);

      expect(
        screen.getByRole('heading', { level: 1, name: 'About the figures: Scotland' }),
      ).not.toBeNull();
      expect(
        screen.getByText(
          'This is not medical advice. Speak to your GP or care team about your own care.',
        ),
      ).not.toBeNull();
      expect(
        screen.getByRole('heading', { level: 2, name: 'Two separate wait stages in Scotland' }),
      ).not.toBeNull();
      expect(
        screen.getByRole('heading', { level: 2, name: 'The Waiting Standards in Scotland' }),
      ).not.toBeNull();
    });

    test('renders Scotland "Your rights" page', async () => {
      const page = await ScotlandYourRightsPage();
      render(page);

      expect(
        screen.getByRole('heading', { level: 1, name: 'Your rights: Scotland' }),
      ).not.toBeNull();
      expect(
        screen.getByText(
          'This is not medical advice. Speak to your GP or care team about your own care.',
        ),
      ).not.toBeNull();
      expect(
        screen.getByRole('heading', { level: 2, name: 'Patient Rights in Scotland' }),
      ).not.toBeNull();
    });
  });

  describe('ExplainerPage component', () => {
    test('does not show last reviewed when status is placeholder', () => {
      const mockPlaceholderContent: LoadedContent<AboutTheFiguresFrontMatter> = {
        frontMatter: {
          kind: 'about-the-figures',
          nation: 'england',
          status: 'placeholder',
          sources: [],
        },
        html: '<h2>Test Heading</h2><p>Placeholder paragraph</p>',
        isPlaceholder: true,
      };

      render(<ExplainerPage title="Test Title" content={mockPlaceholderContent} />);

      expect(screen.queryByText(/Last reviewed:/)).toBeNull();
      expect(
        screen.getByText(
          'This page is being written. The sections below outline what will be covered.',
        ),
      ).not.toBeNull();
      expect(screen.getByText('Placeholder paragraph')).not.toBeNull();
      expect(
        screen.getByText(
          'This is not medical advice. Speak to your GP or care team about your own care.',
        ),
      ).not.toBeNull();
    });

    test('renders last reviewed and sources links when reviewed', () => {
      const mockReviewedContent: LoadedContent<AboutTheFiguresFrontMatter> = {
        frontMatter: {
          kind: 'about-the-figures',
          nation: 'england',
          status: 'reviewed',
          lastReviewed: '2026-10-01',
          reviewedBy: 'product-owner',
          sources: [
            {
              id: 'official-stats',
              title: 'NHS England Statistical Release',
              url: 'https://england.nhs.uk/statistics/rtt',
            },
          ],
        },
        html: '<p>Reviewed content body.</p>',
        isPlaceholder: false,
      };

      render(<ExplainerPage title="Reviewed Title" content={mockReviewedContent} />);

      expect(screen.getByText('Last reviewed: 1 October 2026')).not.toBeNull();
      expect(
        screen.queryByText(
          'This page is being written. The sections below outline what will be covered.',
        ),
      ).toBeNull();
      expect(screen.getByRole('heading', { level: 2, name: 'Sources' })).not.toBeNull();

      const sourceLink = screen.getByRole('link', { name: 'NHS England Statistical Release' });
      expect(sourceLink.getAttribute('href')).toBe('https://england.nhs.uk/statistics/rtt');
    });
  });
});
