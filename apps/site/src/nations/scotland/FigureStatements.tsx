import React from 'react';
import type { PublishedFigure, PublishedUnitSpecialty } from '@kyw/model/published';
import {
  SCOTLAND_STATISTIC_LONG_WAIT_COUNT,
  SCOTLAND_STATISTIC_MEDIAN_ONGOING_WAIT,
  SCOTLAND_STATISTIC_TOTAL_WAITING,
  SCOTLAND_STATISTIC_WITHIN_WAITING_STANDARD_COUNT,
  SCOTLAND_WAIT_STAGE_NEW_OUTPATIENT,
  scotlandStages,
} from '@kyw/model/scotland/definitions';
import { FigureBlock } from '../../components/figures/FigureBlock';
import { daysToWholeWeeks, formatCount, formatReportingPeriod } from '../../i18n/format';
import { t } from '../../i18n';

export interface FigureStatementsProps {
  entry: PublishedUnitSpecialty<'scotland'>;
  className?: string;
}

function renderMedianBlock(fig: PublishedFigure<'scotland'>) {
  let statement: string | undefined;

  if (fig.value.status === 'published') {
    const reportingPeriod = formatReportingPeriod(fig.reportingPeriod);
    const days = Math.round(fig.value.value);
    const weeks = daysToWholeWeeks(days);
    let yearEarlier = '';

    if (fig.yearEarlier.status === 'shown' && fig.yearEarlier.value.status === 'published') {
      const prevDays = Math.round(fig.yearEarlier.value.value);
      const prevWeeks = daysToWholeWeeks(prevDays);
      yearEarlier = t('scotland', 'yearEarlierComparison', {
        weeks: prevWeeks,
        days: prevDays,
      });
    }

    statement = t('scotland', 'medianStatement', {
      reportingPeriod,
      weeks,
      days,
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

function renderWithinStandardBlock(
  fig: PublishedFigure<'scotland'>,
  totalFig?: PublishedFigure<'scotland'>,
) {
  if (fig.value.status === 'published' && totalFig?.value.status !== 'published') {
    return null;
  }

  let statement: string | undefined;

  if (fig.value.status === 'published' && totalFig?.value.status === 'published') {
    const within = formatCount(fig.value.value);
    const total = formatCount(totalFig.value.value);
    const totalCount = totalFig.value.value;

    statement = t('scotland', 'withinStandardStatement', {
      within,
      total,
      totalCount,
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

function renderLongWaitBlock(fig: PublishedFigure<'scotland'>) {
  let statement: string | undefined;

  if (fig.value.status === 'published') {
    const count = fig.value.value;
    const formattedCount = formatCount(count);

    statement = t('scotland', 'longWaitStatement', {
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

  const sections = scotlandStages
    .map((stage) => {
      const stageFigures = figures.filter((f) => f.waitStage === stage.id);
      if (stageFigures.length === 0) {
        return null;
      }

      const medianFig = stageFigures.find(
        (f) => f.statistic === SCOTLAND_STATISTIC_MEDIAN_ONGOING_WAIT.id,
      );
      const withinStandardFig = stageFigures.find(
        (f) => f.statistic === SCOTLAND_STATISTIC_WITHIN_WAITING_STANDARD_COUNT.id,
      );
      const totalFig = stageFigures.find(
        (f) => f.statistic === SCOTLAND_STATISTIC_TOTAL_WAITING.id,
      );
      const longWaitFig = stageFigures.find(
        (f) => f.statistic === SCOTLAND_STATISTIC_LONG_WAIT_COUNT.id,
      );

      if (!medianFig && !withinStandardFig && !longWaitFig) {
        return null;
      }

      const stageHeading =
        stage.id === SCOTLAND_WAIT_STAGE_NEW_OUTPATIENT.id
          ? t('scotland', 'newOutpatientHeading')
          : t('scotland', 'inpatientDayCaseHeading');

      const headingId = `scotland-wait-stage-${stage.id.replace('scotland:', '')}-heading`;

      return (
        <section key={stage.id} aria-labelledby={headingId}>
          <h2 id={headingId}>{stageHeading}</h2>
          {medianFig ? renderMedianBlock(medianFig) : null}
          {withinStandardFig ? renderWithinStandardBlock(withinStandardFig, totalFig) : null}
          {longWaitFig ? renderLongWaitBlock(longWaitFig) : null}
        </section>
      );
    })
    .filter(Boolean);

  if (sections.length === 0) {
    return null;
  }

  return <div className={className}>{sections}</div>;
}
