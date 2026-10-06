import { describe, expect, expectTypeOf, test } from 'vitest';
import {
  publicationDate,
  reportingPeriod,
  type PublicationDate,
  type ReportingPeriod,
} from '@kyw/model/period';
import {
  daysToWholeWeeks,
  formatCount,
  formatMedianWeeks,
  formatPublicationDate,
  formatReportingPeriod,
  formatWeeks,
} from '../../src/i18n/format.js';
import { t, type MessageKey, type Messages } from '../../src/i18n/index.js';

describe('i18n date formatters', () => {
  test('formats ReportingPeriod as en-GB D MMMM YYYY', () => {
    const rp = reportingPeriod('2026-08-31');
    expect(formatReportingPeriod(rp)).toBe('31 August 2026');
  });

  test('formats PublicationDate as en-GB D MMMM YYYY', () => {
    const pd = publicationDate('2026-10-09');
    expect(formatPublicationDate(pd)).toBe('9 October 2026');
  });

  test('is timezone resilient across UTC boundaries', () => {
    const rpNewYear = reportingPeriod('2026-01-01');
    expect(formatReportingPeriod(rpNewYear)).toBe('1 January 2026');
  });

  test('throws TypeError on invalid ISO format', () => {
    expect(() => formatReportingPeriod('not-a-date' as unknown as ReportingPeriod)).toThrow(
      TypeError,
    );
  });

  test('type test: formatReportingPeriod rejects PublicationDate and unbranded strings', () => {
    const pd = publicationDate('2026-10-09');
    const rp = reportingPeriod('2026-08-31');

    expectTypeOf<Parameters<typeof formatReportingPeriod>[0]>().toEqualTypeOf<ReportingPeriod>();
    expectTypeOf<Parameters<typeof formatPublicationDate>[0]>().toEqualTypeOf<PublicationDate>();
    expectTypeOf<PublicationDate>().not.toExtend<ReportingPeriod>();
    expectTypeOf<ReportingPeriod>().not.toExtend<PublicationDate>();

    // @ts-expect-error formatReportingPeriod rejects PublicationDate
    formatReportingPeriod(pd);

    // @ts-expect-error formatPublicationDate rejects ReportingPeriod
    formatPublicationDate(rp);

    // @ts-expect-error formatReportingPeriod rejects unbranded string
    formatReportingPeriod('2026-08-31');

    // @ts-expect-error formatPublicationDate rejects unbranded string
    formatPublicationDate('2026-10-09');
  });
});

describe('number & week formatters', () => {
  test('formatCount adds thousands separators', () => {
    expect(formatCount(0)).toBe('0');
    expect(formatCount(42)).toBe('42');
    expect(formatCount(1234)).toBe('1,234');
    expect(formatCount(1234567)).toBe('1,234,567');
  });

  test('formatWeeks outputs as published without rounding (A-08)', () => {
    expect(formatWeeks(18)).toBe('18');
    expect(formatWeeks(26)).toBe('26');
    expect(formatWeeks(12.5)).toBe('12.5');
  });

  test('formatMedianWeeks rounds to 1 dp and drops trailing .0 (A-08)', () => {
    expect(formatMedianWeeks(12.5229007633588)).toBe('12.5');
    expect(formatMedianWeeks(14.0)).toBe('14');
    expect(formatMedianWeeks(14)).toBe('14');
    expect(formatMedianWeeks(0)).toBe('0');
  });

  test('daysToWholeWeeks rounds days / 7 to nearest whole week (A-08)', () => {
    expect(daysToWholeWeeks(126)).toBe(18);
    expect(daysToWholeWeeks(0)).toBe(0);
    expect(daysToWholeWeeks(7)).toBe(1);
    expect(daysToWholeWeeks(10)).toBe(1);
    expect(daysToWholeWeeks(11)).toBe(2);
  });
});

describe('t() translation function', () => {
  test('retrieves site name without NHS branding (ADR-0004)', () => {
    expect(t('common', 'siteName')).toBe('Know Your Wait');
  });

  test('retrieves nation names and common navigation strings', () => {
    expect(t('common', 'england')).toBe('England');
    expect(t('common', 'wales')).toBe('Wales');
    expect(t('common', 'scotland')).toBe('Scotland');
    expect(t('common', 'skipLink')).toBe('Skip to main content');
    expect(t('common', 'nation.england')).toBe('England');
  });

  test('handles ICU plural rules correctly', () => {
    expect(t('common', 'peopleCount', { count: 1 })).toBe('1 person');
    expect(t('common', 'peopleCount', { count: 42 })).toBe('42 people');
    expect(t('common', 'resultsCount', { count: 1 })).toBe('1 result');
    expect(t('common', 'resultsCount', { count: 12 })).toBe('12 results');
  });

  test('throws error at build time when key is missing', () => {
    // @ts-expect-error nonExistentKey is not in common.json
    expect(() => t('common', 'nonExistentKey')).toThrow(
      /Missing message key "nonExistentKey" in namespace "common"/,
    );
  });

  test('throws error when message namespace file is missing', () => {
    expect(() => t('unknown_namespace', 'someKey')).toThrow(/Message file not found/);
  });

  test('type test: unknown keys fail typecheck on known namespaces', () => {
    expectTypeOf<MessageKey<'common'>>().toEqualTypeOf<keyof Messages>();

    // @ts-expect-error unknown key on known namespace fails typecheck
    const _invalidKey: MessageKey<'common'> = 'does_not_exist';
    expectTypeOf(_invalidKey).toEqualTypeOf<MessageKey<'common'>>();
  });
});
