import { describe, expect, test } from 'vitest';
import {
  isDomainAllowed,
  scanHtmlContent,
  type ReferenceDataMap,
  type ScanOptions,
} from '../../scripts/scan-output';

const mockReferenceData: ReferenceDataMap = {
  england: {
    unitNames: ['University Hospitals Birmingham NHS Foundation Trust', 'Barts Health NHS Trust'],
    unitIds: ['england:RRK', 'RRK', 'england:R1H', 'R1H'],
  },
  wales: {
    unitNames: ['Betsi Cadwaladr University Health Board', 'Hywel Dda University Health Board'],
    unitIds: ['wales:7A1', '7A1', 'wales:7A2', '7A2'],
  },
  scotland: {
    unitNames: ['Golden Jubilee National Hospital', 'NHS Ayrshire and Arran', 'NHS Lothian'],
    unitIds: ['scotland:SB0801', 'SB0801', 'scotland:S08000015', 'S08000015'],
  },
};

const defaultTestOptions: ScanOptions = {
  referenceData: mockReferenceData,
};

const validFigureHtml = `
<!DOCTYPE html>
<html lang="en">
<head><title>Test Page</title></head>
<body>
  <h1>Test Page</h1>
  <figure data-figure data-figure-status="published">
    <p class="figure-statement">Half of people waiting had waited 14 weeks or less.</p>
    <figcaption>
      Official figures published by <time dateTime="2026-08-31">31 August 2026</time>
      <a href="https://www.england.nhs.uk/rtt">Source</a>
    </figcaption>
    <p>
      Published <time dateTime="2026-10-09">9 October 2026</time> by
      <a href="https://www.england.nhs.uk/rtt">NHS England</a>
    </p>
  </figure>
</body>
</html>
`;

