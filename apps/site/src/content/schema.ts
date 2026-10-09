import { z } from 'zod';
import { PUBLISHING_NATIONS, type PublishingNation } from '@kyw/model/nation';

/**
 * Official domain allow-list for Editorial Content source citations.
 * Only HTTPS URLs under these domains or their subdomains are permitted.
 */
export const ALLOWED_SOURCE_DOMAINS = [
  'nhs.uk',
  'england.nhs.uk',
  'gov.uk',
  'legislation.gov.uk',
  'gov.wales',
  'nhs.wales',
  'llaiswales.org',
  'nhs.scot',
  'nhsinform.scot',
  'gov.scot',
  'publichealthscotland.scot',
  'opendata.nhs.scot',
  'pass-scotland.org.uk',
  'statswales.gov.wales',
  'stats.gov.wales',
] as const;

export type AllowedSourceDomain = (typeof ALLOWED_SOURCE_DOMAINS)[number];

/**
 * Checks if a given hostname matches an allow-listed domain or one of its subdomains.
 */
export function isAllowedSourceHostname(hostname: string): boolean {
  const lowerHost = hostname.toLowerCase();
  return ALLOWED_SOURCE_DOMAINS.some(
    (domain) => lowerHost === domain || lowerHost.endsWith(`.${domain}`),
  );
}

/**
 * Schema for an individual citation source.
 */
export const SourceSchema = z.object({
  id: z.string().min(1, 'Source ID cannot be empty'),
  title: z.string().min(1, 'Source title cannot be empty'),
  url: z
    .url('Source URL must be a valid URL')
    .refine((urlStr) => urlStr.startsWith('https://'), {
      message: 'Source URL must use HTTPS protocol',
    })
    .refine(
      (urlStr) => {
        try {
          const parsed = new URL(urlStr);
          return isAllowedSourceHostname(parsed.hostname);
        } catch {
          return false;
        }
      },
      {
        message: `Source URL domain is not in the official allow-list: ${ALLOWED_SOURCE_DOMAINS.join(', ')}`,
      },
    ),
});

export type EditorialSource = z.infer<typeof SourceSchema>;

export const ContentStatusSchema = z.enum(['placeholder', 'draft', 'reviewed']);
export type ContentStatus = z.infer<typeof ContentStatusSchema>;

const IsoDateRegex = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Base front matter schema with review state refinements.
 */
const BaseFrontMatterSchema = z.object({
  nation: z.enum(PUBLISHING_NATIONS),
  status: ContentStatusSchema,
  lastReviewed: z
    .string()
    .regex(IsoDateRegex, 'lastReviewed must be an ISO date (YYYY-MM-DD)')
    .optional(),
  reviewedBy: z.string().min(1, 'reviewedBy cannot be empty').optional(),
  sources: z.array(SourceSchema).default([]),
});

function refineReviewedFields(
  data: z.infer<typeof BaseFrontMatterSchema>,
  ctx: z.RefinementCtx,
): void {
  if (data.status === 'reviewed') {
    if (!data.lastReviewed) {
      ctx.addIssue({
        code: 'custom',
        path: ['lastReviewed'],
        message: 'lastReviewed is required when status is "reviewed"',
      });
    }
    if (!data.reviewedBy) {
      ctx.addIssue({
        code: 'custom',
        path: ['reviewedBy'],
        message: 'reviewedBy is required when status is "reviewed"',
      });
    }
  }
}

export const AboutTheFiguresFrontMatterSchema = BaseFrontMatterSchema.extend({
  kind: z.literal('about-the-figures'),
}).superRefine(refineReviewedFields);

export type AboutTheFiguresFrontMatter = z.infer<typeof AboutTheFiguresFrontMatterSchema>;

export const YourRightsFrontMatterSchema = BaseFrontMatterSchema.extend({
  kind: z.literal('your-rights'),
}).superRefine(refineReviewedFields);

export type YourRightsFrontMatter = z.infer<typeof YourRightsFrontMatterSchema>;

export const SpecialtyFrontMatterSchema = BaseFrontMatterSchema.extend({
  kind: z.literal('specialty'),
  specialtyId: z.string().min(1, 'specialtyId cannot be empty'),
  summary: z.string(),
  keywords: z.array(z.string()).default([]),
})
  .superRefine(refineReviewedFields)
  .superRefine((data, ctx) => {
    const prefix = `${data.nation}:`;
    if (!data.specialtyId.startsWith(prefix)) {
      ctx.addIssue({
        code: 'custom',
        path: ['specialtyId'],
        message: `specialtyId "${data.specialtyId}" must start with nation prefix "${prefix}"`,
      });
    }
  });

export type SpecialtyFrontMatter = z.infer<typeof SpecialtyFrontMatterSchema>;

export const EditorialFrontMatterSchema = z.discriminatedUnion('kind', [
  AboutTheFiguresFrontMatterSchema,
  YourRightsFrontMatterSchema,
  SpecialtyFrontMatterSchema,
]);

export type EditorialFrontMatter = z.infer<typeof EditorialFrontMatterSchema>;

export class ContentValidationError extends Error {
  constructor(
    message: string,
    public readonly issues?: readonly unknown[],
  ) {
    super(message);
    this.name = 'ContentValidationError';
  }
}

/**
 * Validates front matter data with folder nation check.
 */
export function validateFrontMatter(
  data: unknown,
  expectedNation?: PublishingNation,
): EditorialFrontMatter {
  const result = EditorialFrontMatterSchema.safeParse(data);
  if (!result.success) {
    const details = result.error.issues
      .map((i) => `[${i.path.join('.') || 'root'}]: ${i.message}`)
      .join('; ');
    throw new ContentValidationError(
      `Front matter schema validation failed: ${details}`,
      result.error.issues,
    );
  }

  const parsed = result.data;
  if (expectedNation && parsed.nation !== expectedNation) {
    throw new ContentValidationError(
      `Content front matter nation "${parsed.nation}" does not match folder nation "${expectedNation}"`,
    );
  }
  return parsed;
}
