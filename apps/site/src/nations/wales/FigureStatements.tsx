import React from 'react';
import type { PublishedFigure, PublishedUnitSpecialty } from '@kyw/model/published';
import {
  WALES_STATISTIC_LONG_WAIT_COUNT,
  WALES_STATISTIC_MEDIAN_ONGOING_WAIT,
  WALES_STATISTIC_WITHIN_WAITING_STANDARD,
  WALES_WAIT_STAGE_RTT_PATHWAY,
} from '@kyw/model/wales/definitions';
import { FigureBlock } from '../../components/figures/FigureBlock';
import { formatCount, formatMedianWeeks, formatReportingPeriod } from '../../i18n/format';
import { t } from '../../i18n';

export interface FigureStatementsProps {
  entry: PublishedUnitSpecialty<'wales'>;
  className?: string;
}

function renderMedianBlock(fig: PublishedFigure<'wales'>) {
  let statement: string | undefined;

  if (fig.value.status === 'published') {
    const reportingPeriod = formatReportingPeriod(fig.reportingPeriod);
    const weeks = formatMedianWeeks(fig.value.value);
    let yearEarlier = '';

    if (fig.yearEarlier.status === 'shown' && fig.yearEarlier.value.status === 'published') {
      yearEarlier = t('wales', 'yearEarlierComparison', {
        weeks: formatMedianWeeks(fig.yearEarlier.value.value),
        count: fig.yearEarlier.value.value,
      });
    }

    statement = t('wales', 'medianStatement', {
      reportingPeriod,
      weeks,
      count: fig.value.value,
      yearEarlier,
    });
  }

  return (
    <FigureBlock
      key={fig.statistic}
      statement={statement}
      status={fig.value}
      provenance={fig.provenance}
      reportingPeriod={fig.reportingPeriod}
      publicationDate={fig.publicationDate}
      sourceTitle={fig.source.title}
      sourceUrl={fig.source.url}
      publisher={fig.source.publisher}
    />
  );
}

function renderWithinStandardBlock(fig: PublishedFigure<'wales'>) {
  let statement: string | undefined;

  if (fig.value.status === 'published') {
    const ratio = Math.round(fig.value.value / 10);
    const percent = fig.value.value.toLocaleString('en-GB', {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    });
    const standardWeeks = WALES_WAIT_STAGE_RTT_PATHWAY.waitingStandard.weeks;

    statement = t('wales', 'withinStandardStatement', {
      ratio,
      percent,
      standardWeeks,
    });
  }

  return (
    <FigureBlock
      key={fig.statistic}
      statement={statement}
      status={fig.value}
      provenance={fig.provenance}
      reportingPeriod={fig.reportingPeriod}
      publicationDate={fig.publicationDate}
      sourceTitle={fig.source.title}
      sourceUrl={fig.source.url}
      publisher={fig.source.publisher}
    />
  );
}

function renderLongWaitBlock(fig: PublishedFigure<'wales'>) {
  let statement: string | undefined;

  if (fig.value.status === 'published') {
    const count = fig.value.value;
    const formattedCount = formatCount(count);

    statement = t('wales', 'longWaitStatement', {
      count,
      formattedCount,
    });
  }

  return (
    <FigureBlock
      key={fig.statistic}
      statement={statement}
      status={fig.value}
      provenance={fig.provenance}
      reportingPeriod={fig.reportingPeriod}
      publicationDate={fig.publicationDate}
      sourceTitle={fig.source.title}
      sourceUrl={fig.source.url}
      publisher={fig.source.publisher}
    />
  );
}

export function FigureStatements({ entry, className }: FigureStatementsProps) {
  const figures = entry.figures;
  if (figures.length === 0) {
    return null;
  }

  const medianFig = figures.find((f) => f.statistic === WALES_STATISTIC_MEDIAN_ONGOING_WAIT.id);
  const withinStandardFig = figures.find(
    (f) => f.statistic === WALES_STATISTIC_WITHIN_WAITING_STANDARD.id,
  );
  const longWaitFig = figures.find((f) => f.statistic === WALES_STATISTIC_LONG_WAIT_COUNT.id);

  if (!medianFig && !withinStandardFig && !longWaitFig) {
    return null;
  }

  return (
    <section className={className} aria-labelledby="wales-wait-stage-heading">
      <h2 id="wales-wait-stage-heading">{t('wales', 'stageHeading')}</h2>
      {medianFig ? renderMedianBlock(medianFig) : null}
      {withinStandardFig ? renderWithinStandardBlock(withinStandardFig) : null}
      {longWaitFig ? renderLongWaitBlock(longWaitFig) : null}
    </section>
  );
}
