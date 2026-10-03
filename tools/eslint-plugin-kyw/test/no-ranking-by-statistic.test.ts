import { describe, it } from 'vitest';
import { RuleTester } from 'eslint';
import rule from '../src/rules/no-ranking-by-statistic.js';

RuleTester.describe = describe;
RuleTester.it = it;

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
});

ruleTester.run('kyw/no-ranking-by-statistic', rule, {
  valid: [
    {
      code: 'units.sort((a, b) => a.displayName.localeCompare(b.displayName));',
    },
    {
      code: 'units.toSorted((a, b) => a.officialName.localeCompare(b.officialName));',
    },
    {
      code: 'items.sort((a, b) => a.name.localeCompare(b.name));',
    },
    {
      code: 'const collator = new Intl.Collator("en"); units.sort((a, b) => collator.compare(a.displayName, b.displayName));',
    },
    {
      code: 'releases.sort((a, b) => compareReportingPeriods(a.reportingPeriod, b.reportingPeriod));',
    },
    {
      code: 'sortBy(units, ["displayName"]);',
    },
    {
      code: '_.sortBy(units, (u) => u.name);',
    },
    {
      code: 'array.map((x) => x.value);',
    },
    {
      code: 'figures.filter((f) => f.value.status === "published");',
    },
  ],
  invalid: [
    {
      code: 'units.sort((a, b) => a.value.value - b.value.value);',
      errors: [
        { messageId: 'noRankingByStatistic', data: { name: 'value' } },
        { messageId: 'noRankingByStatistic', data: { name: 'value' } },
        { messageId: 'noRankingByStatistic', data: { name: 'value' } },
        { messageId: 'noRankingByStatistic', data: { name: 'value' } },
      ],
    },
    {
      code: 'units.toSorted((a, b) => a.median - b.median);',
      errors: [
        { messageId: 'noRankingByStatistic', data: { name: 'median' } },
        { messageId: 'noRankingByStatistic', data: { name: 'median' } },
      ],
    },
    {
      code: 'units.sort((a, b) => a.medianOngoingWait - b.medianOngoingWait);',
      errors: [
        { messageId: 'noRankingByStatistic', data: { name: 'medianOngoingWait' } },
        { messageId: 'noRankingByStatistic', data: { name: 'medianOngoingWait' } },
      ],
    },
    {
      code: 'units.toSorted((a, b) => a.longWaitCount - b.longWaitCount);',
      errors: [
        { messageId: 'noRankingByStatistic', data: { name: 'longWaitCount' } },
        { messageId: 'noRankingByStatistic', data: { name: 'longWaitCount' } },
      ],
    },
    {
      code: 'units.sort((a, b) => b.withinWaitingStandard - a.withinWaitingStandard);',
      errors: [
        { messageId: 'noRankingByStatistic', data: { name: 'withinWaitingStandard' } },
        { messageId: 'noRankingByStatistic', data: { name: 'withinWaitingStandard' } },
      ],
    },
    {
      code: 'units.sort((a, b) => a.totalWaiting - b.totalWaiting);',
      errors: [
        { messageId: 'noRankingByStatistic', data: { name: 'totalWaiting' } },
        { messageId: 'noRankingByStatistic', data: { name: 'totalWaiting' } },
      ],
    },
    {
      code: 'units.sort((a, b) => a.statistic.localeCompare(b.statistic));',
      errors: [
        { messageId: 'noRankingByStatistic', data: { name: 'statistic' } },
        { messageId: 'noRankingByStatistic', data: { name: 'statistic' } },
      ],
    },
    {
      code: 'units.sort((a, b) => a.figures.length - b.figures.length);',
      errors: [
        { messageId: 'noRankingByStatistic', data: { name: 'figures' } },
        { messageId: 'noRankingByStatistic', data: { name: 'figures' } },
      ],
    },
    {
      code: 'units.sort((a, b) => a.figure.value - b.figure.value);',
      errors: [
        { messageId: 'noRankingByStatistic', data: { name: 'figure' } },
        { messageId: 'noRankingByStatistic', data: { name: 'value' } },
        { messageId: 'noRankingByStatistic', data: { name: 'figure' } },
        { messageId: 'noRankingByStatistic', data: { name: 'value' } },
      ],
    },
    {
      code: 'sortBy(units, "medianOngoingWait");',
      errors: [{ messageId: 'noRankingByStatistic', data: { name: 'medianOngoingWait' } }],
    },
    {
      code: '_.orderBy(units, ["totalWaiting"], ["desc"]);',
      errors: [{ messageId: 'noRankingByStatistic', data: { name: 'totalWaiting' } }],
    },
  ],
});
