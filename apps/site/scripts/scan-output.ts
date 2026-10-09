/* eslint-disable no-console */
import fs from 'node:fs';
import path from 'node:path';
import { parse } from 'node-html-parser';
import { loadAllAvoidTerms, scanTextForAvoidTerms } from '../test/guards/avoid-terms';

export type ViolationKind =
  | 'figure-missing-caption'
  | 'figure-missing-reporting-period'
  | 'figure-missing-publication-date'
  | 'figure-missing-source-link'
  | 'suppressed-invalid-label'
  | 'suppressed-contains-zero'
  | 'avoid-term'
  | 'cross-nation-leak'
  | 'banned-branding'
  | 'banned-site-name'
  | 'disallowed-outbound-link';

export interface OutputViolation {
  file: string;
  kind: ViolationKind;
  message: string;
  matchedText?: string;
  elementHtml?: string;
}

export interface NationReferenceUnits {
  unitNames: string[];
  unitIds: string[];
}

export interface ReferenceDataMap {
  england: NationReferenceUnits;
  wales: NationReferenceUnits;
  scotland: NationReferenceUnits;
}

export interface ScanOptions {
  avoidTerms?: readonly string[] | string[];
  allowedOutboundDomains?: readonly string[] | string[];
  referenceData?: ReferenceDataMap;
  referenceDataDir?: string;
}

export const DEFAULT_ALLOWED_OUTBOUND_DOMAINS: readonly string[] = [
  'gov.uk',
  'nhs.uk',
  'gov.wales',
  'nhs.scot',
  'nhsinform.scot',
  'publichealthscotland.scot',
  'nationalarchives.gov.uk',
  'github.com',
  'cloudflareinsights.com',
];

export function isDomainAllowed(
  hostname: string,
  allowedDomains: readonly string[] = DEFAULT_ALLOWED_OUTBOUND_DOMAINS,
): boolean {
  const normalizedHost = hostname.toLowerCase();
  return allowedDomains.some((domain) => {
    const normDomain = domain.toLowerCase();
    return normalizedHost === normDomain || normalizedHost.endsWith(`.${normDomain}`);
  });
}

/**
 * Loads reference data for cross-nation leak checks.
 */
export function loadReferenceUnits(customDataDir?: string): ReferenceDataMap {
  const nations = ['england', 'wales', 'scotland'] as const;
  const result: ReferenceDataMap = {
    england: { unitNames: [], unitIds: [] },
    wales: { unitNames: [], unitIds: [] },
    scotland: { unitNames: [], unitIds: [] },
  };

  const possibleDirs = [
    customDataDir,
    path.resolve(process.cwd(), 'data'),
    path.resolve(process.cwd(), 'apps/site/test/fixtures/data'),
    path.resolve(process.cwd(), 'test/fixtures/data'),
    path.resolve(process.cwd(), '../../data'),
  ].filter(Boolean) as string[];

  for (const nation of nations) {
    for (const dir of possibleDirs) {
      const refPath = path.join(dir, nation, 'reference.json');
      if (fs.existsSync(refPath)) {
        try {
          const content = JSON.parse(fs.readFileSync(refPath, 'utf8')) as {
            reportingUnits?: {
              id?: string;
              officialCode?: string;
              displayName?: string;
              officialName?: string;
            }[];
          };
          if (Array.isArray(content.reportingUnits)) {
            const names = new Set<string>();
            const ids = new Set<string>();

            for (const unit of content.reportingUnits) {
              if (unit.displayName && unit.displayName.trim().length > 3) {
                names.add(unit.displayName.trim());
              }
              if (unit.officialName && unit.officialName.trim().length > 3) {
                names.add(unit.officialName.trim());
              }
              if (unit.id) {
                ids.add(unit.id);
                // Also add unqualified ID part e.g. "RRK" from "england:RRK"
                const parts = unit.id.split(':');
                if (parts[1] && parts[1].length >= 3) {
                  ids.add(parts[1]);
                }
              }
              if (unit.officialCode && unit.officialCode.length >= 3) {
                ids.add(unit.officialCode);
              }
            }

            result[nation].unitNames = Array.from(names);
            result[nation].unitIds = Array.from(ids);
            break;
          }
        } catch {
          // ignore parsing error and continue
        }
      }
    }
  }

  return result;
}

/**
 * Scans a single HTML document string and asserts all built-output guards.
 */
