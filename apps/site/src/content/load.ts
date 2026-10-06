import * as fs from 'node:fs';
import * as fsp from 'node:fs/promises';
import * as path from 'node:path';
import matter from 'gray-matter';
import type { PublishingNation } from '@kyw/model/nation';
import {
  type EditorialFrontMatter,
  type SpecialtyFrontMatter,
  type AboutTheFiguresFrontMatter,
  type YourRightsFrontMatter,
  validateFrontMatter,
} from './schema.js';
import { renderMarkdownToHtml } from './render.js';

export class ContentLoadError extends Error {
  constructor(
    public readonly filePath: string,
    message: string,
  ) {
    super(`[ContentLoadError] Failed to load "${filePath}": ${message}`);
    this.name = 'ContentLoadError';
  }
}

function findWorkspaceRoot(startDir: string): string | undefined {
  let curr = path.resolve(startDir);
  for (let i = 0; i < 10; i++) {
    if (fs.existsSync(path.join(curr, 'pnpm-workspace.yaml'))) {
      return curr;
    }
    const parent = path.dirname(curr);
    if (parent === curr) {
      break;
    }
    curr = parent;
  }
  return undefined;
}

/**
 * Resolves the root directory containing Editorial Content.
 * Defaults to `<repo>/content`, or respects `process.env.KYW_CONTENT_DIR`.
 */
export function contentDir(): string {
  const envDir = process.env.KYW_CONTENT_DIR;
  if (envDir && envDir.trim().length > 0) {
    if (path.isAbsolute(envDir)) {
      return envDir;
    }
    const cwdCandidate = path.resolve(process.cwd(), envDir);
    if (fs.existsSync(cwdCandidate)) {
      return cwdCandidate;
    }
    const root = findWorkspaceRoot(process.cwd());
    if (root) {
      const rootCandidate = path.resolve(root, envDir);
      if (fs.existsSync(rootCandidate)) {
        return rootCandidate;
      }
    }
    return cwdCandidate;
  }

  const workspaceRoot = findWorkspaceRoot(process.cwd());
  if (workspaceRoot) {
    return path.resolve(workspaceRoot, 'content');
  }

  const candidate = path.resolve(process.cwd(), 'content');
  if (fs.existsSync(candidate)) {
    return candidate;
  }
  return path.resolve(process.cwd(), '../../content');
}

export interface LoadedContent<T extends EditorialFrontMatter = EditorialFrontMatter> {
  readonly frontMatter: T;
  readonly html: string;
  readonly isPlaceholder: boolean;
}

/**
 * Loads and validates a single editorial markdown file from disk.
 */
export async function loadContentFile<T extends EditorialFrontMatter = EditorialFrontMatter>(
  filePath: string,
  expectedNation?: PublishingNation,
): Promise<LoadedContent<T>> {
  let rawContent: string;
  try {
    rawContent = await fsp.readFile(filePath, 'utf-8');
  } catch (err) {
    throw new ContentLoadError(filePath, `Could not read file: ${(err as Error).message}`);
  }

  let parsedMatter: matter.GrayMatterFile<string>;
  try {
    parsedMatter = matter(rawContent);
  } catch (err) {
    throw new ContentLoadError(filePath, `Invalid YAML front matter: ${(err as Error).message}`);
  }

  let validatedFrontMatter: EditorialFrontMatter;
  try {
    validatedFrontMatter = validateFrontMatter(parsedMatter.data, expectedNation);
  } catch (err) {
    throw new ContentLoadError(
      filePath,
      `Front matter validation failed: ${(err as Error).message}`,
    );
  }

  let html: string;
  try {
    html = await renderMarkdownToHtml(parsedMatter.content, validatedFrontMatter.sources);
  } catch (err) {
    throw new ContentLoadError(filePath, `Markdown rendering failed: ${(err as Error).message}`);
  }

  return {
    frontMatter: validatedFrontMatter as T,
    html,
    isPlaceholder: validatedFrontMatter.status === 'placeholder',
  };
}

/**
 * Loads an explainer page for a nation: "about-the-figures" or "your-rights".
 */
export async function getExplainer(
  nation: PublishingNation,
  kind: 'about-the-figures' | 'your-rights',
): Promise<LoadedContent<AboutTheFiguresFrontMatter | YourRightsFrontMatter>> {
  const filePath = path.join(contentDir(), nation, `${kind}.md`);
  return loadContentFile<AboutTheFiguresFrontMatter | YourRightsFrontMatter>(filePath, nation);
}

/**
 * Loads editorial content for a specific specialty in a nation.
 * Scans content/<nation>/specialties/ for matching specialtyId.
 */
export async function getSpecialtyContent(
  nation: PublishingNation,
  specialtyId: string,
): Promise<LoadedContent<SpecialtyFrontMatter> | null> {
  const specialtiesDir = path.join(contentDir(), nation, 'specialties');
  if (!fs.existsSync(specialtiesDir)) {
    return null;
  }

  const entries = await fsp.readdir(specialtiesDir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isFile() && entry.name.endsWith('.md')) {
      const fullPath = path.join(specialtiesDir, entry.name);
      try {
        const loaded = await loadContentFile<SpecialtyFrontMatter>(fullPath, nation);
        if (loaded.frontMatter.specialtyId === specialtyId) {
          return loaded;
        }
      } catch (err) {
        throw new ContentLoadError(fullPath, (err as Error).message);
      }
    }
  }

  return null;
}
