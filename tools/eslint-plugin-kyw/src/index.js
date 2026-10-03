import noRankingByStatistic from './rules/no-ranking-by-statistic.js';

const plugin = {
  meta: {
    name: 'eslint-plugin-kyw',
    version: '0.0.0',
  },
  rules: {
    'no-ranking-by-statistic': noRankingByStatistic,
  },
};

export default plugin;
