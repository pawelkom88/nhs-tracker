import { z } from 'zod';

declare const reportingPeriodBrand: unique symbol;
declare const publicationDateBrand: unique symbol;

/**
 * Branded ISO date string (`YYYY-MM-DD`) representing the "as at" list snapshot date.
 *
 * In all three nations, reporting periods represent month ends.
 *
 * @see GLOSSARY.md Reporting Period
 * @see ADR-0002
 * @see ADR-0006
 */
export type ReportingPeriod = string & {
  readonly [reportingPeriodBrand]: 'ReportingPeriod';
};

/**
 * Branded ISO date string (`YYYY-MM-DD`) representing when a Publishing Nation released a figure.
 *
 * @see GLOSSARY.md Publication Date
 * @see ADR-0002
 * @see ADR-0006
 */
export type PublicationDate = string & {
  readonly [publicationDateBrand]: 'PublicationDate';
};

function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

function getDaysInMonth(year: number, month: number): number {
  switch (month) {
    case 2:
      return isLeapYear(year) ? 29 : 28;
    case 4:
    case 6:
    case 9:
    case 11:
      return 30;
    default:
      return 31;
  }
}

interface ParsedIsoDate {
  year: number;
  month: number;
  day: number;
}

function parseAndValidateIsoDate(iso: unknown, label: string): ParsedIsoDate {
  if (typeof iso !== 'string') {
    throw new TypeError(`${label} must be a string`);
  }
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match) {
    throw new TypeError(`${label} "${iso}" must be in YYYY-MM-DD format`);
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  if (year < 1900 || year > 2100) {
    throw new RangeError(
      `${label} "${iso}" has year ${String(year)} outside valid range (1900-2100)`,
    );
  }

  if (month < 1 || month > 12) {
    throw new RangeError(`${label} "${iso}" has invalid month ${String(month)} (must be 01-12)`);
  }

  const maxDays = getDaysInMonth(year, month);
  if (day < 1 || day > maxDays) {
    throw new RangeError(
      `${label} "${iso}" has invalid day ${String(day)} for month ${String(month)} in year ${String(year)} (max ${String(maxDays)})`,
    );
  }

  return { year, month, day };
}

/**
 * Constructs a validated `ReportingPeriod` from an ISO date string (`YYYY-MM-DD`).
 *
 * Throws `TypeError` or `RangeError` if the string is not a valid calendar date.
 */
export function reportingPeriod(iso: string): ReportingPeriod {
  parseAndValidateIsoDate(iso, 'ReportingPeriod');
  return iso as ReportingPeriod;
}

/**
 * Constructs a validated `PublicationDate` from an ISO date string (`YYYY-MM-DD`).
 *
 * Throws `TypeError` or `RangeError` if the string is not a valid calendar date.
 */
export function publicationDate(iso: string): PublicationDate {
  parseAndValidateIsoDate(iso, 'PublicationDate');
  return iso as PublicationDate;
}

/**
 * Calculates the `ReportingPeriod` 12 months before the given period, preserving month-end alignment.
 *
 * @example
 * yearEarlierThan(reportingPeriod('2026-02-28')) // '2025-02-28'
 * yearEarlierThan(reportingPeriod('2024-02-29')) // '2023-02-28'
 * yearEarlierThan(reportingPeriod('2025-02-28')) // '2024-02-29'
 * yearEarlierThan(reportingPeriod('2026-06-30')) // '2025-06-30'
 */
export function yearEarlierThan(period: ReportingPeriod): ReportingPeriod {
  const { year, month, day } = parseAndValidateIsoDate(period, 'ReportingPeriod');
  const targetYear = year - 1;
  const isMonthEnd = day === getDaysInMonth(year, month);

  const targetDay = isMonthEnd
    ? getDaysInMonth(targetYear, month)
    : Math.min(day, getDaysInMonth(targetYear, month));

  const pad = (n: number): string => String(n).padStart(2, '0');
  const formatted = `${String(targetYear)}-${pad(month)}-${pad(targetDay)}`;
  return formatted as ReportingPeriod;
}

/**
 * Computes the whole calendar months between two `ReportingPeriod` instances.
 *
 * Used for the Carried-Forward Figure ≤12-month rule.
 */
export function monthsBetween(older: ReportingPeriod, newer: ReportingPeriod): number {
  const o = parseAndValidateIsoDate(older, 'older ReportingPeriod');
  const n = parseAndValidateIsoDate(newer, 'newer ReportingPeriod');
  return (n.year - o.year) * 12 + (n.month - o.month);
}

/**
 * Chronological comparator for sorting `ReportingPeriod` values.
 */
export function compareReportingPeriods(a: ReportingPeriod, b: ReportingPeriod): number {
  return a.localeCompare(b);
}

/**
 * Zod schema validating a real calendar ISO `YYYY-MM-DD` date as a `ReportingPeriod`.
 */
export const reportingPeriodSchema: z.ZodType<ReportingPeriod> = z
  .string()
  .refine(
    (val): val is string => {
      try {
        parseAndValidateIsoDate(val, 'ReportingPeriod');
        return true;
      } catch {
        return false;
      }
    },
    { message: 'Invalid ReportingPeriod: must be a valid calendar date in YYYY-MM-DD format' },
  )
  .transform((val) => val as ReportingPeriod);

/**
 * Zod schema validating a real calendar ISO `YYYY-MM-DD` date as a `PublicationDate`.
 */
export const publicationDateSchema: z.ZodType<PublicationDate> = z
  .string()
  .refine(
    (val): val is string => {
      try {
        parseAndValidateIsoDate(val, 'PublicationDate');
        return true;
      } catch {
        return false;
      }
    },
    { message: 'Invalid PublicationDate: must be a valid calendar date in YYYY-MM-DD format' },
  )
  .transform((val) => val as PublicationDate);
