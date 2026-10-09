import React from 'react';
import type { Metadata } from 'next';
import { getExplainer } from '../../../content/load.js';
import { ExplainerPage } from '../../../components/ExplainerPage.js';
import { t } from '../../../i18n/index.js';

export const metadata: Metadata = {
  title: t('explainers', 'yourRightsTitle', { nation: t('common', 'wales') }),
  description: t('explainers', 'yourRightsDescription', { nation: t('common', 'wales') }),
};

export default async function WalesYourRightsPage() {
  const content = await getExplainer('wales', 'your-rights');
  const title = t('explainers', 'yourRightsTitle', { nation: t('common', 'wales') });

  return <ExplainerPage title={title} content={content} />;
}
