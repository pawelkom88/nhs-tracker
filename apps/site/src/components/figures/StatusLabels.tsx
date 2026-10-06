import React from 'react';
import type { ReportingPeriod } from '@kyw/model/period';
import { formatReportingPeriod } from '../../i18n/format';
import { t } from '../../i18n';

export interface ProvisionalTagProps {
  className?: string;
}

export function ProvisionalTag({ className }: ProvisionalTagProps) {
  return (
    <span role="status" className={className}>
      {t('status', 'provisional')}
    </span>
  );
}

export interface DerivedLabelProps {
  sourceTitle?: string;
  sourceUrl?: string;
  className?: string;
}

export function DerivedLabel({ sourceTitle, sourceUrl, className }: DerivedLabelProps) {
  return (
    <p className={className}>
      {t('status', 'derived')}
      {sourceTitle ? (
        <>
          {' ('}
          {sourceUrl ? (
            <a href={sourceUrl} className="underline">
              {sourceTitle}
            </a>
          ) : (
            sourceTitle
          )}
          {')'}
        </>
      ) : null}
    </p>
  );
}

export interface SuppressedNoticeProps {
  className?: string;
}

export function SuppressedNotice({ className }: SuppressedNoticeProps) {
  return <p className={className}>{t('status', 'suppressed')}</p>;
}

export interface CarriedForwardWarningProps {
  unitName: string;
  reportingPeriod: ReportingPeriod;
  latestReportingPeriod: ReportingPeriod;
  className?: string;
}

export function CarriedForwardWarning({
  unitName,
  reportingPeriod,
  latestReportingPeriod,
  className,
}: CarriedForwardWarningProps) {
  const formattedPeriod = formatReportingPeriod(reportingPeriod);
  const formattedLatest = formatReportingPeriod(latestReportingPeriod);

  const template = t('status', 'carriedForward', {
    unitName,
    reportingPeriod: '___PERIOD___',
    latestReportingPeriod: '___LATEST___',
  });

  const [beforePeriod, afterPeriod] = template.split('___PERIOD___');
  const [middle, afterLatest] = (afterPeriod ?? '').split('___LATEST___');

  return (
    <div role="note" className={className}>
      <p>
        {beforePeriod}
        <time dateTime={reportingPeriod}>{formattedPeriod}</time>
        {middle}
        <time dateTime={latestReportingPeriod}>{formattedLatest}</time>
        {afterLatest}
      </p>
    </div>
  );
}

export interface NoRecentFiguresProps {
  reportingPeriod: ReportingPeriod;
  className?: string;
}

export function NoRecentFigures({ reportingPeriod, className }: NoRecentFiguresProps) {
  const formattedPeriod = formatReportingPeriod(reportingPeriod);
  const template = t('status', 'noRecentFigures', {
    reportingPeriod: '___PERIOD___',
  });

  const [beforePeriod, afterPeriod] = template.split('___PERIOD___');

  return (
    <div role="note" className={className}>
      <p>
        {beforePeriod}
        <time dateTime={reportingPeriod}>{formattedPeriod}</time>
        {afterPeriod}
      </p>
    </div>
  );
}
