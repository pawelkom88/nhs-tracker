# Prompt: create the Know Your Wait master plan

> Paste everything below the line into a fresh context window, with the working directory set to the project root (currently `nhs-wait-finder/`). USE SUBAGENTS: you may use subagents for research and verification.

---

You are the planning lead for **Know Your Wait**, a free, independent, open-source website that explains official NHS waiting-time statistics for England, Wales and Scotland. Your job is to produce a **very detailed master plan with a TODO list** that other AI coding agents (running in parallel, possibly as subagents of a different model) can pick up and build from without needing this conversation.

**You are planning, not building.** Do not scaffold the app or write application code. The only files you create are the plan files described below, plus edits to the docs if you find a genuine contradiction (flag it, don't silently change decisions).

## 1. Read first, in this order

1. `PRD.md`: product scope, figures shown, wording, data sources, tech decisions.
2. `GLOSSARY.md`: canonical domain language. **Use these terms exactly** in every plan file, task title, type name suggestion and acceptance criterion. Respect every `_Avoid_` list.
3. `docs/adr/0001` … `0007`: decisions that must not be re-litigated. Each task that touches a decision should cite the ADR.

These documents are the source of truth. If something you need is not in them, choose a sensible default, record it in the plan's "Assumptions" section, and move on. Don't stop to ask unless a choice would contradict an ADR.

## 2. Fixed decisions (summary; the docs win if they differ)

- Three nations, never compared. Data model is one record shape with **nation-namespaced** values and no shared categories (ADR-0006). A cross-nation ranking must be impossible to express.
- Headline = **Median Ongoing Wait**, then % within **Waiting Standard**, **Long Wait** count (over one year), **Year-Earlier Comparison** of the median. Scotland has two **Wait Stages** shown separately, never summed (ADR-0002).
- Only **Official Figures** or **Derived Figures** (exact sums of Official Figures from the same release). No estimates, ever (ADR-0005).
- Figure status handling: Suppressed, Provisional, Carried-Forward (≤12 months), as in PRD.
- Reporting Units: NHS trusts + Independent Sector Providers (England), health boards (Wales, Scotland incl. Golden Jubilee) (ADR-0003). Identified by official org codes.
- No postcode or distance. England list grouped by NHS Region with a filter over trust name, Hospital Site names and towns. Never sorted by wait.
- Home Nation = residence; cross-border is a notice only (ADR-0001).
- Name "Know Your Wait", no NHS branding (ADR-0004). Independence footer on every page.
- Fully static: Next.js + TypeScript + Tailwind, `output: 'export'`, Cloudflare Pages; daily GitHub Actions pipeline downloads, validates, normalises and **commits JSON to the repo**; failed validation blocks publish and opens an issue (ADR-0007).
- English only, but all UI strings go through an i18n layer from day one.
- WCAG 2.2 AA, works without JS, Cloudflare Web Analytics (cookieless), "Spotted a mistake?" → GitHub issue form.

## 3. Tooling decisions (made for you)

- **pnpm workspaces** monorepo. Suggested packages: `packages/model` (shared types + nation-namespaced schemas), `packages/pipeline` (ingest/validate/normalise per nation), `apps/site` (Next.js). Adjust if you have a strong reason; record why.
- **Vitest** for unit tests, **Playwright + axe** for e2e/accessibility, ESLint + Prettier, TypeScript strict.
- Runtime schema validation for ingested data (e.g. Zod). Pick one and record it.
- Repo is not yet a git repository. Plan includes `git init`, licence choice (recommend MIT for code; note data licences: Open Government Licence v3 for all three nations' data, which must be verified and attributed).

## 4. UI scope for this plan

UI design comes **later, in a separate effort**. This plan covers an **unstyled semantic skeleton** only:

- All routes and pages exist and render real data with correct wording, captions, dates, status labels, footer, explainers and the border notice.
- Semantic HTML, accessible, works without JS. Filters progressively enhance.
- Minimal or no styling. No visual design decisions, no component library.
- Include a final **"Phase: Visual design (placeholder)"** with only a stub description, so UI work slots in later without restructuring.

## 5. Research you must do before writing tasks

Some PRD facts came from memory. **Verify each against the live sources** and record findings (URLs, file formats, column names, codes, publication schedule, licence) in `docs/plan/data-sources.md`. Use subagents for this if available: one per nation.

- **England:** NHS England "Consultant-led Referral to Treatment Waiting Times" statistical work area. Find the monthly full CSV/ZIP for incomplete pathways by provider × treatment function; columns for median, % within 18 weeks, 52+ week counts; how Independent Sector Providers are marked; publication calendar; how missing submissions show up.
- **Wales:** StatsWales RTT. Note there is a newer portal at `stats.gov.wales` alongside legacy `statswales.gov.wales`. Find the machine-readable endpoint (OData/API/CSV) for key measures by health board × treatment function: median, 90th percentile, % within 26 weeks, 36+ weeks, >1 year counts. Check whether Welsh labels are available (needed later).
- **Scotland:** Public Health Scotland, CKAN at `opendata.nhs.scot`, dataset `stage-of-treatment-waiting-times`. Already verified:
  - "Distribution of Ongoing Waits CBF" resource `b2dc7934-9597-412d-abad-b605439855da`: columns `QuarterEnding, HBR, HBT, PatientType, Specialty`, 4-week bands to `48To52WeekWait`, then `52To65WeekWait` … `143To156WeekWait`, `Over156WeekWait`, each with a `…QF` quality-flag column. Long Wait = exact sum of bands from `52To65WeekWait` through `Over156WeekWait` (Derived Figure).
  - "Ongoing Waits" resource `5816ec92-66bf-4033-ae55-9df45ff19d49`: median and 90th percentile in **days**.
  - Use `HBT` (board of treatment), not `HBR`. Decode QF flag meanings (e.g. `d`) and specialty codes (`Z9` = all specialties?).
  - Check whether monthly management information exists in addition to quarterly figures.
- **Reference data:** NHS ODS for trust/ISP codes, Hospital Sites, site towns, NHS Region membership; Scottish board codes; StatsWales board codes. Record how mergers/successor organisations are represented (needed for Year-Earlier Comparison skip rule).

If a source contradicts the PRD (e.g. a figure isn't published at the needed granularity), record it as a **Blocking finding** in `data-sources.md`, propose the minimal change consistent with the ADRs (usually: omit the figure for that nation, never estimate), and flag it at the top of the master plan.

## 6. Deliverables

Write everything under `docs/plan/`:

### `docs/plan/MASTER-PLAN.md`
- Goal and definition of done (from PRD "Done means").
- Architecture overview: packages, data flow (source → raw → validated → normalised JSON → static pages), directory layout, a mermaid diagram.
- Phase list with one-paragraph summaries and links to phase files.
- **Dependency graph** of all tasks (mermaid), plus a table of which tasks can run **in parallel**.
- Assumptions, Blocking findings, risks and mitigations.
- Global **TODO checklist**: every task ID + title as `- [ ]`, grouped by phase.

### `docs/plan/phase-NN-<slug>.md` (one per phase)
Suggested phases (refine as needed):
1. Repo foundation: git, pnpm workspace, TS strict, lint/format, Vitest, CI skeleton, licence, `AGENTS.md`.
2. Domain model: nation-namespaced types and schemas for every glossary concept; figure status; units; Derived Figure provenance.
3. Reference data: Reporting Units, Hospital Sites, NHS Regions, Specialty lists + plain-English descriptions slots, org-code succession.
4. Pipeline: England ingest + normalise.
5. Pipeline: Wales ingest + normalise.
6. Pipeline: Scotland ingest + normalise (incl. Long Wait Derived Figure, days → stored as published).
7. Validation gate + scheduled GitHub Actions (daily check, commit on new valid release, issue on failure), Carried-Forward and Year-Earlier logic.
8. Site skeleton: routes, static generation from committed JSON, figure rendering with exact PRD wording and captions, status labels, filters (progressive enhancement), border notice, footer, i18n layer.
9. Editorial Content: content structure for per-nation process/Patient Right explainers and Specialty descriptions; T&O full content placeholders with source-link and "Last reviewed" requirements. Agents write structure and placeholders only; the product owner writes and reviews the real copy.
10. Quality: Playwright + axe e2e, no-JS checks, link checks for sources, Cloudflare Pages deploy, Web Analytics, "Spotted a mistake?" issue form.
11. Visual design (placeholder).

Phases 4/5/6 should be parallelisable once 2 and 3 land.

### Every task must be self-contained
An agent should be able to execute a task after reading only `AGENTS.md`, `GLOSSARY.md`, the cited ADRs and that task. Use this template:

```md
### T-<phase>.<n> — <imperative title>
- **Depends on:** T-x.y, … (or none)
- **Parallel-safe with:** T-…
- **Owns files:** exact paths this task creates/edits (no two parallel tasks may own the same file)
- **Glossary terms:** …
- **ADRs:** …
- **Context:** why this task exists, 2–5 sentences
- **Steps:** numbered, concrete
- **Acceptance criteria:** checkable bullets, incl. tests that must exist and pass
- **Out of scope:** what not to do
- **Size:** S (<1h) / M (1–3h) / L (split it if possible)
```

Keep tasks small (prefer S/M). Every pipeline task includes fixture-based tests using real sample files (committed to `fixtures/`). Every figure-rendering task includes tests asserting exact wording, the "not a prediction" caption, Reporting Period vs Publication Date, and status labels.

### `docs/plan/data-sources.md`
Verified findings from section 5.

### `AGENTS.md` content (as a task in phase 1, drafted in full inside that task)
Rules for building agents: read GLOSSARY and ADRs first; use glossary terms in code names; never compare nations; never estimate; never add NHS branding; one task per branch/PR; Conventional Commits; tests required; don't edit files owned by another in-flight task.

## 7. Guardrails to bake into tasks

Add explicit tests or lint rules where possible, not just prose:
- No code path that sorts or ranks Reporting Units by any wait Statistic.
- No type or function accepting figures from two Publishing Nations together (e.g. a branded nation type parameter).
- Suppressed values never render as `0` or empty.
- Derived Figure is dropped if any input is suppressed or missing.
- Headline sentence uses Reporting Period, never Publication Date.
- Every rendered figure has source + Reporting Period + Publication Date.
- No "average", "expected wait", "estimated wait" strings in UI copy (lint/test against the glossary `_Avoid_` terms where practical).

## 8. Finish

When done, reply with: the list of files created, the number of phases and tasks, any Blocking findings, assumptions made, and which tasks a first wave of parallel agents can start immediately.
