import * as fs from 'node:fs';
import * as path from 'node:path';
import matter from 'gray-matter';
import { PUBLISHING_NATIONS, type PublishingNation } from '../packages/model/src/nation.js';
import { validateFrontMatter, type EditorialFrontMatter } from '../apps/site/src/content/schema.js';

export const MAX_CONTENT_AGE_DAYS = 183;

export const REQUIRED_LAUNCH_FILES: readonly {
  nation: PublishingNation;
  relativePath: string;
  description: string;
}[] = [
  {
    nation: 'england',
    relativePath: 'england/about-the-figures.md',
    description: 'England "About the figures" explainer',
  },
  {
    nation: 'england',
    relativePath: 'england/your-rights.md',
    description: 'England "Your rights" explainer',
  },
  {
    nation: 'england',
    relativePath: 'england/specialties/trauma-and-orthopaedics.md',
    description: 'England Trauma & Orthopaedics full content',
  },
  {
    nation: 'wales',
    relativePath: 'wales/about-the-figures.md',
    description: 'Wales "About the figures" explainer',
  },
  {
    nation: 'wales',
    relativePath: 'wales/your-rights.md',
    description: 'Wales "Your rights" explainer',
  },
  {
    nation: 'wales',
    relativePath: 'wales/specialties/trauma-and-orthopaedics.md',
    description: 'Wales Trauma & Orthopaedics full content',
  },
  {
    nation: 'scotland',
    relativePath: 'scotland/about-the-figures.md',
    description: 'Scotland "About the figures" explainer',
  },
  {
    nation: 'scotland',
    relativePath: 'scotland/your-rights.md',
    description: 'Scotland "Your rights" explainer',
  },
  {
    nation: 'scotland',
    relativePath: 'scotland/specialties/trauma-and-orthopaedics.md',
    description: 'Scotland Trauma & Orthopaedics full content',
  },
];

export interface GuardIssue {
  readonly filePath: string;
  readonly message: string;
  readonly severity: 'error' | 'warning';
}

export interface CheckContentOptions {
  readonly contentDir?: string | undefined;
  readonly freshnessOnly?: boolean | undefined;
  readonly asOfDate?: Date | undefined;
  readonly maxAgeDays?: number | undefined;
}

export interface CheckContentResult {
  readonly ok: boolean;
  readonly totalFilesChecked: number;
  readonly reviewedFilesCount: number;
  readonly placeholderFilesCount: number;
  readonly errors: readonly GuardIssue[];
  readonly warnings: readonly GuardIssue[];
}

/**
 * Finds all markdown files in the content directory.
 */
export function getAllContentFilePaths(contentDir: string): string[] {
  const files: string[] = [];

  function walk(dir: string): void {
    if (!fs.existsSync(dir)) {
      return;
    }
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (entry.isFile() && entry.name.endsWith('.md') && entry.name !== 'README.md') {
        files.push(fullPath);
      }
    }
  }

  walk(contentDir);
  return files.sort();
}

/**
 * Checks if a reviewed file exceeds the maximum freshness age.
 */
export function checkFreshness(
  frontMatter: EditorialFrontMatter,
  filePath: string,
  asOfDate: Date = new Date(),
  maxAgeDays: number = MAX_CONTENT_AGE_DAYS,
): GuardIssue | null {
  if (frontMatter.status !== 'reviewed') {
    return null;
  }

  if (!frontMatter.lastReviewed) {
    return {
      filePath,
      message: 'Status is "reviewed" but "lastReviewed" date is missing.',
      severity: 'error',
    };
  }

  const reviewTimestamp = Date.parse(frontMatter.lastReviewed);
  if (Number.isNaN(reviewTimestamp)) {
    return {
      filePath,
      message: `Invalid lastReviewed date format: "${frontMatter.lastReviewed}"`,
      severity: 'error',
    };
  }

  const ageMs = asOfDate.getTime() - reviewTimestamp;
  const ageDays = Math.floor(ageMs / (1000 * 60 * 60 * 24));

  if (ageDays > maxAgeDays) {
    return {
      filePath,
      message: `Content last reviewed ${String(ageDays)} days ago (${frontMatter.lastReviewed}), which exceeds maximum permitted age of ${String(maxAgeDays)} days.`,
      severity: 'error',
    };
  }

  return null;
}

