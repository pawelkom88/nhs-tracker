import React from 'react';
import { t } from '../i18n';
import { siteConfig } from '../config/site';

export interface MistakeLinkProps {
  pagePath?: string;
  className?: string;
}

export function MistakeLink({ pagePath = '', className }: MistakeLinkProps) {
  const url = `${siteConfig.repoUrl}/issues/new?template=spotted-a-mistake.yml&page=${encodeURIComponent(pagePath)}`;

  return (
    <a href={url} className={className} rel="noopener noreferrer">
      {t('layout', 'mistakeLink.label')}
    </a>
  );
}
