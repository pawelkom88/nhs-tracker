import { waitStageId, statisticId } from '../ids.js';
import type {
  NationDefinitions,
  StatisticDefinition,
  WaitStageDefinition,
} from '../nation-definitions.js';

/**
 * England Referral to Treatment (RTT) incomplete pathway wait stage.
 *
 * Measures patients currently waiting on an open referral-to-treatment pathway.
 *
 * Waiting standard: 92% of patients waiting to start consultant-led treatment
 * should be waiting less than 18 weeks (The NHS Constitution).
 *
 * @see GLOSSARY.md Wait Stage, Waiting Standard
 * @see ADR-0002
 * @see https://www.england.nhs.uk/statistics/statistical-work-areas/rtt-waiting-times/
 */
export const ENGLAND_WAIT_STAGE_RTT_INCOMPLETE_PATHWAY: WaitStageDefinition<'england'> = {
  id: waitStageId('england', 'rtt-incomplete-pathway'),
  officialName: 'Referral to treatment (incomplete pathways)',
  waitingStandard: {
    weeks: 18,
    officialName: '18 weeks RTT standard',
    sourceUrl: 'https://www.england.nhs.uk/statistics/statistical-work-areas/rtt-waiting-times/',
  },
};

/**
 * England Median Ongoing Wait statistic.
 *
 * Official definition: "Average (median) waiting time (in weeks)" from NHS England
 * Consultant-led Referral to Treatment Waiting Times Incomplete Provider XLSX.
 * Suppressed when organisation/treatment function has fewer than 20 pathways.
 *
 * @see GLOSSARY.md Median Ongoing Wait, Official Figure
 * @see ADR-0005
 * @see ADR-0006
 * @see https://www.england.nhs.uk/statistics/statistical-work-areas/rtt-waiting-times/
 */
export const ENGLAND_STATISTIC_MEDIAN_ONGOING_WAIT: StatisticDefinition<'england'> = {
  id: statisticId('england', 'median-ongoing-wait'),
  unit: 'weeks',
  officialName: 'Average (median) waiting time (in weeks)',
  allowedProvenance: 'official',
  range: { min: 0, max: 104 },
};

/**
 * England Within Waiting Standard statistic.
 *
 * Official definition: "% within 18 weeks" from NHS England Consultant-led
 * Referral to Treatment Waiting Times Incomplete Provider XLSX (published as a decimal proportion 0-1).
 *
 * @see GLOSSARY.md Waiting Standard, Official Figure
 * @see ADR-0005
 * @see ADR-0006
 * @see https://www.england.nhs.uk/statistics/statistical-work-areas/rtt-waiting-times/
 */
export const ENGLAND_STATISTIC_WITHIN_WAITING_STANDARD: StatisticDefinition<'england'> = {
  id: statisticId('england', 'within-waiting-standard'),
  unit: 'proportion',
  officialName: '% within 18 weeks',
  allowedProvenance: 'official',
  range: { min: 0, max: 1 },
};

/**
 * England Long Wait Count statistic.
 *
 * Official definition: "Total 52 plus weeks" from NHS England Consultant-led
 * Referral to Treatment Waiting Times Incomplete Provider XLSX.
 *
 * @see GLOSSARY.md Long Wait, Official Figure
 * @see ADR-0005
 * @see ADR-0006
 * @see https://www.england.nhs.uk/statistics/statistical-work-areas/rtt-waiting-times/
 */
export const ENGLAND_STATISTIC_LONG_WAIT_COUNT: StatisticDefinition<'england'> = {
  id: statisticId('england', 'long-wait-count'),
  unit: 'count',
  officialName: 'Total 52 plus weeks',
  allowedProvenance: 'official',
  range: { min: 0, max: 1_000_000 },
};

/**
 * England Total Waiting statistic.
 *
 * Official definition: "Total number of incomplete pathways" from NHS England
 * Consultant-led Referral to Treatment Waiting Times Incomplete Provider XLSX.
 * Used for validation and context; not shown as a headline figure.
 *
 * @see GLOSSARY.md Official Figure
 * @see ADR-0005
 * @see ADR-0006
 * @see https://www.england.nhs.uk/statistics/statistical-work-areas/rtt-waiting-times/
 */
export const ENGLAND_STATISTIC_TOTAL_WAITING: StatisticDefinition<'england'> = {
  id: statisticId('england', 'total-waiting'),
  unit: 'count',
  officialName: 'Total number of incomplete pathways',
  allowedProvenance: 'official',
  range: { min: 0, max: 10_000_000 },
};

/**
 * Complete set of England wait stages and statistics definitions.
 *
 * @see GLOSSARY.md Publishing Nation, Wait Stage, Statistic
 * @see ADR-0002
 * @see ADR-0005
 * @see ADR-0006
 */
export const englandDefinitions: NationDefinitions<'england'> = {
  nation: 'england',
  waitStages: {
    'rtt-incomplete-pathway': ENGLAND_WAIT_STAGE_RTT_INCOMPLETE_PATHWAY,
  },
  statistics: {
    'median-ongoing-wait': ENGLAND_STATISTIC_MEDIAN_ONGOING_WAIT,
    'within-waiting-standard': ENGLAND_STATISTIC_WITHIN_WAITING_STANDARD,
    'long-wait-count': ENGLAND_STATISTIC_LONG_WAIT_COUNT,
    'total-waiting': ENGLAND_STATISTIC_TOTAL_WAITING,
  },
};
