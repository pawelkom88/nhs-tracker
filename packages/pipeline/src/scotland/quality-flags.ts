import type { FigureValue } from '@kyw/model/figure';

/**
 * Public Health Scotland (PHS) Statistical Qualifiers definition and handling:
 *
 * PHS uses standard statistical qualifiers (aligned with ONS open-data guidelines)
 * to annotate data quality, confidentiality, and availability:
 *
 * - '' (empty) : Value published without qualification.
 * - 'd' : Derived figure (PHS aggregate, e.g. national totals or all-specialties aggregate Z9).
 *         Treated as an Official Figure by Know Your Wait.
 * - 'p' : Provisional figure (subject to planned future revision).
 *         Treated as a Published Figure with `provisional: true`.
 * - ':' : Not available / withheld (e.g. small cells under disclosure control).
 *         Treated as a Suppressed Figure. Never displayed as zero.
 * - ':u': Not available and of low reliability.
 *         Treated as a Suppressed Figure.
 * - 'c' : Confidential / suppressed for statistical disclosure control.
 *         Treated as a Suppressed Figure.
 * - 'u' : Low reliability.
 *         Treated as a Suppressed Figure.
 * - 'e' : Estimated figure. Under ADR-0005, estimates must never be shown.
 *         Treated as a Suppressed Figure.
 * - 'b' : Break in time series.
 *         Treated as a Suppressed Figure.
 * - 'x' : Archived / historical series.
 *         Treated as a Suppressed Figure.
 * - 'y' : Incomplete / partial reporting.
 *         Treated as a Suppressed Figure.
 * - 'z' : Not applicable.
 *         Treated as a Suppressed Figure.
 * - '~' : Nil or negligible (rounds to zero).
 *         Treated as a Suppressed Figure.
 * - 'r' : Revised figure.
 *
 * @see docs/plan/data-sources.md § Quality flags
 * @see GLOSSARY.md Suppressed Figure, Provisional Figure, Official Figure
 * @see ADR-0005
 */
export const PHS_QUALIFIER_DEFINITIONS: Readonly<Record<string, string>> = {
  '': 'Published standard figure',
  d: 'Derived aggregate (PHS calculated)',
  p: 'Provisional figure',
  ':': 'Not available / suppressed',
  ':u': 'Not available and low reliability',
  c: 'Confidential / disclosure control suppression',
  u: 'Low reliability',
  e: 'Estimated figure (suppressed under ADR-0005)',
  b: 'Break in time series',
  x: 'Archived / historical definition',
  y: 'Incomplete reporting',
  z: 'Not applicable',
  '~': 'Nil or negligible (rounds to zero)',
  r: 'Revised figure',
};

/**
 * Decodes a PHS quality flag and raw value into a typed `FigureValue`.
 *
 * - Empty string or 'd' with valid numeric value -> `{ status: 'published', value, provisional: false }`
 * - 'p' with valid numeric value -> `{ status: 'published', value, provisional: true }`
 * - 'e' (estimate) -> `{ status: 'suppressed', provisional: false }` (never shown per ADR-0005)
 * - ':', ':u', 'c', 'u', 'x', 'y', 'z', '~', 'b' or any other flag -> `{ status: 'suppressed', provisional: false }`
 * - Missing, blank, or non-numeric raw value -> `{ status: 'suppressed', provisional }`
 */
export function decodeQf(
  flag: string | null | undefined,
  rawValue: string | number | null | undefined,
): FigureValue {
  const cleanFlag = (flag ?? '').trim();

  let numericValue: number | null = null;

  if (rawValue !== null && rawValue !== undefined) {
    if (typeof rawValue === 'number') {
      if (Number.isFinite(rawValue)) {
        numericValue = rawValue;
      }
    } else {
      const trimmed = rawValue.trim();
      if (trimmed !== '' && trimmed !== ':' && trimmed !== '-') {
        const parsed = Number(trimmed);
        if (!Number.isNaN(parsed) && Number.isFinite(parsed)) {
          numericValue = parsed;
        }
      }
    }
  }

  // Non-numeric or missing raw value is always suppressed
  if (numericValue === null) {
    return {
      status: 'suppressed',
      provisional: cleanFlag === 'p',
    };
  }

  // Clean published values
  if (cleanFlag === '' || cleanFlag === 'd') {
    return {
      status: 'published',
      value: numericValue,
      provisional: false,
    };
  }

  // Provisional published values
  if (cleanFlag === 'p') {
    return {
      status: 'published',
      value: numericValue,
      provisional: true,
    };
  }

  // Estimates ('e'), withholdings (':', ':u', 'c'), low reliability ('u'), or any other qualifier
  return {
    status: 'suppressed',
    provisional: false,
  };
}
