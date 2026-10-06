import React from 'react';
import type { ReportingPeriod } from '@kyw/model/period';
import { formatReportingPeriod } from '../../i18n/format';
import { t } from '../../i18n';

export interface FigureCaptionProps {
  reportingPeriod: ReportingPeriod;
  sourceTitle: string;
  sourceUrl?: string;
  className?: string;
}

export function FigureCaption({
  reportingPeriod,
  sourceTitle,
  sourceUrl,
  className,
}: FigureCaptionProps) {
  const formattedPeriod = formatReportingPeriod(reportingPeriod);

  const sourceNode = sourceUrl ? (
    <a href={sourceUrl} className="underline">
      {sourceTitle}
    </a>
  ) : (
    sourceTitle
  );

  const template = t('figures', 'caption', {
    reportingPeriod: '___DATE___',
    source: '___SOURCE___',
  });

  const [beforeDate, afterDate] = template.split('___DATE___');
  const [middle, afterSource] = (afterDate ?? '').split('___SOURCE___');

  return (
    <figcaption className={className}>
      {beforeDate}
      <time dateTime={reportingPeriod}>{formattedPeriod}</time>
      {middle}
      {sourceNode}
      {afterSource}
    </figcaption>
  );
}
