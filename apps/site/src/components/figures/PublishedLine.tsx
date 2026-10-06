import React from 'react';
import type { PublicationDate } from '@kyw/model/period';
import { formatPublicationDate } from '../../i18n/format';
import { t } from '../../i18n';

export interface PublishedLineProps {
  publicationDate: PublicationDate;
  publisher: string;
  sourceUrl?: string;
  className?: string;
}

export function PublishedLine({
  publicationDate,
  publisher,
  sourceUrl,
  className,
}: PublishedLineProps) {
  const formattedDate = formatPublicationDate(publicationDate);

  const publisherNode = sourceUrl ? (
    <a href={sourceUrl} className="underline">
      {publisher}
    </a>
  ) : (
    publisher
  );

  const template = t('figures', 'published', {
    publicationDate: '___DATE___',
    publisher: '___PUBLISHER___',
  });

  const [beforeDate, afterDate] = template.split('___DATE___');
  const [middle, afterPublisher] = (afterDate ?? '').split('___PUBLISHER___');

  return (
    <p className={className}>
      {beforeDate}
      <time dateTime={publicationDate}>{formattedDate}</time>
      {middle}
      {publisherNode}
      {afterPublisher}
    </p>
  );
}
