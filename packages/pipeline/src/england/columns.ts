/**
 * Exact expected column headers for NHS England Incomplete Provider XLSX files.
 *
 * @see docs/plan/data-sources.md § England
 */

function generateWeeklyBandHeaders(): readonly string[] {
  const bands: string[] = [];
  for (let i = 0; i < 104; i++) {
    bands.push(`>${String(i)}-${String(i + 1)}`);
  }
  bands.push('104 plus');
  return bands;
}

export const ENGLAND_EXPECTED_WEEK_BANDS = generateWeeklyBandHeaders();

export const ENGLAND_LEADING_COLUMNS = [
  'Region Code',
  'Provider Code',
  'Provider Name',
  'Treatment Function Code',
  'Treatment Function',
] as const;

export const ENGLAND_SUMMARY_COLUMNS = [
  'Total number of incomplete pathways',
  'Total within 18 weeks',
  '% within 18 weeks',
  'Average (median) waiting time (in weeks)',
  '92nd percentile waiting time (in weeks)',
  'Total 52 plus weeks',
  'Total 78 plus weeks',
  'Total 65 plus weeks',
  '% 52 plus weeks',
] as const;

export const ENGLAND_EXPECTED_HEADERS: readonly string[] = [
  ...ENGLAND_LEADING_COLUMNS,
  ...ENGLAND_EXPECTED_WEEK_BANDS,
  ...ENGLAND_SUMMARY_COLUMNS,
];

/**
 * 0-based column offsets relative to Column B (where data starts in row 14 / rows 15+).
 * Column A in the sheet is empty (index 0).
 */
export const ENGLAND_COLUMN_OFFSETS = {
  REGION_CODE: 0, // Column B
  PROVIDER_CODE: 1, // Column C
  PROVIDER_NAME: 2, // Column D
  TREATMENT_FUNCTION_CODE: 3, // Column E
  TREATMENT_FUNCTION_NAME: 4, // Column F
  TOTAL_INCOMPLETE_PATHWAYS: 110, // Column DH
  TOTAL_WITHIN_18_WEEKS: 111, // Column DI
  PERCENT_WITHIN_18_WEEKS: 112, // Column DJ
  MEDIAN_WAIT_TIME_WEEKS: 113, // Column DK
  PERCENTILE_92_WAIT_TIME_WEEKS: 114, // Column DL
  TOTAL_52_PLUS_WEEKS: 115, // Column DM
  TOTAL_78_PLUS_WEEKS: 116, // Column DN
  TOTAL_65_PLUS_WEEKS: 117, // Column DO
  PERCENT_52_PLUS_WEEKS: 118, // Column DP
} as const;
