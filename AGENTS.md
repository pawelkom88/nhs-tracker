# AGENTS.md — rules for building Know Your Wait

Know Your Wait is a free, independent, open-source site that explains official NHS
waiting-time statistics for England, Wales and Scotland. You are building it from the
task list in `docs/plan/`. Follow these rules exactly.

## Before you start any task

1. Read `GLOSSARY.md`. It is the canonical domain language.
2. Read every ADR your task cites in `docs/adr/`. ADRs are settled; do not re-open them.
3. Read your task in `docs/plan/phase-NN-*.md` and `docs/plan/MASTER-PLAN.md § Conventions`.
4. Check the task's **Depends on** are merged to `main`. If not, stop.
5. Check no in-flight task owns the files you need (see the task's **Owns files**).
   Only edit files your task owns. If you must touch another file, stop and report.

## Language

- Use glossary terms in code names, types, comments, tests, commit messages and UI copy:
  `HomeNation`, `PublishingNation`, `Specialty`, `ReportingUnit`, `HospitalSite`,
  `WaitStage`, `Statistic`, `MedianOngoingWait`, `WaitingStandard`, `LongWait`,
  `ReportingPeriod`, `PublicationDate`, `YearEarlierComparison`, `OfficialFigure`,
  `DerivedFigure`, `SuppressedFigure`, `ProvisionalFigure`, `CarriedForwardFigure`,
  `NhsRegion`, `IndependentSectorProvider`, `PatientRight`, `EditorialContent`.
- Never use a glossary `_Avoid_` term in user-facing text. In particular never write
  "average", "expected wait", "estimated wait", "breach", "52-week wait", "private hospital",
  "near you", "local area". A test enforces this (T-8.16).
- Say "treatment function" only when quoting England or Wales source data.

## Product rules (from the PRD and ADRs)

- **Never compare nations.** No type, function, component, page or test fixture may
  combine figures from two Publishing Nations. Every domain type takes a nation type
  parameter; keep it. No shared cross-nation Specialty, Statistic or Wait Stage IDs
  (ADR-0006).
- **Never rank.** Never sort or order Reporting Units by any Statistic. Lists are
  alphabetical (England: grouped by NHS Region, alphabetical within). A lint rule and
  tests enforce this.
- **Never estimate.** Only Official Figures, or Derived Figures that are exact sums of
  Official Figures from the same release. No interpolation, no filling gaps, no
  medians from bands. If any input to a Derived Figure is suppressed or missing, the
  Derived Figure is not produced (ADR-0005).
- **Never sum Wait Stages.** Scotland's two Wait Stages are always separate (ADR-0002).
- **Suppressed is not zero.** A Suppressed Figure has no numeric value and renders as
  "Not published (small numbers)". Never `0`, never blank.
- **Snapshots, not predictions.** Every rendered figure carries the fixed caption,
  its source, its Reporting Period and its Publication Date. Headlines use the
  Reporting Period, never the Publication Date.
- **No NHS branding.** The product is "Know Your Wait". No NHS logo, NHS blue lozenge,
  NHS fonts, "NHS" in the name, domain or logo (ADR-0004). "NHS" only descriptively.
- **No outbound links to providers**, no "near you", no postcode, no distance.
- **Home Nation is residence** (ADR-0001). A Home Nation's pages never show another
  nation's figures; the border notice only points to the other nations' pages.
- All UI text goes through the i18n layer (`apps/site/src/i18n`). No hard-coded
  user-facing strings in components.
- Works without JavaScript; WCAG 2.2 AA.

## Workflow

- One task per branch and per PR. Branch name: `t-<phase>-<n>-<slug>`, e.g. `t-4-2-england-normalise`.
- Conventional Commits (`feat(pipeline): …`, `fix(site): …`, `test(model): …`).
  PR title = the task ID and title, e.g. `T-4.2 — Normalise England release`.
- Tests are required. A task is not done until its acceptance criteria pass locally
  and in CI: `pnpm format:check && pnpm lint && pnpm typecheck && pnpm test`
  (plus `pnpm --filter site build` and `pnpm e2e` once they exist).
- Pipeline tests use real sample files committed under `packages/pipeline/fixtures/`.
  Never fetch the network in unit tests.
- Never hand-edit `data/`. It is written only by the pipeline.
- Do not add dependencies beyond what your task names without saying why in the PR.
- If the docs contradict each other or a source contradicts the PRD, stop and report;
  do not silently change a decision.

## Layout

- `packages/model` — nation-namespaced types and Zod schemas (`@kyw/model`).
- `packages/pipeline` — ingest, validate, normalise, assemble (`@kyw/pipeline`).
- `packages/pipeline/fixtures/<nation>/` — real sample source files for tests.
- `data/` — committed normalised JSON (pipeline output; source of the site).
- `apps/site` — Next.js static site (`output: 'export'`).
- `content/` — Editorial Content (Markdown with front matter).
- `tools/eslint-plugin-kyw` — project guardrail lint rules.
