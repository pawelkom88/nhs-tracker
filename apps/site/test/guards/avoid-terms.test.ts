import { describe, it, expect } from 'vitest';
import path from 'node:path';
import fs from 'node:fs';
import {
  parseGlossaryAvoidTerms,
  loadAllAvoidTerms,
  scanMessagesDirectory,
  scanContentDirectory,
  scanTextForAvoidTerms,
  FIXED_EXTRA_AVOID_TERMS,
} from './avoid-terms';

describe('T-8.16 — Wording guard tests: Avoid terms and required captions', () => {
  const repoRoot = path.resolve(__dirname, '../../../../');
  const glossaryPath = path.join(repoRoot, 'GLOSSARY.md');
  const messagesDir = path.resolve(__dirname, '../../messages');
  const contentDir = path.join(repoRoot, 'content');

  it('parses _Avoid_ terms from GLOSSARY.md', () => {
    expect(fs.existsSync(glossaryPath)).toBe(true);
    const glossaryText = fs.readFileSync(glossaryPath, 'utf8');
    const terms = parseGlossaryAvoidTerms(glossaryText);

    expect(terms.length).toBeGreaterThan(10);
    expect(terms).toContain('user nation');
    expect(terms).toContain('expected wait');
    expect(terms).toContain('estimated wait');
    expect(terms).toContain('52-week wait');
    expect(terms).toContain('private hospital');
  });

  it('combines GLOSSARY terms with fixed extras without duplicates', () => {
    const allTerms = loadAllAvoidTerms(glossaryPath);
    for (const extra of FIXED_EXTRA_AVOID_TERMS) {
      expect(allTerms).toContain(extra);
    }
  });

  it('scans all messages/**/*.json in apps/site and finds zero avoid-term violations', () => {
    const allTerms = loadAllAvoidTerms(glossaryPath);
    const violations = scanMessagesDirectory(messagesDir, { terms: allTerms });

    if (violations.length > 0) {
      const formatted = violations
        .map(
          (v) =>
            `- [${path.relative(repoRoot, v.file)}] key: "${v.key ?? ''}", term: "${v.term}"\n  text: "${v.matchedText}"`,
        )
        .join('\n');
      expect.fail(`Found avoid-term violations in message files:\n${formatted}`);
    }

    expect(violations).toHaveLength(0);
  });

  it('scans content/**/*.md if present and finds zero avoid-term violations', () => {
    const allTerms = loadAllAvoidTerms(glossaryPath);
    const violations = scanContentDirectory(contentDir, { terms: allTerms });

    if (violations.length > 0) {
      const formatted = violations
        .map(
          (v) =>
            `- [${path.relative(repoRoot, v.file)}] line ${String(v.line ?? '')}: term "${v.term}"\n  text: "${v.matchedText}"`,
        )
        .join('\n');
      expect.fail(`Found avoid-term violations in content files:\n${formatted}`);
    }

    expect(violations).toHaveLength(0);
  });

  it('fails with file + key + term when forbidden terms are present in text', () => {
    const dummyFile = '/dummy/messages/en/test.json';

    const testCases = [
      { text: 'The average wait was 12 weeks.', expectedTerm: 'average' },
      { text: 'Here is your expected wait for surgery.', expectedTerm: 'expected wait' },
      { text: 'Patients with a 52-week wait are prioritized.', expectedTerm: '52-week wait' },
      { text: 'Find hospitals near you.', expectedTerm: 'near you' },
      { text: 'This private hospital accepts referrals.', expectedTerm: 'private hospital' },
      { text: 'Rank of trusts by shortest wait.', expectedTerm: 'shortest wait' },
    ];

    for (const tc of testCases) {
      const violations = scanTextForAvoidTerms(
        tc.text,
        dummyFile,
        { key: 'testKey' },
        { terms: FIXED_EXTRA_AVOID_TERMS },
      );
      expect(violations.length).toBeGreaterThan(0);
      expect(violations[0]?.file).toBe(dummyFile);
      expect(violations[0]?.key).toBe('testKey');
      expect(violations[0]?.term).toBe(tc.expectedTerm);
    }
  });

  it('validates the fixed PRD caption and status message strings', () => {
    const figuresJsonPath = path.join(messagesDir, 'en/figures.json');
    const statusJsonPath = path.join(messagesDir, 'en/status.json');

    expect(fs.existsSync(figuresJsonPath)).toBe(true);
    expect(fs.existsSync(statusJsonPath)).toBe(true);

    const figuresJson = JSON.parse(fs.readFileSync(figuresJsonPath, 'utf8')) as Record<
      string,
      string
    >;
    const statusJson = JSON.parse(fs.readFileSync(statusJsonPath, 'utf8')) as Record<
      string,
      string
    >;

    // Fixed PRD caption check
    expect(figuresJson.caption).toBe(
      'This shows people already on the list as of {reportingPeriod}, from {source}. It is not a prediction of how long you will wait. Waits change month to month and depend on your clinical need.',
    );

    // Suppressed status check
    expect(statusJson.suppressed).toBe('Not published (small numbers)');
    expect(statusJson.provisional).toBe('Provisional');
    expect(statusJson.derived).toBe(
      'Calculated by Know Your Wait by adding published figures from the same release.',
    );
  });
});
