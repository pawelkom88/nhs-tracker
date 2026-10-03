import { describe, expect, it } from 'vitest';
import {
  compareReportingPeriods,
  monthsBetween,
  publicationDate,
  publicationDateSchema,
  reportingPeriod,
  reportingPeriodSchema,
  yearEarlierThan,
} from '../src/period.js';

describe('ReportingPeriod and PublicationDate constructors', () => {
  it('accepts valid calendar dates', () => {
    expect(reportingPeriod('2026-02-28')).toBe('2026-02-28');
    expect(reportingPeriod('2024-02-29')).toBe('2024-02-29'); // Leap year
    expect(publicationDate('2026-03-15')).toBe('2026-03-15');
  });

  it('rejects invalid date formats', () => {
    expect(() => reportingPeriod('2026/02/28')).toThrow(TypeError);
    expect(() => reportingPeriod('2026-2-28')).toThrow(TypeError);
    expect(() => reportingPeriod('28-02-2026')).toThrow(TypeError);
    expect(() => reportingPeriod('')).toThrow(TypeError);
    // @ts-expect-error test invalid type at runtime
    expect(() => reportingPeriod(123)).toThrow(TypeError);
  });

  it('rejects non-existent calendar dates', () => {
    expect(() => reportingPeriod('2026-02-29')).toThrow(RangeError); // 2026 is not leap year
    expect(() => reportingPeriod('2026-02-30')).toThrow(RangeError);
    expect(() => reportingPeriod('2026-04-31')).toThrow(RangeError);
    expect(() => reportingPeriod('2026-06-31')).toThrow(RangeError);
    expect(() => reportingPeriod('2026-00-10')).toThrow(RangeError);
    expect(() => reportingPeriod('2026-13-01')).toThrow(RangeError);
    expect(() => reportingPeriod('2026-01-00')).toThrow(RangeError);
    expect(() => reportingPeriod('2026-01-32')).toThrow(RangeError);
  });

  it('rejects out of range years', () => {
    expect(() => reportingPeriod('1899-12-31')).toThrow(RangeError);
    expect(() => reportingPeriod('2101-01-01')).toThrow(RangeError);
  });
});

describe('yearEarlierThan', () => {
  it('subtracts 12 months preserving month-end alignment', () => {
    // Standard non-leap month ends
    expect(yearEarlierThan(reportingPeriod('2026-02-28'))).toBe('2025-02-28');
    expect(yearEarlierThan(reportingPeriod('2026-06-30'))).toBe('2025-06-30');
    expect(yearEarlierThan(reportingPeriod('2026-03-31'))).toBe('2025-03-31');

    // Leap year Feb 29 to non-leap Feb 28
    expect(yearEarlierThan(reportingPeriod('2024-02-29'))).toBe('2023-02-28');

    // Non-leap Feb 28 to leap year Feb 29 (month-end preserved)
    expect(yearEarlierThan(reportingPeriod('2025-02-28'))).toBe('2024-02-29');

    // Mid-month dates (if used)
    expect(yearEarlierThan(reportingPeriod('2026-01-15'))).toBe('2025-01-15');
  });
});

describe('monthsBetween', () => {
  it('calculates whole calendar months between periods', () => {
    expect(monthsBetween(reportingPeriod('2025-01-31'), reportingPeriod('2026-01-31'))).toBe(12);
    expect(monthsBetween(reportingPeriod('2025-06-30'), reportingPeriod('2026-06-30'))).toBe(12);
    expect(monthsBetween(reportingPeriod('2025-10-31'), reportingPeriod('2026-01-31'))).toBe(3);
    expect(monthsBetween(reportingPeriod('2026-01-31'), reportingPeriod('2026-01-31'))).toBe(0);
    expect(monthsBetween(reportingPeriod('2026-01-31'), reportingPeriod('2025-01-31'))).toBe(-12);
  });
});

describe('compareReportingPeriods', () => {
  it('compares periods chronologically', () => {
    expect(
      compareReportingPeriods(reportingPeriod('2025-12-31'), reportingPeriod('2026-01-31')),
    ).toBeLessThan(0);
    expect(
      compareReportingPeriods(reportingPeriod('2026-01-31'), reportingPeriod('2025-12-31')),
    ).toBeGreaterThan(0);
    expect(
      compareReportingPeriods(reportingPeriod('2026-01-31'), reportingPeriod('2026-01-31')),
    ).toBe(0);

    const unsorted = [
      reportingPeriod('2026-03-31'),
      reportingPeriod('2025-12-31'),
      reportingPeriod('2026-01-31'),
    ];
    const sorted = [...unsorted].sort(compareReportingPeriods);
    expect(sorted).toEqual(['2025-12-31', '2026-01-31', '2026-03-31']);
  });
});

describe('Zod schemas', () => {
  it('validates reportingPeriodSchema', () => {
    expect(reportingPeriodSchema.parse('2026-01-31')).toBe('2026-01-31');
    expect(() => reportingPeriodSchema.parse('2026-02-30')).toThrow();
    expect(() => reportingPeriodSchema.parse('invalid')).toThrow();
  });

  it('validates publicationDateSchema', () => {
    expect(publicationDateSchema.parse('2026-03-12')).toBe('2026-03-12');
    expect(() => publicationDateSchema.parse('2026-04-31')).toThrow();
    expect(() => publicationDateSchema.parse('invalid')).toThrow();
  });
});
