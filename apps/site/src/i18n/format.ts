import type { PublicationDate, ReportingPeriod } from '@kyw/model/period';

function parseIsoDateToUtc(isoString: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoString);
  if (!match) {
    throw new TypeError(`Invalid ISO date format: "${isoString}" (expected YYYY-MM-DD)`);
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  return new Date(Date.UTC(year, month - 1, day));
}

const dateFormatter = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
});

const countFormatter = new Intl.NumberFormat('en-GB');

/**
 * Formats a branded ReportingPeriod date as "D MMMM YYYY" in en-GB (e.g. "31 August 2026").
 *
 * @see GLOSSARY.md Reporting Period
 */
export function formatReportingPeriod(period: ReportingPeriod): string {
  return dateFormatter.format(parseIsoDateToUtc(period));
}

/**
 * Formats a branded PublicationDate date as "D MMMM YYYY" in en-GB (e.g. "9 October 2026").
 *
 * @see GLOSSARY.md Publication Date
 */
export function formatPublicationDate(date: PublicationDate): string {
  return dateFormatter.format(parseIsoDateToUtc(date));
}

/**
 * Formats a count with thousands separators in en-GB (e.g. "1,234").
 */
export function formatCount(count: number): string {
  return countFormatter.format(count);
}

/**
 * Formats weeks as published with no rounding.
 *
 * @see Assumption A-08
 */
export function formatWeeks(weeks: number): string {
  return String(weeks);
}

/**
 * Formats median weeks rounded to 1 decimal place with trailing .0 dropped.
 *
 * @see Assumption A-08
 */
export function formatMedianWeeks(weeks: number): string {
  const rounded = Math.round(weeks * 10) / 10;
  return rounded.toLocaleString('en-GB', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
  });
}

/**
 * Converts days to whole weeks display-only: Math.round(days / 7).
 *
 * @see Assumption A-08
 */
export function daysToWholeWeeks(days: number): number {
  return Math.round(days / 7);
}