describe('scan-output guard (T-10.3)', () => {
  describe('Rule 1: data-figure elements must be sourced and dated', () => {
    test('passes clean HTML with valid figure', () => {
      const violations = scanHtmlContent(
        'apps/site/out/england/t-and-o/rrk.html',
        validFigureHtml,
        defaultTestOptions,
      );
      expect(violations).toEqual([]);
    });

    test('fails when data-figure is missing caption', () => {
      const html = `
        <figure data-figure data-figure-status="published">
          <p>Half of people waited 14 weeks.</p>
          <p><time dateTime="2026-08-31">31 August 2026</time></p>
          <p><time dateTime="2026-10-09">9 October 2026</time></p>
          <a href="https://www.england.nhs.uk">Source</a>
        </figure>
      `;
      const violations = scanHtmlContent('out/england/test.html', html, defaultTestOptions);
      expect(violations.some((v) => v.kind === 'figure-missing-caption')).toBe(true);
    });

    test('fails when data-figure is missing time elements', () => {
      const html = `
        <figure data-figure data-figure-status="published">
          <p class="figure-statement">Some statement</p>
          <figcaption>Official figures published by August 2026</figcaption>
          <a href="https://www.england.nhs.uk">Source</a>
        </figure>
      `;
      const violations = scanHtmlContent('out/england/test.html', html, defaultTestOptions);
      expect(violations.some((v) => v.kind === 'figure-missing-reporting-period')).toBe(true);
      expect(violations.some((v) => v.kind === 'figure-missing-publication-date')).toBe(true);
    });

    test('fails when data-figure is missing source link', () => {
      const html = `
        <figure data-figure data-figure-status="published">
          <p class="figure-statement">Statement</p>
          <figcaption>Official figures published by <time dateTime="2026-08-31">31 August 2026</time></figcaption>
          <p>Published <time dateTime="2026-10-09">9 October 2026</time> by NHS England</p>
        </figure>
      `;
      const violations = scanHtmlContent('out/england/test.html', html, defaultTestOptions);
      expect(violations.some((v) => v.kind === 'figure-missing-source-link')).toBe(true);
    });
  });

  describe('Rule 2: Suppressed figures must have correct label and no numeric 0', () => {
    test('passes valid suppressed figure', () => {
      const html = `
        <figure data-figure data-figure-status="suppressed">
          <p class="figure-statement">Not published (small numbers)</p>
          <figcaption>Official figures published by <time dateTime="2026-08-31">31 August 2026</time> <a href="https://www.england.nhs.uk">Source</a></figcaption>
          <p>Published <time dateTime="2026-10-09">9 October 2026</time> by <a href="https://www.england.nhs.uk">NHS England</a></p>
        </figure>
      `;
      const violations = scanHtmlContent('out/england/test.html', html, defaultTestOptions);
      expect(violations).toEqual([]);
    });

    test('fails when suppressed figure does not contain the required label', () => {
      const html = `
        <figure data-figure data-figure-status="suppressed">
          <p class="figure-statement">Hidden data</p>
          <figcaption>Official figures published by <time dateTime="2026-08-31">31 August 2026</time> <a href="https://www.england.nhs.uk">Source</a></figcaption>
          <p>Published <time dateTime="2026-10-09">9 October 2026</time> by <a href="https://www.england.nhs.uk">NHS England</a></p>
        </figure>
      `;
      const violations = scanHtmlContent('out/england/test.html', html, defaultTestOptions);
      expect(violations.some((v) => v.kind === 'suppressed-invalid-label')).toBe(true);
    });

    test('fails when suppressed figure contains digit 0 as value', () => {
      const html = `
        <figure data-figure data-figure-status="suppressed">
          <p class="figure-statement">0 people waited</p>
          <figcaption>Official figures published by <time dateTime="2026-08-31">31 August 2026</time> <a href="https://www.england.nhs.uk">Source</a></figcaption>
          <p>Published <time dateTime="2026-10-09">9 October 2026</time> by <a href="https://www.england.nhs.uk">NHS England</a></p>
        </figure>
      `;
      const violations = scanHtmlContent('out/england/test.html', html, defaultTestOptions);
      expect(violations.some((v) => v.kind === 'suppressed-contains-zero')).toBe(true);
    });
  });

  describe('Rule 3: No banned avoid terms in visible text', () => {
    test('fails when visible text contains "average wait"', () => {
      const html = `
        <html><body><p>The average wait in this trust is 14 weeks.</p></body></html>
      `;
      const violations = scanHtmlContent('out/england/test.html', html, defaultTestOptions);
      expect(violations.some((v) => v.kind === 'avoid-term' && v.message.includes('average'))).toBe(
        true,
      );
    });

    test('fails when visible text contains "expected wait" or "52-week wait"', () => {
      const html = `
        <html><body><p>Your expected wait is 20 weeks with a 52-week wait standard.</p></body></html>
      `;
      const violations = scanHtmlContent('out/england/test.html', html, defaultTestOptions);
      expect(
        violations.some((v) => v.kind === 'avoid-term' && v.message.includes('expected wait')),
      ).toBe(true);
      expect(
        violations.some((v) => v.kind === 'avoid-term' && v.message.includes('52-week wait')),
      ).toBe(true);
    });

    test('ignores avoid terms inside script tags or json payloads', () => {
      const html = `
        <html>
          <head>
            <script type="application/json">{"banned": "average wait"}</script>
          </head>
          <body>
            <p>Know Your Wait provides clear information.</p>
          </body>
        </html>
      `;
      const violations = scanHtmlContent('out/england/test.html', html, defaultTestOptions);
      expect(violations.filter((v) => v.kind === 'avoid-term')).toEqual([]);
    });
  });

  describe('Rule 4: Cross-nation leak check', () => {
    test('fails when Wales reporting unit name appears on England page', () => {
      const html = `
        <html><body><h1>England Hospital</h1><p>See Betsi Cadwaladr University Health Board for details.</p></body></html>
      `;
      const violations = scanHtmlContent('out/england/test.html', html, defaultTestOptions);
      expect(violations.some((v) => v.kind === 'cross-nation-leak')).toBe(true);
    });

    test('fails when Scotland reporting unit name appears on England page', () => {
      const html = `
        <html><body><h1>England Hospital</h1><p>Referral from NHS Lothian accepted.</p></body></html>
      `;
      const violations = scanHtmlContent('out/england/test.html', html, defaultTestOptions);
      expect(violations.some((v) => v.kind === 'cross-nation-leak')).toBe(true);
    });

    test('fails when England reporting unit name appears on Wales page', () => {
      const html = `
        <html><body><h1>Wales Board</h1><p>Partnered with University Hospitals Birmingham NHS Foundation Trust.</p></body></html>
      `;
      const violations = scanHtmlContent('out/wales/test.html', html, defaultTestOptions);
      expect(violations.some((v) => v.kind === 'cross-nation-leak')).toBe(true);
    });
  });

  describe('Rule 5: No NHS logos or "NHS Wait Finder" name', () => {
    test('fails when img references nhs-logo', () => {
      const html = `
        <html><body><img src="/images/nhs-logo.png" alt="NHS Logo" /></body></html>
      `;
      const violations = scanHtmlContent('out/about.html', html, defaultTestOptions);
      expect(violations.some((v) => v.kind === 'banned-branding')).toBe(true);
    });

    test('fails when svg references nhs-blue lozenge', () => {
      const html = `
        <html><body><svg class="nhs-blue-lozenge"><circle></circle></svg></body></html>
      `;
      const violations = scanHtmlContent('out/about.html', html, defaultTestOptions);
      expect(violations.some((v) => v.kind === 'banned-branding')).toBe(true);
    });

    test('fails when text contains prohibited draft name "NHS Wait Finder"', () => {
      const html = `
        <html><body><p>Welcome to NHS Wait Finder.</p></body></html>
      `;
      const violations = scanHtmlContent('out/about.html', html, defaultTestOptions);
      expect(violations.some((v) => v.kind === 'banned-site-name')).toBe(true);
    });
  });

  describe('Rule 6: Outbound links allow-list', () => {
    test('isDomainAllowed correctly checks hostnames', () => {
      expect(isDomainAllowed('www.england.nhs.uk')).toBe(true);
      expect(isDomainAllowed('stats.gov.wales')).toBe(true);
      expect(isDomainAllowed('publichealthscotland.scot')).toBe(true);
      expect(isDomainAllowed('github.com')).toBe(true);
      expect(isDomainAllowed('raw.githubusercontent.com')).toBe(false);
      expect(isDomainAllowed('evil-site.com')).toBe(false);
      expect(isDomainAllowed('google.com')).toBe(false);
    });

    test('fails when HTML contains disallowed outbound link', () => {
      const html = `
        <html><body><a href="https://private-hospital.example.com/rates">Compare</a></body></html>
      `;
      const violations = scanHtmlContent('out/sources.html', html, defaultTestOptions);
      expect(violations.some((v) => v.kind === 'disallowed-outbound-link')).toBe(true);
    });

    test('passes internal relative links and anchor links', () => {
      const html = `
        <html><body>
          <a href="/england">England</a>
          <a href="#section-1">Jump</a>
          <a href="https://github.com/knowyourwait/know-your-wait">Repo</a>
          <a href="https://www.gov.wales/health">Gov Wales</a>
        </body></html>
      `;
      const violations = scanHtmlContent('out/about.html', html, defaultTestOptions);
      expect(violations).toEqual([]);
    });
  });
});
