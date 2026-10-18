import * as fsp from 'node:fs/promises';
import * as path from 'node:path';
import { afterEach, describe, expect, test } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import React from 'react';
import { SpecialtyIntro } from '../../src/components/SpecialtyIntro';
import { contentDir, loadContentFile, type LoadedContent } from '../../src/content/load';
import type { SpecialtyFrontMatter } from '../../src/content/schema';

afterEach(() => {
  cleanup();
});

describe('SpecialtyIntro (T-9.3 / ADR-0002 / ADR-0006)', () => {
  test('renders nothing when content is undefined or null', () => {
    const { container: containerUndef } = render(<SpecialtyIntro />);
    expect(containerUndef.firstChild).toBeNull();

    const { container: containerNull } = render(<SpecialtyIntro content={null} />);
    expect(containerNull.firstChild).toBeNull();
  });

  test('renders nothing when status is placeholder', () => {
    const placeholderFixture: LoadedContent<SpecialtyFrontMatter> = {
      frontMatter: {
        kind: 'specialty',
        nation: 'england',
        specialtyId: 'england:C_110',
        summary: '',
        keywords: [],
        status: 'placeholder',
        sources: [],
      },
      html: '<h2>What this specialty covers</h2><p>Placeholder content</p>',
      isPlaceholder: true,
    };

    const { container } = render(<SpecialtyIntro content={placeholderFixture} />);
    expect(container.firstChild).toBeNull();
  });

  test('renders body HTML, Last reviewed date, and closing advice notice when status is reviewed', () => {
    const reviewedFixture: LoadedContent<SpecialtyFrontMatter> = {
      frontMatter: {
        kind: 'specialty',
        nation: 'england',
        specialtyId: 'england:C_110',
        summary: 'Trauma and orthopaedics covers bones and joints.',
        keywords: ['hip', 'knee'],
        status: 'reviewed',
        lastReviewed: '2026-10-01',
        reviewedBy: 'product-owner',
        sources: [
          {
            id: 'nhs-choice',
            title: 'Your choices in the NHS',
            url: 'https://www.nhs.uk/nhs-services/hospitals/your-choices-in-the-nhs/',
          },
        ],
      },
      html: '<h2>What this specialty covers</h2><p>Trauma and orthopaedic surgeons treat bones, joints, ligaments and tendons.</p>',
      isPlaceholder: false,
    };

    const { container } = render(<SpecialtyIntro content={reviewedFixture} />);

    const section = container.querySelector('section.specialty-intro');
    expect(section).not.toBeNull();
    expect(section?.getAttribute('aria-label')).toBe('Specialty overview and patient rights');

    // Body rendered from html
    const heading = screen.getByRole('heading', { level: 2 });
    expect(heading.textContent).toBe('What this specialty covers');
    expect(container.textContent).toContain(
      'Trauma and orthopaedic surgeons treat bones, joints, ligaments and tendons.',
    );

    // Last reviewed date
    expect(container.textContent).toContain('Last reviewed: 1 October 2026');

    // Closing disclaimer line
    expect(container.textContent).toContain(
      'This is not medical advice. Speak to your GP or care team about your own care.',
    );
  });

  test('renders body and closing advice without Last reviewed when lastReviewed is omitted in draft', () => {
    const draftFixture: LoadedContent<SpecialtyFrontMatter> = {
      frontMatter: {
        kind: 'specialty',
        nation: 'scotland',
        specialtyId: 'scotland:C8',
        summary: 'Bones and joints.',
        keywords: [],
        status: 'draft',
        sources: [],
      },
      html: '<h2>What this specialty covers</h2><p>Draft description for Scotland.</p>',
      isPlaceholder: false,
    };

    const { container } = render(<SpecialtyIntro content={draftFixture} />);

    expect(container.querySelector('section.specialty-intro')).not.toBeNull();
    expect(container.textContent).toContain('Draft description for Scotland.');
    expect(container.textContent).not.toContain('Last reviewed:');
    expect(container.textContent).toContain(
      'This is not medical advice. Speak to your GP or care team about your own care.',
    );
  });

  describe('Live Trauma & Orthopaedics content structure (T-9.3 / ADR-0002 / ADR-0006)', () => {
    const nations: readonly { nation: 'england' | 'wales' | 'scotland'; specialtyId: string }[] = [
      { nation: 'england', specialtyId: 'england:C_110' },
      { nation: 'wales', specialtyId: 'wales:110' },
      { nation: 'scotland', specialtyId: 'scotland:C8' },
    ];

    for (const { nation, specialtyId } of nations) {
      test(`verifies ${nation} T&O markdown file structure and placeholder rendering`, async () => {
        const filePath = path.join(
          contentDir(),
          nation,
          'specialties',
          'trauma-and-orthopaedics.md',
        );
        const raw = await fsp.readFile(filePath, 'utf-8');

        // Verify standard headings and comments exist
        expect(raw).toContain('## What this specialty covers');
        expect(raw).toContain(
          '<!-- PO: Describe clinical scope of Trauma & Orthopaedics in plain English',
        );
        expect(raw).toContain('## What the figures for this specialty include');
        expect(raw).toContain('## Related Patient Rights');
        expect(raw).toContain(
          `[your rights in ${nation.charAt(0).toUpperCase() + nation.slice(1)}](/${nation}/your-rights)`,
        );

        // Nation-specific nuances (ADR-0002 for Scotland)
        if (nation === 'scotland') {
          expect(raw).toContain('two distinct Wait Stages');
          expect(raw).toContain('Do not sum Wait Stages');
        }

        // Validate content loading
        const loaded = await loadContentFile<SpecialtyFrontMatter>(filePath, nation);
        expect(loaded.frontMatter.kind).toBe('specialty');
        expect(loaded.frontMatter.nation).toBe(nation);
        expect(loaded.frontMatter.specialtyId).toBe(specialtyId);
        expect(loaded.frontMatter.status).toBe('placeholder');
        expect(loaded.isPlaceholder).toBe(true);

        // SpecialtyIntro must render nothing when status is placeholder
        const { container } = render(<SpecialtyIntro content={loaded} />);
        expect(container.firstChild).toBeNull();
      });
    }
  });
});
