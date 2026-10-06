import { afterEach, describe, expect, test } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import React from 'react';
import type { PublishedFigure, PublishedUnitSpecialty } from '@kyw/model/published';
import type { PublicationDate, ReportingPeriod } from '@kyw/model/period';
import type { ReportingUnitId, SpecialtyId, StatisticId } from '@kyw/model/ids';
import type { SourceRef } from '@kyw/model/source';
import {
  ENGLAND_STATISTIC_LONG_WAIT_COUNT,
  ENGLAND_STATISTIC_MEDIAN_ONGOING_WAIT,
  ENGLAND_STATISTIC_WITHIN_WAITING_STANDARD,
  ENGLAND_WAIT_STAGE_RTT_INCOMPLETE_PATHWAY,
} from '@kyw/model/england/definitions';
import { FigureStatements } from '../../../src/nations/england/FigureStatements';

afterEach(() => {
  cleanup();
});

const mockReportingPeriod = '2026-07-31' as ReportingPeriod;
const mockPublicationDate = '2026-09-10' as PublicationDate;
const mockReportingUnit = 'england:RRK' as ReportingUnitId<'england'>;
const mockSpecialty = 'england:C_110' as SpecialtyId<'england'>;
const mockWaitStage = ENGLAND_WAIT_STAGE_RTT_INCOMPLETE_PATHWAY.id;

const mockSource: SourceRef<'england'> = {
  licence: 'OGL-3.0',
  attribution:
    'Contains public sector information licensed under the Open Government Licence v3.0. Source: NHS England, Consultant-led Referral to Treatment Waiting Times.',
  nation: 'england',
  publisher: 'NHS England',
  title: 'NHS England Consultant-led Referral to Treatment (RTT) Waiting Times',
  url: 'https://www.england.nhs.uk/statistics/statistical-work-areas/rtt-waiting-times/',
};

function createMockFigure(
  statistic: StatisticId<'england'>,
  value: number | 'suppressed',
  options: {
    yearEarlier?: PublishedFigure<'england'>['yearEarlier'];
    provisional?: boolean;
    reportingPeriod?: ReportingPeriod;
    publicationDate?: PublicationDate;
  } = {},
): PublishedFigure<'england'> {
  const isSuppressed = value === 'suppressed';
  const unit =
    statistic === ENGLAND_STATISTIC_MEDIAN_ONGOING_WAIT.id
      ? 'weeks'
      : statistic === ENGLAND_STATISTIC_WITHIN_WAITING_STANDARD.id
        ? 'proportion'
        : 'count';

  return {
    nation: 'england',
    reportingUnit: mockReportingUnit,
    specialty: mockSpecialty,
    waitStage: mockWaitStage,
    statistic,
    reportingPeriod: options.reportingPeriod ?? mockReportingPeriod,
    publicationDate: options.publicationDate ?? mockPublicationDate,
    unit,
    value: isSuppressed
      ? { status: 'suppressed', provisional: options.provisional ?? false }
      : { status: 'published', value, provisional: options.provisional ?? false },
    provenance: {
      kind: 'official',
      sourceField:
        statistic === ENGLAND_STATISTIC_MEDIAN_ONGOING_WAIT.id
          ? 'Average (median) waiting time (in weeks)'
          : statistic === ENGLAND_STATISTIC_WITHIN_WAITING_STANDARD.id
            ? '% within 18 weeks'
            : 'Total 52 plus weeks',
    },
    source: mockSource,
    yearEarlier: options.yearEarlier ?? {
      status: 'omitted',
      reason:
        statistic === ENGLAND_STATISTIC_MEDIAN_ONGOING_WAIT.id ? 'not-in-release' : 'not-median',
    },
  };
}

function createMockEntry(figures: PublishedFigure<'england'>[]): PublishedUnitSpecialty<'england'> {
  return {
    reportingUnit: mockReportingUnit,
    specialty: mockSpecialty,
    state: { kind: 'current' },
    figures,
  };
}

