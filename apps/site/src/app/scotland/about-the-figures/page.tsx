import React from 'react';
import type { Metadata } from 'next';
import { getExplainer } from '../../../content/load.js';
import { ExplainerPage } from '../../../components/ExplainerPage.js';
import { t } from '../../../i18n/index.js';

export const metadata: Metadata = {
  title: t('explainers', 'aboutFiguresTitle', { nation: t('common', 'scotland') }),
  description: t('explainers', 'aboutFiguresDescription', { nation: t('common', 'scotland') }),
};

export default async function ScotlandAboutTheFiguresPage() {
  const content = await getExplainer('scotland', 'about-the-figures');
  const title = t('explainers', 'aboutFiguresTitle', { nation: t('common', 'scotland') });

  return <ExplainerPage title={title} content={content} />;
}
