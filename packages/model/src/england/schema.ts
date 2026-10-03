import { releaseFileSchema, releaseSchema } from '../release.js';
import { englandDefinitions } from './definitions.js';

/**
 * Zod schema for validating a complete `Release<'england'>` against England's domain definitions.
 *
 * @see GLOSSARY.md Publishing Nation, Official Figure, Wait Stage, Statistic
 * @see ADR-0002
 * @see ADR-0005
 * @see ADR-0006
 * @see ADR-0007
 */
export const englandReleaseSchema = releaseSchema(englandDefinitions);

/**
 * Zod schema for validating a compact `ReleaseFile<'england'>` against England's domain definitions.
 *
 * @see ADR-0007
 */
export const englandReleaseFileSchema = releaseFileSchema(englandDefinitions);
