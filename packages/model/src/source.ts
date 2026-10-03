import { z } from 'zod';
import { isPublishingNation, type PublishingNation } from './nation.js';

/**
 * Metadata identifying the official publication source of a figure or dataset.
 *
 * @see GLOSSARY.md Publication Date, Official Figure
 * @see ADR-0006
 */
export interface SourceRef<N extends PublishingNation> {
  readonly nation: N;
  readonly publisher: string;
  readonly title: string;
  readonly url: string;
  readonly licence: 'OGL-3.0';
  readonly attribution: string;
}

/**
 * Creates a Zod schema validating a `SourceRef` for a specific publishing nation.
 */
export function sourceRefSchema<N extends PublishingNation>(nation: N): z.ZodType<SourceRef<N>> {
  if (!isPublishingNation(nation)) {
    throw new TypeError(`Invalid publishing nation: "${String(nation)}"`);
  }

  return z.strictObject({
    nation: z.literal(nation),
    publisher: z.string().min(1, 'Publisher must be non-empty'),
    title: z.string().min(1, 'Title must be non-empty'),
    url: z.url('Source URL must be a valid URL'),
    licence: z.literal('OGL-3.0'),
    attribution: z.string().min(1, 'Attribution must be non-empty'),
  });
}
