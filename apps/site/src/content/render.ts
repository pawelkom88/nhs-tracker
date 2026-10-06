import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkRehype from 'remark-rehype';
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';
import rehypeStringify from 'rehype-stringify';
import type { EditorialSource } from './schema.js';

export class ContentRenderError extends Error {
  constructor(message: string) {
    super(`[ContentRenderError] ${message}`);
    this.name = 'ContentRenderError';
  }
}

/**
 * Checks for prohibited figure claims outside blockquote sections.
 * e.g., "18 weeks", "52 weeks", "92%".
 */
export function validateFigureClaims(markdown: string): void {
  const lines = markdown.split('\n');
  let inCodeBlock = false;

  const figureRegex = /(?:\b\d+\s*(?:weeks?|days?|months?|percent)\b|\b\d+\s*%)/i;

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

    const match = figureRegex.exec(trimmed);
    if (match) {
      throw new ContentRenderError(
        `Unauthorized figure claim "${match[0]}" at line ${String(i + 1)}. Figures may only appear inside blockquotes quoting official standards.`,
      );
    }
  }
}

/**
 * Rejects raw dangerous HTML tags such as <script>, <style>, <iframe>, <object>, etc.
 */
export function validateNoRawHtml(markdown: string): void {
  const rawScriptRegex = /<\s*script\b[^>]*>/i;
  if (rawScriptRegex.test(markdown)) {
    throw new ContentRenderError('Raw <script> tags are strictly forbidden in editorial content.');
  }

  const rawIframeRegex = /<\s*(?:iframe|object|embed|form|input|button)\b[^>]*>/i;
  if (rawIframeRegex.test(markdown)) {
    throw new ContentRenderError(
      'Interactive or embed HTML elements are forbidden in editorial content.',
    );
  }
}

/**
 * Custom sanitize schema extending default GitHub schema.
 * Explicitly forbids 'target' attribute on links so links do not open new windows unexpectedly.
 */
const strictSanitizeSchema = {
  ...defaultSchema,
  attributes: {
    ...defaultSchema.attributes,
    a: (defaultSchema.attributes?.a ?? []).filter((attr) => attr !== 'target'),
  },
};

/**
 * Renders Editorial Markdown to sanitised HTML.
 * Appends front matter sources as reference link definitions so [text][source-id] resolves automatically.
 */
export async function renderMarkdownToHtml(
  markdown: string,
  sources: readonly EditorialSource[] = [],
): Promise<string> {
  validateNoRawHtml(markdown);
  validateFigureClaims(markdown);

  // Append source reference link definitions
  const sourceDefs = sources
    .map((src) => `[${src.id}]: ${src.url} "${src.title.replace(/"/g, '\\"')}"`)
    .join('\n');

  const contentWithDefs = sourceDefs ? `${markdown}\n\n${sourceDefs}\n` : markdown;

  const file = await unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkRehype, { allowDangerousHtml: false })
    .use(rehypeSanitize, strictSanitizeSchema)
    .use(rehypeStringify)
    .process(contentWithDefs);

  return String(file).trim();
}