const FIGURE_CLAIM_REGEX =
  /(?:\b\d+\s*(?:weeks?|days?|months?|percent|people)\b|\b\d+\s*%(?!\w)|\b\d+,\d+\s*people\b)/i;

/**
 * Checks for prohibited figure claims outside blockquotes and code blocks.
 */
export function checkFigureClaims(markdown: string, filePath: string): GuardIssue[] {
  const issues: GuardIssue[] = [];
  const lines = markdown.split('\n');
  let inCodeBlock = false;

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    if (rawLine === undefined) {
      continue;
    }
    const trimmed = rawLine.trim();

    if (trimmed.startsWith('```')) {
      inCodeBlock = !inCodeBlock;
      continue;
    }

    if (inCodeBlock) {
      continue;
    }

    // Blockquotes start with >
    if (trimmed.startsWith('>')) {
      continue;
    }

    // Ignore HTML comments <!-- ... -->
    if (trimmed.startsWith('<!--') || trimmed.endsWith('-->')) {
      continue;
    }

    const match = FIGURE_CLAIM_REGEX.exec(trimmed);
    if (match) {
      issues.push({
        filePath,
        message: `Line ${String(i + 1)} contains unauthorized figure claim "${match[0]}". Official figures in editorial copy may only appear inside blockquotes citing official sources.`,
        severity: 'error',
      });
    }
  }

  return issues;
}

/**
 * Parses markdown reference links [text][id] or [id][] and validates they resolve to sources[].id.
 */
export function checkSourceReferenceLinks(
  markdown: string,
  sources: readonly { id: string }[],
  filePath: string,
): GuardIssue[] {
  const issues: GuardIssue[] = [];
  const validSourceIds = new Set(sources.map((s) => s.id));

  const lines = markdown.split('\n');
  let inCodeBlock = false;

  // Matches [link text][source-id] or [source-id][]
  const refLinkRegex = /\[(?:[^\]]*)\]\[([^\]]+)\]/g;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line === undefined) {
      continue;
    }
    const trimmed = line.trim();

    if (trimmed.startsWith('```')) {
      inCodeBlock = !inCodeBlock;
      continue;
    }

    if (inCodeBlock) {
      continue;
    }

    // Ignore HTML comments <!-- ... -->
    if (trimmed.startsWith('<!--') || trimmed.endsWith('-->')) {
      continue;
    }

    let match: RegExpExecArray | null;
    while ((match = refLinkRegex.exec(line)) !== null) {
      const refId = match[1]?.trim();
      if (refId && !validSourceIds.has(refId)) {
        issues.push({
          filePath,
          message: `Line ${String(i + 1)} references unknown source id "[${refId}]". It is not defined in front matter sources.`,
          severity: 'error',
        });
      }
    }
  }

  return issues;
}

/**
 * Runs all content guard and launch checks across the editorial content directory.
 */