describe('England FigureStatements (T-8.7)', () => {
  test('renders wait stage heading with official name', () => {
    const entry = createMockEntry([
      createMockFigure(ENGLAND_STATISTIC_MEDIAN_ONGOING_WAIT.id, 12.5),
    ]);

    render(<FigureStatements entry={entry} />);

    const heading = screen.getByRole('heading', { level: 2 });
    expect(heading.textContent).toBe('Referral to treatment (incomplete pathways)');
  });

  test('renders exact string for median from unrounded published float (12.5229007633588)', () => {
    const entry = createMockEntry([
      createMockFigure(ENGLAND_STATISTIC_MEDIAN_ONGOING_WAIT.id, 12.5229007633588),
    ]);

    const { container } = render(<FigureStatements entry={entry} />);

    const statement = container.querySelector('.figure-statement');
    expect(statement?.textContent).toBe(
      'Half of people waiting at 31 July 2026 had waited 12.5 weeks or less.',
    );
  });

  test('renders single week singular form for median when value is 1', () => {
    const entry = createMockEntry([createMockFigure(ENGLAND_STATISTIC_MEDIAN_ONGOING_WAIT.id, 1)]);

    const { container } = render(<FigureStatements entry={entry} />);

    const statement = container.querySelector('.figure-statement');
    expect(statement?.textContent).toBe(
      'Half of people waiting at 31 July 2026 had waited 1 week or less.',
    );
  });

  test('appends year-earlier comparison when shown', () => {
    const entry = createMockEntry([
      createMockFigure(ENGLAND_STATISTIC_MEDIAN_ONGOING_WAIT.id, 12.5, {
        yearEarlier: {
          status: 'shown',
          value: { status: 'published', value: 14.1, provisional: false },
          reportingPeriod: '2025-07-31' as ReportingPeriod,
          publicationDate: '2025-09-11' as PublicationDate,
        },
      }),
    ]);

    const { container } = render(<FigureStatements entry={entry} />);

    const statement = container.querySelector('.figure-statement');
    expect(statement?.textContent).toBe(
      'Half of people waiting at 31 July 2026 had waited 12.5 weeks or less. (a year earlier: 14.1 weeks)',
    );
  });

  test('appends year-earlier comparison with singular week form for 1 week', () => {
    const entry = createMockEntry([
      createMockFigure(ENGLAND_STATISTIC_MEDIAN_ONGOING_WAIT.id, 12.5, {
        yearEarlier: {
          status: 'shown',
          value: { status: 'published', value: 1, provisional: false },
          reportingPeriod: '2025-07-31' as ReportingPeriod,
          publicationDate: '2025-09-11' as PublicationDate,
        },
      }),
    ]);

    const { container } = render(<FigureStatements entry={entry} />);

    const statement = container.querySelector('.figure-statement');
    expect(statement?.textContent).toBe(
      'Half of people waiting at 31 July 2026 had waited 12.5 weeks or less. (a year earlier: 1 week)',
    );
  });

  test.each([
    'not-in-release',
    'unit-changed',
    'specialty-changed',
    'suppressed',
    'not-median',
  ] as const)('renders nothing extra when year-earlier reason is "%s"', (reason) => {
    const entry = createMockEntry([
      createMockFigure(ENGLAND_STATISTIC_MEDIAN_ONGOING_WAIT.id, 12.5, {
        yearEarlier: {
          status: 'omitted',
          reason,
        },
      }),
    ]);

    const { container } = render(<FigureStatements entry={entry} />);

    const statement = container.querySelector('.figure-statement');
    expect(statement?.textContent).toBe(
      'Half of people waiting at 31 July 2026 had waited 12.5 weeks or less.',
    );
    expect(statement?.textContent).not.toContain('year earlier');
  });

  test('renders within-standard statement with 18 weeks and exact rounded ratio/percentage from proportion 0.650234…', () => {
    const entry = createMockEntry([
      createMockFigure(ENGLAND_STATISTIC_WITHIN_WAITING_STANDARD.id, 0.650234),
    ]);

    const { container } = render(<FigureStatements entry={entry} />);

    const statement = container.querySelector('.figure-statement');
    expect(statement?.textContent).toBe('About 7 in 10 (65.0%) had waited less than 18 weeks.');
  });

  test('renders within-standard statement for lower proportion (0.58 -> About 6 in 10 (58.0%))', () => {
    const entry = createMockEntry([
      createMockFigure(ENGLAND_STATISTIC_WITHIN_WAITING_STANDARD.id, 0.58),
    ]);

    const { container } = render(<FigureStatements entry={entry} />);

    const statement = container.querySelector('.figure-statement');
    expect(statement?.textContent).toBe('About 6 in 10 (58.0%) had waited less than 18 weeks.');
  });

  test('renders long wait statement with singular plural form for 1 person', () => {
    const entry = createMockEntry([createMockFigure(ENGLAND_STATISTIC_LONG_WAIT_COUNT.id, 1)]);

    const { container } = render(<FigureStatements entry={entry} />);

    const statement = container.querySelector('.figure-statement');
    expect(statement?.textContent).toBe('1 person had waited over a year.');
  });

  test('renders long wait statement with plural form for 420 people', () => {
    const entry = createMockEntry([createMockFigure(ENGLAND_STATISTIC_LONG_WAIT_COUNT.id, 420)]);

    const { container } = render(<FigureStatements entry={entry} />);

    const statement = container.querySelector('.figure-statement');
    expect(statement?.textContent).toBe('420 people had waited over a year.');
  });

  test('renders long wait statement with formatted thousands separator for 1,234 people', () => {
    const entry = createMockEntry([createMockFigure(ENGLAND_STATISTIC_LONG_WAIT_COUNT.id, 1234)]);

    const { container } = render(<FigureStatements entry={entry} />);

    const statement = container.querySelector('.figure-statement');
    expect(statement?.textContent).toBe('1,234 people had waited over a year.');
  });

  test('renders all three figures in canonical order: median, within-standard, long wait', () => {
    // Pass figures in reversed order to ensure component enforces canonical order
    const entry = createMockEntry([
      createMockFigure(ENGLAND_STATISTIC_LONG_WAIT_COUNT.id, 42),
      createMockFigure(ENGLAND_STATISTIC_WITHIN_WAITING_STANDARD.id, 0.65),
      createMockFigure(ENGLAND_STATISTIC_MEDIAN_ONGOING_WAIT.id, 12.5),
    ]);

    const { container } = render(<FigureStatements entry={entry} />);

    const statements = container.querySelectorAll('.figure-statement');
    expect(statements.length).toBe(3);
    expect(statements[0]?.textContent).toContain('Half of people waiting');
    expect(statements[1]?.textContent).toContain('About 7 in 10');
    expect(statements[2]?.textContent).toContain('42 people had waited over a year.');
  });

  test('omits block when a statistic is missing from the entry (never invents missing figures)', () => {
    const entry = createMockEntry([
      createMockFigure(ENGLAND_STATISTIC_MEDIAN_ONGOING_WAIT.id, 10.1),
      createMockFigure(ENGLAND_STATISTIC_LONG_WAIT_COUNT.id, 5),
    ]);

    const { container } = render(<FigureStatements entry={entry} />);

    const statements = container.querySelectorAll('.figure-statement');
    expect(statements.length).toBe(2);
    expect(statements[0]?.textContent).toContain('Half of people waiting');
    expect(statements[1]?.textContent).toContain('5 people had waited over a year.');
    expect(container.textContent).not.toContain('About');
  });

  test('returns null when entry has no figures or no recognized statistics', () => {
    const entryEmpty = createMockEntry([]);
    const { container: container1 } = render(<FigureStatements entry={entryEmpty} />);
    expect(container1.firstChild).toBeNull();
  });

  test('suppressed median renders "Not published (small numbers)", contains no "0", and is not blank', () => {
    const entry = createMockEntry([
      createMockFigure(ENGLAND_STATISTIC_MEDIAN_ONGOING_WAIT.id, 'suppressed'),
      createMockFigure(ENGLAND_STATISTIC_WITHIN_WAITING_STANDARD.id, 0.65),
    ]);

    const { container } = render(<FigureStatements entry={entry} />);

    const statements = container.querySelectorAll('.figure-statement');
    expect(statements.length).toBe(2);
    expect(statements[0]?.textContent).toBe('Not published (small numbers)');
    expect(statements[0]?.textContent).not.toContain('0');
    expect(statements[0]?.textContent).not.toBe('');
    expect(statements[1]?.textContent).toBe('About 7 in 10 (65.0%) had waited less than 18 weeks.');
  });

  test('dates separation: Reporting Period in statement, Publication Date in published line only', () => {
    const entry = createMockEntry([
      createMockFigure(ENGLAND_STATISTIC_MEDIAN_ONGOING_WAIT.id, 12.5, {
        reportingPeriod: '2026-07-31' as ReportingPeriod,
        publicationDate: '2026-09-10' as PublicationDate,
      }),
    ]);

    const { container } = render(<FigureStatements entry={entry} />);

    const statementEl = container.querySelector('.figure-statement');
    expect(statementEl?.textContent).toContain('31 July 2026');
    expect(statementEl?.textContent).not.toContain('10 September 2026');

    const publishedEl = container.querySelector('p:last-of-type');
    expect(publishedEl?.textContent).toContain('10 September 2026');
    expect(publishedEl?.textContent).not.toContain('31 July 2026');
  });

  test('captions present on every figure block with source link', () => {
    const entry = createMockEntry([
      createMockFigure(ENGLAND_STATISTIC_MEDIAN_ONGOING_WAIT.id, 12.5),
      createMockFigure(ENGLAND_STATISTIC_WITHIN_WAITING_STANDARD.id, 0.65),
      createMockFigure(ENGLAND_STATISTIC_LONG_WAIT_COUNT.id, 10),
    ]);

    const { container } = render(<FigureStatements entry={entry} />);

    const captions = container.querySelectorAll('figcaption');
    expect(captions.length).toBe(3);
    for (const caption of captions) {
      expect(caption.textContent).toContain(
        'This shows people already on the list as of 31 July 2026, from NHS England Consultant-led Referral to Treatment (RTT) Waiting Times.',
      );
    }
  });
});