export function scanHtmlContent(
  filePath: string,
  html: string,
  options?: ScanOptions,
): OutputViolation[] {
  const violations: OutputViolation[] = [];
  const root = parse(html);

  const avoidTerms = options?.avoidTerms ?? loadAllAvoidTerms();
  const allowedDomains = options?.allowedOutboundDomains ?? DEFAULT_ALLOWED_OUTBOUND_DOMAINS;
  const referenceData = options?.referenceData ?? loadReferenceUnits(options?.referenceDataDir);

  // 1. Check every element marked data-figure
  const figures = root.querySelectorAll('[data-figure]');
  for (const figure of figures) {
    const figureHtml = figure.outerHTML;
    const timeElements = figure.querySelectorAll('time');
    const links = figure.querySelectorAll('a');
    const figcaption = figure.querySelector('figcaption');
    const status = figure.getAttribute('data-figure-status');

    // Must contain caption
    if (!figcaption && !figure.text.includes('Official figures published by')) {
      violations.push({
        file: filePath,
        kind: 'figure-missing-caption',
        message: 'Element marked data-figure is missing a caption or figcaption.',
        elementHtml: figureHtml,
      });
    }

    // Must contain at least two time elements (one for Reporting Period, one for Publication Date)
    const validTimes = timeElements.filter((t) => Boolean(t.getAttribute('dateTime')));
    if (validTimes.length < 2) {
      if (validTimes.length === 0) {
        violations.push({
          file: filePath,
          kind: 'figure-missing-reporting-period',
          message: 'Element marked data-figure is missing a time element for Reporting Period.',
          elementHtml: figureHtml,
        });
        violations.push({
          file: filePath,
          kind: 'figure-missing-publication-date',
          message: 'Element marked data-figure is missing a time element for Publication Date.',
          elementHtml: figureHtml,
        });
      } else {
        violations.push({
          file: filePath,
          kind: 'figure-missing-publication-date',
          message:
            'Element marked data-figure must contain distinct time elements for both Reporting Period and Publication Date.',
          elementHtml: figureHtml,
        });
      }
    }

    // Must contain source link
    const hasSourceLink = links.some((a) => Boolean(a.getAttribute('href')));
    if (!hasSourceLink) {
      violations.push({
        file: filePath,
        kind: 'figure-missing-source-link',
        message: 'Element marked data-figure is missing an official source link.',
        elementHtml: figureHtml,
      });
    }

    // 2. Suppressed figure checks
    if (status === 'suppressed') {
      const statement = figure.querySelector('.figure-statement');
      const statementText = statement ? statement.text : figure.text;

      if (!statementText.includes('Not published (small numbers)')) {
        violations.push({
          file: filePath,
          kind: 'suppressed-invalid-label',
          message:
            'Suppressed figure element does not contain the required "Not published (small numbers)" label.',
          matchedText: statementText,
          elementHtml: figureHtml,
        });
      }

      // Must not contain numeric 0 as value in statement
      if (/\b0\b/.test(statementText) && !statementText.includes('Not published (small numbers)')) {
        violations.push({
          file: filePath,
          kind: 'suppressed-contains-zero',
          message: 'Suppressed figure contains digit 0 as a numeric value.',
          matchedText: statementText,
          elementHtml: figureHtml,
        });
      }
    }
  }

  // 3. No banned terms from T-8.16 in visible text
  // Clone AST and remove non-visible tags
  const cleanRoot = parse(html);
  cleanRoot.querySelectorAll('script, style, noscript, svg').forEach((el) => el.remove());
  const bodyElement = cleanRoot.querySelector('body') ?? cleanRoot;
  const visibleText = bodyElement.text;

  const lines = visibleText.split('\n');
  lines.forEach((lineText) => {
    const textViolations = scanTextForAvoidTerms(lineText, filePath, {}, { terms: avoidTerms });
    for (const v of textViolations) {
      violations.push({
        file: filePath,
        kind: 'avoid-term',
        message: `Visible text contains banned term: "${v.term}"`,
        matchedText: v.matchedText,
      });
    }
  });

  // 4. Cross-nation leak check using reference data
  const normalizedPath = filePath.replace(/\\/g, '/');
  const isEnglandPage =
    normalizedPath.includes('/england/') || normalizedPath.endsWith('/england.html');
  const isWalesPage = normalizedPath.includes('/wales/') || normalizedPath.endsWith('/wales.html');
  const isScotlandPage =
    normalizedPath.includes('/scotland/') || normalizedPath.endsWith('/scotland.html');

  const checkLeaks = (otherNation: 'england' | 'wales' | 'scotland') => {
    const otherUnits = referenceData[otherNation];
    for (const name of otherUnits.unitNames) {
      if (visibleText.includes(name)) {
        violations.push({
          file: filePath,
          kind: 'cross-nation-leak',
          message: `Cross-nation leak: ${otherNation} reporting unit "${name}" found on page ${filePath}`,
          matchedText: name,
        });
      }
    }
    for (const id of otherUnits.unitIds) {
      // Check full IDs like "wales:7A1" or path references
      if (
        visibleText.includes(id) ||
        (html.includes(`/${otherNation}/`) && !html.includes(`/link`))
      ) {
        // Only trigger on distinct id match in content
        const idRegex = new RegExp(`\\b${id}\\b`);
        if (idRegex.test(visibleText) && id.length > 4) {
          violations.push({
            file: filePath,
            kind: 'cross-nation-leak',
            message: `Cross-nation leak: ${otherNation} reporting unit ID "${id}" found on page ${filePath}`,
            matchedText: id,
          });
        }
      }
    }
  };

  if (isEnglandPage) {
    checkLeaks('wales');
    checkLeaks('scotland');
  } else if (isWalesPage) {
    checkLeaks('england');
    checkLeaks('scotland');
  } else if (isScotlandPage) {
    checkLeaks('england');
    checkLeaks('wales');
  }

  function hasBannedBranding(attrText: string): boolean {
    const normalized = attrText.toLowerCase().replace(/[-_]/g, ' ');
    return (
      normalized.includes('nhs logo') ||
      normalized.includes('nhslogo') ||
      normalized.includes('nhs blue') ||
      normalized.includes('nhs lozenge')
    );
  }

  // 5. No <img> or <svg> referencing NHS logos; no text "NHS Wait Finder"
  const images = root.querySelectorAll('img');
  for (const img of images) {
    const src = img.getAttribute('src') ?? '';
    const alt = img.getAttribute('alt') ?? '';
    const className = img.getAttribute('class') ?? '';
    const id = img.getAttribute('id') ?? '';
    const combined = `${src} ${alt} ${className} ${id}`;
    if (hasBannedBranding(combined)) {
      violations.push({
        file: filePath,
        kind: 'banned-branding',
        message: 'Image element references prohibited NHS logo or branding.',
        elementHtml: img.outerHTML,
      });
    }
  }

  const svgs = root.querySelectorAll('svg');
  for (const svg of svgs) {
    const label = svg.getAttribute('aria-label') ?? '';
    const className = svg.getAttribute('class') ?? '';
    const id = svg.getAttribute('id') ?? '';
    const combined = `${label} ${className} ${id}`;
    if (hasBannedBranding(combined)) {
      violations.push({
        file: filePath,
        kind: 'banned-branding',
        message: 'SVG element references prohibited NHS logo or branding.',
        elementHtml: svg.outerHTML,
      });
    }
  }

  if (/NHS\s+Wait\s+Finder/i.test(visibleText) || /NHS\s+Wait\s+Finder/i.test(html)) {
    violations.push({
      file: filePath,
      kind: 'banned-site-name',
      message: 'Found prohibited draft name "NHS Wait Finder". Must use "Know Your Wait".',
      matchedText: 'NHS Wait Finder',
    });
  }

  // 6. Outbound links allow-list
  const anchors = root.querySelectorAll('a');
  for (const a of anchors) {
    const href = a.getAttribute('href');
    if (!href) continue;

    const trimmedHref = href.trim();
    if (
      trimmedHref.startsWith('http://') ||
      trimmedHref.startsWith('https://') ||
      trimmedHref.startsWith('//')
    ) {
      try {
        const url = new URL(trimmedHref.startsWith('//') ? `https:${trimmedHref}` : trimmedHref);
        if (!isDomainAllowed(url.hostname, allowedDomains)) {
          violations.push({
            file: filePath,
            kind: 'disallowed-outbound-link',
            message: `Disallowed outbound domain "${url.hostname}" in link href "${href}".`,
            matchedText: href,
            elementHtml: a.outerHTML,
          });
        }
      } catch {
        violations.push({
          file: filePath,
          kind: 'disallowed-outbound-link',
          message: `Malformed outbound URL in link href "${href}".`,
          matchedText: href,
          elementHtml: a.outerHTML,
        });
      }
    }
  }

  return violations;
}

