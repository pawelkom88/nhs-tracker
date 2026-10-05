import { ValidationError } from '../errors.js';
import { SCOTLAND_DISTRIBUTION_BANDS, type ScotlandDistributionBand } from './columns.js';
import type { RawScotlandPerformanceRow, RawScotlandDistributionRow } from './parse.js';

export const BANDS_UNDER_12_WEEKS: readonly ScotlandDistributionBand[] = [
  'LessThan4WeekWait',
  '4To8WeekWait',
  '8To12WeekWait',
] as const;

export const BANDS_12_WEEKS_AND_OVER: readonly ScotlandDistributionBand[] =
  SCOTLAND_DISTRIBUTION_BANDS.slice(3);

export const BANDS_52_WEEKS_AND_OVER: readonly ScotlandDistributionBand[] =
  SCOTLAND_DISTRIBUTION_BANDS.slice(13);

function distributionKey(
  monthEnding: string,
  hbt: string,
  patientType: string,
  specialty: string,
): string {
  return `${monthEnding}|${hbt}|${patientType}|${specialty}`;
}

/**
 * Validates distribution band counts against official totals and threshold counts in performance rows.
 *
 * Cross-checks:
 * 1. Sum of all 22 bands === Waits
 * 2. Sum of 19 bands (>= 12 weeks) === WaitsOver12Weeks
 * 3. Sum of 9 bands (>= 52 weeks) === WaitsOver52Weeks
 *
 * If any check fails for published values, throws `ValidationError`.
 *
 * @see docs/plan/phase-06-pipeline-scotland.md § T-6.4
 * @see docs/plan/data-sources.md § Scotland
 * @see ADR-0005
 */
export function crossCheckScotlandBands(
  performanceRows: readonly RawScotlandPerformanceRow[],
  distributionRows: readonly RawScotlandDistributionRow[],
): void {
  const distMap = new Map<string, RawScotlandDistributionRow>();
  for (const distRow of distributionRows) {
    const key = distributionKey(
      distRow.monthEnding,
      distRow.hbt,
      distRow.patientType,
      distRow.specialty,
    );
    distMap.set(key, distRow);
  }

  for (const perfRow of performanceRows) {
    const key = distributionKey(
      perfRow.monthEnding,
      perfRow.hbt,
      perfRow.patientType,
      perfRow.specialty,
    );
    const distRow = distMap.get(key);
    if (!distRow) {
      continue;
    }

    // 1. Sum of 22 bands === Waits
    if (perfRow.waits.status === 'published') {
      let all22Published = true;
      let sum22 = 0;
      for (const band of SCOTLAND_DISTRIBUTION_BANDS) {
        const val = distRow.bands[band];
        if (val.status !== 'published') {
          all22Published = false;
          break;
        }
        sum22 += val.value;
      }

      if (all22Published && sum22 !== perfRow.waits.value) {
        throw new ValidationError(
          `Scotland band sum mismatch for Total Waits at ${perfRow.monthEnding} / ${perfRow.hbt} / ${perfRow.patientType} / ${perfRow.specialty}: expected ${String(perfRow.waits.value)}, got ${String(sum22)}`,
          [
            {
              monthEnding: perfRow.monthEnding,
              hbt: perfRow.hbt,
              patientType: perfRow.patientType,
              specialty: perfRow.specialty,
              expectedWaits: perfRow.waits.value,
              calculatedBandSum: sum22,
            },
          ],
        );
      }
    }

    // 2. Sum of 19 bands (>= 12 weeks) === WaitsOver12Weeks
    if (perfRow.waitsOver12Weeks.status === 'published') {
      let all19Published = true;
      let sum19 = 0;
      for (const band of BANDS_12_WEEKS_AND_OVER) {
        const val = distRow.bands[band];
        if (val.status !== 'published') {
          all19Published = false;
          break;
        }
        sum19 += val.value;
      }

      if (all19Published && sum19 !== perfRow.waitsOver12Weeks.value) {
        throw new ValidationError(
          `Scotland band sum mismatch for WaitsOver12Weeks at ${perfRow.monthEnding} / ${perfRow.hbt} / ${perfRow.patientType} / ${perfRow.specialty}: expected ${String(perfRow.waitsOver12Weeks.value)}, got ${String(sum19)}`,
          [
            {
              monthEnding: perfRow.monthEnding,
              hbt: perfRow.hbt,
              patientType: perfRow.patientType,
              specialty: perfRow.specialty,
              expectedWaitsOver12Weeks: perfRow.waitsOver12Weeks.value,
              calculatedBandSum: sum19,
            },
          ],
        );
      }
    }

    // 3. Sum of 9 bands (>= 52 weeks) === WaitsOver52Weeks
    if (perfRow.waitsOver52Weeks.status === 'published') {
      let all9Published = true;
      let sum9 = 0;
      for (const band of BANDS_52_WEEKS_AND_OVER) {
        const val = distRow.bands[band];
        if (val.status !== 'published') {
          all9Published = false;
          break;
        }
        sum9 += val.value;
      }

      if (all9Published && sum9 !== perfRow.waitsOver52Weeks.value) {
        throw new ValidationError(
          `Scotland band sum mismatch for WaitsOver52Weeks at ${perfRow.monthEnding} / ${perfRow.hbt} / ${perfRow.patientType} / ${perfRow.specialty}: expected ${String(perfRow.waitsOver52Weeks.value)}, got ${String(sum9)}`,
          [
            {
              monthEnding: perfRow.monthEnding,
              hbt: perfRow.hbt,
              patientType: perfRow.patientType,
              specialty: perfRow.specialty,
              expectedWaitsOver52Weeks: perfRow.waitsOver52Weeks.value,
              calculatedBandSum: sum9,
            },
          ],
        );
      }
    }
  }
}