export function checkLaunchContent(options: CheckContentOptions = {}): CheckContentResult {
  const rootDir = process.cwd();
  const defaultDir = path.resolve(rootDir, 'content');
  const baseContentDir = options.contentDir ? path.resolve(options.contentDir) : defaultDir;

  const errors: GuardIssue[] = [];
  const warnings: GuardIssue[] = [];

  const allFilePaths = getAllContentFilePaths(baseContentDir);
  let reviewedCount = 0;
  let placeholderCount = 0;

  // Map of relative path -> parsed front matter & raw content
  const parsedFiles = new Map<string, { frontMatter: EditorialFrontMatter; rawBody: string }>();

  for (const filePath of allFilePaths) {
    const relPath = path.relative(baseContentDir, filePath);
    let rawContent: string;
    try {
      rawContent = fs.readFileSync(filePath, 'utf-8');
    } catch (err) {
      errors.push({
        filePath,
        message: `Could not read file: ${(err as Error).message}`,
        severity: 'error',
      });
      continue;
    }

    let parsedMatter: matter.GrayMatterFile<string>;
    try {
      parsedMatter = matter(rawContent);
    } catch (err) {
      errors.push({
        filePath,
        message: `Invalid YAML front matter: ${(err as Error).message}`,
        severity: 'error',
      });
      continue;
    }

    const pathSegments = relPath.split(path.sep);
    const nationFolder = pathSegments[0] as PublishingNation | undefined;
    const expectedNation =
      nationFolder && PUBLISHING_NATIONS.includes(nationFolder) ? nationFolder : undefined;

    let validatedFrontMatter: EditorialFrontMatter;
    try {
      validatedFrontMatter = validateFrontMatter(parsedMatter.data, expectedNation);
    } catch (err) {
      errors.push({
        filePath,
        message: `Front matter validation failed: ${(err as Error).message}`,
        severity: 'error',
      });
      continue;
    }

    parsedFiles.set(relPath, {
      frontMatter: validatedFrontMatter,
      rawBody: parsedMatter.content,
    });

    if (validatedFrontMatter.status === 'reviewed') {
      reviewedCount++;
    } else {
      placeholderCount++;
    }

    // Freshness check on reviewed files
    const freshnessIssue = checkFreshness(
      validatedFrontMatter,
      filePath,
      options.asOfDate,
      options.maxAgeDays,
    );
    if (freshnessIssue) {
      errors.push(freshnessIssue);
    }

    // Prohibited figures check
    const figureIssues = checkFigureClaims(parsedMatter.content, filePath);
    errors.push(...figureIssues);

    // Source reference links check
    const sourceLinkIssues = checkSourceReferenceLinks(
      parsedMatter.content,
      validatedFrontMatter.sources,
      filePath,
    );
    errors.push(...sourceLinkIssues);
  }

  // Launch gate requirements check (only if not in freshness-only mode)
  if (!options.freshnessOnly) {
    for (const req of REQUIRED_LAUNCH_FILES) {
      const fileData = parsedFiles.get(req.relativePath);
      const fullPath = path.join(baseContentDir, req.relativePath);

      if (!fileData) {
        errors.push({
          filePath: fullPath,
          message: `Required launch file "${req.relativePath}" (${req.description}) is missing.`,
          severity: 'error',
        });
      } else if (fileData.frontMatter.status !== 'reviewed') {
        errors.push({
          filePath: fullPath,
          message: `Required launch file "${req.relativePath}" (${req.description}) has status "${fileData.frontMatter.status}", but launch gate requires status="reviewed".`,
          severity: 'error',
        });
      }
    }
  }

  return {
    ok: errors.length === 0,
    totalFilesChecked: allFilePaths.length,
    reviewedFilesCount: reviewedCount,
    placeholderFilesCount: placeholderCount,
    errors,
    warnings,
  };
}

/**
 * CLI execution entrypoint
 */
export function runCli(argv: readonly string[] = process.argv.slice(2)): void {
  const isFreshnessOnly = argv.includes('--freshness-only');
  const dirFlagIndex = argv.indexOf('--content-dir');
  const customDir = dirFlagIndex !== -1 ? argv[dirFlagIndex + 1] : undefined;

  const modeName = isFreshnessOnly ? 'Freshness-only audit' : 'Launch Gate & Guard check';
  console.warn(`\n=== Editorial Content Verification (${modeName}) ===\n`);

  const result = checkLaunchContent({
    contentDir: customDir,
    freshnessOnly: isFreshnessOnly,
  });

  console.warn(`Files checked: ${String(result.totalFilesChecked)}`);
  console.warn(`Reviewed files: ${String(result.reviewedFilesCount)}`);
  console.warn(`Placeholder/draft files: ${String(result.placeholderFilesCount)}\n`);

  if (result.errors.length > 0) {
    console.error(`FAILED: ${String(result.errors.length)} issue(s) detected:\n`);
    for (const err of result.errors) {
      console.error(`  - [${err.severity.toUpperCase()}] ${err.filePath}`);
      console.error(`    ${err.message}\n`);
    }
    process.exit(1);
  }

  console.warn('SUCCESS: All editorial content guards passed.\n');
  process.exit(0);
}

// If invoked directly from CLI
const isDirectExecution =
  process.argv[1] &&
  (process.argv[1].endsWith('check-launch-content.ts') ||
    process.argv[1].endsWith('check-launch-content.js'));

if (isDirectExecution) {
  runCli();
}
