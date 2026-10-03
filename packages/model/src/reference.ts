import { z } from 'zod';
import { isPublishingNation, type PublishingNation, type SingleNation } from './nation.js';
import {
  nationScopedIdSchema,
  type HospitalSiteId,
  type ReportingUnitId,
  type SpecialtyId,
} from './ids.js';
import { sourceRefSchema, type SourceRef } from './source.js';

/**
 * NHS Region identifier (England only).
 *
 * @see GLOSSARY.md NHS Region
 */
export type NhsRegionId = `england:${string}` & {
  readonly __kind: 'nhs-region';
  readonly __nation: 'england';
};

/**
 * Constructor for an NHS Region identifier.
 */
export function nhsRegionId(officialCode: string): NhsRegionId {
  if (typeof officialCode !== 'string' || officialCode.length === 0) {
    throw new TypeError('NHS Region official code must be a non-empty string');
  }
  if (officialCode.includes(':')) {
    throw new TypeError(`NHS Region official code "${officialCode}" cannot contain a colon (":")`);
  }
  return `england:${officialCode}` as NhsRegionId;
}

/**
 * Zod schema validating an NHS Region identifier.
 */
export const nhsRegionIdSchema: z.ZodType<NhsRegionId> = z
  .string()
  .refine(
    (val): val is `england:${string}` => {
      if (typeof val !== 'string') return false;
      const prefix = 'england:';
      if (!val.startsWith(prefix)) return false;
      const code = val.slice(prefix.length);
      return code.length > 0 && !code.includes(':');
    },
    {
      message:
        'NHS Region identifier must start with "england:" and contain a non-empty code without colons',
    },
  )
  .transform((val) => val as NhsRegionId);

/**
 * One of NHS England's seven administrative regions.
 * Used only for grouping English Reporting Units for browsing; never across nations.
 *
 * @see GLOSSARY.md NHS Region
 */
export interface NhsRegion {
  readonly id: NhsRegionId;
  readonly officialCode: string;
  readonly name: string;
}

export const nhsRegionSchema: z.ZodType<NhsRegion> = z.strictObject({
  id: nhsRegionIdSchema,
  officialCode: z.string().min(1, 'Official code must be non-empty'),
  name: z.string().min(1, 'Name must be non-empty'),
});

/**
 * Reporting unit kinds per nation.
 *
 * @see GLOSSARY.md Reporting Unit, Independent Sector Provider
 * @see ADR-0003
 */
export const ENGLAND_REPORTING_UNIT_KINDS = ['nhs-trust', 'independent-sector-provider'] as const;
export const WALES_REPORTING_UNIT_KINDS = ['health-board', 'nhs-trust'] as const;
export const SCOTLAND_REPORTING_UNIT_KINDS = ['health-board', 'special-health-board'] as const;

export type EnglandReportingUnitKind = (typeof ENGLAND_REPORTING_UNIT_KINDS)[number];
export type WalesReportingUnitKind = (typeof WALES_REPORTING_UNIT_KINDS)[number];
export type ScotlandReportingUnitKind = (typeof SCOTLAND_REPORTING_UNIT_KINDS)[number];

export type ReportingUnitKind<N extends PublishingNation> = N extends 'england'
  ? EnglandReportingUnitKind
  : N extends 'wales'
    ? WalesReportingUnitKind
    : N extends 'scotland'
      ? ScotlandReportingUnitKind
      : never;

/**
 * Specific annotations on Reporting Units (e.g. Golden Jubilee National Hospital in Scotland).
 */
export const REPORTING_UNIT_NOTES = ['treats-patients-from-all-boards'] as const;
export type ReportingUnitNote = (typeof REPORTING_UNIT_NOTES)[number];

export interface OperationalPeriod {
  readonly from: string | null;
  readonly to: string | null;
}

const isoDatePattern = /^\d{4}-\d{2}-\d{2}$/;

function isValidIsoDate(str: string): boolean {
  if (!isoDatePattern.test(str)) return false;
  const parts = str.split('-');
  const y = Number(parts[0]);
  const m = Number(parts[1]);
  const d = Number(parts[2]);
  if (Number.isNaN(y) || Number.isNaN(m) || Number.isNaN(d)) return false;
  if (m < 1 || m > 12) return false;
  const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return d >= 1 && d <= daysInMonth;
}

