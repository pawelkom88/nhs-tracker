import React from 'react';
import type { Metadata } from 'next';
import { getExplainer } from '../../../content/load.js';
import { ExplainerPage } from '../../../components/ExplainerPage.js';
import { t } from '../../../i18n/index.js';

export const metadata: Metadata = {
  title: t('explainers', 'yourRightsTitle', { nation: t('common', 'scotland') }),
  description: t('explainers', 'yourRightsDescription', { nation: t('common', 'scotland') }),
};

export default async function ScotlandYourRightsPage() {
  const content = await getExplainer('scotland', 'your-rights');
  const title = t('explainers', 'yourRightsTitle', { nation: t('common', 'scotland') });

  return <ExplainerPage title={title} content={content} />;
}
