import { afterEach, describe, expect, test } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import React from 'react';
import type { FigureValue, Provenance } from '@kyw/model/figure';
import type { PublicationDate, ReportingPeriod } from '@kyw/model/period';
import { FigureCaption } from '../../src/components/figures/FigureCaption';
import { PublishedLine } from '../../src/components/figures/PublishedLine';
import {
  CarriedForwardWarning,
  DerivedLabel,
  NoRecentFigures,
  ProvisionalTag,
  SuppressedNotice,
} from '../../src/components/figures/StatusLabels';
import { FigureBlock } from '../../src/components/figures/FigureBlock';

afterEach(() => {
  cleanup();
});

const mockReportingPeriod = '2026-08-31' as ReportingPeriod;
const mockPublicationDate = '2026-10-09' as PublicationDate;
const mockSourceTitle = 'NHS England RTT waiting times';
const mockSourceUrl =
  'https://www.england.nhs.uk/statistics/statistical-work-areas/rtt-waiting-times/';
const mockPublisher = 'NHS England';

describe('FigureCaption (T-8.6)', () => {
  test('caption text equals the PRD caption exactly with formatted Reporting Period and source', () => {
    const { container } = render(
      <FigureCaption
        reportingPeriod={mockReportingPeriod}
        sourceTitle={mockSourceTitle}
        sourceUrl={mockSourceUrl}
      />,
    );

    const expectedText =
      'This shows people already on the list as of 31 August 2026, from NHS England RTT waiting times. It is not a prediction of how long you will wait. Waits change month to month and depend on your clinical need.';

    const caption = container.querySelector('figcaption');
    expect(caption).not.toBeNull();
    expect(caption?.textContent).toBe(expectedText);

    const timeElement = container.querySelector('time');
    expect(timeElement).not.toBeNull();
    expect(timeElement?.getAttribute('dateTime')).toBe(mockReportingPeriod);
    expect(timeElement?.textContent).toBe('31 August 2026');

    const sourceLink = container.querySelector('a');
    expect(sourceLink).not.toBeNull();
    expect(sourceLink?.getAttribute('href')).toBe(mockSourceUrl);
    expect(sourceLink?.textContent).toBe(mockSourceTitle);
  });
});

describe('PublishedLine (T-8.6)', () => {
  test('shows formatted Publication Date and publisher with semantic time element', () => {
    const { container } = render(
      <PublishedLine
        publicationDate={mockPublicationDate}
        publisher={mockPublisher}
        sourceUrl={mockSourceUrl}
      />,
    );

    const expectedText = 'Published 9 October 2026 by NHS England';
    expect(container.textContent).toBe(expectedText);

    const timeElement = container.querySelector('time');
    expect(timeElement).not.toBeNull();
    expect(timeElement?.getAttribute('dateTime')).toBe(mockPublicationDate);
    expect(timeElement?.textContent).toBe('9 October 2026');
  });
});

describe('StatusLabels (T-8.6)', () => {
  test('ProvisionalTag renders "Provisional"', () => {
    render(<ProvisionalTag />);
    expect(screen.getByText('Provisional')).not.toBeNull();
  });

  test('DerivedLabel renders calculation notice and source', () => {
    const { container } = render(
      <DerivedLabel sourceTitle={mockSourceTitle} sourceUrl={mockSourceUrl} />,
    );

    const expectedText =
      'Calculated by Know Your Wait by adding published figures from the same release. (NHS England RTT waiting times)';
    expect(container.textContent).toBe(expectedText);

    const link = container.querySelector('a');
    expect(link).not.toBeNull();
    expect(link?.getAttribute('href')).toBe(mockSourceUrl);
  });

  test('SuppressedNotice renders "Not published (small numbers)"', () => {
    const { container } = render(<SuppressedNotice />);
    expect(container.textContent).toBe('Not published (small numbers)');
    expect(container.textContent).not.toContain('0');
  });

  test('CarriedForwardWarning renders unit name, both dates, and time elements', () => {
    const olderPeriod = '2026-05-31' as ReportingPeriod;
    const latestPeriod = '2026-08-31' as ReportingPeriod;

    const { container } = render(
      <CarriedForwardWarning
        unitName="Guy's and St Thomas' NHS Foundation Trust"
        reportingPeriod={olderPeriod}
        latestReportingPeriod={latestPeriod}
      />,
    );

    const expectedText =
      "These are the most recent figures for Guy's and St Thomas' NHS Foundation Trust, as at 31 May 2026. Guy's and St Thomas' NHS Foundation Trust was not in the latest release (31 August 2026).";
    expect(container.textContent).toBe(expectedText);

    const timeElements = container.querySelectorAll('time');
    expect(timeElements.length).toBe(2);
    expect(timeElements[0]?.getAttribute('dateTime')).toBe(olderPeriod);
    expect(timeElements[0]?.textContent).toBe('31 May 2026');
    expect(timeElements[1]?.getAttribute('dateTime')).toBe(latestPeriod);
    expect(timeElements[1]?.textContent).toBe('31 August 2026');
  });

  test('NoRecentFigures renders period and time element', () => {
    const { container } = render(<NoRecentFigures reportingPeriod={mockReportingPeriod} />);

    const expectedText = 'No figures published since 31 August 2026.';
    expect(container.textContent).toBe(expectedText);

    const timeElement = container.querySelector('time');
    expect(timeElement).not.toBeNull();
    expect(timeElement?.getAttribute('dateTime')).toBe(mockReportingPeriod);
    expect(timeElement?.textContent).toBe('31 August 2026');
  });
});

