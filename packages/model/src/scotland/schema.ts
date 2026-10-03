import { releaseFileSchema, releaseSchema } from '../release.js';
import { scotlandDefinitions } from './definitions.js';

/**
 * Zod schema for validating a complete `Release<'scotland'>` against Scotland's domain definitions.
 *
 * @see GLOSSARY.md Publishing Nation, Official Figure, Derived Figure, Wait Stage, Statistic
 * @see ADR-0002
 * @see ADR-0005
 * @see ADR-0006
 * @see ADR-0007
 */
export const scotlandReleaseSchema = releaseSchema(scotlandDefinitions);

/**
 * Zod schema for validating a compact `ReleaseFile<'scotland'>` against Scotland's domain definitions.
 *
 * @see ADR-0007
 */
export const scotlandReleaseFileSchema = releaseFileSchema(scotlandDefinitions);
