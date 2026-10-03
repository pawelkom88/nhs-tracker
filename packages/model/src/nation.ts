/**
 * Publishing Nations and Home Nations domain definitions.
 *
 * @see {@link https://github.com/your-org/know-your-wait/blob/main/GLOSSARY.md GLOSSARY.md}
 * @see ADR-0001 (Home Nation is residence)
 * @see ADR-0006 (One record shape, nation-namespaced values; no shared categories)
 */

/**
 * The official list of nations whose NHS bodies publish waiting-time statistics.
 */
export const PUBLISHING_NATIONS = ['england', 'wales', 'scotland'] as const;

/**
 * The nation whose NHS body published a given waiting-time statistic.
 * Decides the definitions and labels that apply to that statistic.
 */
export type PublishingNation = (typeof PUBLISHING_NATIONS)[number];

/**
 * The nation (England, Wales or Scotland) the user says they live in.
 * Decides which NHS process and patient-options explanations are shown.
 */
export type HomeNation = PublishingNation;

/**
 * Type guard for {@link PublishingNation}.
 */
export function isPublishingNation(value: unknown): value is PublishingNation {
  return typeof value === 'string' && (PUBLISHING_NATIONS as readonly string[]).includes(value);
}

/**
 * Ensures a type parameter is exactly one single PublishingNation,
 * evaluating to `never` if a union or `never` or any other type is passed.
 */
export type SingleNation<N extends PublishingNation> = [N] extends [never]
  ? never
  : [PublishingNation] extends [N]
    ? never
    : (N extends unknown ? (k: N) => void : never) extends (k: infer I) => void
      ? [N] extends [I]
        ? N
        : never
      : never;