export const operationalPeriodSchema: z.ZodType<OperationalPeriod> = z.strictObject({
  from: z
    .string()
    .refine((v) => isValidIsoDate(v), {
      message: 'Operational "from" must be a valid ISO date string (YYYY-MM-DD)',
    })
    .nullable(),
  to: z
    .string()
    .refine((v) => isValidIsoDate(v), {
      message: 'Operational "to" must be a valid ISO date string (YYYY-MM-DD)',
    })
    .nullable(),
});

/**
 * Base definition of a Reporting Unit.
 *
 * @see GLOSSARY.md Reporting Unit, Year-Earlier Comparison
 * @see ADR-0003
 */
export interface BaseReportingUnit<N extends PublishingNation> {
  readonly id: ReportingUnitId<N>;
  readonly officialCode: string;
  readonly officialName: string;
  readonly displayName: string;
  readonly kind: ReportingUnitKind<N>;
  readonly hospitalSites: readonly HospitalSiteId<N>[];
  readonly operational: OperationalPeriod;
  readonly predecessors: readonly ReportingUnitId<N>[];
  readonly successors: readonly ReportingUnitId<N>[];
  readonly notes: readonly ReportingUnitNote[];
}

export interface EnglandReportingUnit extends BaseReportingUnit<'england'> {
  readonly nhsRegion: NhsRegionId;
}

export type WalesReportingUnit = BaseReportingUnit<'wales'>;
export type ScotlandReportingUnit = BaseReportingUnit<'scotland'>;

export type ReportingUnit<N extends PublishingNation> = [SingleNation<N>] extends [never]
  ? never
  : N extends 'england'
    ? EnglandReportingUnit
    : N extends 'wales'
      ? WalesReportingUnit
      : N extends 'scotland'
        ? ScotlandReportingUnit
        : never;

/**
 * Creates a Zod schema validating a `ReportingUnit` for a given nation.
 */
export function reportingUnitSchema<N extends PublishingNation>(
  nation: N,
): z.ZodType<ReportingUnit<N>> {
  if (!isPublishingNation(nation)) {
    throw new TypeError(`Invalid publishing nation: "${String(nation)}"`);
  }

  const baseObjectShape = {
    id: nationScopedIdSchema(nation, 'reporting-unit'),
    officialCode: z.string().min(1, 'Official code must be non-empty'),
    officialName: z.string().min(1, 'Official name must be non-empty'),
    displayName: z.string().min(1, 'Display name must be non-empty'),
    hospitalSites: z.array(nationScopedIdSchema(nation, 'hospital-site')),
    operational: operationalPeriodSchema,
    predecessors: z.array(nationScopedIdSchema(nation, 'reporting-unit')),
    successors: z.array(nationScopedIdSchema(nation, 'reporting-unit')),
    notes: z.array(z.enum(REPORTING_UNIT_NOTES)),
  };

  if (nation === 'england') {
    return z.strictObject({
      ...baseObjectShape,
      kind: z.enum(ENGLAND_REPORTING_UNIT_KINDS),
      nhsRegion: nhsRegionIdSchema,
    }) as unknown as z.ZodType<ReportingUnit<N>>;
  }

  if (nation === 'wales') {
    return z.strictObject({
      ...baseObjectShape,
      kind: z.enum(WALES_REPORTING_UNIT_KINDS),
    }) as unknown as z.ZodType<ReportingUnit<N>>;
  }

  return z.strictObject({
    ...baseObjectShape,
    kind: z.enum(SCOTLAND_REPORTING_UNIT_KINDS),
  }) as unknown as z.ZodType<ReportingUnit<N>>;
}

/**
 * Physical hospital site run by a Reporting Unit.
 * Strictly context only; never includes postcodes, coordinates, or distance.
 *
 * @see GLOSSARY.md Hospital Site
 */
export type HospitalSite<N extends PublishingNation> = [SingleNation<N>] extends [never]
  ? never
  : {
      readonly id: HospitalSiteId<N>;
      readonly officialCode: string;
      readonly name: string;
      readonly town: string | null;
      readonly reportingUnit: ReportingUnitId<N>;
    };

/**
 * Creates a Zod schema validating a `HospitalSite` for a given nation.
 * Strict object rejects any extraneous fields such as postcode, lat, lon.
 */
