import React from 'react';
import type { PublishedFigure, PublishedUnitSpecialty } from '@kyw/model/published';
import {
  ENGLAND_STATISTIC_LONG_WAIT_COUNT,
  ENGLAND_STATISTIC_MEDIAN_ONGOING_WAIT,
  ENGLAND_STATISTIC_WITHIN_WAITING_STANDARD,
  ENGLAND_WAIT_STAGE_RTT_INCOMPLETE_PATHWAY,
} from '@kyw/model/england/definitions';
import { FigureBlock } from '../../components/figures/FigureBlock';
import { formatCount, formatMedianWeeks, formatReportingPeriod } from '../../i18n/format';
import { t } from '../../i18n';

export interface FigureStatementsProps {
  entry: PublishedUnitSpecialty<'england'>;
  className?: string;
}

function renderMedianBlock(fig: PublishedFigure<'england'>) {
  let statement: string | undefined;

  if (fig.value.status === 'published') {
    const reportingPeriod = formatReportingPeriod(fig.reportingPeriod);
    const weeks = formatMedianWeeks(fig.value.value);
    let yearEarlier = '';

    if (fig.yearEarlier.status === 'shown' && fig.yearEarlier.value.status === 'published') {
      yearEarlier = t('england', 'yearEarlierComparison', {
        weeks: formatMedianWeeks(fig.yearEarlier.value.value),
        count: fig.yearEarlier.value.value,
      });
    }

    statement = t('england', 'medianStatement', {
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

function renderWithinStandardBlock(fig: PublishedFigure<'england'>) {
  let statement: string | undefined;

  if (fig.value.status === 'published') {
    const rawPercent = fig.value.value * 100;
    const isExact = Math.abs(rawPercent - Math.round(rawPercent / 10) * 10) < 0.001;
    const approx = isExact ? 'false' : 'true';
    const ratio = Math.round(fig.value.value * 10);
    const percent = rawPercent.toLocaleString('en-GB', {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    });
    const standardWeeks = ENGLAND_WAIT_STAGE_RTT_INCOMPLETE_PATHWAY.waitingStandard.weeks;

    statement = t('england', 'withinStandardStatement', {
      approx,
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

function renderLongWaitBlock(fig: PublishedFigure<'england'>) {
  let statement: string | undefined;

  if (fig.value.status === 'published') {
    const count = fig.value.value;
    const formattedCount = formatCount(count);

    statement = t('england', 'longWaitStatement', {
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

  const medianFig = figures.find((f) => f.statistic === ENGLAND_STATISTIC_MEDIAN_ONGOING_WAIT.id);
  const withinStandardFig = figures.find(
    (f) => f.statistic === ENGLAND_STATISTIC_WITHIN_WAITING_STANDARD.id,
  );
  const longWaitFig = figures.find((f) => f.statistic === ENGLAND_STATISTIC_LONG_WAIT_COUNT.id);

  if (!medianFig && !withinStandardFig && !longWaitFig) {
    return null;
  }

  return (
    <section className={className} aria-labelledby="england-wait-stage-heading">
      <h2 id="england-wait-stage-heading">{t('england', 'stageHeading')}</h2>
      {medianFig ? renderMedianBlock(medianFig) : null}
      {withinStandardFig ? renderWithinStandardBlock(withinStandardFig) : null}
      {longWaitFig ? renderLongWaitBlock(longWaitFig) : null}
    </section>
  );
}
