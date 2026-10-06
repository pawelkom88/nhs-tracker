import React from 'react';
import type { FigureValue, Provenance } from '@kyw/model/figure';
import type { PublicationDate, ReportingPeriod } from '@kyw/model/period';
import { FigureCaption } from './FigureCaption';
import { PublishedLine } from './PublishedLine';
import { DerivedLabel, ProvisionalTag, SuppressedNotice } from './StatusLabels';

export interface FigureBlockProps {
  statement?: React.ReactNode;
  status: FigureValue;
  provenance: Provenance;
  reportingPeriod: ReportingPeriod;
  publicationDate: PublicationDate;
  sourceTitle: string;
  sourceUrl: string;
  publisher: string;
  className?: string;
}

export function FigureBlock({
  statement,
  status,
  provenance,
  reportingPeriod,
  publicationDate,
  sourceTitle,
  sourceUrl,
  publisher,
  className,
}: FigureBlockProps) {
  const isSuppressed = status.status === 'suppressed';

  return (
    <figure className={className}>
      {isSuppressed ? (
        <SuppressedNotice className="figure-statement" />
      ) : (
        <p className="figure-statement">{statement}</p>
      )}

      {status.provisional ? <ProvisionalTag /> : null}

      {provenance.kind === 'derived' ? (
        <DerivedLabel sourceTitle={sourceTitle} sourceUrl={sourceUrl} />
      ) : null}

      <FigureCaption
        reportingPeriod={reportingPeriod}
        sourceTitle={sourceTitle}
        sourceUrl={sourceUrl}
      />

      <PublishedLine
        publicationDate={publicationDate}
        publisher={publisher}
        sourceUrl={sourceUrl}
      />
    </figure>
  );
}
