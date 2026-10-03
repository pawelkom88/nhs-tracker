# Phase 4 — Pipeline: England ingest and normalise

**Goal:** turn NHS England's monthly **Incomplete Provider XLSX** into a validated `Release<'england'>` JSON, discovering new and revised files by scraping the yearly RTT pages.

**Starts after:** T-2.5, T-3.1. Runs **in parallel with Phases 5 and 6**. Every fact is from [data-sources.md § England](./data-sources.md#england--nhs-england-consultant-led-rtt-waiting-times). Read [MASTER-PLAN.md § Conventions](./MASTER-PLAN.md#conventions).

All code lives in `packages/pipeline/src/england/` (lint zones forbid imports from `wales/` or `scotland/`).

---

### T-4.1 — Commit trimmed real England fixtures

- **Depends on:** T-3.1
- **Parallel-safe with:** T-4.2, Phase 5 and 6 tasks
- **Owns files:** `packages/pipeline/scripts/trim-england-fixture.ts`, `packages/pipeline/fixtures/england/**`, `packages/pipeline/fixtures/england/README.md`
- **Glossary terms:** Reporting Unit, Independent Sector Provider, Suppressed Figure, Reporting Period, Publication Date
- **ADRs:** ADR-0003, ADR-0007
- **Context:** Tests must use real published files, never invented data, but the full XLSX is ~10 MB. A script trims real files to a handful of providers while keeping layout, metadata rows and header row exactly as published.
- **Steps:**
  1. Download (manually or via the script with `--live`) the Incomplete Provider XLSX for **Jul 2026**, **Jul 2025** (year-earlier), one **revised** file (e.g. Mar 2026 `-revised`), and save the HTML of `rtt-data-2026-27/` and `rtt-data-2025-26/`.
  2. Script keeps sheets `Provider` and `IS Provider` (and `Notes` text), rows 1–14 untouched, and only data rows for: `R1H` (large trust), `RRK`, `RAL` (absorbed RAP on 2025-01-01, so Year-Earlier must be skipped for 2024→2025), `RAP` (present only in older file), one provider absent from Jul 2026 but present in Jul 2025 (e.g. `RA9`, a non-submitter), two ISPs including one site-level code with a suppressed median (e.g. `A1D1B`), all 24 treatment-function rows for each.
  3. Record in `fixtures/england/README.md`: source URLs, download date, sha256 of originals, what was kept.
  4. Fixture size budget ≤ 500 KB total.
- **Acceptance criteria:** fixture XLSX opens with `exceljs`; header row 14 unchanged; README lists URLs and hashes; script reproduces fixtures byte-for-byte from the originals (deterministic).
- **Out of scope:** parsing.
- **Size:** M

### T-4.2 — Discover England release files from the yearly pages

- **Depends on:** T-3.1, T-4.1
- **Parallel-safe with:** T-4.3, Phase 5/6
- **Owns files:** `packages/pipeline/src/england/discover.ts`, `packages/pipeline/test/england/discover.test.ts`
- **Glossary terms:** Reporting Period, Publication Date
- **ADRs:** ADR-0007
- **Context:** File URLs contain a random suffix and the upload month, so they cannot be predicted. Revised files replace links on the page. The daily job must find the newest Incomplete Provider file and any revised older ones.
- **Steps:**
  1. Fetch the current and previous financial-year pages (`rtt-data-YYYY-YY/`; derive the two years from today's date).
  2. Extract `<a href>` values matching `/Incomplete-Provider-([A-Z][a-z]{2})(\d{2})-XLSX-[^/]*\.xlsx$/`; map `Mon`+`YY` to the month-end `ReportingPeriod`; `revised = /-revised\.xlsx$/`.
  3. Return `ReleaseCandidate[]` with `fingerprint` = URL (a changed URL for the same period = revision).
  4. If zero matches on the current page during months it should have files → `SourceUnavailableError` (page layout changed).
- **Acceptance criteria:** tests on committed HTML: Jul 2026 candidate found with correct period `2026-07-31`; a `-revised` link flagged; periods unique; no network.
- **Out of scope:** download.
- **Size:** S

### T-4.3 — Parse the Incomplete Provider XLSX

- **Depends on:** T-4.1, T-3.1
- **Parallel-safe with:** T-4.2, Phase 5/6
- **Owns files:** `packages/pipeline/src/england/parse.ts`, `packages/pipeline/src/england/columns.ts`, `packages/pipeline/test/england/parse.test.ts`
- **Glossary terms:** Reporting Unit, Independent Sector Provider, Specialty, Publication Date, Reporting Period
- **ADRs:** ADR-0003, ADR-0005
- **Context:** The XLSX has metadata rows, a header on row 14, data starting in column B, and two relevant sheets. Any structural change must block publishing (`SchemaChangeError`) rather than produce wrong figures.
- **Steps:**
  1. `columns.ts`: the exact expected header list (data-sources.md) as a constant.
  2. Read metadata: `Period` (→ ReportingPeriod; must match the filename period), `Published` (e.g. `10th September 2026` → PublicationDate), `Revised` (`N/A` or date), `Status`.
  3. For sheets `Provider` and `IS Provider`: find the header row (expect 14); compare header cells to `columns.ts` exactly → `SchemaChangeError` listing differences.
  4. Emit `RawEnglandRow` = `{ sheet: 'Provider' | 'IS Provider', regionCode, providerCode, providerName, treatmentFunctionCode, treatmentFunctionName, total: number, within18Proportion: number, median: number | 'suppressed', longWait52Plus: number }`. `-` → `'suppressed'`. Week bands are not needed (not parsed).
  5. Reject non-numeric values other than `-` in figure columns.
- **Acceptance criteria:** tests: fixture parses; publication date `2026-09-10`; ISP rows carry `sheet: 'IS Provider'`; a header with a renamed column throws `SchemaChangeError`; a suppressed median parses as `'suppressed'`.
- **Out of scope:** model mapping.
- **Size:** M

### T-4.4 — Normalise parsed rows into `Release<'england'>`

- **Depends on:** T-4.3, T-2.5, T-3.6
- **Parallel-safe with:** T-3.9, Phase 5/6
- **Owns files:** `packages/pipeline/src/england/normalise.ts`, `packages/pipeline/test/england/normalise.test.ts`
- **Glossary terms:** Official Figure, Suppressed Figure, Median Ongoing Wait, Waiting Standard, Long Wait, Reporting Unit, Specialty, Wait Stage, Reporting Period, Publication Date
- **ADRs:** ADR-0005, ADR-0006, ADR-0002
- **Context:** All four England Statistics are Official Figures published in the XLSX. Values keep their published unit (proportion, weeks). Rows with total 0 are "no pathways", not 0 %, and produce no figures.
- **Steps:**
  1. For each row with `total > 0`: emit four `Figure<'england'>` (median, within-standard, long-wait, total) with ids `england:<providerCode>`, `england:<TF code>`, `england:rtt-incomplete-pathway`, Statistic ids from T-2.5, `provenance: { kind: 'official', sourceField: '<exact column name>' }`, `provisional: false`, source ref with the XLSX URL.
  2. Median `'suppressed'` → `{ status: 'suppressed', provisional: false }`.
  3. Rows with `total === 0`: skip all four figures.
  4. `reportingUnits` = distinct provider ids with at least one figure.
  5. `assertKnownTreatmentFunctions` (T-3.6) on all codes.
  6. Validate the result with `englandReleaseSchema` before returning.
  7. `comparisonFigures: []` (England year-earlier comes from the stored older release, T-7.2).
- **Acceptance criteria (tests):** R1H × C_110 produces four figures with exact published values; zero-total rows produce none; suppressed median has no `value`; long wait equals the `Total 52 plus weeks` cell; proportion stored as published (no ×100); output passes schema; no figure has `kind: 'derived'`.
- **Out of scope:** writing files, validation gate.
- **Size:** M

### T-4.5 — England source adapter

- **Depends on:** T-4.2, T-4.4, T-3.9
- **Parallel-safe with:** Phase 5/6 adapters
- **Owns files:** `packages/pipeline/src/england/source.ts`, `packages/pipeline/test/england/source.test.ts`
- **Glossary terms:** Publishing Nation, Reporting Period, Publication Date
- **ADRs:** ADR-0007
- **Context:** Implements `NationSource<'england'>` (T-3.1) so the orchestrator (T-7.5) can run England like any nation: discover candidates not yet in `state.json` (new period or changed URL = revision), fetch, normalise, and rebuild England reference data from the release's provider list.
- **Steps:**
  1. `discover(state)`: candidates whose period is newer than the latest committed release, or whose URL differs from the stored URL for an already-committed period (revision; only within the last 13 months).
  2. `fetch(candidate)`: download via `fetchToCache`, record sha256.
  3. `normalise(raw, reference)`: T-4.3 + T-4.4; also return provider list for `buildEnglandReference` (T-3.9).
- **Acceptance criteria:** tests with injected fetch and fixtures: new period detected; same URL = nothing to do; changed URL for Mar 2026 = revision candidate; end-to-end fixture → Release passes schema.
- **Out of scope:** committing, validation gate.
- **Size:** S
