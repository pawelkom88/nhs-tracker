import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fsp from 'node:fs/promises';
import * as path from 'node:path';
import * as os from 'node:os';
import {
  validateFrontMatter,
  SourceSchema,
  isAllowedSourceHostname,
} from '../../src/content/schema.js';
import {
  renderMarkdownToHtml,
  validateFigureClaims,
  ContentRenderError,
} from '../../src/content/render.js';
import { getExplainer, getSpecialtyContent } from '../../src/content/load.js';

describe('Editorial Content Schema & Source Validation', () => {
  it('allows valid official source hostnames and subdomains', () => {
    expect(isAllowedSourceHostname('nhs.uk')).toBe(true);
    expect(isAllowedSourceHostname('www.nhs.uk')).toBe(true);
    expect(isAllowedSourceHostname('england.nhs.uk')).toBe(true);
    expect(isAllowedSourceHostname('sub.england.nhs.uk')).toBe(true);
    expect(isAllowedSourceHostname('gov.uk')).toBe(true);
    expect(isAllowedSourceHostname('www.gov.uk')).toBe(true);
    expect(isAllowedSourceHostname('legislation.gov.uk')).toBe(true);
    expect(isAllowedSourceHostname('gov.wales')).toBe(true);
    expect(isAllowedSourceHostname('nhs.wales')).toBe(true);
    expect(isAllowedSourceHostname('llaiswales.org')).toBe(true);
    expect(isAllowedSourceHostname('www.llaiswales.org')).toBe(true);
    expect(isAllowedSourceHostname('nhs.scot')).toBe(true);
    expect(isAllowedSourceHostname('nhsinform.scot')).toBe(true);
    expect(isAllowedSourceHostname('www.nhsinform.scot')).toBe(true);
    expect(isAllowedSourceHostname('pass-scotland.org.uk')).toBe(true);
    expect(isAllowedSourceHostname('statswales.gov.wales')).toBe(true);
  });

  it('rejects unauthorized or commercial source hostnames', () => {
    expect(isAllowedSourceHostname('google.com')).toBe(false);
    expect(isAllowedSourceHostname('evil-nhs.uk.attacker.com')).toBe(false);
    expect(isAllowedSourceHostname('privatehealth.co.uk')).toBe(false);
    expect(isAllowedSourceHostname('wikipedia.org')).toBe(false);
  });

  it('validates source schema strictly', () => {
    const validSource = {
      id: 'nhs-choice',
      title: 'Your choices in the NHS',
      url: 'https://www.nhs.uk/conditions/consent-to-treatment/',
    };
    expect(SourceSchema.parse(validSource)).toEqual(validSource);

    // Reject non-HTTPS
    expect(() => {
      SourceSchema.parse({
        id: 'insecure',
        title: 'Insecure site',
        url: 'http://www.nhs.uk/something',
      });
    }).toThrow();

    // Reject unapproved domain
    expect(() => {
      SourceSchema.parse({
        id: 'unapproved',
        title: 'Unapproved site',
        url: 'https://example.com/health',
      });
    }).toThrow();
  });

  it('validates placeholder front matter', () => {
    const fm = {
      kind: 'about-the-figures',
      nation: 'england',
      status: 'placeholder',
    };
    const parsed = validateFrontMatter(fm, 'england');
    expect(parsed.status).toBe('placeholder');
    expect(parsed.sources).toEqual([]);
  });

  it('requires lastReviewed and reviewedBy when status is reviewed', () => {
    const invalidReviewed = {
      kind: 'your-rights',
      nation: 'wales',
      status: 'reviewed',
    };
    expect(() => {
      validateFrontMatter(invalidReviewed, 'wales');
    }).toThrow(/lastReviewed is required when status is "reviewed"/);

    const validReviewed = {
      kind: 'your-rights',
      nation: 'wales',
      status: 'reviewed',
      lastReviewed: '2026-10-01',
      reviewedBy: 'product-owner',
      sources: [
        {
          id: 'wales-rights',
          title: 'NHS Wales waiting times',
          url: 'https://gov.wales/nhs-waiting-times',
        },
      ],
    };
    expect(validateFrontMatter(validReviewed, 'wales')).toEqual(validReviewed);
  });

  it('rejects mismatch between front matter nation and folder nation', () => {
    const fm = {
      kind: 'about-the-figures',
      nation: 'scotland',
      status: 'placeholder',
    };
    expect(() => {
      validateFrontMatter(fm, 'england');
    }).toThrow(/Content front matter nation "scotland" does not match folder nation "england"/);
  });

  it('validates specialty front matter and enforces nation prefix on specialtyId', () => {
    const validSpecialty = {
      kind: 'specialty',
      nation: 'england',
      specialtyId: 'england:C_110',
      summary: 'Trauma & Orthopaedics deals with bones and joints.',
      keywords: ['hip', 'knee'],
      status: 'placeholder',
    };
    expect(validateFrontMatter(validSpecialty, 'england')).toEqual({
      ...validSpecialty,
      sources: [],
    });

    const invalidSpecialty = {
      kind: 'specialty',
      nation: 'england',
      specialtyId: 'scotland:C_110',
      summary: 'Trauma & Orthopaedics',
      status: 'placeholder',
    };
    expect(() => {
      validateFrontMatter(invalidSpecialty, 'england');
    }).toThrow(/specialtyId "scotland:C_110" must start with nation prefix "england:"/);
  });
});