describe('FigureBlock (T-8.6)', () => {
  const publishedValue: FigureValue = {
    status: 'published',
    value: 14,
    provisional: false,
  };

  const officialProvenance: Provenance = {
    kind: 'official',
    sourceField: 'Median wait (weeks)',
  };

  test('renders published statement, caption, published line, and source link with dates in distinct elements', () => {
    const statementText = 'Half of people waiting at 31 August 2026 had waited 14 weeks or less.';

    const { container } = render(
      <FigureBlock
        statement={statementText}
        status={publishedValue}
        provenance={officialProvenance}
        reportingPeriod={mockReportingPeriod}
        publicationDate={mockPublicationDate}
        sourceTitle={mockSourceTitle}
        sourceUrl={mockSourceUrl}
        publisher={mockPublisher}
      />,
    );

    // Statement contains the reporting period, not the publication date
    const statementEl = container.querySelector('.figure-statement');
    expect(statementEl).not.toBeNull();
    expect(statementEl?.textContent).toContain('31 August 2026');
    expect(statementEl?.textContent).not.toContain('9 October 2026');

    // Caption uses reporting period, not publication date
    const captionEl = container.querySelector('figcaption');
    expect(captionEl).not.toBeNull();
    expect(captionEl?.textContent).toContain('31 August 2026');
    expect(captionEl?.textContent).not.toContain('9 October 2026');

    // PublishedLine uses publication date, not reporting period
    const publishedEl = container.querySelector('p:last-of-type');
    expect(publishedEl?.textContent).toContain('9 October 2026');
    expect(publishedEl?.textContent).not.toContain('31 August 2026');

    // Source link is present
    const sourceLinks = container.querySelectorAll(`a[href="${mockSourceUrl}"]`);
    expect(sourceLinks.length).toBeGreaterThanOrEqual(1);
  });

  test('suppressed figure renders "Not published (small numbers)", contains no "0", and ignores numeric statement', () => {
    const suppressedValue: FigureValue = {
      status: 'suppressed',
      provisional: false,
    };

    const { container } = render(
      <FigureBlock
        statement="0 people waited 0 weeks"
        status={suppressedValue}
        provenance={officialProvenance}
        reportingPeriod={mockReportingPeriod}
        publicationDate={mockPublicationDate}
        sourceTitle={mockSourceTitle}
        sourceUrl={mockSourceUrl}
        publisher={mockPublisher}
      />,
    );

    const statementEl = container.querySelector('.figure-statement');
    expect(statementEl?.textContent).toBe('Not published (small numbers)');
    expect(statementEl?.textContent).not.toContain('0');
    expect(statementEl?.textContent).not.toBe('');
  });

  test('shows "Provisional" tag when provisional is true', () => {
    const provisionalVal: FigureValue = {
      status: 'published',
      value: 12,
      provisional: true,
    };

    render(
      <FigureBlock
        statement="Some statement"
        status={provisionalVal}
        provenance={officialProvenance}
        reportingPeriod={mockReportingPeriod}
        publicationDate={mockPublicationDate}
        sourceTitle={mockSourceTitle}
        sourceUrl={mockSourceUrl}
        publisher={mockPublisher}
      />,
    );

    expect(screen.getByText('Provisional')).not.toBeNull();
  });

  test('shows derived label and source when provenance is derived', () => {
    const derivedProvenance: Provenance = {
      kind: 'derived',
      method: 'exact-sum',
      inputs: ['waits_52_to_64', 'waits_65_plus'],
    };

    const { container } = render(
      <FigureBlock
        statement="420 people had waited over a year."
        status={publishedValue}
        provenance={derivedProvenance}
        reportingPeriod={mockReportingPeriod}
        publicationDate={mockPublicationDate}
        sourceTitle={mockSourceTitle}
        sourceUrl={mockSourceUrl}
        publisher={mockPublisher}
      />,
    );

    expect(
      screen.getByText(
        /Calculated by Know Your Wait by adding published figures from the same release/i,
      ),
    ).not.toBeNull();
    expect(container.textContent).toContain(mockSourceTitle);
  });
});
