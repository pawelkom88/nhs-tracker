import { reportingUnitId, specialtyId, statisticId, waitStageId } from '@kyw/model/ids';
import type { ReportingUnitId } from '@kyw/model/ids';
import type { SourceRef } from '@kyw/model/source';
import type { Figure, OfficialProvenance } from '@kyw/model/figure';
import type { Release, SourceFileRef } from '@kyw/model/release';
import { englandReleaseSchema } from '@kyw/model/england/schema';
import { ValidationError } from '../errors.js';
import { assertKnownTreatmentFunctions } from '../reference/england/specialties.js';
import type { ParsedEnglandXlsx } from './parse.js';

export interface NormaliseEnglandOptions {
  readonly sourceUrl: string;
  readonly sourceTitle?: string;
  readonly sourceSha256?: string;
  readonly retrievedAt?: string;
  readonly revised?: boolean;
}

const DEFAULT_SOURCE_TITLE = 'NHS England Consultant-led Referral to Treatment (RTT) Waiting Times';

const DEFAULT_ATTRIBUTION =
  'Contains public sector information licensed under the Open Government Licence v3.0. Source: NHS England, Consultant-led Referral to Treatment Waiting Times.';

const PROVENANCE_MEDIAN: OfficialProvenance = {
  kind: 'official',
  sourceField: 'Average (median) waiting time (in weeks)',
};

const PROVENANCE_WITHIN_18: OfficialProvenance = {
  kind: 'official',
  sourceField: '% within 18 weeks',
};

const PROVENANCE_LONG_WAIT_52_PLUS: OfficialProvenance = {
  kind: 'official',
  sourceField: 'Total 52 plus weeks',
};

const PROVENANCE_TOTAL: OfficialProvenance = {
  kind: 'official',
  sourceField: 'Total number of incomplete pathways',
};

export function createEnglandSourceRef(url: string, title?: string): SourceRef<'england'> {
  return {
    nation: 'england',
    publisher: 'NHS England',
    title: title ?? DEFAULT_SOURCE_TITLE,
    url,
    licence: 'OGL-3.0',
    attribution: DEFAULT_ATTRIBUTION,
  };
}

/**
 * Normalises parsed raw England rows into a validated Release<'england'> object.
 *
 * @see docs/plan/phase-04-pipeline-england.md § T-4.4
 * @see GLOSSARY.md Official Figure, Suppressed Figure, Median Ongoing Wait, Waiting Standard, Long Wait, Reporting Unit, Specialty
 * @see ADR-0002
 * @see ADR-0005
 * @see ADR-0006
 */
export function normaliseEnglandRelease(
  parsed: ParsedEnglandXlsx,
  options: NormaliseEnglandOptions,
): Release<'england'> {
  const { metadata, rows } = parsed;

  // 1. Assert all treatment function codes are valid and known (T-3.6)
  const treatmentFunctionCodes = new Set(rows.map((r) => r.treatmentFunctionCode));
  assertKnownTreatmentFunctions(treatmentFunctionCodes);

  const releaseSource = createEnglandSourceRef(options.sourceUrl, options.sourceTitle);

  const waitStage = waitStageId('england', 'rtt-incomplete-pathway');
  const medianStatId = statisticId('england', 'median-ongoing-wait');
  const withinStandardStatId = statisticId('england', 'within-waiting-standard');
  const longWaitStatId = statisticId('england', 'long-wait-count');
  const totalStatId = statisticId('england', 'total-waiting');

  const figures: Figure<'england'>[] = [];
  const activeReportingUnitIds = new Set<ReportingUnitId<'england'>>();

  for (const row of rows) {
    // Rows with total === 0 are "no pathways", not 0 %, and produce no figures
    if (row.total === 0) {
      continue;
    }

    const repUnitId = reportingUnitId('england', row.providerCode);
    const specId = specialtyId('england', row.treatmentFunctionCode);
    activeReportingUnitIds.add(repUnitId);

    // 1. Median Ongoing Wait figure
    figures.push({
      nation: 'england',
      reportingUnit: repUnitId,
      specialty: specId,
      waitStage,
      statistic: medianStatId,
      reportingPeriod: metadata.reportingPeriod,
      publicationDate: metadata.publicationDate,
      unit: 'weeks',
      value:
        row.median === 'suppressed'
          ? { status: 'suppressed', provisional: false }
          : { status: 'published', value: row.median, provisional: false },
      provenance: PROVENANCE_MEDIAN,
      source: releaseSource,
    });

    // 2. Within Waiting Standard figure
    figures.push({
      nation: 'england',
      reportingUnit: repUnitId,
      specialty: specId,
      waitStage,
      statistic: withinStandardStatId,
      reportingPeriod: metadata.reportingPeriod,
      publicationDate: metadata.publicationDate,
      unit: 'proportion',
      value: {
        status: 'published',
        value: row.within18Proportion,
        provisional: false,
      },
      provenance: PROVENANCE_WITHIN_18,
      source: releaseSource,
    });

    // 3. Long Wait Count figure
    figures.push({
      nation: 'england',
      reportingUnit: repUnitId,
      specialty: specId,
      waitStage,
      statistic: longWaitStatId,
      reportingPeriod: metadata.reportingPeriod,
      publicationDate: metadata.publicationDate,
      unit: 'count',
      value: {
        status: 'published',
        value: row.longWait52Plus,
        provisional: false,
      },
      provenance: PROVENANCE_LONG_WAIT_52_PLUS,
      source: releaseSource,
    });

    // 4. Total Waiting figure
    figures.push({
      nation: 'england',
      reportingUnit: repUnitId,
      specialty: specId,
      waitStage,
      statistic: totalStatId,
      reportingPeriod: metadata.reportingPeriod,
      publicationDate: metadata.publicationDate,
      unit: 'count',
      value: {
        status: 'published',
        value: row.total,
        provisional: false,
      },
      provenance: PROVENANCE_TOTAL,
      source: releaseSource,
    });
  }

  // Sorted list of distinct reporting units that have at least one figure
  const reportingUnits = Array.from(activeReportingUnitIds).sort();

  const sourceFiles: readonly SourceFileRef[] = [
    {
      url: options.sourceUrl,
      sha256: options.sourceSha256 ?? '0'.repeat(64),
      revised: options.revised ?? metadata.revisedDate !== null,
    },
  ];

  const releaseCandidate: Release<'england'> = {
    schemaVersion: 1,
    nation: 'england',
    reportingPeriod: metadata.reportingPeriod,
    publicationDate: metadata.publicationDate,
    source: releaseSource,
    retrievedAt: options.retrievedAt ?? new Date().toISOString(),
    sourceFiles,
    reportingUnits,
    figures,
    comparisonFigures: [], // England year-earlier resolved from historical release files (T-7.2)
  };

  const validationResult = englandReleaseSchema.safeParse(releaseCandidate);
  if (!validationResult.success) {
    throw new ValidationError(
      `Normalised England release failed schema validation: ${validationResult.error.message}`,
      validationResult.error.issues,
    );
  }

  return validationResult.data;
}
