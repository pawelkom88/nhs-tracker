/**
 * Exact expected column headers and offsets for Public Health Scotland
 * Stage of Treatment Waiting Times monthly open-data CSV files.
 *
 * @see docs/plan/data-sources.md § Scotland
 */

/**
 * Expected 21-column CSV header structure for Ongoing and Completed Waits – Monthly
 * (resource `ac63b747-fdcc-410c-ae43-de6fe3c46abf`).
 */
export const SCOTLAND_PERFORMANCE_EXPECTED_HEADERS = [
  'MonthEnding',
  'HBT',
  'HBTQF',
  'PatientType',
  'WaitType',
  'Specialty',
  'SpecialtyQF',
  'Waits',
  'WaitsQF',
  'WaitsOver12Weeks',
  'WaitsOver12WeeksQF',
  'WaitsOver52Weeks',
  'WaitsOver52WeeksQF',
  'WaitsOver78Weeks',
  'WaitsOver78WeeksQF',
  'WaitsOver104Weeks',
  'WaitsOver104WeeksQF',
  'Median',
  'MedianQF',
  '90thPercentile',
  '90thPercentileQF',
] as const;

export const SCOTLAND_PERFORMANCE_COLUMN_OFFSETS = {
  MONTH_ENDING: 0,
  HBT: 1,
  HBT_QF: 2,
  PATIENT_TYPE: 3,
  WAIT_TYPE: 4,
  SPECIALTY: 5,
  SPECIALTY_QF: 6,
  WAITS: 7,
  WAITS_QF: 8,
  WAITS_OVER_12_WEEKS: 9,
  WAITS_OVER_12_WEEKS_QF: 10,
  WAITS_OVER_52_WEEKS: 11,
  WAITS_OVER_52_WEEKS_QF: 12,
  WAITS_OVER_78_WEEKS: 13,
  WAITS_OVER_78_WEEKS_QF: 14,
  WAITS_OVER_104_WEEKS: 15,
  WAITS_OVER_104_WEEKS_QF: 16,
  MEDIAN: 17,
  MEDIAN_QF: 18,
  PERCENTILE_90: 19,
  PERCENTILE_90_QF: 20,
} as const;

/**
 * The 22 waiting duration bands published in the Distribution of Ongoing and Completed Waits dataset.
 */
export const SCOTLAND_DISTRIBUTION_BANDS = [
  'LessThan4WeekWait',
  '4To8WeekWait',
  '8To12WeekWait',
  '12To16WeekWait',
  '16To20WeekWait',
  '20To24WeekWait',
  '24To28WeekWait',
  '28To32WeekWait',
  '32To36WeekWait',
  '36To40WeekWait',
  '40To44WeekWait',
  '44To48WeekWait',
  '48To52WeekWait',
  '52To65WeekWait',
  '65To78WeekWait',
  '78To91WeekWait',
  '91To104WeekWait',
  '104To117WeekWait',
  '117To130WeekWait',
  '130To143WeekWait',
  '143To156WeekWait',
  'Over156WeekWait',
] as const;

export type ScotlandDistributionBand = (typeof SCOTLAND_DISTRIBUTION_BANDS)[number];

export const SCOTLAND_DISTRIBUTION_LEADING_HEADERS = [
  'MonthEnding',
  'HBT',
  'HBTQF',
  'PatientType',
  'WaitType',
  'Specialty',
  'SpecialtyQF',
] as const;

/**
 * Expected 51-column CSV header structure for Distribution of Ongoing and Completed Waits – Monthly
 * (resource `f9232c17-a90e-4d35-a863-11bdb3a748c0`).
 * Comprises 7 leading dimension columns followed by 22 band pairs (<Band>, <Band>QF).
 */
export const SCOTLAND_DISTRIBUTION_EXPECTED_HEADERS: readonly string[] = [
  ...SCOTLAND_DISTRIBUTION_LEADING_HEADERS,
  ...SCOTLAND_DISTRIBUTION_BANDS.flatMap((band) => [band, `${band}QF`]),
];

export const SCOTLAND_DISTRIBUTION_COLUMN_OFFSETS = {
  MONTH_ENDING: 0,
  HBT: 1,
  HBT_QF: 2,
  PATIENT_TYPE: 3,
  WAIT_TYPE: 4,
  SPECIALTY: 5,
  SPECIALTY_QF: 6,
  BANDS_START: 7,
} as const;

/**
 * Permitted PatientType values in Stage of Treatment releases.
 * Each PatientType represents a distinct WaitStage.
 *
 * @see GLOSSARY.md Wait Stage
 * @see ADR-0002
 */
export const SCOTLAND_PATIENT_TYPES = ['New Outpatient', 'Inpatient/Day case'] as const;

export type ScotlandPatientType = (typeof SCOTLAND_PATIENT_TYPES)[number];

/**
 * Permitted WaitType values in Stage of Treatment releases.
 */
export const SCOTLAND_WAIT_TYPES = ['Ongoing', 'Completed'] as const;

export type ScotlandWaitType = (typeof SCOTLAND_WAIT_TYPES)[number];

export function isScotlandPatientType(value: unknown): value is ScotlandPatientType {
  return typeof value === 'string' && (SCOTLAND_PATIENT_TYPES as readonly string[]).includes(value);
}

export function isScotlandWaitType(value: unknown): value is ScotlandWaitType {
  return typeof value === 'string' && (SCOTLAND_WAIT_TYPES as readonly string[]).includes(value);
}
