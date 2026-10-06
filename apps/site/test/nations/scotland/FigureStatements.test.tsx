import { afterEach, describe, expect, test } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import React from 'react';
import type { PublishedFigure, PublishedUnitSpecialty } from '@kyw/model/published';
import type { PublicationDate, ReportingPeriod } from '@kyw/model/period';
import type { ReportingUnitId, SpecialtyId, StatisticId, WaitStageId } from '@kyw/model/ids';
import type { SourceRef } from '@kyw/model/source';
import {
  SCOTLAND_STATISTIC_LONG_WAIT_COUNT,
  SCOTLAND_STATISTIC_MEDIAN_ONGOING_WAIT,
  SCOTLAND_STATISTIC_TOTAL_WAITING,
  SCOTLAND_STATISTIC_WITHIN_WAITING_STANDARD_COUNT,
  SCOTLAND_WAIT_STAGE_INPATIENT_DAY_CASE,
  SCOTLAND_WAIT_STAGE_NEW_OUTPATIENT,
} from '@kyw/model/scotland/definitions';
import { FigureStatements } from '../../../src/nations/scotland/FigureStatements';

afterEach(() => {
  cleanup();
});

const mockReportingPeriod = '2026-08-31' as ReportingPeriod;
const mockPublicationDate = '2026-10-06' as PublicationDate;
const mockReportingUnit = 'scotland:S08000015' as ReportingUnitId<'scotland'>; // NHS Ayrshire and Arran
const mockSpecialty = 'scotland:C8' as SpecialtyId<'scotland'>; // T&O

const mockSource: SourceRef<'scotland'> = {
  licence: 'OGL-3.0',
  attribution:
    'Source: Public Health Scotland, Stage of Treatment Waiting Times (opendata.nhs.scot). Contains public sector information licensed under the Open Government Licence v3.0.',
  nation: 'scotland',
  publisher: 'Public Health Scotland',
  title: 'Stage of Treatment Waiting Times - Inpatients, Day Cases and New Outpatients',
  url: 'https://publichealthscotland.scot/publications/stage-of-treatment-waiting-times/',
};

function createMockFigure(
  waitStage: WaitStageId<'scotland'>,
  statistic: StatisticId<'scotland'>,
  value: number | 'suppressed',
  options: {
    yearEarlier?: PublishedFigure<'scotland'>['yearEarlier'];
    provisional?: boolean;
    reportingPeriod?: ReportingPeriod;
    publicationDate?: PublicationDate;
  } = {},
): PublishedFigure<'scotland'> {
  const isSuppressed = value === 'suppressed';
  const unit = statistic === SCOTLAND_STATISTIC_MEDIAN_ONGOING_WAIT.id ? 'days' : 'count';
  const isDerived = statistic === SCOTLAND_STATISTIC_WITHIN_WAITING_STANDARD_COUNT.id;

  return {
    nation: 'scotland',
    reportingUnit: mockReportingUnit,
    specialty: mockSpecialty,
    waitStage,
    statistic,
    reportingPeriod: options.reportingPeriod ?? mockReportingPeriod,
    publicationDate: options.publicationDate ?? mockPublicationDate,
    unit,
    value: isSuppressed
      ? { status: 'suppressed', provisional: options.provisional ?? false }
      : { status: 'published', value, provisional: options.provisional ?? false },
    provenance: isDerived
      ? {
          kind: 'derived',
          method: 'exact-sum',
          inputs: ['LessThan4WeekWait', '4To8WeekWait', '8To12WeekWait'],
        }
      : {
          kind: 'official',
          sourceField:
            statistic === SCOTLAND_STATISTIC_MEDIAN_ONGOING_WAIT.id
              ? 'Median'
              : statistic === SCOTLAND_STATISTIC_LONG_WAIT_COUNT.id
                ? 'WaitsOver52Weeks'
                : 'Waits',
        },
    source: mockSource,
    yearEarlier: options.yearEarlier ?? {
      status: 'omitted',
      reason:
        statistic === SCOTLAND_STATISTIC_MEDIAN_ONGOING_WAIT.id ? 'not-in-release' : 'not-median',
    },
  };
}