/**
 * Scans an entire directory of HTML files.
 */
export function scanOutputDirectory(
  outDir: string,
  options?: ScanOptions,
): { totalFiles: number; violations: OutputViolation[] } {
  const violations: OutputViolation[] = [];
  let totalFiles = 0;

  if (!fs.existsSync(outDir)) {
    throw new Error(`Output directory does not exist: ${outDir}`);
  }

  function walk(dir: string) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (entry.isFile() && entry.name.endsWith('.html')) {
        totalFiles += 1;
        const html = fs.readFileSync(fullPath, 'utf8');
        const fileViolations = scanHtmlContent(fullPath, html, options);
        violations.push(...fileViolations);
      }
    }
  }

  walk(outDir);
  return { totalFiles, violations };
}

/**
 * CLI Entry point
 */
export function runCli(): void {
  const defaultDir = path.resolve(process.cwd(), 'apps/site/out');
  const fallbackDir = path.resolve(process.cwd(), 'out');
  const targetDir = process.argv[2] ?? (fs.existsSync(defaultDir) ? defaultDir : fallbackDir);

  console.log(`Scanning built HTML output in: ${targetDir}`);

  try {
    const { totalFiles, violations } = scanOutputDirectory(targetDir);
    console.log(`Scanned ${String(totalFiles)} HTML files.`);

    if (violations.length > 0) {
      console.error(`\n❌ Found ${String(violations.length)} violation(s):`);
      for (const v of violations) {
        console.error(
          `  - [${v.kind}] ${v.file}: ${v.message}${
            v.matchedText ? ` (matched: "${v.matchedText}")` : ''
          }`,
        );
      }
      process.exit(1);
    } else {
      console.log(
        '✅ Built-output guard scan passed: all figures sourced/dated, no banned terms or leaks.',
      );
      process.exit(0);
    }
  } catch (error) {
    console.error(`❌ Scan failed with error:`, error);
    process.exit(1);
  }
}

// Run CLI when executed directly
if (
  process.argv[1] &&
  (process.argv[1].endsWith('scan-output.ts') || process.argv[1].endsWith('scan-output.js'))
) {
  runCli();
}
