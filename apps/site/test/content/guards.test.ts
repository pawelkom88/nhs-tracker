import { describe, it, expect } from 'vitest';
import * as fsp from 'node:fs/promises';
import * as path from 'node:path';
import * as os from 'node:os';
import {
  checkFreshness,
  checkFigureClaims,
  checkSourceReferenceLinks,
  checkLaunchContent,
  REQUIRED_LAUNCH_FILES,
} from '../../../../scripts/check-launch-content.js';
import type { EditorialFrontMatter } from '../../src/content/schema.js';

describe('Editorial Content Freshness Guard', () => {
  const asOfDate = new Date('2026-10-07T00:00:00.000Z');

  it('passes when reviewed within the last 183 days', () => {
    const frontMatter: EditorialFrontMatter = {
      kind: 'about-the-figures',
      nation: 'england',
      status: 'reviewed',
      lastReviewed: '2026-08-01', // ~67 days old
      reviewedBy: 'product-owner',
      sources: [],
    };

    const issue = checkFreshness(frontMatter, 'content/england/about-the-figures.md', asOfDate);
    expect(issue).toBeNull();
  });

  it('fails when lastReviewed is older than 183 days', () => {
    const frontMatter: EditorialFrontMatter = {
      kind: 'about-the-figures',
      nation: 'england',
      status: 'reviewed',
      lastReviewed: '2026-03-01', // ~220 days old (> 183)
      reviewedBy: 'product-owner',
      sources: [],
    };

    const issue = checkFreshness(frontMatter, 'content/england/about-the-figures.md', asOfDate);
    expect(issue).not.toBeNull();
    expect(issue?.severity).toBe('error');
    expect(issue?.message).toContain('exceeds maximum permitted age of 183 days');
  });

  it('ignores freshness on placeholder or draft content', () => {
    const placeholderFm: EditorialFrontMatter = {
      kind: 'about-the-figures',
      nation: 'england',
      status: 'placeholder',
      sources: [],
    };
    expect(
      checkFreshness(placeholderFm, 'content/england/about-the-figures.md', asOfDate),
    ).toBeNull();
  });
});

describe('Editorial Content Figure Claims Guard', () => {
  it('flags prohibited figure mentions in standard body text', () => {
    const samples = [
      'The current wait is 18 weeks long.',
      'Patients waiting over 52 weeks are counted.',
      'Around 92% of patients are seen on time.',
      'Around 92 percent of patients are seen.',
      'Over 45 days after referral.',
      'More than 500 people are waiting.',
      'Affecting 1,500 people each month.',
    ];

    for (const sample of samples) {
      const issues = checkFigureClaims(sample, 'test.md');
      expect(issues.length).toBeGreaterThan(0);
      expect(issues[0]?.severity).toBe('error');
      expect(issues[0]?.message).toContain('contains unauthorized figure claim');
    }
  });

  it('permits official figure quotes inside blockquotes', () => {
    const blockquoteText = `
Here is what the official standard states:

> "Patients have the legal right to start non-urgent consultant-led treatment within 18 weeks."
> The standard is that 92% of patients should wait no longer than 18 weeks.
`;
    const issues = checkFigureClaims(blockquoteText, 'test.md');
    expect(issues).toHaveLength(0);
  });

  it('permits figures inside markdown code blocks and ignores comments', () => {
    const codeBlockText = `
<!-- PO note: review target 18 weeks before next release -->
Some introductory text without figures.

\`\`\`yaml
waitingTarget: 18 weeks
compliance: 92%
\`\`\`
`;
    const issues = checkFigureClaims(codeBlockText, 'test.md');
    expect(issues).toHaveLength(0);
  });
});

describe('Editorial Content Source Reference Link Guard', () => {
  const sources = [
    {
      id: 'nhs-constitution',
      title: 'The NHS Constitution',
      url: 'https://www.gov.uk/government/publications/the-nhs-constitution-for-england',
    },
    {
      id: 'choice-framework',
      title: 'NHS Choice Framework',
      url: 'https://www.england.nhs.uk/choice/',
    },
  ];

  it('passes when all reference links match defined source IDs', () => {
    const markdown = `
Read about your rights in the [NHS Constitution][nhs-constitution] or the [Choice Framework][choice-framework].
You can also visit [direct external link](https://www.nhs.uk).
`;
    const issues = checkSourceReferenceLinks(markdown, sources, 'test.md');
    expect(issues).toHaveLength(0);
  });

  it('fails when a reference link refers to an unknown source ID', () => {
    const markdown = `
Read about your rights in [the handbook][unknown-source-id].
`;
    const issues = checkSourceReferenceLinks(markdown, sources, 'test.md');
    expect(issues).toHaveLength(1);
    expect(issues[0]?.message).toContain('references unknown source id "[unknown-source-id]"');
  });
});

describe('Live Repository Content Audit', () => {
  it('verifies all committed markdown files in content/ pass guards', () => {
    const repoContentDir = path.resolve(process.cwd(), 'content');
    const result = checkLaunchContent({
      contentDir: repoContentDir,
      freshnessOnly: true,
    });

    expect(result.errors).toEqual([]);
    expect(result.totalFilesChecked).toBeGreaterThan(0);
  });
});

describe('Launch Gate Script Verification', () => {
  it('identifies required launch files that are not yet reviewed in current repo', () => {
    const result = checkLaunchContent();
    expect(result.ok).toBe(false);

    // All required explainers and T&O files should be listed as not yet reviewed
    expect(REQUIRED_LAUNCH_FILES).toHaveLength(9);
    for (const req of REQUIRED_LAUNCH_FILES) {
      const match = result.errors.find((e) => e.filePath.includes(req.relativePath));
      expect(match).toBeDefined();
      expect(match?.message).toContain('launch gate requires status="reviewed"');
    }
  });

  it('passes launch gate when all required content files are reviewed and fresh in a fixture directory', async () => {
    const tmpDir = await fsp.mkdtemp(path.join(os.tmpdir(), 'kyw-launch-gate-test-'));

    try {
      // Create required structure in tmpDir
      for (const req of REQUIRED_LAUNCH_FILES) {
        const fullPath = path.join(tmpDir, req.relativePath);
        await fsp.mkdir(path.dirname(fullPath), { recursive: true });

        const isSpecialty = req.relativePath.includes('specialties');
        const specialtyExtra = isSpecialty
          ? `specialtyId: ${req.nation}:C_110\nsummary: "Trauma and orthopaedics summary."\nkeywords: ["hip", "knee"]\n`
          : '';

        const fileContent = `---
kind: ${isSpecialty ? 'specialty' : path.basename(req.relativePath, '.md')}
nation: ${req.nation}
${specialtyExtra}status: reviewed
lastReviewed: '2026-10-01'
reviewedBy: product-owner
sources:
  - id: official-guide
    title: Official Waiting Times Guide
    url: https://www.england.nhs.uk/guide/
---

## Official overview

See [official guide][official-guide] for details.

> "Patients have the right to start treatment within 18 weeks."
`;
        await fsp.writeFile(fullPath, fileContent, 'utf-8');
      }

      const result = checkLaunchContent({
        contentDir: tmpDir,
        freshnessOnly: false,
        asOfDate: new Date('2026-10-07T00:00:00.000Z'),
      });

      expect(result.errors).toEqual([]);
      expect(result.ok).toBe(true);
      expect(result.reviewedFilesCount).toBe(9);
    } finally {
      await fsp.rm(tmpDir, { recursive: true, force: true });
    }
  });
});
