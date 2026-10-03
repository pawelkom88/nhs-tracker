import { statisticId, waitStageId } from '../ids.js';
import type {
  NationDefinitions,
  StatisticDefinition,
  WaitStageDefinition,
} from '../nation-definitions.js';

/**
 * Scotland New Outpatient wait stage.
 *
 * Measures patients currently waiting for a first outpatient appointment.
 *
 * Waiting standard: 95% of new outpatients should be seen within 12 weeks of referral
 * (Local Delivery Plan standard; not a statutory legal right).
 *
 * @see GLOSSARY.md Wait Stage, Waiting Standard
 * @see ADR-0002
 * @see https://www.gov.scot/policies/healthcare-standards/waiting-times/
 */
export const SCOTLAND_WAIT_STAGE_NEW_OUTPATIENT: WaitStageDefinition<'scotland'> = {
  id: waitStageId('scotland', 'new-outpatient'),
  officialName: 'New Outpatient',
  waitingStandard: {
    weeks: 12,
    officialName: '12 weeks first outpatient standard',
    sourceUrl: 'https://www.gov.scot/policies/healthcare-standards/waiting-times/',
  },
};

/**
 * Scotland Inpatient / Day case wait stage.
 *
 * Measures patients currently waiting for inpatient or day case treatment.
 *
 * Waiting standard: 12 weeks Treatment Time Guarantee (TTG), a statutory patient right
 * under section 8 of the Patient Rights (Scotland) Act 2011.
 *
 * @see GLOSSARY.md Wait Stage, Waiting Standard, Patient Right
 * @see ADR-0002
 * @see https://www.legislation.gov.uk/asp/2011/5/section/8
 */
export const SCOTLAND_WAIT_STAGE_INPATIENT_DAY_CASE: WaitStageDefinition<'scotland'> = {
  id: waitStageId('scotland', 'inpatient-day-case'),
  officialName: 'Inpatient/Day case',
  waitingStandard: {
    weeks: 12,
    officialName: 'Treatment Time Guarantee',
    sourceUrl: 'https://www.legislation.gov.uk/asp/2011/5/section/8',
  },
};

/**
 * Typed tuple containing Scotland's two distinct wait stages.
 * Note: Scotland stages are never combined or summed together.
 *
 * @see ADR-0002
 */
export const scotlandStages = [
  SCOTLAND_WAIT_STAGE_NEW_OUTPATIENT,
  SCOTLAND_WAIT_STAGE_INPATIENT_DAY_CASE,
] as const;

/**
 * Scotland Median Ongoing Wait statistic.
 *
 * Official definition: "Median" (in days) from Public Health Scotland Stage of Treatment
 * Waiting Times Ongoing and Completed Waits dataset (resource ac63b747-fdcc-410c-ae43-de6fe3c46abf).
 * Stored in days (as published).
 *
 * @see GLOSSARY.md Median Ongoing Wait, Official Figure
 * @see ADR-0005
 * @see ADR-0006
 * @see https://publichealthscotland.scot/publications/stage-of-treatment-waiting-times/
 */
export const SCOTLAND_STATISTIC_MEDIAN_ONGOING_WAIT: StatisticDefinition<'scotland'> = {
  id: statisticId('scotland', 'median-ongoing-wait'),
  unit: 'days',
  officialName: 'Median',
  allowedProvenance: 'official',
  range: { min: 0, max: 1100 },
};

/**
 * Scotland Within Waiting Standard count statistic.
 *
 * Derived definition: exact sum of the three source band counts under 12 weeks:
 * `LessThan4WeekWait + 4To8WeekWait + 8To12WeekWait` from the PHS Distribution dataset
 * (resource f9232c17-a90e-4d35-a863-11bdb3a748c0).
 *
 * Allowed provenance is strictly 'derived' only.
 *
 * @see GLOSSARY.md Waiting Standard, Derived Figure
 * @see ADR-0005
 * @see ADR-0006
 * @see https://publichealthscotland.scot/publications/stage-of-treatment-waiting-times/
 */
export const SCOTLAND_STATISTIC_WITHIN_WAITING_STANDARD_COUNT: StatisticDefinition<'scotland'> = {
  id: statisticId('scotland', 'within-waiting-standard-count'),
  unit: 'count',
  officialName: 'LessThan4WeekWait + 4To8WeekWait + 8To12WeekWait',
  allowedProvenance: 'derived',
  range: { min: 0, max: 1_000_000 },
};

/**
 * Scotland Long Wait Count statistic.
 *
 * Official definition: "WaitsOver52Weeks" from PHS Ongoing and Completed Waits dataset
 * (resource ac63b747-fdcc-410c-ae43-de6fe3c46abf).
 *
 * @see GLOSSARY.md Long Wait, Official Figure
 * @see ADR-0005
 * @see ADR-0006
 * @see https://publichealthscotland.scot/publications/stage-of-treatment-waiting-times/
 */
export const SCOTLAND_STATISTIC_LONG_WAIT_COUNT: StatisticDefinition<'scotland'> = {
  id: statisticId('scotland', 'long-wait-count'),
  unit: 'count',
  officialName: 'WaitsOver52Weeks',
  allowedProvenance: 'official',
  range: { min: 0, max: 500_000 },
};

/**
 * Scotland Total Waiting statistic.
 *
 * Official definition: "Waits" from PHS Ongoing and Completed Waits dataset
 * (resource ac63b747-fdcc-410c-ae43-de6fe3c46abf).
 * Used for validation and context; not shown as a headline figure.
 *
 * @see GLOSSARY.md Official Figure
 * @see ADR-0005
 * @see ADR-0006
 * @see https://publichealthscotland.scot/publications/stage-of-treatment-waiting-times/
 */
export const SCOTLAND_STATISTIC_TOTAL_WAITING: StatisticDefinition<'scotland'> = {
  id: statisticId('scotland', 'total-waiting'),
  unit: 'count',
  officialName: 'Waits',
  allowedProvenance: 'official',
  range: { min: 0, max: 1_000_000 },
};

/**
 * Complete set of Scotland wait stages and statistics definitions.
 *
 * @see GLOSSARY.md Publishing Nation, Wait Stage, Statistic
 * @see ADR-0002
 * @see ADR-0005
 * @see ADR-0006
 */
export const scotlandDefinitions: NationDefinitions<'scotland'> = {
  nation: 'scotland',
  waitStages: {
    'new-outpatient': SCOTLAND_WAIT_STAGE_NEW_OUTPATIENT,
    'inpatient-day-case': SCOTLAND_WAIT_STAGE_INPATIENT_DAY_CASE,
  },
  statistics: {
    'median-ongoing-wait': SCOTLAND_STATISTIC_MEDIAN_ONGOING_WAIT,
    'within-waiting-standard-count': SCOTLAND_STATISTIC_WITHIN_WAITING_STANDARD_COUNT,
    'long-wait-count': SCOTLAND_STATISTIC_LONG_WAIT_COUNT,
    'total-waiting': SCOTLAND_STATISTIC_TOTAL_WAITING,
  },
};
