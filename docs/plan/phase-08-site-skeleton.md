# Phase 8 — Site skeleton (unstyled, semantic)

**Goal:** every route exists in `apps/site`, statically exported, rendering real committed data with the exact PRD wording, captions, dates, status labels, border notice, footer and i18n layer. Semantic HTML, works without JavaScript, minimal or no styling. **No visual design decisions** (Phase 11).

**Starts after:** T-1.6, T-2.9 (types), plus T-3.1 (data layout) for the loader. Nation route tasks also need the nation's figure statements and the filter. Real data is not required to start: the loader reads `KYW_DATA_DIR`, which defaults to `data/` and is set to `apps/site/test/fixtures/data/` in tests.

Read [MASTER-PLAN.md § Conventions](./MASTER-PLAN.md#conventions) first.

## Routes

| Path                                               | Page                                                                      | Task                   |
| -------------------------------------------------- | ------------------------------------------------------------------------- | ---------------------- |
| `/`                                                | Home: "Where do you live?" (England / Wales / Scotland links)             | T-8.5                  |
| `/england`, `/wales`, `/scotland`                  | Specialty list with filter                                                | T-8.11, T-8.13, T-8.14 |
| `/<nation>/<specialty-slug>`                       | Reporting Unit list for that Specialty (+ T&O editorial intro if present) | T-8.11, T-8.13, T-8.14 |
| `/<nation>/<specialty-slug>/<unit-code>`           | Reporting Unit detail: figures per Wait Stage, Hospital Sites, labels     | T-8.12, T-8.13, T-8.14 |
| `/<nation>/about-the-figures`                      | What the figures mean (per nation)                                        | T-9.4                  |
| `/<nation>/your-rights`                            | Process and Patient Rights explainer                                      | T-9.4                  |
| `/about`, `/sources`, `/privacy`, `/accessibility` | Static information pages                                                  | T-8.15                 |
| `/404`                                             | Not found                                                                 | T-8.17                 |

`<unit-code>` is the lower-cased official organisation code (e.g. `/england/trauma-and-orthopaedics/rrk`). Nation routes are **static folders per nation** (`app/england/…`, `app/wales/…`, `app/scotland/…`), not a shared `[nation]` segment: display logic is written per nation (ADR-0006) and lint zones (T-2.11) stop cross-imports.

## Exact wording (source: PRD § Figures shown; all strings live in i18n messages)

| Key                                       | English text (ICU MessageFormat)                                                                                                                                                                                                                                  |
| ----------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `figures.median.weeks` (England, Wales)   | `Half of people waiting at {reportingPeriod} had waited {weeks} weeks or less.` — `{weeks}` = published value rounded to 1 decimal place, trailing `.0` dropped (Assumption A-08)                                                                                 |
| `figures.median.days` (Scotland)          | `Half of people waiting at {reportingPeriod} had waited about {weeks} weeks ({days} days) or less.` — `{days}` = published days rounded to a whole day, `{weeks}` = days ÷ 7 rounded to a whole week (A-08)                                                       |
| `figures.withinStandard` (England, Wales) | `{approx, select, true {About } other {}}{inTen} in 10 ({percent}%) had waited less than {standardWeeks} weeks.` — `{inTen}` = percent rounded to nearest 10 ÷ 10; `approx` true unless percent is an exact multiple of 10; `{percent}` to 1 dp (Assumption A-09) |
| `figures.withinStandardCount` (Scotland)  | `{within} of {total} people had waited less than 12 weeks.` — counts, no division (Blocking finding B-1)                                                                                                                                                          |
| `figures.longWait`                        | `{count, plural, one {# person had} other {# people had}} waited over a year.`                                                                                                                                                                                    |
| `figures.yearEarlier.weeks`               | `(a year earlier: {weeks} weeks)`                                                                                                                                                                                                                                 |
| `figures.yearEarlier.days`                | `(a year earlier: about {weeks} weeks ({days} days))`                                                                                                                                                                                                             |
| `figures.caption`                         | `This shows people already on the list as of {reportingPeriod}, from {source}. It is not a prediction of how long you will wait. Waits change month to month and depend on your clinical need.`                                                                   |
| `figures.published`                       | `Published {publicationDate} by {publisher}`                                                                                                                                                                                                                      |
| `status.suppressed`                       | `Not published (small numbers)`                                                                                                                                                                                                                                   |
| `status.provisional`                      | `Provisional`                                                                                                                                                                                                                                                     |
| `status.derived`                          | `Calculated by Know Your Wait by adding published figures from the same release.`                                                                                                                                                                                 |
| `status.carriedForward`                   | `These are the most recent figures for {unitName}, as at {reportingPeriod}. {unitName} was not in the latest release ({latestReportingPeriod}).`                                                                                                                  |
| `status.noRecentFigures`                  | `No figures published since {reportingPeriod}.`                                                                                                                                                                                                                   |
| `units.isp`                               | `Independent Sector Provider: NHS-funded and free to the patient.`                                                                                                                                                                                                |
| `units.goldenJubilee`                     | `Treats patients referred from all health boards in Scotland.`                                                                                                                                                                                                    |
| `border.title` / `border.body`            | `Live near the border?` / `Your NHS care usually follows where your GP practice is. If you live near a border, check each nation's pages separately and talk to your GP.` (+ links to the other two nations' home pages)                                          |
| `footer.independence`                     | PRD footer text verbatim                                                                                                                                                                                                                                          |
| `footer.mistake`                          | `Spotted a mistake?`                                                                                                                                                                                                                                              |

Dates render as `31 August 2026` (`en-GB`, day month year). The headline uses the **Reporting Period**; the Publication Date appears only in `figures.published`.

---

### T-8.1 — Scaffold the Next.js static site

- **Depends on:** T-1.6
- **Parallel-safe with:** Phase 2–7 tasks
- **Owns files:** `apps/site/package.json`, `apps/site/next.config.ts`, `apps/site/tsconfig.json`, `apps/site/postcss.config.mjs`, `apps/site/src/app/globals.css`, `apps/site/src/app/layout.tsx` (minimal, replaced by T-8.4), `apps/site/src/app/page.tsx` (placeholder, replaced by T-8.5), `apps/site/vitest.config.ts`, `apps/site/next-env.d.ts`, `.github/workflows/ci.yml` (append `site-build` job), `eslint.config.js` (append Next.js block)
- **Glossary terms:** none
- **ADRs:** ADR-0007, ADR-0004
- **Context:** Fully static export to Cloudflare Pages (ADR-0007). Tailwind is installed per the PRD but used minimally; no theme, no component library.
- **Steps:**
  1. Create `apps/site` (`"name": "site"`) with Next.js (latest stable, App Router), React, TypeScript, Tailwind CSS v4 (`@tailwindcss/postcss`), `@kyw/model: workspace:*`, `intl-messageformat`. Dev: `@testing-library/react`, `jsdom`, `@eslint/eslintrc` or `@next/eslint-plugin-next` flat config.
  2. `next.config.ts`: `output: 'export'`, `trailingSlash: false`, `images: { unoptimized: true }`, `reactStrictMode: true`. No `rewrites`, `headers` or API routes (not supported by static export).
  3. `tsconfig.json` extends base with `"module": "ESNext"`, `"moduleResolution": "Bundler"`, `jsx: "preserve"`, Next plugin.
  4. `globals.css`: `@import "tailwindcss";` only.
  5. `vitest.config.ts`: `environment: 'jsdom'` for `test/**/*.test.tsx`.
  6. Scripts: `dev`, `build` (`next build`), `typecheck`, `test`.
  7. CI: append job `site-build` running `pnpm --filter site build` with `KYW_DATA_DIR=apps/site/test/fixtures/data` until real data exists (switch to default in T-7.7).
- **Acceptance criteria:** `pnpm --filter site build` produces `apps/site/out/index.html`; no `NHS` in `<title>` (ADR-0004); lint/typecheck pass.
- **Out of scope:** any page content or styling.
- **Size:** M

### T-8.2 — Build-time data loader with validation

- **Depends on:** T-8.1, T-2.9, T-2.8, T-3.1
- **Parallel-safe with:** T-8.3, T-8.4, T-8.6, T-8.10
- **Owns files:** `apps/site/src/data/load.ts`, `apps/site/src/data/england.ts`, `apps/site/src/data/wales.ts`, `apps/site/src/data/scotland.ts`, `apps/site/test/data/load.test.ts`, `apps/site/test/fixtures/data/**`
- **Glossary terms:** Publishing Nation, Reporting Unit, Specialty, Carried-Forward Figure, Year-Earlier Comparison
- **ADRs:** ADR-0006, ADR-0007
- **Context:** Pages read committed JSON at build time only. The loader validates with the model's Zod schemas so a bad file fails the build rather than rendering wrong figures. Each nation has its own accessor module, so a page can only ever load one nation's data.
- **Steps:**
  1. `load.ts`: `dataDir()` from `process.env.KYW_DATA_DIR ?? <repo>/data`; generic `readJson(path, schema)` that throws with file path and Zod issues.
  2. `england.ts` etc.: `getPublished()`, `getReference()`, `getSpecialties()`, `getSpecialtyBySlug(slug)`, `getUnitsForSpecialty(specialtyId)` (returns units **sorted alphabetically by displayName**, using `Intl.Collator('en-GB')`), `getUnitDetail(unitId, specialtyId)`, `getNhsRegions()` (England only). Memoise per build.
  3. Fixtures: hand-write a small, realistic `apps/site/test/fixtures/data/` tree in the T-3.1 layout covering: one current unit, one Suppressed Figure, one Provisional Figure, one Derived Figure (Scotland within-12-weeks count), one Carried-Forward entry (3 months old), one `no-recent-figures` entry, one Year-Earlier shown and one omitted, one Independent Sector Provider, Golden Jubilee, two NHS Regions, T&O and one other Specialty per nation.
- **Acceptance criteria:**
  - Tests: invalid JSON fails with the file path in the message; `getUnitsForSpecialty` returns alphabetical order regardless of fixture order and regardless of figure values (shuffle test).
  - No accessor accepts a nation parameter (each module is single-nation).
- **Out of scope:** rendering.
- **Size:** M

### T-8.3 — Build the i18n layer and date/number formatting

- **Depends on:** T-8.1
- **Parallel-safe with:** T-8.2, T-8.4, T-8.10
- **Owns files:** `apps/site/src/i18n/index.ts`, `apps/site/src/i18n/format.ts`, `apps/site/messages/en/common.json`, `apps/site/test/i18n/i18n.test.ts`
- **Glossary terms:** Reporting Period, Publication Date
- **ADRs:** none (PRD: all UI text through i18n from day one)
- **Context:** English only in v1, Welsh later. A tiny build-time layer avoids locale routing (static export, no middleware). Messages are split by namespace so parallel tasks own separate files.
- **Steps:**
  1. `t(namespace, key, values?)` server-side function using `intl-messageformat` with locale `en-GB`; messages loaded from `messages/<locale>/<namespace>.json`; missing key throws at build time.
  2. `format.ts`: `formatReportingPeriod(p)` and `formatPublicationDate(d)` → `31 August 2026` (two separate functions taking branded types); `formatCount(n)` → `1,234`; `formatWeeks(n)` → as published (no rounding, see A-08); `daysToWholeWeeks(days)` → `Math.round(days / 7)` display-only (A-08).
  3. A typed key helper (generate a `Messages` type from the JSON via `typeof import`) so unknown keys fail typecheck.
  4. `common.json`: site name `Know Your Wait`, nation names, skip link, generic labels.
- **Acceptance criteria:** tests for both date formatters, plural rules, missing key error, `daysToWholeWeeks(126) === 18`; a type test that `formatReportingPeriod` rejects a `PublicationDate`.
- **Out of scope:** Welsh messages.
- **Size:** M

### T-8.4 — Root layout, footer, skip link and "Spotted a mistake?" link

- **Depends on:** T-8.3
- **Parallel-safe with:** T-8.2, T-8.6, T-8.10
- **Owns files:** `apps/site/src/app/layout.tsx`, `apps/site/src/components/Footer.tsx`, `apps/site/src/components/SiteHeader.tsx`, `apps/site/src/components/MistakeLink.tsx`, `apps/site/src/config/site.ts`, `apps/site/messages/en/layout.json`, `apps/site/test/components/Footer.test.tsx`
- **Glossary terms:** none user-facing beyond footer
- **ADRs:** ADR-0004
- **Context:** The independence footer and the mistake link appear on every page (PRD). The analytics beacon slot is added here but enabled in T-10.5.
- **Steps:**
  1. `layout.tsx`: `<html lang="en-GB">`, skip link to `#main`, `<header>` with site name linking home (text only, no logo), `<main id="main">`, `<Footer/>`.
  2. `Footer.tsx`: PRD footer text verbatim (bold first sentence), links to `/about`, `/sources`, `/privacy`, `/accessibility`, `MistakeLink`, contact email from `site.ts`.
  3. `MistakeLink.tsx`: link to `https://github.com/<owner>/<repo>/issues/new?template=spotted-a-mistake.yml&page=<path>` (repo slug in `site.ts`, placeholder until A-01 resolved); plain `<a>`, works without JS.
  4. `site.ts`: `siteName`, `repoUrl`, `contactEmail`, `analyticsToken` (from env, optional).
- **Acceptance criteria:** test asserts the footer text equals the PRD string exactly; mistake link has the template param; no element contains "NHS" in the site name or header.
- **Out of scope:** analytics script (T-10.5), issue template (T-10.6).
- **Size:** S

### T-8.5 — Home page and the border notice

- **Depends on:** T-8.4
- **Parallel-safe with:** T-8.6–T-8.10
- **Owns files:** `apps/site/src/app/page.tsx`, `apps/site/src/components/BorderNotice.tsx`, `apps/site/messages/en/home.json`, `apps/site/messages/en/border.json`, `apps/site/test/components/BorderNotice.test.tsx`, `apps/site/test/app/home.test.tsx`
- **Glossary terms:** Home Nation
- **ADRs:** ADR-0001
- **Context:** Users pick their Home Nation by residence ("Where do you live?"). The border notice only points users to each nation's own pages; it never shows another nation's figures.
- **Steps:**
  1. Home: `<h1>` "Where do you live?", a list of three links (England, Wales, Scotland) in that fixed order, a one-sentence product description, `BorderNotice`.
  2. `BorderNotice({ current?: HomeNation })`: `<aside aria-labelledby>` with title/body and links to the _other_ nations' home pages (or all three on `/`). No figures.
  3. Mention Northern Ireland is not covered (one sentence, PRD "Not in v1").
- **Acceptance criteria:** tests: three nation links in fixed order; BorderNotice on `/wales` links to `/england` and `/scotland` only and contains no digits; wording matches `border.json`.
- **Out of scope:** styling.
- **Size:** S

### T-8.6 — Shared figure primitives: caption, source line, status labels

- **Depends on:** T-8.3, T-2.9
- **Parallel-safe with:** T-8.2, T-8.4, T-8.5, T-8.10
- **Owns files:** `apps/site/src/components/figures/FigureCaption.tsx`, `apps/site/src/components/figures/PublishedLine.tsx`, `apps/site/src/components/figures/StatusLabels.tsx`, `apps/site/src/components/figures/FigureBlock.tsx`, `apps/site/messages/en/figures.json`, `apps/site/messages/en/status.json`, `apps/site/test/components/figures.test.tsx`
- **Glossary terms:** Reporting Period, Publication Date, Suppressed Figure, Provisional Figure, Derived Figure, Carried-Forward Figure, Official Figure
- **ADRs:** ADR-0002, ADR-0005
- **Context:** Every rendered figure must show source, Reporting Period, Publication Date and the fixed "not a prediction" caption, and status labels must be consistent across nations. These primitives are nation-agnostic presentation only; they take already-formatted strings and status flags, never raw cross-nation data.
- **Steps:**
  1. `FigureBlock` props: `{ statement: ReactNode; status: FigureValue; provenance: Provenance; reportingPeriod; publicationDate; sourceTitle; sourceUrl; publisher }`. Renders: `<p>` statement (or the Suppressed text instead of the statement's number), Provisional tag, Derived label, `FigureCaption`, `PublishedLine`. Uses `<time dateTime=…>` for both dates.
  2. Suppressed rendering: if `status.status === 'suppressed'` render `status.suppressed` text; the component must not receive a number in that branch (type-level).
  3. `CarriedForwardWarning` and `NoRecentFigures` in `StatusLabels.tsx`.
- **Acceptance criteria (tests must exist and pass):**
  - Caption text equals the PRD caption exactly with the formatted Reporting Period and source.
  - `PublishedLine` shows the Publication Date and publisher; the statement uses the Reporting Period (two different dates in fixture; assert each appears in the right element only).
  - Suppressed renders `Not published (small numbers)` and the block's text contains no `0` digit and is not empty.
  - Provisional shows `Provisional`; Derived shows the derived label and source.
  - Every `FigureBlock` contains a link to the source URL.
- **Out of scope:** nation statement wording (T-8.7–T-8.9).
- **Size:** M

### T-8.7 — England figure statements

- **Depends on:** T-8.6, T-2.5
- **Parallel-safe with:** T-8.8, T-8.9, T-8.10
- **Owns files:** `apps/site/src/nations/england/FigureStatements.tsx`, `apps/site/messages/en/england.json`, `apps/site/test/nations/england/FigureStatements.test.tsx`
- **Glossary terms:** Median Ongoing Wait, Waiting Standard, Long Wait, Year-Earlier Comparison, Reporting Period
- **ADRs:** ADR-0002, ADR-0006
- **Context:** Renders one England Reporting Unit × Specialty: one Wait Stage, headline median, % within 18 weeks, Long Wait count, Year-Earlier Comparison of the median, each in a `FigureBlock`. Written for England only (ADR-0006).
- **Steps:**
  1. Component takes `PublishedUnitSpecialty<'england'>`; order: median (with year-earlier appended when `shown`), within-standard, long wait. Missing Statistic → omit that block (never invent).
  2. Wait Stage heading: England's official Wait Stage name.
- **Acceptance criteria (tests):** exact strings for median (`Half of people waiting at 31 July 2026 had waited 12.5 weeks or less.` from published `12.5229007633588`), within-standard (`About 7 in 10 (65.0%) had waited less than 18 weeks.` from proportion `0.650234…`), within-standard with 18 weeks, long wait plural forms (1 / 420), year-earlier appended only when shown, omitted reason renders nothing; caption present on each block; Reporting Period in statement, Publication Date only in published line; suppressed median shows the suppressed text.
- **Out of scope:** page layout.
- **Size:** M

### T-8.8 — Wales figure statements

- **Depends on:** T-8.6, T-2.6
- **Parallel-safe with:** T-8.7, T-8.9, T-8.10
- **Owns files:** `apps/site/src/nations/wales/FigureStatements.tsx`, `apps/site/messages/en/wales.json`, `apps/site/test/nations/wales/FigureStatements.test.tsx`
- **Glossary terms:** as T-8.7
- **ADRs:** ADR-0002, ADR-0006
- **Context:** As T-8.7 for Wales (Waiting Standard 26 weeks). Render only the Statistics Wales publishes per `data-sources.md`.
- **Steps / Acceptance criteria:** as T-8.7 with `26 weeks`; tests assert no `18` or `12` weeks string appears.
- **Out of scope:** page layout.
- **Size:** M

### T-8.9 — Scotland figure statements (two Wait Stages, days)

- **Depends on:** T-8.6, T-2.7
- **Parallel-safe with:** T-8.7, T-8.8, T-8.10
- **Owns files:** `apps/site/src/nations/scotland/FigureStatements.tsx`, `apps/site/messages/en/scotland.json`, `apps/site/test/nations/scotland/FigureStatements.test.tsx`
- **Glossary terms:** Wait Stage, Median Ongoing Wait, Waiting Standard, Long Wait, Derived Figure
- **ADRs:** ADR-0002, ADR-0005, ADR-0006
- **Context:** Scotland shows two separate sections, one per Wait Stage, never summed. Medians are published in days; display "about N weeks (D days)". The Long Wait count is an Official Figure (`WaitsOver52Weeks`). The within-12-weeks figure is a **count** Derived Figure rendered with `figures.withinStandardCount` and the derived label (Blocking finding B-1: no percentage, because that would need division).
- **Steps:**
  1. Component takes the two `PublishedUnitSpecialty<'scotland'>` entries (new outpatient, inpatient/day case) and renders two `<section>`s each with its own `<h2>` (official stage name), and `12 weeks` standard wording.
  2. No total, no combined sentence.
- **Acceptance criteria (tests):** `about 18 weeks (126 days)` for 126 days; two sections with distinct headings; no number on the page equals the sum of the two stages' fixture values (fixture chosen so sums are distinctive); within-12 count sentence `{within} of {total} people…` with the derived label and no `%` anywhere in Scotland output; Long Wait has no derived label; within-12 block omitted when the fixture has it dropped; caption on every block; month-end Reporting Period appears in the statement.
- **Out of scope:** page layout.
- **Size:** M

### T-8.10 — Progressive-enhancement list filter

- **Depends on:** T-8.3
- **Parallel-safe with:** T-8.2, T-8.4–T-8.9
- **Owns files:** `apps/site/src/components/ListFilter.tsx`, `apps/site/messages/en/filter.json`, `apps/site/test/components/ListFilter.test.tsx`
- **Glossary terms:** Specialty, Reporting Unit, Hospital Site
- **ADRs:** ADR-0007 (browser-side filtering)
- **Context:** Without JS every item is visible. With JS a text box hides non-matching items. Used for Specialties (names + description keywords) and England Reporting Units (trust name, Hospital Site names, towns). It filters only; it never reorders.
- **Steps:**
  1. Server renders lists with `data-filter-text` on each `<li>` (lower-cased searchable text). A client component renders a labelled `<input type="search">` only after hydration (so no dead control without JS), filters by substring on all words, toggles `hidden`, hides empty group headings, and updates an `aria-live="polite"` count ("12 of 140 shown").
  2. No sorting, no ranking, no fuzzy scoring that reorders.
- **Acceptance criteria:** tests: SSR output contains no `<input>`; after mount, typing "cataract" leaves only items whose text includes it; DOM order unchanged; live region updates.
- **Out of scope:** styling.
- **Size:** M

### T-8.11 — England Specialty list and Reporting Unit list pages

- **Depends on:** T-8.2, T-8.5, T-8.10, T-9.2
- **Parallel-safe with:** T-8.12, T-8.13, T-8.14
- **Owns files:** `apps/site/src/app/england/page.tsx`, `apps/site/src/app/england/[specialty]/page.tsx`, `apps/site/src/nations/england/SpecialtyList.tsx`, `apps/site/src/nations/england/UnitList.tsx`, `apps/site/messages/en/england-lists.json`, `apps/site/test/nations/england/lists.test.tsx`
- **Glossary terms:** Specialty, Reporting Unit, NHS Region, Hospital Site, Independent Sector Provider
- **ADRs:** ADR-0003, ADR-0006
- **Context:** England lists Specialties by official name with one-line descriptions (Editorial Content), then Reporting Units grouped by NHS Region, alphabetical within groups, with a filter over trust name, Hospital Site names and towns. Never sorted by wait.
- **Steps:**
  1. `/england`: `<h1>`, intro, `ListFilter` over Specialty list (official name, description), "All specialties" entry last if published, BorderNotice, links to explainers.
  2. `/england/[specialty]`: `generateStaticParams` from specialties; `<h1>` official Specialty name; T&O editorial intro slot (from T-9.3 when present); Reporting Units grouped by NHS Region (regions alphabetical; Independent Sector Providers within their region with the ISP label); each item links to the detail page; `data-filter-text` = name + site names + towns.
  3. Each list item shows no figures (figures only on detail page) so the list cannot read as a ranking. Carried-forward/no-recent units still listed.
- **Acceptance criteria (tests):** grouping by region; alphabetical within group (shuffled fixtures); filter text includes site names and towns; no digits representing figures in list items; every Specialty in reference data has a page.
- **Out of scope:** detail page.
- **Size:** M

### T-8.12 — England Reporting Unit detail page

- **Depends on:** T-8.2, T-8.7
- **Parallel-safe with:** T-8.11, T-8.13, T-8.14
- **Owns files:** `apps/site/src/app/england/[specialty]/[unit]/page.tsx`, `apps/site/src/nations/england/UnitDetail.tsx`, `apps/site/messages/en/england-detail.json`, `apps/site/test/nations/england/detail.test.tsx`
- **Glossary terms:** Reporting Unit, Hospital Site, Independent Sector Provider, Carried-Forward Figure
- **ADRs:** ADR-0003, ADR-0006
- **Context:** Headline figures, Hospital Sites run by the unit (context only, no links to provider sites), ISP label, carried-forward warning or "no figures published since".
- **Steps:**
  1. `generateStaticParams` over (specialty, unit) pairs present in `published.json`.
  2. `<h1>` = unit displayName; Specialty; ISP label if kind is ISP; carried-forward warning above figures; `FigureStatements`; Hospital Sites list (name, town; no links); links to explainers; BorderNotice.
- **Acceptance criteria (tests):** ISP fixture shows the label; carried-forward fixture shows its own older Reporting Period in the headline and the warning; no-recent fixture shows "No figures published since …" and no figure blocks; no `<a>` to any non-`gov.uk`/`nhs.uk`/`gov.wales`/`nhs.scot`/`nhsinform.scot`/site-internal domain.
- **Out of scope:** styling.
- **Size:** M

### T-8.13 — Wales routes: Specialty list, health board list, detail

- **Depends on:** T-8.2, T-8.5, T-8.8, T-8.10, T-9.2
- **Parallel-safe with:** T-8.11, T-8.12, T-8.14
- **Owns files:** `apps/site/src/app/wales/page.tsx`, `apps/site/src/app/wales/[specialty]/page.tsx`, `apps/site/src/app/wales/[specialty]/[unit]/page.tsx`, `apps/site/src/nations/wales/SpecialtyList.tsx`, `apps/site/src/nations/wales/UnitList.tsx`, `apps/site/src/nations/wales/UnitDetail.tsx`, `apps/site/messages/en/wales-pages.json`, `apps/site/test/nations/wales/pages.test.tsx`
- **Glossary terms:** Specialty, Reporting Unit, Hospital Site
- **ADRs:** ADR-0006, ADR-0001
- **Context:** Same flow as England but plain alphabetical health board list (no regions) with a "Not sure which board you're in? See the official list of health boards." link to https://www.gov.wales/nhs-wales-health-boards-and-trusts (no official postcode finder exists; Blocking finding B-5).
- **Steps:** mirror T-8.11/T-8.12 for Wales; use the nation's word for the unit ("health board").
- **Acceptance criteria:** as T-8.11/T-8.12 (minus regions) plus finder link present and pointing to the official URL.
- **Out of scope:** Welsh language.
- **Size:** L (acceptable: mostly mirrors England; split into list/detail if it exceeds 3h)

### T-8.14 — Scotland routes: Specialty list, health board list, detail

- **Depends on:** T-8.2, T-8.5, T-8.9, T-8.10, T-9.2
- **Parallel-safe with:** T-8.11, T-8.12, T-8.13
- **Owns files:** `apps/site/src/app/scotland/page.tsx`, `apps/site/src/app/scotland/[specialty]/page.tsx`, `apps/site/src/app/scotland/[specialty]/[unit]/page.tsx`, `apps/site/src/nations/scotland/SpecialtyList.tsx`, `apps/site/src/nations/scotland/UnitList.tsx`, `apps/site/src/nations/scotland/UnitDetail.tsx`, `apps/site/messages/en/scotland-pages.json`, `apps/site/test/nations/scotland/pages.test.tsx`
- **Glossary terms:** Specialty, Reporting Unit, Wait Stage
- **ADRs:** ADR-0002, ADR-0003, ADR-0006
- **Context:** As Wales; detail page shows both Wait Stages separately; Golden Jubilee listed alphabetically as a normal board with its note (ADR-0003). Reporting Period is a month end (monthly data, B-2).
- **Steps:** mirror T-8.13 for Scotland; board list link to https://www.scot.nhs.uk/organisations/ (B-5); Golden Jubilee note; Reporting Period is a month end (monthly data, B-2).
- **Acceptance criteria:** as T-8.13 plus two Wait Stage sections on the detail page and Golden Jubilee note.
- **Out of scope:** monthly MI (see data-sources.md).
- **Size:** L (split list/detail if needed)

### T-8.15 — Static information pages: about, sources and licences, privacy, accessibility

- **Depends on:** T-8.4
- **Parallel-safe with:** T-8.5–T-8.14
- **Owns files:** `apps/site/src/app/about/page.tsx`, `apps/site/src/app/sources/page.tsx`, `apps/site/src/app/privacy/page.tsx`, `apps/site/src/app/accessibility/page.tsx`, `apps/site/messages/en/pages.json`, `apps/site/test/app/static-pages.test.tsx`
- **Glossary terms:** Official Figure, Derived Figure, Publishing Nation, Editorial Content
- **ADRs:** ADR-0004, ADR-0005, ADR-0007
- **Context:** `/sources` carries the OGL attribution statements for each Publishing Nation and NHS ODS (from `data-sources.md`) and explains Official vs Derived Figures. Privacy explains cookieless Cloudflare Web Analytics and no accounts. Accessibility statement targets WCAG 2.2 AA. These are placeholder-quality texts for product-owner review.
- **Steps:** one page each, semantic headings, links to the GitHub repo and `data/` folder.
- **Acceptance criteria:** `/sources` lists each nation's publisher, dataset URL and attribution statement verbatim; privacy mentions no cookies; tests assert headings and attribution strings.
- **Out of scope:** final legal copy (product owner).
- **Size:** M

### T-8.16 — Wording guard tests: _Avoid_ terms and required captions

- **Depends on:** T-8.7, T-8.8, T-8.9, T-8.15, T-9.1
- **Parallel-safe with:** T-8.11–T-8.14, T-8.17
- **Owns files:** `apps/site/test/guards/avoid-terms.test.ts`, `apps/site/test/guards/avoid-terms.ts`
- **Glossary terms:** all _Avoid_ lists
- **ADRs:** ADR-0002, ADR-0005
- **Context:** User-facing text must never say "average", "expected wait", "estimated wait" or other glossary _Avoid_ terms. Checking message files and content files catches regressions before review.
- **Steps:**
  1. `avoid-terms.ts`: list derived from `GLOSSARY.md` _Avoid_ lines (parse the file at test time) plus fixed extras: `average`, `expected wait`, `estimated wait`, `typical wait`, `mean wait`, `breach`, `52-week wait`, `private hospital`, `near you`, `local area`, `shortest wait`, `best`, `worst`, `rank`. Allow-list contexts: "treatment function" only inside quoted source names; "NHS" descriptively.
  2. Test scans every `apps/site/messages/**/*.json` value and every `content/**/*.md` body (case-insensitive, word-boundary).
  3. Test fails with file + key + term.
- **Acceptance criteria:** suite passes on the repo; adding "average wait" to any message makes it fail (verify locally).
- **Out of scope:** built HTML scan (T-10.3 does it on `out/`).
- **Size:** S

### T-8.17 — 404 page, robots, sitemap and no-ranking order tests

- **Depends on:** T-8.11, T-8.13, T-8.14
- **Parallel-safe with:** T-8.15, T-8.16
- **Owns files:** `apps/site/src/app/not-found.tsx`, `apps/site/src/app/robots.ts`, `apps/site/src/app/sitemap.ts`, `apps/site/test/guards/no-ranking.test.ts`, `apps/site/messages/en/not-found.json`
- **Glossary terms:** Reporting Unit, Statistic
- **ADRs:** ADR-0003, ADR-0006
- **Context:** Static export needs explicit robots/sitemap (`dynamic = 'force-static'`). The no-ranking test proves list order is independent of figures.
- **Steps:**
  1. 404 page with links to the three nations.
  2. `robots.ts`, `sitemap.ts` (base URL from `site.ts`).
  3. `no-ranking.test.ts`: render each nation's unit list twice with fixture figures permuted (values reassigned randomly across units) and assert identical DOM order, equal to `Intl.Collator('en-GB')` order of display names (within region for England).
- **Acceptance criteria:** build emits `404.html`, `robots.txt`, `sitemap.xml`; no-ranking test passes.
- **Out of scope:** —
- **Size:** S
