# Phase 1 — Repo foundation

**Goal:** a git repository with a pnpm workspace, strict TypeScript, lint/format, Vitest, CI, licences and the `AGENTS.md` rulebook, so every later task lands in a consistent, checked environment.

**Starts:** immediately. **Unblocks:** everything.

Conventions used by every phase are in [MASTER-PLAN.md § Conventions](./MASTER-PLAN.md#conventions). Read them first.

---

### T-1.1 — Initialise the git repository and base repo files

- **Depends on:** none
- **Parallel-safe with:** none (first task)
- **Owns files:** `.git/`, `.gitignore`, `.gitattributes`, `.editorconfig`, `.nvmrc`, `README.md`
- **Glossary terms:** none
- **ADRs:** ADR-0007 (data is committed to the repo, so JSON under `data/` must not be ignored)
- **Context:** The project folder is not yet a repository. Everything else needs a git history, a pinned Node version and editor defaults. Committed data under `data/` is the product's audit trail (ADR-0007), so the ignore file must never exclude it.
- **Steps:**
  1. `git init -b main` in the project root.
  2. `.nvmrc`: `24` (current Node LTS). Local Node 26 is fine for development; CI uses 24.
  3. `.gitignore`: `node_modules/`, `.next/`, `out/`, `dist/`, `coverage/`, `.turbo/`, `*.log`, `.env*` (except `.env.example`), `.DS_Store`, `playwright-report/`, `test-results/`, `packages/pipeline/.cache/` (raw downloads). Do **not** ignore `data/` or `packages/pipeline/fixtures/`.
  4. `.gitattributes`: `* text=auto eol=lf`; `*.zip binary`; `*.xlsx binary`; `data/**/*.json linguist-generated=true` (keeps GitHub diffs readable); `packages/pipeline/fixtures/** linguist-vendored=true`.
  5. `.editorconfig`: 2-space indent, LF, UTF-8, final newline, trim trailing whitespace (except `*.md`).
  6. `README.md`: product one-liner from `PRD.md`, link to `PRD.md`, `GLOSSARY.md`, `docs/adr/`, `docs/plan/MASTER-PLAN.md`, `AGENTS.md`; "Development" section placeholder (filled by T-1.2).
  7. Initial commit: `chore: initialise repository` including the existing `PRD.md`, `GLOSSARY.md`, `docs/`.
- **Acceptance criteria:**
  - `git log --oneline` shows one commit on `main` containing PRD, GLOSSARY, ADRs and plan files.
  - `git check-ignore data/england/x.json` exits non-zero (not ignored).
  - `README.md` names the product "Know Your Wait" and contains no NHS logo or affiliation claim (ADR-0004).
- **Out of scope:** remote creation on GitHub (product owner does this; see Assumptions A-01), package setup.
- **Size:** S

### T-1.2 — Create the pnpm workspace and install all shared dev tooling

- **Depends on:** T-1.1
- **Parallel-safe with:** none
- **Owns files:** `package.json` (root), `pnpm-workspace.yaml`, `pnpm-lock.yaml`, `.npmrc`, `packages/model/package.json`, `packages/model/src/index.ts`, `packages/pipeline/package.json`, `packages/pipeline/src/index.ts`, `README.md` (Development section only)
- **Glossary terms:** none
- **ADRs:** ADR-0007
- **Context:** One task installs every shared dev dependency so later parallel tasks only add config files and never fight over the root `package.json` or lockfile. `apps/site` is created later by T-8.1.
- **Steps:**
  1. Root `package.json`: `"name": "know-your-wait"`, `"private": true`, `"packageManager": "pnpm@10.<current>"`, `"engines": { "node": ">=24" }`, `"type": "module"`.
  2. `pnpm-workspace.yaml`: `packages: ["packages/*", "apps/*", "tools/*"]`. Under pnpm 10 add `onlyBuiltDependencies` only for packages that need install scripts (e.g. `esbuild`, `sharp` later); leave a comment.
  3. Root dev dependencies (exact latest stable at time of execution): `typescript`, `@types/node`, `eslint`, `@eslint/js`, `typescript-eslint`, `eslint-config-prettier`, `eslint-plugin-import-x`, `prettier`, `vitest`, `@vitest/coverage-v8`, `tsx`. Package dependencies: `packages/model` → `zod` (v4); `packages/pipeline` → `zod`, `@kyw/model`, `csv-parse`, `yauzl-promise` (ZIP), `exceljs` (only if `data-sources.md` says an XLSX is required for England). Installing them here keeps later parallel tasks off the lockfile.
  4. Root scripts: `lint` (`eslint .`), `format` (`prettier --write .`), `format:check` (`prettier --check .`), `typecheck` (`pnpm -r --if-present typecheck`), `test` (`vitest run`), `test:watch` (`vitest`), `build` (`pnpm -r --if-present build`), `pipeline` (`pnpm --filter @kyw/pipeline run pipeline`).
  5. Create `packages/model` (`"name": "@kyw/model"`, `"type": "module"`, `"exports": { ".": "./src/index.ts", "./*": "./src/*.ts" }`, dependency `zod`) and `packages/pipeline` (`"name": "@kyw/pipeline"`, depends on `@kyw/model: workspace:*`, script `"pipeline": "tsx src/cli.ts"`). Each with `src/index.ts` exporting nothing yet (`export {};`) and a `typecheck` script (`tsc --noEmit`).
  6. `.npmrc`: `engine-strict=true`, `auto-install-peers=true`.
  7. Fill README "Development": `corepack enable`, `pnpm install`, `pnpm lint`, `pnpm typecheck`, `pnpm test`.
- **Acceptance criteria:**
  - `pnpm install` on a clean clone succeeds with no warnings about ignored build scripts for required packages.
  - `pnpm -r ls --depth -1` lists `@kyw/model` and `@kyw/pipeline`.
  - Source is consumed as TypeScript directly via `exports` (no build step for internal packages); recorded in README.
- **Out of scope:** config files for TS/ESLint/Prettier/Vitest (T-1.3 to T-1.5), `apps/site` (T-8.1).
- **Size:** S

### T-1.3 — Configure strict TypeScript for all packages

- **Depends on:** T-1.2
- **Parallel-safe with:** T-1.4, T-1.5, T-1.7, T-1.8
- **Owns files:** `tsconfig.base.json`, `tsconfig.json` (root, references only), `packages/model/tsconfig.json`, `packages/pipeline/tsconfig.json`
- **Glossary terms:** none
- **ADRs:** ADR-0006 (strict types are what make cross-nation mixing a compile error)
- **Context:** The nation-namespaced model (ADR-0006) relies on the type checker to reject cross-nation code. That only works with the strictest settings.
- **Steps:**
  1. `tsconfig.base.json`: `"strict": true`, `"noUncheckedIndexedAccess": true`, `"exactOptionalPropertyTypes": true`, `"noImplicitOverride": true`, `"noFallthroughCasesInSwitch": true`, `"verbatimModuleSyntax": true`, `"isolatedModules": true`, `"module": "NodeNext"` for packages (site overrides to `"Bundler"` in T-8.1), `"target": "ES2023"`, `"lib": ["ES2023"]`, `"skipLibCheck": true`, `"resolveJsonModule": true`.
  2. Per-package `tsconfig.json` extending base, `include: ["src", "test", "*.config.ts"]`.
  3. Root `tsconfig.json` with project references (for editor support only).
- **Acceptance criteria:**
  - `pnpm typecheck` passes.
  - A deliberate `const x: string = 1` in a scratch file fails `pnpm typecheck` (verify locally, do not commit).
- **Out of scope:** site tsconfig (T-8.1).
- **Size:** S

### T-1.4 — Configure ESLint (flat config) and Prettier

- **Depends on:** T-1.2
- **Parallel-safe with:** T-1.3, T-1.5, T-1.7, T-1.8
- **Owns files:** `eslint.config.js`, `.prettierrc.json`, `.prettierignore`
- **Glossary terms:** none
- **ADRs:** none directly (custom guardrail rules are added in T-2.11)
- **Context:** One lint/format setup for all packages. The config must be easy to extend with the project's own guardrail rules (T-2.11) and Next.js rules (T-8.1).
- **Steps:**
  1. `eslint.config.js`: `@eslint/js` recommended, `typescript-eslint` `strictTypeChecked` + `stylisticTypeChecked` with `parserOptions.projectService: true`, `eslint-plugin-import-x` (no cycles, no extraneous deps), `eslint-config-prettier` last.
  2. Rules: `@typescript-eslint/consistent-type-imports: error`, `no-console: ["error", { allow: ["warn", "error"] }]` (pipeline CLI may override locally), `eqeqeq`.
  3. Ignore: `**/out/**`, `**/.next/**`, `data/**`, `packages/pipeline/fixtures/**`, `coverage/**`.
  4. Export a clearly marked array slot (comment `// project guardrail rules: see T-2.11`) where T-2.11 appends its plugin.
  5. `.prettierrc.json`: `{ "singleQuote": true, "trailingComma": "all", "printWidth": 100 }`. `.prettierignore`: `data/`, `packages/pipeline/fixtures/`, `pnpm-lock.yaml`, `out/`, `.next/`.
- **Acceptance criteria:**
  - `pnpm lint` and `pnpm format:check` pass on the repo.
  - Committed `data/` JSON is never reformatted by Prettier (the pipeline writes it canonically; see T-3.1).
- **Out of scope:** Next.js lint rules (T-8.1), guardrail plugin (T-2.11).
- **Size:** S

### T-1.5 — Configure Vitest for the workspace

- **Depends on:** T-1.2
- **Parallel-safe with:** T-1.3, T-1.4, T-1.7, T-1.8
- **Owns files:** `vitest.config.ts` (root), `packages/model/vitest.config.ts`, `packages/pipeline/vitest.config.ts`, `packages/model/test/smoke.test.ts`
- **Glossary terms:** none
- **ADRs:** ADR-0006 (type-level tests verify nation separation)
- **Context:** Unit tests and **type tests** (`expectTypeOf`, `@ts-expect-error`) are the main guardrails. Vitest `typecheck` mode must be on so type tests run in CI.
- **Steps:**
  1. Root `vitest.config.ts` with `test.projects: ['packages/*', 'apps/*']`.
  2. Per-package config: `environment: 'node'`, `include: ['test/**/*.test.ts', 'src/**/*.test.ts']`, `typecheck: { enabled: true, include: ['test/**/*.test-d.ts'] }`, coverage provider v8.
  3. `packages/model/test/smoke.test.ts`: trivial passing test so CI exercises the setup.
- **Acceptance criteria:**
  - `pnpm test` runs both projects and passes.
  - A `*.test-d.ts` file with a failing `expectTypeOf` makes `pnpm test` fail (verify locally, do not commit).
- **Out of scope:** Playwright (T-10.1).
- **Size:** S

### T-1.6 — Add the CI workflow for pull requests

- **Depends on:** T-1.3, T-1.4, T-1.5
- **Parallel-safe with:** T-1.7, T-1.8
- **Owns files:** `.github/workflows/ci.yml`
- **Glossary terms:** none
- **ADRs:** ADR-0007
- **Context:** Every PR from a building agent must be checked automatically. Later phases add jobs (site build in T-8.1, e2e in T-10.2, real-data build in T-7.7) by appending to this file through their own tasks.
- **Steps:**
  1. Trigger on `pull_request` and `push` to `main`.
  2. Job `check`: checkout, `pnpm/action-setup`, `actions/setup-node` with `node-version-file: .nvmrc` and pnpm cache, `pnpm install --frozen-lockfile`, `pnpm format:check`, `pnpm lint`, `pnpm typecheck`, `pnpm test`.
  3. `permissions: contents: read`. `concurrency` group per ref with cancel-in-progress.
- **Acceptance criteria:**
  - Workflow passes `actionlint` (run locally via `npx actionlint` or the Docker image).
  - Workflow runs green on the first PR after the remote exists.
- **Out of scope:** scheduled pipeline (T-7.6), deploy (T-10.5).
- **Size:** S

### T-1.7 — Add the code licence, data licence notice and contribution basics

- **Depends on:** T-1.1
- **Parallel-safe with:** T-1.3, T-1.4, T-1.5, T-1.6, T-1.8
- **Owns files:** `LICENSE`, `DATA-LICENCE.md`, `CONTRIBUTING.md`
- **Glossary terms:** Official Figure, Derived Figure, Publishing Nation
- **ADRs:** ADR-0004, ADR-0005, ADR-0007
- **Context:** Code is MIT. Committed data republishes Official Figures under each Publishing Nation's licence (Open Government Licence v3.0 for all three; verified in `docs/plan/data-sources.md`), which requires attribution statements. Derived Figures must be described as calculated by Know Your Wait.
- **Steps:**
  1. `LICENSE`: MIT, copyright "Know Your Wait contributors", year 2026.
  2. `DATA-LICENCE.md`: state that `data/` contains Official Figures and Derived Figures; per Publishing Nation, give publisher, dataset name, URL and the exact attribution statement listed in `docs/plan/data-sources.md` § Licences; state Derived Figures are exact sums calculated by Know Your Wait from Official Figures in the same release (ADR-0005); state that NHS ODS reference data is used under OGL v3 with attribution; state no endorsement implied (ADR-0004).
  3. `CONTRIBUTING.md`: link to `AGENTS.md` rules (human-readable summary), Conventional Commits, how to report a data mistake (link to the issue form added in T-10.6).
- **Acceptance criteria:**
  - Each of the three Publishing Nations and NHS ODS has an attribution entry with a working URL.
  - No sentence implies NHS affiliation (ADR-0004).
- **Out of scope:** on-site licence/attribution page (T-8.14).
- **Size:** S

### T-1.8 — Write AGENTS.md, the rulebook for building agents

- **Depends on:** T-1.1
- **Parallel-safe with:** T-1.3, T-1.4, T-1.5, T-1.6, T-1.7
- **Owns files:** `AGENTS.md`, `CLAUDE.md` (one line: `@AGENTS.md`)
- **Glossary terms:** all (the file points agents at the glossary)
- **ADRs:** ADR-0001 to ADR-0007
- **Context:** Every later task assumes the agent has read `AGENTS.md`, `GLOSSARY.md`, the cited ADRs and the task. This file is the shared contract. Write it exactly as drafted below, adjusting only paths that changed during Phase 1.
- **Steps:**
  1. Create `AGENTS.md` with the content below.
  2. Create `CLAUDE.md` containing `@AGENTS.md` so Claude-based agents load it automatically.
- **Acceptance criteria:**
  - `AGENTS.md` contains every rule listed in the draft below.
  - Paths in `AGENTS.md` match the real layout after T-1.2.
- **Out of scope:** changing any rule (rules come from the PRD and ADRs; propose changes through the product owner).
- **Size:** S

**`AGENTS.md` draft (write verbatim):**

```md
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
```
