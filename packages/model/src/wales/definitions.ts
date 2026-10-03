import { waitStageId, statisticId } from '../ids.js';
import type {
  NationDefinitions,
  StatisticDefinition,
  WaitStageDefinition,
} from '../nation-definitions.js';

/**
 * Wales Referral to Treatment (RTT) pathway wait stage.
 *
 * Measures patients currently waiting on an open referral-to-treatment pathway.
 *
 * Waiting standard: 95% of patients waiting to start treatment should be waiting
 * less than 26 weeks from referral (Welsh Government standard).
 *
 * @see GLOSSARY.md Wait Stage, Waiting Standard
 * @see ADR-0002
 * @see ADR-0006
 * @see https://www.gov.wales/nhs-activity-and-performance-summary
 */
export const WALES_WAIT_STAGE_RTT_PATHWAY: WaitStageDefinition<'wales'> = {
  id: waitStageId('wales', 'rtt-pathway'),
  officialName: 'Patient pathways waiting to start treatment',
  waitingStandard: {
    weeks: 26,
    officialName: '26 weeks RTT standard',
    sourceUrl: 'https://www.gov.wales/nhs-activity-and-performance-summary',
  },
};

/**
 * Wales Median Ongoing Wait statistic.
 *
 * Official definition: "Median waiting time (in weeks)" from StatsWales
 * Key Measures dataset (acd9529c-979a-48ef-a773-870b3ebe4391, MeasureCode 4).
 * Suppressed (row absent) when cell size is small.
 *
 * @see GLOSSARY.md Median Ongoing Wait, Official Figure
 * @see ADR-0005
 * @see ADR-0006
 * @see https://stats.gov.wales/en-GB/topic/50/performance-and-waiting-times
 */
export const WALES_STATISTIC_MEDIAN_ONGOING_WAIT: StatisticDefinition<'wales'> = {
  id: statisticId('wales', 'median-ongoing-wait'),
  unit: 'weeks',
  officialName: 'Median waiting time (in weeks)',
  allowedProvenance: 'official',
  range: { min: 0, max: 260 },
};

/**
 * Wales Within Waiting Standard statistic.
 *
 * Official definition: "Percentage waiting less than 26 weeks" from StatsWales
 * Key Measures dataset (acd9529c-979a-48ef-a773-870b3ebe4391, MeasureCode 2).
 * Published as a percentage (0–100).
 *
 * @see GLOSSARY.md Waiting Standard, Official Figure
 * @see ADR-0005
 * @see ADR-0006
 * @see https://stats.gov.wales/en-GB/topic/50/performance-and-waiting-times
 */
export const WALES_STATISTIC_WITHIN_WAITING_STANDARD: StatisticDefinition<'wales'> = {
  id: statisticId('wales', 'within-waiting-standard'),
  unit: 'percent',
  officialName: '% waiting under 26 weeks',
  allowedProvenance: 'official',
  range: { min: 0, max: 100 },
};

/**
 * Wales Long Wait Count statistic.
 *
 * Official definition: "Waiting more than 52 weeks" from StatsWales
 * Threshold Counts dataset (3ef3a1d8-1467-4afe-ad60-4fc3d92228a1, Measure 52, stage T, age T).
 *
 * @see GLOSSARY.md Long Wait, Official Figure
 * @see ADR-0005
 * @see ADR-0006
 * @see https://stats.gov.wales/en-GB/topic/50/performance-and-waiting-times
 */
export const WALES_STATISTIC_LONG_WAIT_COUNT: StatisticDefinition<'wales'> = {
  id: statisticId('wales', 'long-wait-count'),
  unit: 'count',
  officialName: 'More than 52 weeks waiting',
  allowedProvenance: 'official',
  range: { min: 0, max: 1_000_000 },
};

/**
 * Wales Total Waiting statistic.
 *
 * Official definition: "Total number of patient pathways waiting" from StatsWales
 * Key Measures dataset (acd9529c-979a-48ef-a773-870b3ebe4391, MeasureCode 1).
 *
 * @see GLOSSARY.md Official Figure
 * @see ADR-0005
 * @see ADR-0006
 * @see https://stats.gov.wales/en-GB/topic/50/performance-and-waiting-times
 */
export const WALES_STATISTIC_TOTAL_WAITING: StatisticDefinition<'wales'> = {
  id: statisticId('wales', 'total-waiting'),
  unit: 'count',
  officialName: 'Total patient pathways waiting',
  allowedProvenance: 'official',
  range: { min: 0, max: 2_000_000 },
};

/**
 * Complete set of Wales wait stages and statistics definitions.
 *
 * @see GLOSSARY.md Publishing Nation, Wait Stage, Statistic
 * @see ADR-0002
 * @see ADR-0005
 * @see ADR-0006
 */
export const walesDefinitions: NationDefinitions<'wales'> = {
  nation: 'wales',
  waitStages: {
    'rtt-pathway': WALES_WAIT_STAGE_RTT_PATHWAY,
  },
  statistics: {
    'median-ongoing-wait': WALES_STATISTIC_MEDIAN_ONGOING_WAIT,
    'within-waiting-standard': WALES_STATISTIC_WITHIN_WAITING_STANDARD,
    'long-wait-count': WALES_STATISTIC_LONG_WAIT_COUNT,
    'total-waiting': WALES_STATISTIC_TOTAL_WAITING,
  },
};