describe('Editorial Markdown Rendering & Sanitization', () => {
  it('renders markdown to sanitized HTML with resolved source reference links', async () => {
    const md = 'Read more about [patient rights][nhs-choice] in England.';
    const sources = [
      {
        id: 'nhs-choice',
        title: 'NHS Choice Framework',
        url: 'https://www.england.nhs.uk/choice/',
      },
    ];

    const html = await renderMarkdownToHtml(md, sources);
    expect(html).toContain(
      '<p>Read more about <a href="https://www.england.nhs.uk/choice/" title="NHS Choice Framework">patient rights</a> in England.</p>',
    );
    expect(html).not.toContain('target=');
  });

  it('rejects raw script tags in markdown content', async () => {
    const maliciousMd = 'Text before <script>alert("hack")</script> text after';
    await expect(renderMarkdownToHtml(maliciousMd)).rejects.toThrow(ContentRenderError);
    await expect(renderMarkdownToHtml(maliciousMd)).rejects.toThrow(
      /Raw <script> tags are strictly forbidden/,
    );
  });

  it('rejects raw embed and iframe elements in markdown content', async () => {
    const iframeMd = 'Content with <iframe src="https://attacker.com"></iframe>';
    await expect(renderMarkdownToHtml(iframeMd)).rejects.toThrow(ContentRenderError);
  });

  it('rejects unauthorized figure claims outside blockquotes', () => {
    const invalidFigures = [
      'The wait is 18 weeks long.',
      'Waits of 52 weeks or more.',
      'Around 92% of patients are seen.',
      'It takes 45 days to complete.',
    ];

    for (const text of invalidFigures) {
      expect(() => {
        validateFigureClaims(text);
      }).toThrow(ContentRenderError);
    }
  });

  it('permits official figure standards inside blockquotes', async () => {
    const quotedMd = `
Here is what the official standard states:

> "Patients have the legal right to start non-urgent consultant-led treatment within 18 weeks."
`;
    expect(() => {
      validateFigureClaims(quotedMd);
    }).not.toThrow();
    const html = await renderMarkdownToHtml(quotedMd);
    expect(html).toContain('<blockquote>');
    expect(html).toContain('18 weeks');
  });
});

describe('Editorial Content File Loader', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fsp.mkdtemp(path.join(os.tmpdir(), 'kyw-content-test-'));
    process.env.KYW_CONTENT_DIR = tmpDir;
  });

  afterEach(async () => {
    delete process.env.KYW_CONTENT_DIR;
    await fsp.rm(tmpDir, { recursive: true, force: true });
  });

  it('loads and validates an explainer file', async () => {
    const englandDir = path.join(tmpDir, 'england');
    await fsp.mkdir(englandDir, { recursive: true });

    const content = `---
kind: about-the-figures
nation: england
status: reviewed
lastReviewed: '2026-10-01'
reviewedBy: product-owner
sources:
  - id: rtt-guide
    title: RTT Waiting Times Guide
    url: https://www.england.nhs.uk/rtt/
---

This page explains waiting times in England. See [RTT guide][rtt-guide].
`;
    const filePath = path.join(englandDir, 'about-the-figures.md');
    await fsp.writeFile(filePath, content, 'utf-8');

    const loaded = await getExplainer('england', 'about-the-figures');
    expect(loaded.isPlaceholder).toBe(false);
    expect(loaded.frontMatter.kind).toBe('about-the-figures');
    expect(loaded.frontMatter.nation).toBe('england');
    expect(loaded.html).toContain('href="https://www.england.nhs.uk/rtt/"');
  });

  it('loads a specialty content file by specialtyId', async () => {
    const specialtiesDir = path.join(tmpDir, 'scotland', 'specialties');
    await fsp.mkdir(specialtiesDir, { recursive: true });

    const content = `---
kind: specialty
nation: scotland
specialtyId: scotland:C8
summary: Trauma and orthopaedic surgery in NHS Scotland.
keywords:
  - orthopaedics
  - joints
status: placeholder
---

# Trauma and Orthopaedics
`;
    await fsp.writeFile(path.join(specialtiesDir, 'trauma-and-orthopaedics.md'), content, 'utf-8');

    const loaded = await getSpecialtyContent('scotland', 'scotland:C8');
    expect(loaded).not.toBeNull();
    expect(loaded?.isPlaceholder).toBe(true);
    expect(loaded?.frontMatter.specialtyId).toBe('scotland:C8');
    expect(loaded?.html).toContain('<h1>Trauma and Orthopaedics</h1>');
  });

  it('returns null when specialty content does not exist', async () => {
    const loaded = await getSpecialtyContent('wales', 'wales:NON_EXISTENT');
    expect(loaded).toBeNull();
  });
});
