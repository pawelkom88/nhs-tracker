# Phase 2 — Domain model

**Goal:** `@kyw/model` expresses every glossary concept as nation-namespaced TypeScript types plus Zod runtime schemas, such that combining two Publishing Nations' figures, summing Wait Stages, or giving a Suppressed Figure a numeric value is a **compile error**, and a malformed release is a **runtime validation error**.

**Starts after:** T-1.3, T-1.5. **Unblocks:** Phases 3–8.

Read [MASTER-PLAN.md § Conventions](./MASTER-PLAN.md#conventions) first. Consumers import by subpath (`@kyw/model/figure`, `@kyw/model/england/definitions`); `src/index.ts` stays empty so parallel tasks never share a barrel file.

**Schema library:** Zod v4 (decision recorded in MASTER-PLAN Assumption A-04). Schemas live next to types; types are written by hand (not `z.infer`) where branding or nation generics need it, and a type test asserts the schema output is assignable to the hand-written type.

---

### T-2.1 — Define Publishing Nations and nation-namespaced identifiers
- **Depends on:** T-1.3, T-1.5
- **Parallel-safe with:** T-2.2, T-2.11
- **Owns files:** `packages/model/src/nation.ts`, `packages/model/src/ids.ts`, `packages/model/test/nation.test.ts`, `packages/model/test/ids.test-d.ts`
- **Glossary terms:** Publishing Nation, Home Nation, Reporting Unit, Specialty, Wait Stage, Statistic, Hospital Site
- **ADRs:** ADR-0006, ADR-0001
- **Context:** ADR-0006 says every category value is namespaced by nation and there is no shared cross-nation category. This task creates the identifier types every other type uses. The aim is that `SpecialtyId<'england'>` and `SpecialtyId<'wales'>` are never assignable to each other, and that a type parameter cannot be widened to a union of nations.
- **Steps:**
  1. `nation.ts`: `export const PUBLISHING_NATIONS = ['england', 'wales', 'scotland'] as const;` `export type PublishingNation = (typeof PUBLISHING_NATIONS)[number];` `export type HomeNation = PublishingNation;` (same values, different meaning: document both with the glossary definitions in TSDoc).
  2. `nation.ts`: `export type SingleNation<N extends PublishingNation>` that resolves to `N` when `N` is exactly one member and to `never` for a union (e.g. via `[N] extends [infer U] ? (U extends PublishingNation ? ([PublishingNation] extends [N] ? never : …) …)`; any correct implementation is fine as long as the type tests pass).
  3. `ids.ts`: generic branded id `type NationScopedId<N extends PublishingNation, K extends IdKind> = \`${N}:${string}\` & { readonly __kind: K; readonly __nation: N }` with `IdKind = 'reporting-unit' | 'hospital-site' | 'specialty' | 'wait-stage' | 'statistic'`. Export aliases `ReportingUnitId<N>`, `HospitalSiteId<N>`, `SpecialtyId<N>`, `WaitStageId<N>`, `StatisticId<N>`.
  4. Constructors `reportingUnitId(nation, officialCode)` etc. that validate the raw code (non-empty, no `:`) and return `"<nation>:<code>"`; parser `parseNationScopedId(id) → { nation, code }`.
  5. Zod: `nationScopedIdSchema(nation, kind)` that checks the prefix and brands the output.
- **Acceptance criteria:**
  - `ids.test-d.ts` has `// @ts-expect-error` cases proving: a `SpecialtyId<'wales'>` is not assignable to `SpecialtyId<'england'>`; a `ReportingUnitId<'england'>` is not assignable to `SpecialtyId<'england'>`; a plain string is not assignable to any id; `SingleNation<'england' | 'wales'>` is `never`.
  - `nation.test.ts` covers constructors and parser, including rejecting `wales:` prefixed ids in an England schema.
  - No shared category type exists (e.g. no `SpecialtyId` without a nation parameter).
- **Out of scope:** concrete Specialty or Statistic values (T-2.5–T-2.7).
- **Size:** S

### T-2.2 — Define Reporting Period and Publication Date
- **Depends on:** T-1.3, T-1.5
- **Parallel-safe with:** T-2.1, T-2.11
- **Owns files:** `packages/model/src/period.ts`, `packages/model/test/period.test.ts`
- **Glossary terms:** Reporting Period, Publication Date, Year-Earlier Comparison, Carried-Forward Figure
- **ADRs:** ADR-0002, ADR-0006
- **Context:** Headlines always use the Reporting Period, never the Publication Date. Mixing them up is a real risk because both are dates, so they get distinct branded types. Year-Earlier Comparison needs "twelve months before", and Carried-Forward Figures need "months between" for the 12-month limit.
- **Steps:**
  1. `ReportingPeriod`: branded ISO date string `YYYY-MM-DD` = the "as at" date the figure describes (month end in all three nations; Scotland is monthly per data-sources.md B-2). `PublicationDate`: branded ISO date string.
  2. Constructors `reportingPeriod(iso)`, `publicationDate(iso)` with strict validation (real calendar date).
  3. `yearEarlierThan(period)`: same day-of-month logic for month ends (e.g. `2026-02-28` → `2025-02-28`; `2024-02-29` → `2023-02-28`); returns a `ReportingPeriod`.
  4. `monthsBetween(older, newer)`: whole calendar months; used for the Carried-Forward ≤12-month rule.
  5. `compareReportingPeriods(a, b)` for chronological ordering of periods (ordering periods is allowed; ordering Reporting Units by a Statistic is not).
  6. Zod schemas `reportingPeriodSchema`, `publicationDateSchema`.
- **Acceptance criteria:**
  - Type test: a `PublicationDate` is not assignable to `ReportingPeriod` and vice versa.
  - Unit tests: leap-year case, month-end cases, quarter-end (`2026-06-30` → `2025-06-30`), invalid dates rejected (`2026-02-30`).
  - No locale formatting here (display formatting lives in the site i18n layer, T-8.3).
- **Out of scope:** display strings.
- **Size:** S

### T-2.3 — Define figure values, status, unit and provenance
- **Depends on:** T-2.1, T-2.2
- **Parallel-safe with:** T-2.8, T-2.11
- **Owns files:** `packages/model/src/figure.ts`, `packages/model/src/source.ts`, `packages/model/test/figure.test.ts`, `packages/model/test/figure.test-d.ts`
- **Glossary terms:** Official Figure, Derived Figure, Suppressed Figure, Provisional Figure, Statistic, Publishing Nation, Reporting Period, Publication Date
- **ADRs:** ADR-0005, ADR-0006
- **Context:** ADR-0006 fixes the record shape: Publishing Nation × Reporting Unit × Specialty × Wait Stage × Statistic × Reporting Period, with value, unit as published, status, source and Publication Date. ADR-0005 requires Derived Figures to record their inputs and never exist when an input is suppressed or missing. A Suppressed Figure must have no number at all so it can never render as `0`.
- **Steps:**
  1. `source.ts`: `SourceRef<N>` = `{ nation: N; publisher: string; title: string; url: string; licence: 'OGL-3.0'; attribution: string }`.
  2. `figure.ts`:
     - `PublishedUnit = 'weeks' | 'days' | 'percent' | 'proportion' | 'count'` (value kept exactly as published; ADR-0006). England publishes "% within 18 weeks" as a proportion (`0.650…`), so it is stored as `proportion` and multiplied by 100 only for display.
     - `FigureValue = { status: 'published'; value: number; provisional: boolean } | { status: 'suppressed'; provisional: boolean }`. **No `value` key on suppressed.**
     - `Provenance = { kind: 'official'; sourceField: string } | { kind: 'derived'; method: 'exact-sum'; inputs: readonly [string, string, ...string[]] }` (`inputs` are source column/field names from the same release).
     - `Figure<N extends PublishingNation>` = `{ nation: N; reportingUnit: ReportingUnitId<N>; specialty: SpecialtyId<N>; waitStage: WaitStageId<N>; statistic: StatisticId<N>; reportingPeriod: ReportingPeriod; publicationDate: PublicationDate; unit: PublishedUnit; value: FigureValue; provenance: Provenance; source: SourceRef<N> }`, wrapped so `Figure<'england' | 'wales'>` resolves to `never` (use `SingleNation`).
     - `figureKey(f)`: stable string key from the six key parts.
     - `exactSum(inputs: Figure<N>[]): FigureValue | null`: returns `null` if the array is empty, any input is suppressed, or inputs differ in Reporting Period, Publication Date, unit, Reporting Unit, Specialty or Wait Stage; otherwise the integer sum, `provisional` = any input provisional. (Missing inputs are detected by the caller passing the expected input list; see T-6.4.)
  3. Zod schemas for each of the above, parameterised by nation.
- **Acceptance criteria:**
  - `figure.test-d.ts`: `// @ts-expect-error` on reading `.value` from a suppressed `FigureValue` without narrowing; `Figure<PublishingNation>` is `never`; `exactSum` rejects a mixed-nation array at compile time.
  - `figure.test.ts`: `exactSum` returns `null` for any suppressed input, mismatched period, mismatched Wait Stage, empty input; sums integers exactly; propagates provisional.
  - Zod: a suppressed value with a `value` key fails validation; a negative count fails; percent outside 0–100 fails.
- **Out of scope:** nation-specific Statistics (T-2.5–T-2.7); carried-forward state (T-2.9).
- **Size:** M

### T-2.4 — Define the Release type and the per-nation schema factory
- **Depends on:** T-2.3
- **Parallel-safe with:** T-2.8, T-2.11
- **Owns files:** `packages/model/src/release.ts`, `packages/model/src/nation-definitions.ts`, `packages/model/test/release.test.ts`
- **Glossary terms:** Publishing Nation, Reporting Period, Publication Date, Official Figure, Derived Figure, Statistic, Wait Stage, Waiting Standard
- **ADRs:** ADR-0006, ADR-0002, ADR-0007
- **Context:** A Release is one Publishing Nation's normalised publication for one Reporting Period, committed as JSON (ADR-0007). Each nation defines its own Wait Stages, Statistics and Waiting Standards; display logic is written per nation and duplication is accepted (ADR-0006). This task creates the shared *shape* only; values come in T-2.5–T-2.7.
- **Steps:**
  1. `nation-definitions.ts`: `NationDefinitions<N>` = `{ nation: N; waitStages: Record<string, WaitStageDefinition<N>>; statistics: Record<string, StatisticDefinition<N>>; }` where `StatisticDefinition<N>` = `{ id: StatisticId<N>; unit: PublishedUnit; officialName: string; allowedProvenance: 'official' | 'derived' | 'official-or-derived'; range: { min: number; max: number } }` and `WaitStageDefinition<N>` = `{ id: WaitStageId<N>; officialName: string; waitingStandard: { weeks: number; officialName: string; sourceUrl: string } }`.
  2. `release.ts`: `Release<N>` = `{ schemaVersion: 1; nation: N; reportingPeriod; publicationDate; source: SourceRef<N>; retrievedAt: string (ISO datetime); sourceFiles: { url: string; sha256: string; revised: boolean }[]; reportingUnits: ReportingUnitId<N>[] /* present in this release */; figures: Figure<N>[]; comparisonFigures: Figure<N>[] }`. `comparisonFigures` holds Median Ongoing Wait figures for `yearEarlierThan(reportingPeriod)` **taken from the same release** when the source file carries history (Scotland's monthly files carry 25 months and PHS revises history silently, so same-vintage comparison is preferred; see data-sources.md). Empty for England/Wales unless their source carries history.
  3. `releaseSchema(defs: NationDefinitions<N>)` → Zod schema that additionally checks: every `figures` entry's nation/period/publicationDate match the release and every `comparisonFigures` entry has period = `yearEarlierThan(reportingPeriod)` and Statistic = Median Ongoing Wait; every Statistic and Wait Stage id exists in `defs`; value within the Statistic's `range`; unit equals the Statistic's unit; provenance kind allowed; no duplicate `figureKey`.
  4. **Compact file form** (repo-size guard, ADR-0007): `ReleaseFile<N>` stores release-level fields once and each figure without `nation`, `reportingPeriod`, `publicationDate` and `source` (they are identical within a release; `comparisonFigures` keep their own `reportingPeriod`). `toReleaseFile(release)` / `fromReleaseFile(file) → Release<N>` round-trip losslessly. Target: an England release file ≤ 5 MB.
- **Acceptance criteria:**
  - Tests with a tiny inline England-like definitions object prove each extra check rejects a bad release.
  - Round-trip test: `fromReleaseFile(toReleaseFile(r))` deep-equals `r`.
  - `Release<'england' | 'scotland'>` resolves to `never` (type test).
- **Out of scope:** concrete definitions; JSON file layout (T-3.1).
- **Size:** M

### T-2.5 — Define England's Wait Stage, Statistics and Waiting Standard
- **Depends on:** T-2.4
- **Parallel-safe with:** T-2.6, T-2.7, T-2.8
- **Owns files:** `packages/model/src/england/definitions.ts`, `packages/model/src/england/schema.ts`, `packages/model/test/england.test.ts`
- **Glossary terms:** Wait Stage, Statistic, Median Ongoing Wait, Waiting Standard, Long Wait, Official Figure, Derived Figure
- **ADRs:** ADR-0002, ADR-0005, ADR-0006
- **Context:** England publishes ongoing (incomplete) referral-to-treatment pathways. One Wait Stage. Statistics per `docs/plan/data-sources.md § England`. Use the exact source field names recorded there in `provenance.sourceField`.
- **Steps:**
  1. Wait Stage `england:rtt-incomplete-pathway`, officialName "Referral to treatment (incomplete pathways)", Waiting Standard 18 weeks (source URL from data-sources.md).
  2. Statistics (all **official**, from the Incomplete Provider XLSX; data-sources.md § England): `england:median-ongoing-wait` (unit `weeks`, source field `Average (median) waiting time (in weeks)`, range 0–104), `england:within-waiting-standard` (unit `proportion`, field `% within 18 weeks`, range 0–1), `england:long-wait-count` (unit `count`, field `Total 52 plus weeks`), `england:total-waiting` (unit `count`, field `Total number of incomplete pathways`; used for validation, not shown as a headline).
  3. `schema.ts`: `englandReleaseSchema = releaseSchema(englandDefinitions)`.
- **Acceptance criteria:**
  - Tests: a valid England release fixture (inline) parses; a Wales-prefixed id fails; a `days` unit median fails.
  - TSDoc on each Statistic quotes the official definition and source URL.
- **Out of scope:** Specialty list (reference data, T-3.6).
- **Size:** S

### T-2.6 — Define Wales's Wait Stage, Statistics and Waiting Standard
- **Depends on:** T-2.4
- **Parallel-safe with:** T-2.5, T-2.7, T-2.8
- **Owns files:** `packages/model/src/wales/definitions.ts`, `packages/model/src/wales/schema.ts`, `packages/model/test/wales.test.ts`
- **Glossary terms:** Wait Stage, Statistic, Median Ongoing Wait, Waiting Standard, Long Wait
- **ADRs:** ADR-0002, ADR-0005, ADR-0006
- **Context:** Wales publishes patient pathways waiting (whole referral-to-treatment pathway). Waiting Standard 26 weeks. Which Statistics are Official vs Derived at health board × treatment function grain is fixed in `docs/plan/data-sources.md § Wales` — follow it exactly, including any Blocking finding that removes a Statistic.
- **Steps:**
  1. Wait Stage `wales:rtt-pathway` (officialName "Patient pathways waiting to start treatment"; Stage of pathway `T` = all stages), Waiting Standard 26 weeks.
  2. Statistics (all **official**; data-sources.md § Wales): `wales:median-ongoing-wait` (weeks, dataset `acd9529c` MeasureCode 4, range 0–260), `wales:within-waiting-standard` (percent, MeasureCode 2, range 0–100), `wales:long-wait-count` (count, dataset `3ef3a1d8` Measure `52` = "more than 52 weeks"), `wales:total-waiting` (count, MeasureCode 1). No 95th percentile exists for Wales; never add one.
  3. `wales/schema.ts`: `walesReleaseSchema`.
- **Acceptance criteria:** as T-2.5 with Wales values; a test asserts no Statistic has `allowedProvenance` other than what data-sources.md specifies.
- **Out of scope:** Specialty list.
- **Size:** S

### T-2.7 — Define Scotland's two Wait Stages, Statistics and Waiting Standards
- **Depends on:** T-2.4
- **Parallel-safe with:** T-2.5, T-2.6, T-2.8
- **Owns files:** `packages/model/src/scotland/definitions.ts`, `packages/model/src/scotland/schema.ts`, `packages/model/test/scotland.test.ts`, `packages/model/test/scotland.test-d.ts`
- **Glossary terms:** Wait Stage, Statistic, Median Ongoing Wait, Waiting Standard, Long Wait, Derived Figure
- **ADRs:** ADR-0002, ADR-0005, ADR-0006
- **Context:** Scotland publishes ongoing waits per stage only: new outpatient, and inpatient/day case. They are separate Wait Stages and are never summed (ADR-0002). Medians are published in **days** and stored in days (ADR-0006). Verified research (data-sources.md § Scotland) changes two PRD assumptions: the monthly file publishes `WaitsOver52Weeks` directly, so the Long Wait count is an **Official Figure**; and no "% within 12 weeks" is published, so the within-standard figure is a **count** Derived Figure (exact sum of the three bands under 12 weeks), not a percentage (Blocking finding B-1 in MASTER-PLAN).
- **Steps:**
  1. Wait Stages `scotland:new-outpatient` and `scotland:inpatient-day-case` (source `PatientType` values `New Outpatient`, `Inpatient/Day case`), Waiting Standard 12 weeks each with their own official names (12-week first outpatient standard; Treatment Time Guarantee for inpatient/day case — the TTG is also a Patient Right, see glossary).
  2. Statistics: `scotland:median-ongoing-wait` (unit **days**, official, field `Median`, range 0–1100), `scotland:within-waiting-standard-count` (unit `count`, **derived** only: exact sum of `LessThan4WeekWait`, `4To8WeekWait`, `8To12WeekWait`), `scotland:long-wait-count` (unit `count`, official, field `WaitsOver52Weeks`), `scotland:total-waiting` (unit `count`, official, field `Waits`).
  3. Export a typed helper `scotlandStages` tuple; **no** helper that accepts two Wait Stages' figures and returns a number.
- **Acceptance criteria:**
  - Tests: median in `weeks` unit is rejected; within-standard-count with `official` provenance is rejected; with `derived` provenance listing the three band inputs it is accepted; no `percent` Statistic exists for Scotland.
  - `scotland.test-d.ts`: compile-time proof that passing a `new-outpatient` and an `inpatient-day-case` Figure to `exactSum` together… is allowed by type (same nation) but **returns `null` at runtime** (Wait Stage mismatch) — runtime test in `scotland.test.ts`.
- **Out of scope:** band definitions (pipeline, T-6.4).
- **Size:** S

### T-2.8 — Define reference data types: Reporting Units, Hospital Sites, NHS Regions, Specialties, succession
- **Depends on:** T-2.1
- **Parallel-safe with:** T-2.3, T-2.4, T-2.5, T-2.6, T-2.7, T-2.11
- **Owns files:** `packages/model/src/reference.ts`, `packages/model/test/reference.test.ts`
- **Glossary terms:** Reporting Unit, Hospital Site, NHS Region, Specialty, Independent Sector Provider, Publishing Nation, Year-Earlier Comparison
- **ADRs:** ADR-0003, ADR-0006, ADR-0001
- **Context:** Pages need names, kinds, sites, towns and (England only) NHS Region for each Reporting Unit, plus each nation's own Specialty names. Successor/predecessor links decide whether a Year-Earlier Comparison is allowed.
- **Steps:**
  1. `ReportingUnit<N>` = `{ id: ReportingUnitId<N>; officialCode: string; officialName: string; displayName: string; kind: ReportingUnitKind<N>; hospitalSites: HospitalSiteId<N>[]; operational: { from: string | null; to: string | null }; predecessors: ReportingUnitId<N>[]; successors: ReportingUnitId<N>[]; notes: ('treats-patients-from-all-boards')[] }`. `ReportingUnitKind<'england'> = 'nhs-trust' | 'independent-sector-provider'`, `ReportingUnitKind<'wales'> = 'health-board' | 'nhs-trust'` (only if data-sources.md shows Velindre or another trust reports), `ReportingUnitKind<'scotland'> = 'health-board' | 'special-health-board'`.
  2. England-only field `nhsRegion: NhsRegionId` exists only on `ReportingUnit<'england'>` (conditional type), so Wales/Scotland units cannot be grouped by NHS Region.
  3. `HospitalSite<N>` = `{ id; officialCode; name; town: string | null; reportingUnit: ReportingUnitId<N> }`. **No postcode, no coordinates** (PRD: no postcode/distance).
  4. `NhsRegion` = `{ id: NhsRegionId /* 'england:Y56' */; officialCode; name }` — England only.
  5. `Specialty<N>` = `{ id: SpecialtyId<N>; officialCode: string; officialName: string; slug: string; descriptionKey: string /* Editorial Content key, T-9.2 */; isAllSpecialties: boolean }`.
  6. Zod schemas for each, parameterised by nation; `ReferenceData<N>` bundle `{ nation; reportingUnits; hospitalSites; specialties; nhsRegions? (england only); retrievedAt; sources: SourceRef<N>[] }`.
- **Acceptance criteria:**
  - Type test: `ReportingUnit<'wales'>` has no `nhsRegion` property; a `HospitalSite` type has no `postcode` key (asserted with `expectTypeOf<keyof HospitalSite<'england'>>().not.toEqualTypeOf<'postcode'>()` or equivalent).
  - Zod rejects objects with extra `postcode`/`latitude`/`longitude` keys (`.strict()`).
- **Out of scope:** populating data (Phase 3).
- **Size:** M

### T-2.9 — Define the published view the site reads (carried-forward and year-earlier state)
- **Depends on:** T-2.4, T-2.8
- **Parallel-safe with:** T-2.5, T-2.6, T-2.7, T-2.11
- **Owns files:** `packages/model/src/published.ts`, `packages/model/test/published.test.ts`, `packages/model/test/published.test-d.ts`
- **Glossary terms:** Carried-Forward Figure, Year-Earlier Comparison, Reporting Period, Publication Date, Suppressed Figure, Provisional Figure, Derived Figure
- **ADRs:** ADR-0006, ADR-0007, ADR-0005
- **Context:** The site must be dumb: it renders a precomputed, validated view (`data/<nation>/published.json`) and never decides carry-forward or year-earlier logic itself. That logic lives in the pipeline (T-7.2, T-7.3, T-7.4) and its output shape is defined here.
- **Steps:**
  1. `PublishedFigure<N>` = `Figure<N>` + `{ yearEarlier: { status: 'shown'; value: FigureValue; reportingPeriod: ReportingPeriod; publicationDate: PublicationDate } | { status: 'omitted'; reason: 'not-in-release' | 'unit-changed' | 'specialty-changed' | 'suppressed' | 'not-median' } }`. Only the Median Ongoing Wait may have `status: 'shown'`.
  2. `PublishedUnitSpecialty<N>` = `{ reportingUnit; specialty; state: { kind: 'current' } | { kind: 'carried-forward'; monthsOld: number } | { kind: 'no-recent-figures'; lastReportingPeriod: ReportingPeriod }; figures: PublishedFigure<N>[] }`. `carried-forward` only when `monthsOld` is 1–12; after 12 months `no-recent-figures` with no figures.
  3. `PublishedNation<N>` = `{ schemaVersion: 1; nation: N; latestRelease: { reportingPeriod; publicationDate; source }; generatedAt; entries: PublishedUnitSpecialty<N>[] }`.
  4. Zod schemas enforcing the invariants above (yearEarlier shown only for median; monthsOld range; `no-recent-figures` has empty `figures`).
  5. Compact file form as in T-2.4: entries carry a `releaseRef` (reportingPeriod + publicationDate) and a top-level `sources` map, instead of repeating source fields on every figure; `fromPublishedFile` hydrates full `PublishedFigure<N>` objects for the site.
- **Acceptance criteria:**
  - Tests: schema rejects yearEarlier on a Long Wait count; rejects carried-forward with `monthsOld: 13`; accepts each valid state.
  - Type test: `PublishedNation<PublishingNation>` is `never`.
- **Out of scope:** computing the view (T-7.2, T-7.3, T-7.4).
- **Size:** M

### T-2.10 — Add the cross-nation guardrail type-test suite
- **Depends on:** T-2.5, T-2.6, T-2.7, T-2.9
- **Parallel-safe with:** T-2.11, Phase 3 tasks
- **Owns files:** `packages/model/test/guardrails.test-d.ts`, `packages/model/test/guardrails.test.ts`
- **Glossary terms:** Publishing Nation, Statistic, Specialty, Reporting Unit, Wait Stage
- **ADRs:** ADR-0006, ADR-0002, ADR-0005
- **Context:** One place that proves the PRD guardrails hold at the type level, so a future refactor that weakens them fails CI loudly.
- **Steps:** write `@ts-expect-error` cases for each guardrail:
  1. An array `Figure<'england'>[]` cannot receive a `Figure<'wales'>`.
  2. No exported function accepts `Figure<'england'>` and `Figure<'scotland'>` in one call (test the exported generic helpers: `exactSum`, `figureKey` consumers, schema factories).
  3. `Release<PublishingNation>`, `Figure<PublishingNation>`, `PublishedNation<PublishingNation>` resolve to `never`.
  4. A Suppressed `FigureValue` has no `value`.
  5. A `PublicationDate` cannot be passed where a `ReportingPeriod` is expected.
  6. Runtime: iterate the exported members of `@kyw/model/*` modules and assert there is no exported constant whose name suggests a cross-nation mapping (`/crossNation|commonSpecialty|sharedSpecialty|ukWide/i`).
- **Acceptance criteria:** all cases present and `pnpm test` passes; removing the `SingleNation` wrapper from `Figure` makes the suite fail (verify locally).
- **Out of scope:** lint rules (T-2.11).
- **Size:** S

### T-2.11 — Add the project guardrail ESLint plugin (no ranking, no cross-nation imports)
- **Depends on:** T-1.4
- **Parallel-safe with:** T-2.1–T-2.10
- **Owns files:** `tools/eslint-plugin-kyw/package.json`, `tools/eslint-plugin-kyw/src/index.js`, `tools/eslint-plugin-kyw/src/rules/no-ranking-by-statistic.js`, `tools/eslint-plugin-kyw/test/no-ranking-by-statistic.test.ts`, `eslint.config.js` (append the guardrail block only)
- **Glossary terms:** Reporting Unit, Statistic, Publishing Nation
- **ADRs:** ADR-0006, ADR-0003 (no ranking keeps Independent Sector Providers neutral)
- **Context:** "Never sorted by wait" must be enforced by tooling, not just prose. Folder-level isolation keeps each nation's pipeline and display code separate, matching ADR-0006's "display logic is written per nation".
- **Steps:**
  1. Rule `kyw/no-ranking-by-statistic`: report any `.sort(…)`, `.toSorted(…)`, lodash `sortBy`/`orderBy`, or `Intl.Collator().compare` wrapper whose comparator/iteratee body references a member named `value`, `median*`, `longWait*`, `withinWaitingStandard*`, `total*`, `statistic`, or `figures`. Allowed: comparators referencing `displayName`, `officialName`, `name`, `reportingPeriod`.
  2. Rule tests with `RuleTester` (Vitest): valid alphabetical sort; invalid sort by `figure.value.value`; invalid `toSorted((a,b)=>a.median-b.median)`.
  3. In `eslint.config.js`, enable `kyw/no-ranking-by-statistic` for `apps/**` and `packages/**`; add `import-x/no-restricted-paths` zones forbidding: `packages/pipeline/src/england/**` ↔ `wales/**` ↔ `scotland/**` imports, and `apps/site/src/nations/england/**` ↔ `wales/**` ↔ `scotland/**`.
- **Acceptance criteria:**
  - Rule tests pass; `pnpm lint` passes on the repo.
  - A scratch file under `packages/pipeline/src/wales/` importing from `../england/` fails lint (verify locally).
- **Out of scope:** UI copy term checks (T-8.16).
- **Size:** M
