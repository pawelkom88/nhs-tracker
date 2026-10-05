/**
 * Custom error hierarchy for the Know Your Wait ingestion and data pipeline.
 */

export class PipelineError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'PipelineError';
  }
}

/**
 * Thrown when upstream source data headers, columns, sheets, or format structures
 * differ from expected definitions. Blocks publishing to prevent corrupted data.
 */
export class SchemaChangeError extends PipelineError {
  readonly details: Readonly<Record<string, unknown>> | undefined;

  constructor(
    message: string,
    details?: Readonly<Record<string, unknown>>,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = 'SchemaChangeError';
    this.details = details;
  }
}

/**
 * Thrown when ingested data fails domain schema validation (Zod validation, value ranges, referential integrity).
 */
export class ValidationError extends PipelineError {
  readonly issues: readonly unknown[] | undefined;

  constructor(message: string, issues?: readonly unknown[], options?: ErrorOptions) {
    super(message, options);
    this.name = 'ValidationError';
    this.issues = issues;
  }
}

/**
 * Thrown when an official data source or publication endpoint is unavailable (e.g. 404, missing resource ID, layout changed).
 */
export class SourceUnavailableError extends PipelineError {
  readonly statusCode: number | undefined;
  readonly url: string | undefined;

  constructor(
    message: string,
    info?: {
      readonly statusCode?: number;
      readonly url?: string;
    },
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = 'SourceUnavailableError';
    this.statusCode = info?.statusCode;
    this.url = info?.url;
  }
}
