import React from 'react';
import type { Metadata } from 'next';
import { getExplainer } from '../../../content/load.js';
import { ExplainerPage } from '../../../components/ExplainerPage.js';
import { t } from '../../../i18n/index.js';

export const metadata: Metadata = {
  title: t('explainers', 'aboutFiguresTitle', { nation: t('common', 'england') }),
  description: t('explainers', 'aboutFiguresDescription', { nation: t('common', 'england') }),
};

export default async function EnglandAboutTheFiguresPage() {
  const content = await getExplainer('england', 'about-the-figures');
  const title = t('explainers', 'aboutFiguresTitle', { nation: t('common', 'england') });

  return <ExplainerPage title={title} content={content} />;
}
