import { z } from 'zod';
import { isPublishingNation, type PublishingNation } from './nation.js';

/**
 * The category kinds for nation-scoped identifiers.
 */
export const ID_KINDS = [
  'reporting-unit',
  'hospital-site',
  'specialty',
  'wait-stage',
  'statistic',
] as const;

export type IdKind = (typeof ID_KINDS)[number];

export function isIdKind(value: unknown): value is IdKind {
  return typeof value === 'string' && (ID_KINDS as readonly string[]).includes(value);
}

/**
 * Nation-scoped generic branded identifier.
 *
 * Ensures identifiers from different nations or kinds can never be mixed or assigned to each other.
 *
 * @see ADR-0006
 */
export type NationScopedId<N extends PublishingNation, K extends IdKind> = `${N}:${string}` & {
  readonly __kind: K;
  readonly __nation: N;
};

export type ReportingUnitId<N extends PublishingNation> = NationScopedId<N, 'reporting-unit'>;
export type HospitalSiteId<N extends PublishingNation> = NationScopedId<N, 'hospital-site'>;
export type SpecialtyId<N extends PublishingNation> = NationScopedId<N, 'specialty'>;
export type WaitStageId<N extends PublishingNation> = NationScopedId<N, 'wait-stage'>;
export type StatisticId<N extends PublishingNation> = NationScopedId<N, 'statistic'>;

function validateOfficialCode(code: string): void {
  if (typeof code !== 'string' || code.length === 0) {
    throw new TypeError('Official code must be a non-empty string');
  }
  if (code.includes(':')) {
    throw new TypeError(`Official code "${code}" cannot contain a colon (":")`);
  }
}

function makeNationScopedId<N extends PublishingNation, K extends IdKind>(
  nation: N,
  kind: K,
  officialCode: string,
): NationScopedId<N, K> {
  if (!isPublishingNation(nation)) {
    throw new TypeError(`Invalid publishing nation: "${String(nation)}"`);
  }
  if (!isIdKind(kind)) {
    throw new TypeError(`Invalid id kind: "${String(kind)}"`);
  }
  validateOfficialCode(officialCode);
  return `${nation}:${officialCode}` as NationScopedId<N, K>;
}

export function reportingUnitId<N extends PublishingNation>(
  nation: N,
  officialCode: string,
): ReportingUnitId<N> {
  return makeNationScopedId(nation, 'reporting-unit', officialCode);
}

export function hospitalSiteId<N extends PublishingNation>(
  nation: N,
  officialCode: string,
): HospitalSiteId<N> {
  return makeNationScopedId(nation, 'hospital-site', officialCode);
}

export function specialtyId<N extends PublishingNation>(
  nation: N,
  officialCode: string,
): SpecialtyId<N> {
  return makeNationScopedId(nation, 'specialty', officialCode);
}

export function waitStageId<N extends PublishingNation>(
  nation: N,
  officialCode: string,
): WaitStageId<N> {
  return makeNationScopedId(nation, 'wait-stage', officialCode);
}

export function statisticId<N extends PublishingNation>(
  nation: N,
  officialCode: string,
): StatisticId<N> {
  return makeNationScopedId(nation, 'statistic', officialCode);
}

/**
 * Parses a nation-scoped identifier into its constituent nation and code.
 */
export function parseNationScopedId<N extends PublishingNation, K extends IdKind>(
  id: NationScopedId<N, K> | string,
): { nation: N; code: string } {
  if (typeof id !== 'string') {
    throw new TypeError('Identifier must be a string');
  }
  const firstColon = id.indexOf(':');
  if (firstColon === -1) {
    throw new TypeError(
      `Invalid nation-scoped identifier "${id}": missing nation prefix delimiter`,
    );
  }
  const nationPrefix = id.slice(0, firstColon);
  const code = id.slice(firstColon + 1);

  if (!isPublishingNation(nationPrefix)) {
    throw new TypeError(
      `Invalid nation-scoped identifier "${id}": unknown publishing nation "${nationPrefix}"`,
    );
  }
  validateOfficialCode(code);

  return {
    nation: nationPrefix as N,
    code,
  };
}

/**
 * Creates a Zod schema validating a nation-scoped identifier for a specific nation and kind.
 */
export function nationScopedIdSchema<N extends PublishingNation, K extends IdKind>(
  nation: N,
  kind: K,
): z.ZodType<NationScopedId<N, K>> {
  if (!isPublishingNation(nation)) {
    throw new TypeError(`Invalid publishing nation: "${String(nation)}"`);
  }
  if (!isIdKind(kind)) {
    throw new TypeError(`Invalid id kind: "${String(kind)}"`);
  }
  return z
    .string()
    .refine(
      (val): val is `${N}:${string}` => {
        if (typeof val !== 'string') return false;
        const prefix = `${nation}:`;
        if (!val.startsWith(prefix)) return false;
        const code = val.slice(prefix.length);
        return code.length > 0 && !code.includes(':');
      },
      {
        message: `Identifier must start with "${nation}:" and contain a non-empty code without colons`,
      },
    )
    .transform((val) => val as NationScopedId<N, K>);
}
