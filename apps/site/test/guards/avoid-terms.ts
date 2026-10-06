import fs from 'node:fs';
import path from 'node:path';

export interface AvoidTermViolation {
  file: string;
  key?: string;
  line?: number;
  term: string;
  matchedText: string;
}

export const FIXED_EXTRA_AVOID_TERMS: readonly string[] = [
  'average',
  'expected wait',
  'estimated wait',
  'typical wait',
  'mean wait',
  'breach',
  '52-week wait',
  'private hospital',
  'near you',
  'local area',
  'shortest wait',
  'best',
  'worst',
  'rank',
];

/**
 * Parses _Avoid_ terms from GLOSSARY.md.
 * Extracts multi-word avoided phrases and specific banned terms,
 * ignoring parenthetical unqualified single-word notes (e.g. `(unqualified)`).
 */
export function parseGlossaryAvoidTerms(glossaryContent: string): string[] {
  const terms = new Set<string>();
  const lines = glossaryContent.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed.startsWith('_Avoid_:')) continue;

    const content = trimmed.replace(/^_Avoid_:\s*/, '');
    // Split sentences if there are notes like:
    // "Service, department, category. "Treatment function" is the official name..."
    const sentences = content.split(/\.\s+/);
    const mainList = sentences[0] ?? '';

    const items = mainList.split(/[,;]/);
    for (let item of items) {
      item = item.trim();
      // If it contains parentheticals like (unqualified), check if it is a single word
      const hasUnqualifiedNote = /\(unqualified\)|\(when|\(unless/i.test(item);
      const cleaned = item
        .replace(/\([^)]*\)/g, '')
        .replace(/["“”]/g, '')
        .trim()
        .toLowerCase();

      if (!cleaned) continue;

      // Unqualified single common nouns are guidance against unqualified domain names,
      // not global substring bans in prose (which would ban words like "date", "data", "hospital").
      const isMultiWord = cleaned.includes(' ') || cleaned.includes('-');
      if (hasUnqualifiedNote && !isMultiWord) {
        continue;
      }

      // Skip generic single common words that are legitimate prose when qualified
      const genericSingleWords = new Set([
        'data',
        'date',
        'month',
        'hospital',
        'service',
        'department',
        'category',
        'step',
        'phase',
        'pathway',
        'metric',
        'kpi',
        'measure',
        'provider',
        'organisation',
        'location',
        'trend',
        'change',
        'history',
        'guidance',
        'advice',
        'area',
        'option',
        'entitlement',
        'guarantee',
        'missing',
        'zero',
        'n/a',
        'draft',
        'estimate',
        'latest',
        'current',
        'country',
        'region',
      ]);

      if (!isMultiWord && genericSingleWords.has(cleaned)) {
        continue;
      }

      terms.add(cleaned);
    }
  }

  return Array.from(terms);
}

/**
 * Loads all avoid terms combined from GLOSSARY.md and fixed extras.
 */
export function loadAllAvoidTerms(glossaryPath?: string): string[] {
  const resolvedGlossaryPath = glossaryPath ?? path.resolve(process.cwd(), '../../GLOSSARY.md');

  let glossaryTerms: string[] = [];
  if (fs.existsSync(resolvedGlossaryPath)) {
    const content = fs.readFileSync(resolvedGlossaryPath, 'utf8');
    glossaryTerms = parseGlossaryAvoidTerms(content);
  } else {
    // Try current working dir fallback
    const fallback = path.resolve(process.cwd(), 'GLOSSARY.md');
    if (fs.existsSync(fallback)) {
      const content = fs.readFileSync(fallback, 'utf8');
      glossaryTerms = parseGlossaryAvoidTerms(content);
    }
  }

  const combined = new Set<string>([...FIXED_EXTRA_AVOID_TERMS, ...glossaryTerms]);
  return Array.from(combined);
}

export interface AllowedPatternRule {
  term: string;
  filePattern?: RegExp;
  keyPattern?: RegExp;
  allowedContextPattern?: RegExp;
}

export interface ScanOptions {
  terms?: readonly string[] | string[];
  allowedPatterns?: AllowedPatternRule[];
}

const DEFAULT_ALLOWED_PATTERNS: AllowedPatternRule[] = [
  {
    // "treatment function" allowed when quoting England source data
    term: 'treatment function',
    filePattern: /england.*\.json$/,
    allowedContextPattern: /treatment functions? combined/i,
  },
];

function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Scans a single string for forbidden avoid terms.
 */
export function scanTextForAvoidTerms(
  text: string,
  filePath: string,
  keyOrLine: { key?: string; line?: number },
  options?: ScanOptions,
): AvoidTermViolation[] {
  const terms = options?.terms ?? FIXED_EXTRA_AVOID_TERMS;
  const allowedPatterns = options?.allowedPatterns ?? DEFAULT_ALLOWED_PATTERNS;
  const violations: AvoidTermViolation[] = [];

  for (const term of terms) {
    // Build word boundary regex
    const escaped = escapeRegExp(term);
    const regex = new RegExp(`\\b${escaped}\\b`, 'i');

    if (regex.test(text)) {
      // Check if this occurrence is allow-listed
      const isAllowed = allowedPatterns.some((rule) => {
        if (rule.term.toLowerCase() !== term.toLowerCase()) return false;
        if (rule.filePattern && !rule.filePattern.test(filePath)) return false;
        if (rule.keyPattern && keyOrLine.key && !rule.keyPattern.test(keyOrLine.key)) return false;
        if (rule.allowedContextPattern && !rule.allowedContextPattern.test(text)) return false;
        return true;
      });

      if (!isAllowed) {
        const violation: AvoidTermViolation = {
          file: filePath,
          term,
          matchedText: text,
          ...(keyOrLine.key !== undefined ? { key: keyOrLine.key } : {}),
          ...(keyOrLine.line !== undefined ? { line: keyOrLine.line } : {}),
        };
        violations.push(violation);
      }
    }
  }

  return violations;
}

/**
 * Recursively scans all JSON files in the messages directory.
 */
export function scanMessagesDirectory(
  messagesDir: string,
  options?: ScanOptions,
): AvoidTermViolation[] {
  const violations: AvoidTermViolation[] = [];

  if (!fs.existsSync(messagesDir)) {
    return violations;
  }

  function walk(currentDir: string) {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (entry.isFile() && entry.name.endsWith('.json')) {
        const raw = fs.readFileSync(fullPath, 'utf8');
        try {
          const parsed: unknown = JSON.parse(raw);
          scanJsonObject(parsed, fullPath, '', violations, options);
        } catch {
          // ignore json parse errors or handled elsewhere
        }
      }
    }
  }

  function scanJsonObject(
    obj: unknown,
    filePath: string,
    keyPath: string,
    out: AvoidTermViolation[],
    opts?: ScanOptions,
  ) {
    if (typeof obj === 'string') {
      const found = scanTextForAvoidTerms(obj, filePath, { key: keyPath }, opts);
      out.push(...found);
    } else if (Array.isArray(obj)) {
      obj.forEach((item: unknown, index: number) => {
        scanJsonObject(item, filePath, `${keyPath}[${String(index)}]`, out, opts);
      });
    } else if (typeof obj === 'object' && obj !== null) {
      for (const [k, v] of Object.entries(obj)) {
        const nextKey = keyPath ? `${keyPath}.${k}` : k;
        scanJsonObject(v, filePath, nextKey, out, opts);
      }
    }
  }

  walk(messagesDir);
  return violations;
}

/**
 * Scans markdown content files in content/ directory (if exists).
 */
export function scanContentDirectory(
  contentDir: string,
  options?: ScanOptions,
): AvoidTermViolation[] {
  const violations: AvoidTermViolation[] = [];

  if (!fs.existsSync(contentDir)) {
    return violations;
  }

  function walk(currentDir: string) {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (entry.isFile() && entry.name.endsWith('.md')) {
        const content = fs.readFileSync(fullPath, 'utf8');
        // Strip frontmatter if present
        let body = content;
        if (content.startsWith('---')) {
          const secondYamlIndex = content.indexOf('---', 3);
          if (secondYamlIndex !== -1) {
            body = content.slice(secondYamlIndex + 3);
          }
        }
        const lines = body.split('\n');
        lines.forEach((lineText, lineIdx) => {
          const found = scanTextForAvoidTerms(lineText, fullPath, { line: lineIdx + 1 }, options);
          violations.push(...found);
        });
      }
    }
  }

  walk(contentDir);
  return violations;
}