function createMockEntry(
  figures: PublishedFigure<'scotland'>[],
): PublishedUnitSpecialty<'scotland'> {
  return {
    reportingUnit: mockReportingUnit,
    specialty: mockSpecialty,
    state: { kind: 'current' },
    figures,
  };
}

describe('Scotland FigureStatements (T-8.9)', () => {
  test('renders two separate sections with distinct official headings for both wait stages', () => {
    const entry = createMockEntry([
      createMockFigure(
        SCOTLAND_WAIT_STAGE_NEW_OUTPATIENT.id,
        SCOTLAND_STATISTIC_MEDIAN_ONGOING_WAIT.id,
        126,
      ),
      createMockFigure(
        SCOTLAND_WAIT_STAGE_INPATIENT_DAY_CASE.id,
        SCOTLAND_STATISTIC_MEDIAN_ONGOING_WAIT.id,
        84,
      ),
    ]);

    render(<FigureStatements entry={entry} />);

    const headings = screen.getAllByRole('heading', { level: 2 });
    expect(headings.length).toBe(2);
    expect(headings[0]?.textContent).toBe('New Outpatient');
    expect(headings[1]?.textContent).toBe('Inpatient/Day case');
  });

  test('renders exact string for median in days converted to display weeks (126 days -> about 18 weeks (126 days))', () => {
    const entry = createMockEntry([
      createMockFigure(
        SCOTLAND_WAIT_STAGE_NEW_OUTPATIENT.id,
        SCOTLAND_STATISTIC_MEDIAN_ONGOING_WAIT.id,
        126,
      ),
    ]);

    const { container } = render(<FigureStatements entry={entry} />);

    const statement = container.querySelector('.figure-statement');
    expect(statement?.textContent).toBe(
      'Half of people waiting at 31 August 2026 had waited about 18 weeks (126 days) or less.',
    );
  });

  test('renders singular week/day forms for median (e.g. 7 days -> about 1 week (7 days); 1 day -> about 0 weeks (1 day))', () => {
    const entry7 = createMockEntry([
      createMockFigure(
        SCOTLAND_WAIT_STAGE_NEW_OUTPATIENT.id,
        SCOTLAND_STATISTIC_MEDIAN_ONGOING_WAIT.id,
        7,
      ),
    ]);
    const { container: container7 } = render(<FigureStatements entry={entry7} />);
    const stmt7 = container7.querySelector('.figure-statement');
    expect(stmt7?.textContent).toBe(
      'Half of people waiting at 31 August 2026 had waited about 1 week (7 days) or less.',
    );
    cleanup();

    const entry1 = createMockEntry([
      createMockFigure(
        SCOTLAND_WAIT_STAGE_NEW_OUTPATIENT.id,
        SCOTLAND_STATISTIC_MEDIAN_ONGOING_WAIT.id,
        1,
      ),
    ]);
    const { container: container1 } = render(<FigureStatements entry={entry1} />);
    const stmt1 = container1.querySelector('.figure-statement');
    expect(stmt1?.textContent).toBe(
      'Half of people waiting at 31 August 2026 had waited about 0 weeks (1 day) or less.',
    );
  });

  test('appends year-earlier comparison when shown with days and weeks', () => {
    const entry = createMockEntry([
      createMockFigure(
        SCOTLAND_WAIT_STAGE_NEW_OUTPATIENT.id,
        SCOTLAND_STATISTIC_MEDIAN_ONGOING_WAIT.id,
        126,
        {
          yearEarlier: {
            status: 'shown',
            value: { status: 'published', value: 98, provisional: false },
            reportingPeriod: '2025-08-31' as ReportingPeriod,
            publicationDate: '2025-10-07' as PublicationDate,
          },
        },
      ),
    ]);

    const { container } = render(<FigureStatements entry={entry} />);

    const statement = container.querySelector('.figure-statement');
    expect(statement?.textContent).toBe(
      'Half of people waiting at 31 August 2026 had waited about 18 weeks (126 days) or less. (a year earlier: about 14 weeks (98 days))',
    );
  });

  test('appends year-earlier comparison with singular week/day forms when appropriate', () => {
    const entry = createMockEntry([
      createMockFigure(
        SCOTLAND_WAIT_STAGE_NEW_OUTPATIENT.id,
        SCOTLAND_STATISTIC_MEDIAN_ONGOING_WAIT.id,
        126,
        {
          yearEarlier: {
            status: 'shown',
            value: { status: 'published', value: 7, provisional: false },
            reportingPeriod: '2025-08-31' as ReportingPeriod,
            publicationDate: '2025-10-07' as PublicationDate,
          },
        },
      ),
    ]);

    const { container } = render(<FigureStatements entry={entry} />);

    const statement = container.querySelector('.figure-statement');
    expect(statement?.textContent).toBe(
      'Half of people waiting at 31 August 2026 had waited about 18 weeks (126 days) or less. (a year earlier: about 1 week (7 days))',
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
      createMockFigure(
        SCOTLAND_WAIT_STAGE_NEW_OUTPATIENT.id,
        SCOTLAND_STATISTIC_MEDIAN_ONGOING_WAIT.id,
        126,
        {
          yearEarlier: {
            status: 'omitted',
            reason,
          },
        },
      ),
    ]);

    const { container } = render(<FigureStatements entry={entry} />);

    const statement = container.querySelector('.figure-statement');
    expect(statement?.textContent).toBe(
      'Half of people waiting at 31 August 2026 had waited about 18 weeks (126 days) or less.',
    );
    expect(statement?.textContent).not.toContain('year earlier');
  });

  test('renders within-standard statement with "{within} of {total} people had waited less than 12 weeks." and Derived label', () => {
    const entry = createMockEntry([
      createMockFigure(
        SCOTLAND_WAIT_STAGE_NEW_OUTPATIENT.id,
        SCOTLAND_STATISTIC_WITHIN_WAITING_STANDARD_COUNT.id,
        1234,
      ),
      createMockFigure(
        SCOTLAND_WAIT_STAGE_NEW_OUTPATIENT.id,
        SCOTLAND_STATISTIC_TOTAL_WAITING.id,
        2000,
      ),
    ]);

    const { container } = render(<FigureStatements entry={entry} />);

    const statement = container.querySelector('.figure-statement');
    expect(statement?.textContent).toBe('1,234 of 2,000 people had waited less than 12 weeks.');

    // Checks derived label is present
    expect(container.textContent).toContain(
      'Calculated by Know Your Wait by adding published figures from the same release.',
    );
  });

  test('renders within-standard statement with singular person form when total is 1', () => {
    const entry = createMockEntry([
      createMockFigure(
        SCOTLAND_WAIT_STAGE_NEW_OUTPATIENT.id,
        SCOTLAND_STATISTIC_WITHIN_WAITING_STANDARD_COUNT.id,
        1,
      ),
      createMockFigure(
        SCOTLAND_WAIT_STAGE_NEW_OUTPATIENT.id,
        SCOTLAND_STATISTIC_TOTAL_WAITING.id,
        1,
      ),
    ]);

    const { container } = render(<FigureStatements entry={entry} />);

    const statement = container.querySelector('.figure-statement');
    expect(statement?.textContent).toBe('1 of 1 person had waited less than 12 weeks.');
  });

  test('renders long wait statement with singular and plural forms (1 person / 420 people / 1,234 people) with NO derived label', () => {
    const entry1 = createMockEntry([
      createMockFigure(
        SCOTLAND_WAIT_STAGE_NEW_OUTPATIENT.id,
        SCOTLAND_STATISTIC_LONG_WAIT_COUNT.id,
        1,
      ),
    ]);
    const { container: c1 } = render(<FigureStatements entry={entry1} />);
    expect(c1.querySelector('.figure-statement')?.textContent).toBe(
      '1 person had waited over a year.',
    );
    expect(c1.textContent).not.toContain('Calculated by Know Your Wait');
    cleanup();

    const entry420 = createMockEntry([
      createMockFigure(
        SCOTLAND_WAIT_STAGE_NEW_OUTPATIENT.id,
        SCOTLAND_STATISTIC_LONG_WAIT_COUNT.id,
        420,
      ),
    ]);
    const { container: c420 } = render(<FigureStatements entry={entry420} />);
    expect(c420.querySelector('.figure-statement')?.textContent).toBe(
      '420 people had waited over a year.',
    );
    expect(c420.textContent).not.toContain('Calculated by Know Your Wait');
    cleanup();

    const entry1234 = createMockEntry([
      createMockFigure(
        SCOTLAND_WAIT_STAGE_NEW_OUTPATIENT.id,
        SCOTLAND_STATISTIC_LONG_WAIT_COUNT.id,
        1234,
      ),
    ]);
    const { container: c1234 } = render(<FigureStatements entry={entry1234} />);
    expect(c1234.querySelector('.figure-statement')?.textContent).toBe(
      '1,234 people had waited over a year.',
    );
    expect(c1234.textContent).not.toContain('Calculated by Know Your Wait');
  });

  test('asserts NO percentage symbol (%) appears anywhere in Scotland output (Blocking Finding B-1)', () => {
    const entry = createMockEntry([
      createMockFigure(
        SCOTLAND_WAIT_STAGE_NEW_OUTPATIENT.id,
        SCOTLAND_STATISTIC_MEDIAN_ONGOING_WAIT.id,
        126,
      ),
      createMockFigure(
        SCOTLAND_WAIT_STAGE_NEW_OUTPATIENT.id,
        SCOTLAND_STATISTIC_WITHIN_WAITING_STANDARD_COUNT.id,
        650,
      ),
      createMockFigure(
        SCOTLAND_WAIT_STAGE_NEW_OUTPATIENT.id,
        SCOTLAND_STATISTIC_TOTAL_WAITING.id,
        1000,
      ),
      createMockFigure(
        SCOTLAND_WAIT_STAGE_NEW_OUTPATIENT.id,
        SCOTLAND_STATISTIC_LONG_WAIT_COUNT.id,
        42,
      ),
      createMockFigure(
        SCOTLAND_WAIT_STAGE_INPATIENT_DAY_CASE.id,
        SCOTLAND_STATISTIC_MEDIAN_ONGOING_WAIT.id,
        84,
      ),
      createMockFigure(
        SCOTLAND_WAIT_STAGE_INPATIENT_DAY_CASE.id,
        SCOTLAND_STATISTIC_WITHIN_WAITING_STANDARD_COUNT.id,
        300,
      ),
      createMockFigure(
        SCOTLAND_WAIT_STAGE_INPATIENT_DAY_CASE.id,
        SCOTLAND_STATISTIC_TOTAL_WAITING.id,
        500,
      ),
      createMockFigure(
        SCOTLAND_WAIT_STAGE_INPATIENT_DAY_CASE.id,
        SCOTLAND_STATISTIC_LONG_WAIT_COUNT.id,
        15,
      ),
    ]);

    const { container } = render(<FigureStatements entry={entry} />);
    expect(container.textContent).not.toContain('%');
  });

  test('proves non-summation: no number on the page equals the sum of the two stages values', () => {
    // Stage 1 values: median=111, within=222, total=333, long=444
    // Stage 2 values: median=555, within=666, total=777, long=888
    // Possible sums:
    // Medians sum: 111 + 555 = 666 (note: distinct from within/long values chosen below)
    // Stage 1 median=105, Stage 2 median=115 -> sum = 220
    // Stage 1 within=301, Stage 2 within=403 -> sum = 704
    // Stage 1 long=13, Stage 2 long=17 -> sum = 30
    const entry = createMockEntry([
      createMockFigure(
        SCOTLAND_WAIT_STAGE_NEW_OUTPATIENT.id,
        SCOTLAND_STATISTIC_MEDIAN_ONGOING_WAIT.id,
        105,
      ),
      createMockFigure(
        SCOTLAND_WAIT_STAGE_NEW_OUTPATIENT.id,
        SCOTLAND_STATISTIC_WITHIN_WAITING_STANDARD_COUNT.id,
        301,
      ),
      createMockFigure(
        SCOTLAND_WAIT_STAGE_NEW_OUTPATIENT.id,
        SCOTLAND_STATISTIC_TOTAL_WAITING.id,
        500,
      ),
      createMockFigure(
        SCOTLAND_WAIT_STAGE_NEW_OUTPATIENT.id,
        SCOTLAND_STATISTIC_LONG_WAIT_COUNT.id,
        13,
      ),

      createMockFigure(
        SCOTLAND_WAIT_STAGE_INPATIENT_DAY_CASE.id,
        SCOTLAND_STATISTIC_MEDIAN_ONGOING_WAIT.id,
        115,
      ),
      createMockFigure(
        SCOTLAND_WAIT_STAGE_INPATIENT_DAY_CASE.id,
        SCOTLAND_STATISTIC_WITHIN_WAITING_STANDARD_COUNT.id,
        403,
      ),
      createMockFigure(
        SCOTLAND_WAIT_STAGE_INPATIENT_DAY_CASE.id,
        SCOTLAND_STATISTIC_TOTAL_WAITING.id,
        600,
      ),
      createMockFigure(
        SCOTLAND_WAIT_STAGE_INPATIENT_DAY_CASE.id,
        SCOTLAND_STATISTIC_LONG_WAIT_COUNT.id,
        17,
      ),
    ]);

    const { container } = render(<FigureStatements entry={entry} />);
    const text = container.textContent;

    // None of the stage sums should exist anywhere in the text
    expect(text).not.toContain('220'); // 105 + 115
    expect(text).not.toContain('704'); // 301 + 403
    expect(text).not.toContain('1,100'); // 500 + 600
    expect(text).not.toContain('30 people'); // 13 + 17
  });

  test('renders figures in canonical order: median, within-standard, long wait for each stage', () => {
    // Provide figures in arbitrary order
    const entry = createMockEntry([
      createMockFigure(
        SCOTLAND_WAIT_STAGE_NEW_OUTPATIENT.id,
        SCOTLAND_STATISTIC_LONG_WAIT_COUNT.id,
        50,
      ),
      createMockFigure(
        SCOTLAND_WAIT_STAGE_NEW_OUTPATIENT.id,
        SCOTLAND_STATISTIC_TOTAL_WAITING.id,
        1000,
      ),
      createMockFigure(
        SCOTLAND_WAIT_STAGE_NEW_OUTPATIENT.id,
        SCOTLAND_STATISTIC_WITHIN_WAITING_STANDARD_COUNT.id,
        750,
      ),
      createMockFigure(
        SCOTLAND_WAIT_STAGE_NEW_OUTPATIENT.id,
        SCOTLAND_STATISTIC_MEDIAN_ONGOING_WAIT.id,
        126,
      ),
    ]);

    const { container } = render(<FigureStatements entry={entry} />);

    const statements = container.querySelectorAll('.figure-statement');
    expect(statements.length).toBe(3);
    expect(statements[0]?.textContent).toContain('Half of people waiting');
    expect(statements[1]?.textContent).toContain(
      '750 of 1,000 people had waited less than 12 weeks.',
    );
    expect(statements[2]?.textContent).toContain('50 people had waited over a year.');
  });

  test('omits within-standard block when within-standard count is missing', () => {
    const entry = createMockEntry([
      createMockFigure(
        SCOTLAND_WAIT_STAGE_NEW_OUTPATIENT.id,
        SCOTLAND_STATISTIC_MEDIAN_ONGOING_WAIT.id,
        126,
      ),
      createMockFigure(
        SCOTLAND_WAIT_STAGE_NEW_OUTPATIENT.id,
        SCOTLAND_STATISTIC_TOTAL_WAITING.id,
        1000,
      ),
      createMockFigure(
        SCOTLAND_WAIT_STAGE_NEW_OUTPATIENT.id,
        SCOTLAND_STATISTIC_LONG_WAIT_COUNT.id,
        10,
      ),
    ]);

    const { container } = render(<FigureStatements entry={entry} />);

    const statements = container.querySelectorAll('.figure-statement');
    expect(statements.length).toBe(2);
    expect(statements[0]?.textContent).toContain('Half of people waiting');
    expect(statements[1]?.textContent).toContain('10 people had waited over a year.');
    expect(container.textContent).not.toContain('less than 12 weeks');
  });

  test('omits within-standard block when total-waiting figure is missing', () => {
    const entry = createMockEntry([
      createMockFigure(
        SCOTLAND_WAIT_STAGE_NEW_OUTPATIENT.id,
        SCOTLAND_STATISTIC_MEDIAN_ONGOING_WAIT.id,
        126,
      ),
      createMockFigure(
        SCOTLAND_WAIT_STAGE_NEW_OUTPATIENT.id,
        SCOTLAND_STATISTIC_WITHIN_WAITING_STANDARD_COUNT.id,
        750,
      ),
      // total-waiting is omitted!
    ]);

    const { container } = render(<FigureStatements entry={entry} />);

    const statements = container.querySelectorAll('.figure-statement');
    expect(statements.length).toBe(1);
    expect(statements[0]?.textContent).toContain('Half of people waiting');
    expect(container.textContent).not.toContain('less than 12 weeks');
  });

  test('returns null when entry has no figures or no recognized statistics', () => {
    const entryEmpty = createMockEntry([]);
    const { container: container1 } = render(<FigureStatements entry={entryEmpty} />);
    expect(container1.firstChild).toBeNull();
  });

  test('suppressed median renders "Not published (small numbers)", contains no "0", and is not blank', () => {
    const entry = createMockEntry([
      createMockFigure(
        SCOTLAND_WAIT_STAGE_NEW_OUTPATIENT.id,
        SCOTLAND_STATISTIC_MEDIAN_ONGOING_WAIT.id,
        'suppressed',
      ),
      createMockFigure(
        SCOTLAND_WAIT_STAGE_NEW_OUTPATIENT.id,
        SCOTLAND_STATISTIC_WITHIN_WAITING_STANDARD_COUNT.id,
        100,
      ),
      createMockFigure(
        SCOTLAND_WAIT_STAGE_NEW_OUTPATIENT.id,
        SCOTLAND_STATISTIC_TOTAL_WAITING.id,
        200,
      ),
    ]);

    const { container } = render(<FigureStatements entry={entry} />);

    const statements = container.querySelectorAll('.figure-statement');
    expect(statements.length).toBe(2);
    expect(statements[0]?.textContent).toBe('Not published (small numbers)');
    expect(statements[0]?.textContent).not.toContain('0');
    expect(statements[0]?.textContent).not.toBe('');
    expect(statements[1]?.textContent).toBe('100 of 200 people had waited less than 12 weeks.');
  });

  test('dates separation: month-end Reporting Period in statement, Publication Date only in published line', () => {
    const entry = createMockEntry([
      createMockFigure(
        SCOTLAND_WAIT_STAGE_NEW_OUTPATIENT.id,
        SCOTLAND_STATISTIC_MEDIAN_ONGOING_WAIT.id,
        126,
        {
          reportingPeriod: '2026-08-31' as ReportingPeriod,
          publicationDate: '2026-10-06' as PublicationDate,
        },
      ),
    ]);

    const { container } = render(<FigureStatements entry={entry} />);

    const statementEl = container.querySelector('.figure-statement');
    expect(statementEl?.textContent).toContain('31 August 2026');
    expect(statementEl?.textContent).not.toContain('6 October 2026');

    const publishedEl = container.querySelector('p:last-of-type');
    expect(publishedEl?.textContent).toContain('6 October 2026');
    expect(publishedEl?.textContent).not.toContain('31 August 2026');
  });

  test('captions present on every figure block with source link', () => {
    const entry = createMockEntry([
      createMockFigure(
        SCOTLAND_WAIT_STAGE_NEW_OUTPATIENT.id,
        SCOTLAND_STATISTIC_MEDIAN_ONGOING_WAIT.id,
        126,
      ),
      createMockFigure(
        SCOTLAND_WAIT_STAGE_NEW_OUTPATIENT.id,
        SCOTLAND_STATISTIC_WITHIN_WAITING_STANDARD_COUNT.id,
        750,
      ),
      createMockFigure(
        SCOTLAND_WAIT_STAGE_NEW_OUTPATIENT.id,
        SCOTLAND_STATISTIC_TOTAL_WAITING.id,
        1000,
      ),
      createMockFigure(
        SCOTLAND_WAIT_STAGE_NEW_OUTPATIENT.id,
        SCOTLAND_STATISTIC_LONG_WAIT_COUNT.id,
        10,
      ),
    ]);

    const { container } = render(<FigureStatements entry={entry} />);

    const captions = container.querySelectorAll('figcaption');
    expect(captions.length).toBe(3);
    for (const caption of captions) {
      expect(caption.textContent).toContain(
        'This shows people already on the list as of 31 August 2026, from Stage of Treatment Waiting Times - Inpatients, Day Cases and New Outpatients.',
      );
    }
  });
});
