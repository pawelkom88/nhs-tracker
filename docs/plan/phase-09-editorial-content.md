# Phase 9 — Editorial Content structure

**Goal:** a typed, validated content system for Editorial Content — per-nation "about the figures" and "your rights" explainers, one-line Specialty descriptions with filter keywords, and full Trauma & Orthopaedics content — with placeholders that make missing copy obvious and a launch gate that blocks unreviewed copy.

**Agents write structure and placeholders only.** The product owner writes and reviews the real copy (PRD § Editorial Content). Agents must not draft medical or rights claims.

**Starts after:** T-8.1 (site exists), T-3.6–T-3.8 (Specialty lists) for stubs. Read [MASTER-PLAN.md § Conventions](./MASTER-PLAN.md#conventions).

## Content layout

```
content/
  README.md                         # how to write content (style, sources, review)
  england/
    about-the-figures.md
    your-rights.md
    specialties/<specialty-slug>.md # one per Specialty in reference data
  wales/ …same…
  scotland/ …same…
```

Front matter (validated by Zod, T-9.1):

```yaml
---
kind: specialty | about-the-figures | your-rights
nation: england # must match folder
specialtyId: england:C_110 # specialty files only
summary: 'One plain-English line.' # specialty: shown in lists
keywords: [hip, knee, joint replacement] # specialty: filter keywords
status: placeholder | draft | reviewed
lastReviewed: 2026-10-03 # required when status = reviewed
reviewedBy: product-owner # required when status = reviewed
sources: # every factual claim in the body cites one of these by id
  - id: nhs-choice
    title: 'Your choices in the NHS'
    url: https://www.nhs.uk/…
---
```

Body: Markdown. Claims link sources with `[text][nhs-choice]` reference links resolved from `sources`. The closing "not advice" line and "Last reviewed" line are rendered by the page component, not written in content.

---

### T-9.1 — Content schema, loader and Markdown rendering

- **Depends on:** T-8.1, T-2.8
- **Parallel-safe with:** Phase 8 tasks except T-8.11, T-8.13, T-8.14, T-8.16
- **Owns files:** `apps/site/src/content/schema.ts`, `apps/site/src/content/load.ts`, `apps/site/src/content/render.ts`, `apps/site/test/content/load.test.ts`, `content/README.md`
- **Glossary terms:** Editorial Content, Specialty, Patient Right, Home Nation
- **ADRs:** ADR-0004, ADR-0005, ADR-0007
- **Context:** Editorial Content must be sourced, dated and reviewable. The loader validates front matter and renders Markdown to HTML at build time (static export, no JS needed).
- **Steps:**
  1. Add `gray-matter`, `unified`, `remark-parse`, `remark-gfm`, `remark-rehype`, `rehype-sanitize`, `rehype-stringify` to `apps/site`.
  2. `schema.ts`: Zod discriminated union on `kind` per the front matter above; `nation` must match the folder; `reviewed` requires `lastReviewed` and `reviewedBy`; every `sources[].url` must be `https://` and on the allow-list (`nhs.uk`, `england.nhs.uk`, `gov.uk`, `legislation.gov.uk`, `gov.wales`, `nhs.wales`, `nhs.scot`, `nhsinform.scot`, `gov.scot`, `publichealthscotland.scot`, `opendata.nhs.scot`, `statswales.gov.wales`, `stats.gov.wales`).
  3. `load.ts`: `getSpecialtyContent(nation, specialtyId)`, `getExplainer(nation, kind)`; returns `{ frontMatter, html, isPlaceholder }`.
  4. `render.ts`: Markdown → sanitised HTML; external links get no `target`; reject raw HTML in content; reject any number-looking figure claim pattern like `\d+ weeks` unless inside a quote of an official standard (warn-level test, see T-9.5).
  5. `content/README.md`: NHS content style (reading age ~9), every claim sourced, describe rights never instruct, never include figures except Official/Derived Figures, review every 6 months.
- **Acceptance criteria:** tests: wrong nation folder fails; reviewed without date fails; non-allow-listed source fails; Markdown with `<script>` is rejected.
- **Out of scope:** the pages (T-9.4).
- **Size:** M

### T-9.2 — Generate Specialty description stubs for every nation

- **Depends on:** T-9.1, T-3.6, T-3.7, T-3.8
- **Parallel-safe with:** T-9.3, T-9.4, T-9.6
- **Owns files:** `packages/pipeline/src/content/stubs.ts`, `packages/pipeline/test/content/stubs.test.ts`, `content/england/specialties/*.md`, `content/wales/specialties/*.md`, `content/scotland/specialties/*.md` (stubs only; real copy is PO-owned afterwards)
- **Glossary terms:** Specialty, Editorial Content
- **ADRs:** ADR-0006 (descriptions are per nation; never share one description file across nations)
- **Context:** The Specialty list shows a one-line description per Specialty and the filter matches description keywords. Every Specialty in reference data needs a file, even before copy exists. Because Specialties are never equivalent across nations, each nation gets its own file even when names match.
- **Steps:**
  1. Script `pnpm --filter @kyw/pipeline content:stubs` imports each nation's Specialty list from the reference modules (T-3.6, T-3.7, T-3.8; no `data/` files needed) and creates any missing `content/<nation>/specialties/<slug>.md` with `status: placeholder`, `summary: ""`, `keywords: []`. Never overwrites an existing file.
  2. Site renders a placeholder summary as nothing (the official name alone) — never as invented text.
  3. A test asserts every Specialty in each nation's reference data has a content file and vice versa (no orphan files).
- **Acceptance criteria:** stubs exist for all Specialties; rerunning the script changes nothing; consistency test passes.
- **Out of scope:** writing descriptions.
- **Size:** S

### T-9.3 — Trauma & Orthopaedics full-content structure in all three nations

- **Depends on:** T-9.2
- **Parallel-safe with:** T-9.4, T-9.6
- **Owns files:** `content/england/specialties/trauma-and-orthopaedics.md`, `content/wales/specialties/<wales-t-and-o-slug>.md`, `content/scotland/specialties/<scotland-t-and-o-slug>.md`, `apps/site/src/components/SpecialtyIntro.tsx`, `apps/site/test/components/SpecialtyIntro.test.tsx`
- **Glossary terms:** Specialty, Editorial Content, Wait Stage, Patient Right
- **ADRs:** ADR-0002, ADR-0006
- **Context:** T&O is the first end-to-end Specialty with polished content in all three nations (PRD). Agents set up the section skeleton the product owner fills. Slugs come from each nation's official Specialty name (reference data), e.g. Scotland may differ from England.
- **Steps:**
  1. Body skeleton with headings and `<!-- PO: … -->` comments: "What this specialty covers", "What the figures for this specialty include" (nation-specific; Scotland mentions two Wait Stages), "Related Patient Rights" (link to `/<nation>/your-rights`). No factual sentences.
  2. `SpecialtyIntro` renders the body on `/<nation>/<slug>` above the unit list when `status !== 'placeholder'`; renders "Last reviewed: {date}" and the closing line.
- **Acceptance criteria:** three files with `status: placeholder`; component test: placeholder renders nothing; reviewed fixture renders body, Last reviewed and closing line.
- **Out of scope:** copy.
- **Size:** S

### T-9.4 — Explainer pages: "About the figures" and "Your rights" per nation

- **Depends on:** T-9.1, T-8.4, T-8.5
- **Parallel-safe with:** T-9.2, T-9.3, T-9.6, Phase 8 nation routes
- **Owns files:** `apps/site/src/app/england/about-the-figures/page.tsx`, `apps/site/src/app/england/your-rights/page.tsx`, `apps/site/src/app/wales/about-the-figures/page.tsx`, `apps/site/src/app/wales/your-rights/page.tsx`, `apps/site/src/app/scotland/about-the-figures/page.tsx`, `apps/site/src/app/scotland/your-rights/page.tsx`, `apps/site/src/components/ExplainerPage.tsx`, `apps/site/messages/en/explainers.json`, `content/{england,wales,scotland}/{about-the-figures,your-rights}.md`, `apps/site/test/app/explainers.test.tsx`
- **Glossary terms:** Patient Right, Waiting Standard, Ongoing Wait, Completed Wait, Median Ongoing Wait, Home Nation, Editorial Content
- **ADRs:** ADR-0001, ADR-0002, ADR-0005
- **Context:** Each nation explains what its figures mean and which processes and Patient Rights apply. Every page shows "Last reviewed", lists sources, and ends: not advice, speak to your GP or care team (PRD). Note: these folders sit inside `apps/site/src/app/<nation>/`, which T-8.11/T-8.13/T-8.14 also use — they own only their own files listed there, so no overlap.
- **Steps:**
  1. Placeholder content files with section skeletons. "About the figures": "What 'people already waiting' means", "What the median means (half of people)", "The Waiting Standard in {nation}", "Long Waits", "Why some figures say 'Not published'", "Carried-forward figures", "Where the figures come from". "Your rights": "How referral works", "Patient Rights in {nation}", "If you live near the border" (GP-registration nuance; ADR-0001), "Where to get help".
  2. `ExplainerPage`: `<h1>`, rendered body (or a clear "This page is being written" notice when placeholder), sources list, "Last reviewed: {date}" (only when reviewed), closing line `explainers.notAdvice` = "This is not medical advice. Speak to your GP or care team about your own care.", BorderNotice.
- **Acceptance criteria:** six routes build; closing line present on all six; Last reviewed absent on placeholders, present on reviewed fixture; sources rendered as links.
- **Out of scope:** copy.
- **Size:** M

### T-9.5 — Content guard tests: freshness, sources, figures and launch gate

- **Depends on:** T-9.1
- **Parallel-safe with:** T-9.2–T-9.4, T-9.6
- **Owns files:** `apps/site/test/content/guards.test.ts`, `scripts/check-launch-content.ts`
- **Glossary terms:** Editorial Content, Official Figure, Derived Figure
- **ADRs:** ADR-0005
- **Context:** The PRD requires re-review every 6 months and Editorial Content never contains figures other than Official or Derived Figures. A launch gate stops launch with placeholder copy where full content is required.
- **Steps:**
  1. Test: any `reviewed` file with `lastReviewed` older than 183 days fails CI (and the scheduled pipeline workflow posts a reminder issue, T-7.6 reads this script's output).
  2. Test: body contains no digits followed by `weeks`/`days`/`%`/`people` unless inside a blockquote citing a source (warn → fail list for PO).
  3. Test: every reference-style link resolves to a `sources[]` id.
  4. `scripts/check-launch-content.ts` (run in T-10.8): fails if any explainer or any T&O file is not `reviewed`.
- **Acceptance criteria:** tests pass on placeholder content; script fails on current placeholders (expected until PO writes copy).
- **Out of scope:** writing copy.
- **Size:** S

### T-9.6 — Product-owner content brief with official source starting points

- **Depends on:** none (documentation only)
- **Parallel-safe with:** everything
- **Owns files:** `docs/content-brief.md`
- **Glossary terms:** Patient Right, Waiting Standard, Home Nation, Editorial Content
- **ADRs:** ADR-0001, ADR-0002, ADR-0004
- **Context:** The product owner writes the real copy. A brief listing each required page, its sections, the style rules and the official pages to cite reduces their effort. This is a list of links and requirements, not copy.
- **Steps:**
  1. Per nation, list required files and sections (from T-9.3, T-9.4).
  2. Starting-point official sources to verify (do not paraphrase them): England — NHS Constitution and handbook (18-week right to start treatment, right to choose provider), nhs.uk "Your choices in the NHS"; Wales — gov.wales / NHS Wales waiting-time standards (26-week RTT target), referral guidance; Scotland — Patient Rights (Scotland) Act 2011 (12-week Treatment Time Guarantee), NHS inform waiting-times pages, 12-week outpatient standard. Record each URL after checking it loads.
  3. Style checklist: reading age ~9, describe rights not instruct, no figures, glossary _Avoid_ terms, "Last reviewed".
- **Acceptance criteria:** every listed URL returns HTTP 200 at time of writing (record date); no instruction-to-user phrasing in the brief's example sentences.
- **Out of scope:** writing explainer copy.
- **Size:** S