export function hospitalSiteSchema<N extends PublishingNation>(
  nation: N,
): z.ZodType<HospitalSite<N>> {
  if (!isPublishingNation(nation)) {
    throw new TypeError(`Invalid publishing nation: "${String(nation)}"`);
  }

  return z.strictObject({
    id: nationScopedIdSchema(nation, 'hospital-site'),
    officialCode: z.string().min(1, 'Official code must be non-empty'),
    name: z.string().min(1, 'Name must be non-empty'),
    town: z.string().min(1, 'Town must be non-empty when provided').nullable(),
    reportingUnit: nationScopedIdSchema(nation, 'reporting-unit'),
  }) as unknown as z.ZodType<HospitalSite<N>>;
}

/**
 * Planned care specialty as officially defined by a Publishing Nation.
 *
 * @see GLOSSARY.md Specialty
 * @see ADR-0006
 */
export type Specialty<N extends PublishingNation> = [SingleNation<N>] extends [never]
  ? never
  : {
      readonly id: SpecialtyId<N>;
      readonly officialCode: string;
      readonly officialName: string;
      readonly slug: string;
      readonly descriptionKey: string;
      readonly isAllSpecialties: boolean;
    };

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/**
 * Creates a Zod schema validating a `Specialty` for a given nation.
 */
export function specialtySchema<N extends PublishingNation>(nation: N): z.ZodType<Specialty<N>> {
  if (!isPublishingNation(nation)) {
    throw new TypeError(`Invalid publishing nation: "${String(nation)}"`);
  }

  return z.strictObject({
    id: nationScopedIdSchema(nation, 'specialty'),
    officialCode: z.string().min(1, 'Official code must be non-empty'),
    officialName: z.string().min(1, 'Official name must be non-empty'),
    slug: z
      .string()
      .regex(slugPattern, 'Specialty slug must be lowercase alphanumeric with single hyphens'),
    descriptionKey: z.string().min(1, 'Description key must be non-empty'),
    isAllSpecialties: z.boolean(),
  }) as unknown as z.ZodType<Specialty<N>>;
}

/**
 * Reference data bundle for a publishing nation.
 */
export interface BaseReferenceData<N extends PublishingNation> {
  readonly nation: N;
  readonly reportingUnits: readonly ReportingUnit<N>[];
  readonly hospitalSites: readonly HospitalSite<N>[];
  readonly specialties: readonly Specialty<N>[];
  readonly retrievedAt: string;
  readonly sources: readonly SourceRef<N>[];
}

export interface EnglandReferenceData extends BaseReferenceData<'england'> {
  readonly nhsRegions: readonly NhsRegion[];
}

export type WalesReferenceData = BaseReferenceData<'wales'>;
export type ScotlandReferenceData = BaseReferenceData<'scotland'>;

export type ReferenceData<N extends PublishingNation> = [SingleNation<N>] extends [never]
  ? never
  : N extends 'england'
    ? EnglandReferenceData
    : N extends 'wales'
      ? WalesReferenceData
      : N extends 'scotland'
        ? ScotlandReferenceData
        : never;

function isValidIsoDateTime(str: string): boolean {
  const d = new Date(str);
  return !Number.isNaN(d.getTime()) && str.includes('T');
}

/**
 * Creates a Zod schema validating a complete `ReferenceData` bundle for a given nation.
 */
export function referenceDataSchema<N extends PublishingNation>(
  nation: N,
): z.ZodType<ReferenceData<N>> {
  if (!isPublishingNation(nation)) {
    throw new TypeError(`Invalid publishing nation: "${String(nation)}"`);
  }

  const baseShape = {
    nation: z.literal(nation),
    reportingUnits: z.array(reportingUnitSchema(nation)),
    hospitalSites: z.array(hospitalSiteSchema(nation)),
    specialties: z.array(specialtySchema(nation)),
    retrievedAt: z.string().refine((v) => isValidIsoDateTime(v), {
      message: 'retrievedAt must be a valid ISO 8601 datetime string',
    }),
    sources: z
      .array(sourceRefSchema(nation))
      .min(1, 'Sources must contain at least one source ref'),
  };

  if (nation === 'england') {
    return z.strictObject({
      ...baseShape,
      nhsRegions: z
        .array(nhsRegionSchema)
        .min(1, 'England reference data must include NHS regions'),
    }) as unknown as z.ZodType<ReferenceData<N>>;
  }

  return z.strictObject(baseShape) as unknown as z.ZodType<ReferenceData<N>>;
}
