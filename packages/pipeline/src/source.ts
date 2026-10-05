import type { PublishingNation } from '@kyw/model/nation';
import type { ReportingPeriod } from '@kyw/model/period';
import type { ReferenceData } from '@kyw/model/reference';
import type { Release } from '@kyw/model/release';

/**
 * Metadata identifying a candidate publication release discovered from official sources.
 */
export interface ReleaseCandidate {
  readonly reportingPeriod: ReportingPeriod;
  readonly sourceUrls: readonly string[];
  readonly revised: boolean;
  readonly fingerprint: string;
}

/**
 * Metadata and local cache path for a downloaded raw source file.
 */
export interface RawFile {
  readonly path: string;
  readonly sha256: string;
  readonly bytes: number;
  readonly fetchedAt: string;
  readonly finalUrl: string;
}

export type RawFiles = Record<string, RawFile>;

/**
 * Persistent pipeline state stored in data/<nation>/state.json.
 */
export interface PipelineState {
  readonly lastCheck: string;
  readonly seenFiles: Record<string, { readonly sha256: string; readonly fetchedAt: string }>;
  readonly lastValidationReport?: unknown;
}

/**
 * Source adapter contract for a single publishing nation.
 *
 * @see GLOSSARY.md Publishing Nation
 * @see ADR-0006
 */
export interface NationSource<N extends PublishingNation> {
  readonly nation: N;
  discover(state: PipelineState): Promise<readonly ReleaseCandidate[]>;
  fetch(candidate: ReleaseCandidate): Promise<RawFiles>;
  normalise(raw: RawFiles, reference: ReferenceData<N>): Release<N> | Promise<Release<N>>;
}
