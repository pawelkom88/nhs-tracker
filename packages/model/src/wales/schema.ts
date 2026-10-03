import { releaseFileSchema, releaseSchema } from '../release.js';
import { walesDefinitions } from './definitions.js';

/**
 * Zod schema for validating a complete `Release<'wales'>` against Wales's domain definitions.
 *
 * @see GLOSSARY.md Publishing Nation, Official Figure, Wait Stage, Statistic
 * @see ADR-0002
 * @see ADR-0005
 * @see ADR-0006
 * @see ADR-0007
 */
export const walesReleaseSchema = releaseSchema(walesDefinitions);

/**
 * Zod schema for validating a compact `ReleaseFile<'wales'>` against Wales's domain definitions.
 *
 * @see ADR-0007
 */
export const walesReleaseFileSchema = releaseFileSchema(walesDefinitions);
