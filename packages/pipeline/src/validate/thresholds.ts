/**
 * Validation gate thresholds for NHS waiting-time releases.
 *
 * @see Assumption A-05
 * @see ADR-0005
 * @see ADR-0006
 * @see ADR-0007
 */

/**
 * Minimum ratio of candidate reporting units relative to previous release for England.
 * A drop below 95% triggers validation failure (catches missing providers/data drops).
 *
 * @see Assumption A-05
 */
export const ENGLAND_UNIT_COUNT_MIN_RATIO = 0.95;

/**
 * Minimum ratio of candidate total figures relative to previous release.
 * Figures count must be >= 90% of previous release.
 *
 * @see Assumption A-05
 */
export const FIGURE_COUNT_MIN_RATIO = 0.9;

/**
 * Maximum allowed relative swing in nation-wide total waiting figures between consecutive releases.
 * Total waiting swing must be <= 25% (|candidate - previous| / previous <= 0.25).
 * Summing is within one nation for validation only, never across nations or for display.
 *
 * @see Assumption A-05
 * @see ADR-0006
 */
export const NATION_TOTAL_SWING_MAX_RATIO = 0.25;

/**
 * Configurable thresholds for release validation checks.
 */
export interface ValidationThresholds {
  readonly englandUnitCountMinRatio: number;
  readonly figureCountMinRatio: number;
  readonly nationTotalSwingMaxRatio: number;
}

/**
 * Default validation thresholds matching PRD Assumption A-05.
 */
export const DEFAULT_VALIDATION_THRESHOLDS: ValidationThresholds = {
  englandUnitCountMinRatio: ENGLAND_UNIT_COUNT_MIN_RATIO,
  figureCountMinRatio: FIGURE_COUNT_MIN_RATIO,
  nationTotalSwingMaxRatio: NATION_TOTAL_SWING_MAX_RATIO,
};
