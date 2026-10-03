# Phase 7 — Validation gate, publish logic and scheduled pipeline

**Goal:** a release reaches `data/` only after passing the validation gate; the site's input (`published.json`) is assembled with Carried-Forward and Year-Earlier logic; a daily GitHub Actions job checks each nation, commits new valid data, and opens an issue when validation fails.

**Starts after:** T-2.9, T-3.1 (logic tasks); adapters from Phases 4–6 for the orchestrator. Read [MASTER-PLAN.md § Conventions](./MASTER-PLAN.md#conventions).

Code lives in `packages/pipeline/src/{validate,assemble}/` and `packages/pipeline/src/cli.ts`. These modules are generic over `N extends PublishingNation`; they never take two nations at once.

---

### T-7.1 — Validation gate

- **Depends on:** T-2.4, T-2.5, T-2.6, T-2.7, T-3.1
- **Parallel-safe with:** T-7.2, T-7.3, Phases 4–6
- **Owns files:** `packages/pipeline/src/validate/gate.ts`, `packages/pipeline/src/validate/thresholds.ts`, `packages/pipeline/src/validate/report.ts`, `packages/pipeline/test/validate/gate.test.ts`
- **Glossary terms:** Reporting Unit, Reporting Period, Publication Date, Official Figure, Derived Figure, Statistic
- **ADRs:** ADR-0007, ADR-0005
- **Context:** ADR-0007: schema changes, sharp drops in Reporting Unit count or out-of-range values block publishing; the site keeps its last good data. Exact thresholds were a PRD open question; defaults below are Assumption A-05 and live in one file so the product owner can tune them.
- **Steps:**
  1. `validateRelease(candidate: Release<N>, previous: Release<N> | null, reference: ReferenceData<N>) → ValidationReport { ok, checks: { id, ok, detail }[] }`.
  2. Checks (each a named function with its own test):
     - `schema`: model Zod schema passes (includes units, ranges, provenance, duplicate keys).
     - `period-order`: candidate period > previous period, or = previous period (revision).
     - `dates`: `publicationDate` > `reportingPeriod` and ≤ today.
     - `unit-count`: England: candidate units ≥ 95 % of previous; Wales/Scotland: no board missing vs previous (any drop blocks for human check).
     - `figure-count`: total figures ≥ 90 % of previous.
     - `reference`: every Reporting Unit and Specialty id exists in reference data.
     - `internal-consistency`: per entry, Long Wait ≤ total waiting; Scotland within-12 count ≤ total.
     - `nation-total-swing`: the sum of `total-waiting` over all-specialties entries for the nation changes by ≤ 25 % vs previous (catches unit or scaling errors; ADR-0006 allows summing within one nation for validation only, never for display).
     - `no-estimates`: no provenance other than `official` or `derived/exact-sum`; no Scotland flag `e` reached output.
  3. `thresholds.ts`: all numbers above as named constants with TSDoc.
  4. `report.ts`: Markdown rendering of a report for GitHub issues (failed checks first, with details).
- **Acceptance criteria:** one failing and one passing test per check; report Markdown snapshot test.
- **Out of scope:** writing files, issues.
- **Size:** M

### T-7.2 — Year-Earlier Comparison logic

- **Depends on:** T-2.9, T-3.5
- **Parallel-safe with:** T-7.1, T-7.3, Phases 4–6
- **Owns files:** `packages/pipeline/src/assemble/year-earlier.ts`, `packages/pipeline/test/assemble/year-earlier.test.ts`
- **Glossary terms:** Year-Earlier Comparison, Median Ongoing Wait, Reporting Unit, Specialty, Reporting Period
- **ADRs:** ADR-0006, ADR-0002
- **Context:** Year-Earlier Comparison applies to the Median Ongoing Wait only and is omitted when the Reporting Unit or Specialty is not the same entity in both periods. ODS shows absorbing trusts keep their code, so a succession check is needed (data-sources.md B-4). Wales and Scotland supply same-release comparison medians (`comparisonFigures`); England uses the stored release from 12 months earlier.
- **Steps:**
  1. `yearEarlierFor(figure, ctx)` where `ctx = { comparisonFigures, olderRelease: Release<N> | null, isSameEntity(unitId, older, newer): boolean, specialtyExistedThen(specialtyId): boolean }`.
  2. Statistic ≠ median → `{ status: 'omitted', reason: 'not-median' }`.
  3. Look up the comparison value: prefer `comparisonFigures`; else `olderRelease` with period = `yearEarlierThan(period)`; none → `not-in-release`.
  4. `isSameEntity` false → `unit-changed`; Specialty absent then → `specialty-changed`; comparison value suppressed → `suppressed`; current median suppressed → `suppressed`.
  5. Per-nation `isSameEntity` wiring: England = T-3.5; Wales = always true after 2019-04-01 (T-3.7); Scotland = archived→current code mapping (T-3.8).
- **Acceptance criteria (tests):** RAL 2025-07 vs 2024-07 omitted `unit-changed`; RRK shown; suppressed comparison omitted; long-wait figure → `not-median`; Scotland uses comparisonFigures even when an older release file exists with a different (unrevised) value.
- **Out of scope:** rendering.
- **Size:** M

### T-7.3 — Carried-Forward logic

- **Depends on:** T-2.9
- **Parallel-safe with:** T-7.1, T-7.2, Phases 4–6
- **Owns files:** `packages/pipeline/src/assemble/carry-forward.ts`, `packages/pipeline/test/assemble/carry-forward.test.ts`
- **Glossary terms:** Carried-Forward Figure, Reporting Unit, Reporting Period
- **ADRs:** ADR-0007
- **Context:** A Reporting Unit missing from the latest release shows its last available figures, with their own older Reporting Period and a warning, for up to 12 months; after that, "No figures published since [period]". (England non-submitters simply vanish from the file — data-sources.md.)
- **Steps:**
  1. `carryForward(latest: Release<N>, history: Release<N>[]) → PublishedUnitSpecialty<N>[]` for units absent from `latest` but present in history.
  2. For each such unit × Specialty: find the most recent release containing it; `monthsOld = monthsBetween(thatPeriod, latest.reportingPeriod)`; 1–12 → `carried-forward` with that release's figures (their own Reporting Period and Publication Date); > 12 → `no-recent-figures` with `lastReportingPeriod`, no figures.
  3. Units with a successor in reference data are **not** carried forward (they no longer exist): `no-recent-figures`.
  4. Stop listing after 24 months (`no-recent-figures` entries older than 24 months are dropped; Assumption A-07).
- **Acceptance criteria:** tests: unit absent for 3 months → carried-forward with older period; 13 months → no-recent; merged unit → no-recent; present unit untouched.
- **Out of scope:** —
- **Size:** S

### T-7.4 — Assemble `published.json` per nation

- **Depends on:** T-7.2, T-7.3
- **Parallel-safe with:** T-7.1, Phases 4–6
- **Owns files:** `packages/pipeline/src/assemble/published.ts`, `packages/pipeline/test/assemble/published.test.ts`
- **Glossary terms:** Carried-Forward Figure, Year-Earlier Comparison, Publication Date, Reporting Period
- **ADRs:** ADR-0006, ADR-0007
- **Context:** The site renders `data/<nation>/published.json` only. This function combines the latest release, carried-forward entries and year-earlier comparisons, and validates against the model schema.
- **Steps:**
  1. `assemblePublished(latest, history, reference) → PublishedNation<N>`; entries in a stable order (Reporting Unit id, then Specialty id, then Wait Stage) — **not** by any Statistic.
  2. Validate with the `PublishedNation` schema.
- **Acceptance criteria:** fixture assembly passes schema; deterministic bytes; entries ordered by ids (test with shuffled inputs).
- **Out of scope:** —
- **Size:** S

### T-7.5 — Pipeline CLI orchestrator

- **Depends on:** T-7.1, T-7.4, T-4.5, T-5.5, T-6.5
- **Parallel-safe with:** T-7.6 (workflow can be written against the CLI contract)
- **Owns files:** `packages/pipeline/src/cli.ts`, `packages/pipeline/src/run.ts`, `packages/pipeline/test/run.test.ts`
- **Glossary terms:** Publishing Nation, Reporting Period
- **ADRs:** ADR-0007, ADR-0006
- **Context:** One command runs each nation independently: a failure in one nation must not stop or roll back another (nations are never coupled).
- **Steps:**
  1. `pnpm pipeline run [--nation england|wales|scotland] [--dry-run] [--from-fixtures]`; `pnpm pipeline reference [--nation …]`; `pnpm pipeline assemble [--nation …]`.
  2. Per nation: load `state.json` → `discover` → for each candidate (oldest first): fetch, normalise, `validateRelease` vs previous → on pass write `releases/<period>.json`, rebuild reference, assemble `published.json`, update `state.json`; on fail write nothing for that nation and record the report.
  3. Write `packages/pipeline/.cache/run-report.json`: per nation `{ status: 'no-change' | 'published' | 'blocked' | 'error', reportingPeriod?, reportMarkdown? }`. Exit code 0 unless an unexpected exception (validation failures are not crashes; the workflow reads the report).
- **Acceptance criteria:** tests with fixtures and a temp data dir: two runs → second is `no-change`; a mutated fixture blocks one nation while another publishes; files byte-stable.
- **Out of scope:** git and GitHub operations (workflow).
- **Size:** M

### T-7.6 — Scheduled GitHub Actions pipeline workflow

- **Depends on:** T-7.5, T-10.6 (issue template), T-1.6
- **Parallel-safe with:** T-7.7
- **Owns files:** `.github/workflows/pipeline.yml`, `.github/scripts/open-pipeline-issue.mjs`
- **Glossary terms:** Publishing Nation, Reporting Period
- **ADRs:** ADR-0007
- **Context:** Daily check because publication dates slip and the check costs nothing on a public repo (ADR-0007). New valid data is committed to `main`, which triggers deploy (T-10.5). Failed validation keeps the last good data and opens an issue.
- **Steps:**
  1. Triggers: `schedule: cron '15 10 * * *'` (after 09:30 UK releases in both GMT/BST) and `workflow_dispatch` with optional `nation` input.
  2. Permissions: `contents: write`, `issues: write`. Concurrency group `pipeline` (no overlap).
  3. Steps: checkout, setup, `pnpm install --frozen-lockfile`, `pnpm pipeline run`, then `pnpm test --project pipeline` against the new data (schema re-check), then if `git status --porcelain data/` non-empty: commit as `github-actions[bot]` with message `chore(data): <nation> <reportingPeriod> release` per nation (one commit per published nation), push.
  4. For each `blocked`/`error` nation in `run-report.json`: open or update (dedupe by title `Pipeline blocked: <nation> <period>`) an issue with label `pipeline-blocked` and the report Markdown.
  5. Also run `scripts/check-launch-content.ts --freshness-only` (T-9.5) weekly (Mondays) and open a `content-review-due` issue if any explainer is older than 6 months.
- **Acceptance criteria:** `actionlint` passes; a `workflow_dispatch` dry run on a fork with fixtures commits nothing and exits 0; issue dedupe tested in `open-pipeline-issue.mjs` unit test (mock Octokit).
- **Out of scope:** deploy.
- **Size:** M

### T-7.7 — Backfill history and commit the first real data

- **Depends on:** T-7.5
- **Parallel-safe with:** T-7.6
- **Owns files:** `packages/pipeline/src/backfill.ts`, `data/england/**`, `data/wales/**`, `data/scotland/**` (first generation), `.github/workflows/ci.yml` (switch `site-build` to real `data/`)
- **Glossary terms:** Year-Earlier Comparison, Carried-Forward Figure, Reporting Period
- **ADRs:** ADR-0007
- **Context:** Year-Earlier Comparison and Carried-Forward need history. England needs the release from 12 months before the latest plus the 12 months between (for carry-forward). Wales and Scotland supply year-earlier medians in the same download, but carry-forward still benefits from up to 12 months of prior releases.
- **Steps:**
  1. `pnpm pipeline backfill --nation england --months 13`: discover all Incomplete Provider files on the current and previous yearly pages (and the one before if needed), ingest oldest first through the normal validation gate.
  2. Wales: ingest the latest release only (comparison medians included); optionally backfill 12 prior months using the same API with older `DateCode` filters, each stored as its own release with the current version's publication date and a `backfilled: true` note in `state.json` (Assumption A-14).
  3. Scotland: same approach using the 25 months in the monthly files.
  4. Commit the generated data in one PR `chore(data): initial backfill` with the run report in the PR body.
  5. Switch CI `site-build` to real data.
- **Acceptance criteria:** all three `published.json` files validate; England has ≥ 13 releases; the site builds with real data; e2e still green.
- **Out of scope:** —
- **Size:** M
