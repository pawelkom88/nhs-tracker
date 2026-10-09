import React from 'react';
import type { Metadata } from 'next';
import { getExplainer } from '../../../content/load.js';
import { ExplainerPage } from '../../../components/ExplainerPage.js';
import { t } from '../../../i18n/index.js';

export const metadata: Metadata = {
  title: t('explainers', 'aboutFiguresTitle', { nation: t('common', 'wales') }),
  description: t('explainers', 'aboutFiguresDescription', { nation: t('common', 'wales') }),
};

export default async function WalesAboutTheFiguresPage() {
  const content = await getExplainer('wales', 'about-the-figures');
  const title = t('explainers', 'aboutFiguresTitle', { nation: t('common', 'wales') });

  return <ExplainerPage title={title} content={content} />;
}
