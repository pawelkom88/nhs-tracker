import React from 'react';
import type { Metadata } from 'next';
import { getExplainer } from '../../../content/load.js';
import { ExplainerPage } from '../../../components/ExplainerPage.js';
import { t } from '../../../i18n/index.js';

export const metadata: Metadata = {
  title: t('explainers', 'yourRightsTitle', { nation: t('common', 'england') }),
  description: t('explainers', 'yourRightsDescription', { nation: t('common', 'england') }),
};

export default async function EnglandYourRightsPage() {
  const content = await getExplainer('england', 'your-rights');
  const title = t('explainers', 'yourRightsTitle', { nation: t('common', 'england') });

  return <ExplainerPage title={title} content={content} />;
}
