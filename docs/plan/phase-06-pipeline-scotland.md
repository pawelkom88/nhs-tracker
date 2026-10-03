# Phase 6 — Pipeline: Scotland ingest and normalise

**Goal:** turn Public Health Scotland's **monthly** stage-of-treatment open-data files into a validated `Release<'scotland'>` JSON with two separate Wait Stages, medians in days, an Official Long Wait count, and a Derived within-12-weeks count.

**Starts after:** T-2.7, T-3.1, T-3.8. Runs **in parallel with Phases 4 and 5**. Every fact is from [data-sources.md § Scotland](./data-sources.md#scotland--public-health-scotland-stage-of-treatment-waiting-times). Read [MASTER-PLAN.md § Conventions](./MASTER-PLAN.md#conventions).

All code lives in `packages/pipeline/src/scotland/`.

**Note:** the PRD says quarterly and that Long Wait is a Derived Figure. Verified research shows monthly Accredited data and a published `WaitsOver52Weeks` column (Blocking finding B-2). The within-standard figure is a count, not a percentage (B-1). Follow this phase, not the PRD, on those points.

---

### T-6.1 — Commit trimmed real Scotland fixtures
- **Depends on:** T-3.1
- **Parallel-safe with:** Phase 4/5, T-6.2
- **Owns files:** `packages/pipeline/scripts/trim-scotland-fixture.ts`, `packages/pipeline/fixtures/scotland/stage-of-treatment/**`, `packages/pipeline/fixtures/scotland/README.md`
- **Glossary terms:** Reporting Unit, Wait Stage, Specialty, Suppressed Figure
- **ADRs:** ADR-0007
- **Context:** Real files are large (41k rows each). Trim to a representative subset, keeping every column.
- **Steps:**
  1. Save `package_show` JSON for `stage-of-treatment-waiting-times`.
  2. Download `ac63b747-…` (Ongoing and Completed Waits – Monthly) and `f9232c17-…` (Distribution – Monthly).
  3. Keep rows for `MonthEnding` ∈ {20260831, 20250831}, `HBT` ∈ {S08000024 Lothian, S08000031 GG&C, SB0801 Golden Jubilee, S08000025 Orkney (small → suppression), S92000003, S27000001, RA2702}, `Specialty` ∈ {`Z9`, the T&O code from the specialty lookup, one more}, both `PatientType`s, both `WaitType`s. Ensure at least one row with `MedianQF = ':'` and one `:u` row.
  4. README with URLs, file names, `last_modified`, sha256 of originals.
- **Acceptance criteria:** fixtures ≤ 300 KB; contains suppressed examples; deterministic script.
- **Out of scope:** parsing.
- **Size:** S

### T-6.2 — Scotland release discovery via CKAN
- **Depends on:** T-3.1
- **Parallel-safe with:** T-6.1, Phase 4/5
- **Owns files:** `packages/pipeline/src/scotland/discover.ts`, `packages/pipeline/test/scotland/discover.test.ts`
- **Glossary terms:** Reporting Period, Publication Date
- **ADRs:** ADR-0007
- **Context:** Resource ids are stable; file names change per release. `package_show` gives each resource's current URL and `last_modified`.
- **Steps:**
  1. Fetch `https://www.opendata.nhs.scot/api/3/action/package_show?id=stage-of-treatment-waiting-times`; select resources by **id** (`ac63b747-fdcc-410c-ae43-de6fe3c46abf`, `f9232c17-a90e-4d35-a863-11bdb3a748c0`); missing id → `SourceUnavailableError`.
  2. Candidate when either resource's `url` or `last_modified` differs from `state.json`. `publicationDate` = date part of `last_modified` (Assumption A-10); `reportingPeriod` determined after parsing (max `MonthEnding`).
  3. Both resources must share the same `last_modified` date, else wait (partial upload) — return no candidate and log.
- **Acceptance criteria:** tests on fixture JSON: unchanged → none; changed → candidate; mismatched dates → none.
- **Out of scope:** parsing.
- **Size:** S

### T-6.3 — Parse monthly CSVs and decode quality flags
- **Depends on:** T-6.1
- **Parallel-safe with:** T-6.2, Phase 4/5
- **Owns files:** `packages/pipeline/src/scotland/parse.ts`, `packages/pipeline/src/scotland/columns.ts`, `packages/pipeline/src/scotland/quality-flags.ts`, `packages/pipeline/test/scotland/parse.test.ts`
- **Glossary terms:** Suppressed Figure, Provisional Figure, Wait Stage
- **ADRs:** ADR-0005
- **Context:** Every value has a `…QF` quality flag. The flag decides whether a value is shown. Estimates (`e`) must never be shown.
- **Steps:**
  1. `columns.ts`: exact header lists for both files (data-sources.md).
  2. `quality-flags.ts`: `decodeQf(flag, rawValue) → { status: 'published', value, provisional } | { status: 'suppressed', provisional }`: empty or `d` → published (value must be numeric); `p` → published + provisional; `:`, `:u`, `c`, `u`, `x`, `y`, `z`, `~`, `e`, `b`, any other or empty value → suppressed. Document each mapping with the PHS qualifier definition.
  3. Parse rows filtered to `WaitType = 'Ongoing'`; keep `MonthEnding`, `HBT`, `PatientType`, `Specialty` and decoded values.
  4. Header mismatch, unknown `PatientType`, or unknown `WaitType` → `SchemaChangeError`.
- **Acceptance criteria:** tests: `:` median → suppressed; `d` total → published; `e` → suppressed; header mutation throws; only Ongoing rows returned.
- **Out of scope:** model mapping.
- **Size:** M

### T-6.4 — Normalise into `Release<'scotland'>` (two Wait Stages, days, Derived within-12 count)
- **Depends on:** T-6.3, T-2.7, T-3.8
- **Parallel-safe with:** Phase 4/5
- **Owns files:** `packages/pipeline/src/scotland/normalise.ts`, `packages/pipeline/src/scotland/bands.ts`, `packages/pipeline/test/scotland/normalise.test.ts`
- **Glossary terms:** Wait Stage, Median Ongoing Wait, Waiting Standard, Long Wait, Derived Figure, Official Figure, Suppressed Figure, Year-Earlier Comparison
- **ADRs:** ADR-0002, ADR-0005, ADR-0006
- **Context:** Each `PatientType` is its own Wait Stage, never summed (ADR-0002). Medians stay in days (ADR-0006). The within-12-weeks count is a Derived Figure: the exact sum of `LessThan4WeekWait`, `4To8WeekWait`, `8To12WeekWait` from the same row; if any input is suppressed or missing it is not produced (ADR-0005). The files carry 25 months and are silently revised, so the year-earlier median comes from the same files.
- **Steps:**
  1. `reportingPeriod` = max `MonthEnding` across both files (must be equal in both; else `SchemaChangeError`).
  2. HBT allow-list from reference (14 boards + SB0801); skip `S92000003`, `S27000001`, `RA2702`, `RA2704`.
  3. Per HBT × Specialty × PatientType at the latest month: median (`Median`, days, official), long wait (`WaitsOver52Weeks`, official), total (`Waits`, official), within-standard count = `exactSum` (T-2.3) of the three band figures → `provenance: { kind: 'derived', method: 'exact-sum', inputs: ['LessThan4WeekWait','4To8WeekWait','8To12WeekWait'] }`; omitted when `exactSum` returns `null`.
  4. `bands.ts`: cross-checks (all must hold for published values, else `ValidationError`): sum of 22 bands = `Waits`; bands ≥ 12 = `WaitsOver12Weeks`; bands ≥ 52 = `WaitsOver52Weeks`. Used as integrity checks, not to produce extra figures.
  5. `comparisonFigures`: medians for `MonthEnding` = latest − 12 months from the same file.
  6. Specialty: `Z9` → `scotland:Z9` (All specialties); never sum specialty rows.
  7. Validate with `scotlandReleaseSchema`.
- **Acceptance criteria (tests):**
  - Two separate entries per board × specialty, one per Wait Stage; no figure equals the sum of the two stages' totals (assert no Wait Stage id other than the two exists).
  - Median stored in days exactly as published.
  - Within-12 count equals the band sum and carries derived provenance; with one band suppressed it is absent.
  - Long Wait official and equal to `WaitsOver52Weeks`.
  - Golden Jubilee present; `S92000003`, `S27000001`, `RA2702` absent.
  - Band cross-check failure raises `ValidationError` (mutated fixture in test).
- **Out of scope:** writing files.
- **Size:** M

### T-6.5 — Scotland source adapter
- **Depends on:** T-6.2, T-6.4
- **Parallel-safe with:** Phase 4/5 adapters
- **Owns files:** `packages/pipeline/src/scotland/source.ts`, `packages/pipeline/test/scotland/source.test.ts`
- **Glossary terms:** Publishing Nation, Reporting Period, Publication Date
- **ADRs:** ADR-0007
- **Context:** Implements `NationSource<'scotland'>`. A changed file for an already-committed latest period replaces that release (revision).
- **Steps:** wire discover → fetch both resources → parse → normalise; record resource URLs and `last_modified` for `state.json`.
- **Acceptance criteria:** end-to-end fixture test produces a valid Release; unchanged state produces no work.
- **Out of scope:** —
- **Size:** S
