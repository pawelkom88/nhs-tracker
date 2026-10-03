# Phase 5 — Pipeline: Wales ingest and normalise

**Goal:** turn the stats.gov.wales RTT datasets into a validated `Release<'wales'>` JSON, detecting new versions through the dataset metadata endpoint.

**Starts after:** T-2.6, T-3.1, T-3.7. Runs **in parallel with Phases 4 and 6**. Every fact is from [data-sources.md § Wales](./data-sources.md#wales--welsh-government--statswales-statsgovwales). Read [MASTER-PLAN.md § Conventions](./MASTER-PLAN.md#conventions).

All code lives in `packages/pipeline/src/wales/`. Legacy StatsWales OData is retired: do not use it.

---

### T-5.1 — Commit trimmed real Wales fixtures
- **Depends on:** T-3.1
- **Parallel-safe with:** Phase 4 and 6 tasks, T-5.2
- **Owns files:** `packages/pipeline/scripts/fetch-wales-fixture.ts`, `packages/pipeline/fixtures/wales/**`, `packages/pipeline/fixtures/wales/README.md`
- **Glossary terms:** Reporting Unit, Specialty, Suppressed Figure, Reporting Period
- **ADRs:** ADR-0007
- **Context:** Fixtures are real API responses filtered server-side (coded download with `raw_extended`), small enough to commit.
- **Steps:**
  1. Script performs, for `acd9529c-979a-48ef-a773-870b3ebe4391` and `3ef3a1d8-1467-4afe-ad60-4fc3d92228a1`: `GET /v2/{uuid}` (metadata) and the two-step coded download filtered to `DateCode` ∈ {`202607`, `202507`}, `StageOfPathwayCode` = `T` (and `AgeGroupCode` = `T` for `3ef3a1d8`; confirm dimension codes from `/filters`), saving JSON metadata + CSV.
  2. Save `/filters` responses for both datasets (code lists).
  3. Trim CSV rows to: all 7 boards + `W92000004` + `A1X` (if present) × specialties `1`/`T`, `110`, `130`, and one small cell **without a median row** (e.g. Powys Cardiology `320`).
  4. README: URLs, request bodies, retrieval date, version ids.
- **Acceptance criteria:** fixtures ≤ 300 KB; README complete; contains at least one cell with total but no median.
- **Out of scope:** parsing.
- **Size:** S

### T-5.2 — Wales API client and release discovery
- **Depends on:** T-3.1
- **Parallel-safe with:** T-5.1, Phase 4/6
- **Owns files:** `packages/pipeline/src/wales/api.ts`, `packages/pipeline/src/wales/discover.ts`, `packages/pipeline/test/wales/discover.test.ts`
- **Glossary terms:** Reporting Period, Publication Date
- **ADRs:** ADR-0007
- **Context:** `GET https://api.stats.gov.wales/v2/{uuid}` returns the current version id, publish time, next update and coverage end. A new version id means a new release (new month and/or silent revisions). The coded download needs a POST (filters) then a GET (`/data/{filterId}?format=csv`).
- **Steps:**
  1. `api.ts`: `getMetadata(uuid)`, `postFilter(uuid, body) → filterId`, `getCodedCsv(uuid, filterId)`; all via `fetchToCache`; injectable fetch.
  2. `discover(state)`: one candidate if either dataset's version id differs from `state.json`; `reportingPeriod` = coverage end month-end; `publicationDate` = version publish date; `fingerprint` = both version ids joined.
  3. Request body helper: `DateCode` = [latest, latest − 12 months], stage `T`, age `T`, `data_value_type: raw_extended`.
- **Acceptance criteria:** tests with fixture metadata: unchanged version → no candidate; changed → candidate with period `2026-07-31` and publication date `2026-09-17`; body includes the year-earlier month.
- **Out of scope:** parsing.
- **Size:** S

### T-5.3 — Parse Wales coded CSVs
- **Depends on:** T-5.1, T-5.2
- **Parallel-safe with:** Phase 4/6
- **Owns files:** `packages/pipeline/src/wales/parse.ts`, `packages/pipeline/src/wales/columns.ts`, `packages/pipeline/test/wales/parse.test.ts`
- **Glossary terms:** Reporting Unit, Specialty, Reporting Period
- **ADRs:** ADR-0005, ADR-0006
- **Context:** Codes come only from the `_reference` columns; labels are ignored except for diagnostics. Any change in expected columns or measure codes must block publishing.
- **Steps:**
  1. `columns.ts`: expected header sets for both datasets (incl. `_reference`, `_sort`, `_hierarchy` columns); expected `MeasureCode` sets (`acd9529c`: 1–6; `3ef3a1d8`: `26`,`36`,`52`,`104`,`TP`).
  2. Parse into `RawWalesValue = { dataset, dateCode, boardOnsCode, specialtyCode, measureCode, value: number }`.
  3. Unknown measure code, non-numeric value, or missing expected column → `SchemaChangeError`.
- **Acceptance criteria:** tests: fixture parses; codes taken from `_reference`; a mutated header throws.
- **Out of scope:** mapping to Statistics.
- **Size:** S

### T-5.4 — Normalise into `Release<'wales'>` (with same-release year-earlier medians)
- **Depends on:** T-5.3, T-2.6, T-3.7
- **Parallel-safe with:** Phase 4/6
- **Owns files:** `packages/pipeline/src/wales/normalise.ts`, `packages/pipeline/test/wales/normalise.test.ts`
- **Glossary terms:** Official Figure, Suppressed Figure, Median Ongoing Wait, Waiting Standard, Long Wait, Year-Earlier Comparison
- **ADRs:** ADR-0005, ADR-0006
- **Context:** All Wales Statistics are Official Figures. Medians are absent (no row) for small cells: that is a Suppressed Figure, never 0 and never estimated. A missing **count** row where the cell's total exists means 0 (verified by band sums; Assumption A-13). Wales revises up to 12 months silently, so the year-earlier median is taken from the same download into `comparisonFigures`.
- **Steps:**
  1. Map board ONS code → `wales:<ODS code>` via the T-3.7 crosswalk; skip `W92000004`, `A1X`, legacy codes.
  2. Map specialty `1` (acd9529c) and `T` (3ef3a1d8) → `wales:all`; others → `wales:<code>`.
  3. For each board × specialty cell with total (MeasureCode 1) > 0 for the latest month: figures for median (MeasureCode 4; absent → suppressed), within-standard (MeasureCode 2, percent), long wait (`3ef3a1d8` Measure `52`; absent with total present → 0, provenance official), total (MeasureCode 1).
  4. `comparisonFigures`: median for the year-earlier month for the same cell, same rules.
  5. Validate with `walesReleaseSchema`.
- **Acceptance criteria (tests):** Cardiff and Vale × 110 July 2026 → median 29.5, within 45.9, long wait 4341, total 14090; the no-median fixture cell → suppressed median, other Statistics present; All Wales row absent; comparison median present for July 2025; output passes schema; no derived provenance.
- **Out of scope:** writing files.
- **Size:** M

### T-5.5 — Wales source adapter
- **Depends on:** T-5.2, T-5.4
- **Parallel-safe with:** Phase 4/6 adapters
- **Owns files:** `packages/pipeline/src/wales/source.ts`, `packages/pipeline/test/wales/source.test.ts`
- **Glossary terms:** Publishing Nation, Reporting Period
- **ADRs:** ADR-0007
- **Context:** Implements `NationSource<'wales'>` for the orchestrator. A new dataset version for an already-committed period (revision only) replaces that release file.
- **Steps:** wire discover → fetch (both datasets) → parse → normalise; store version ids for `state.json`.
- **Acceptance criteria:** end-to-end fixture test produces a valid Release; unchanged versions produce no work.
- **Out of scope:** —
- **Size:** S
