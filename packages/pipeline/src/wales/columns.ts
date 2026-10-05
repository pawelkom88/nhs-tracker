import { KEY_MEASURES_DATASET_ID, THRESHOLD_COUNTS_DATASET_ID } from './api.js';

export type WalesDatasetKind = 'key_measures' | 'threshold_counts';

/**
 * Normalises a dataset identifier (UUID or enum string) into a WalesDatasetKind.
 */
export function resolveWalesDatasetKind(dataset: string): WalesDatasetKind {
  if (dataset === 'key_measures' || dataset === KEY_MEASURES_DATASET_ID) {
    return 'key_measures';
  }
  if (dataset === 'threshold_counts' || dataset === THRESHOLD_COUNTS_DATASET_ID) {
    return 'threshold_counts';
  }
  throw new Error(`Unrecognised Wales dataset identifier: "${dataset}"`);
}

/**
 * Expected 19-column CSV header structure for Key Measures dataset (`acd9529c`).
 * Coded download with `raw_extended` options.
 *
 * @see docs/plan/data-sources.md § Wales
 */
export const WALES_KEY_MEASURES_EXPECTED_HEADERS = [
  'Data values',
  'Data values_sort',
  'Data description',
  'Data description_reference',
  'Data description_sort',
  'Data description_hierarchy',
  'Date',
  'Date_reference',
  'Date_sort',
  'Date_hierarchy',
  'Local health board provider',
  'Local health board provider_reference',
  'Local health board provider_sort',
  'Local health board provider_hierarchy',
  'Specialty',
  'Specialty_reference',
  'Specialty_sort',
  'Specialty_hierarchy',
  'Notes',
] as const;

export const WALES_KEY_MEASURES_COLUMN_OFFSETS = {
  DATA_VALUE: 0,
  DATA_VALUE_SORT: 1,
  DATA_DESCRIPTION: 2,
  DATA_DESCRIPTION_REFERENCE: 3,
  DATA_DESCRIPTION_SORT: 4,
  DATA_DESCRIPTION_HIERARCHY: 5,
  DATE: 6,
  DATE_REFERENCE: 7,
  DATE_SORT: 8,
  DATE_HIERARCHY: 9,
  BOARD_LABEL: 10,
  BOARD_REFERENCE: 11,
  BOARD_SORT: 12,
  BOARD_HIERARCHY: 13,
  SPECIALTY_LABEL: 14,
  SPECIALTY_REFERENCE: 15,
  SPECIALTY_SORT: 16,
  SPECIALTY_HIERARCHY: 17,
  NOTES: 18,
} as const;

/**
 * Expected 27-column CSV header structure for Threshold Counts dataset (`3ef3a1d8`).
 * Coded download with `raw_extended` options.
 * Note: StatsWales outputs lowercase 'local health board provider' and 'specialty' in this dataset.
 *
 * @see docs/plan/data-sources.md § Wales
 */
export const WALES_THRESHOLD_COUNTS_EXPECTED_HEADERS = [
  'Data values',
  'Data values_sort',
  'Data description',
  'Data description_reference',
  'Data description_sort',
  'Data description_hierarchy',
  'Date',
  'Date_reference',
  'Date_sort',
  'Date_hierarchy',
  'local health board provider',
  'local health board provider_reference',
  'local health board provider_sort',
  'local health board provider_hierarchy',
  'specialty',
  'specialty_reference',
  'specialty_sort',
  'specialty_hierarchy',
  'stage of pathway',
  'stage of pathway_reference',
  'stage of pathway_sort',
  'stage of pathway_hierarchy',
  'age group',
  'age group_reference',
  'age group_sort',
  'age group_hierarchy',
  'Notes',
] as const;

export const WALES_THRESHOLD_COUNTS_COLUMN_OFFSETS = {
  DATA_VALUE: 0,
  DATA_VALUE_SORT: 1,
  DATA_DESCRIPTION: 2,
  DATA_DESCRIPTION_REFERENCE: 3,
  DATA_DESCRIPTION_SORT: 4,
  DATA_DESCRIPTION_HIERARCHY: 5,
  DATE: 6,
  DATE_REFERENCE: 7,
  DATE_SORT: 8,
  DATE_HIERARCHY: 9,
  BOARD_LABEL: 10,
  BOARD_REFERENCE: 11,
  BOARD_SORT: 12,
  BOARD_HIERARCHY: 13,
  SPECIALTY_LABEL: 14,
  SPECIALTY_REFERENCE: 15,
  SPECIALTY_SORT: 16,
  SPECIALTY_HIERARCHY: 17,
  STAGE_LABEL: 18,
  STAGE_REFERENCE: 19,
  STAGE_SORT: 20,
  STAGE_HIERARCHY: 21,
  AGE_LABEL: 22,
  AGE_REFERENCE: 23,
  AGE_SORT: 24,
  AGE_HIERARCHY: 25,
  NOTES: 26,
} as const;

/**
 * Permitted MeasureCode reference codes for Key Measures dataset (`acd9529c`).
 * 1: Total pathways waiting
 * 2: Percentage of pathways waiting less than 26 weeks
 * 3: Pathways waiting more than 36 weeks
 * 4: Median waiting time (decimal weeks)
 * 5: 90th centile (decimal weeks)
 * 6: Pathways waiting less than 26 weeks (count)
 */
export const WALES_KEY_MEASURES_EXPECTED_MEASURE_CODES = ['1', '2', '3', '4', '5', '6'] as const;

export type WalesKeyMeasuresMeasureCode =
  (typeof WALES_KEY_MEASURES_EXPECTED_MEASURE_CODES)[number];

/**
 * Permitted Measure reference codes for Threshold Counts dataset (`3ef3a1d8`).
 * 26: Pathways waiting less than 26 weeks
 * 36: Pathways waiting more than 36 weeks
 * 52: Pathways waiting more than 52 weeks (Long Wait count)
 * 104: Pathways waiting more than 104 weeks
 * TP: Total pathways waiting
 */
export const WALES_THRESHOLD_COUNTS_EXPECTED_MEASURE_CODES = [
  '26',
  '36',
  '52',
  '104',
  'TP',
] as const;

export type WalesThresholdCountsMeasureCode =
  (typeof WALES_THRESHOLD_COUNTS_EXPECTED_MEASURE_CODES)[number];
