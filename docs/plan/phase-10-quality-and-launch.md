# Phase 10 — Quality, deploy and launch readiness

**Goal:** prove the PRD "Done means" end to end in a real browser, with and without JavaScript, at WCAG 2.2 AA, then deploy the static export to Cloudflare Pages with cookieless analytics and a working "Spotted a mistake?" route.

**Starts after:** T-8.1 (setup tasks); journey tests need Phase 8 routes. Read [MASTER-PLAN.md § Conventions](./MASTER-PLAN.md#conventions).

---

### T-10.1 — Set up Playwright and axe against the static export

- **Depends on:** T-8.1
- **Parallel-safe with:** Phase 8 and 9 tasks
- **Owns files:** `apps/site/playwright.config.ts`, `apps/site/e2e/fixtures.ts`, `apps/site/e2e/smoke.spec.ts`, `apps/site/package.json` (scripts `e2e`, devDeps `@playwright/test`, `@axe-core/playwright`, `serve`), `.github/workflows/ci.yml` (append `e2e` job)
- **Glossary terms:** none
- **ADRs:** ADR-0007
- **Context:** Tests run against the built `out/` folder, the same artefact Cloudflare Pages serves, using fixture data (`KYW_DATA_DIR=apps/site/test/fixtures/data`).
- **Steps:**
  1. `webServer`: `pnpm build && serve out -l 4173` (static, with clean URLs to mirror Pages).
  2. Projects: `chromium-js`, `chromium-nojs` (`javaScriptEnabled: false`), `webkit-js`, `firefox-js`; mobile viewport project (`390×844`).
  3. `fixtures.ts`: `axeCheck(page)` helper with tags `wcag2a, wcag2aa, wcag21a, wcag21aa, wcag22aa`, failing on any violation.
  4. Root script `pnpm e2e`; CI job installs browsers with `--with-deps`, uploads the report on failure.
- **Acceptance criteria:** smoke test loads `/` in every project; CI job green.
- **Out of scope:** journeys.
- **Size:** M

### T-10.2 — End-to-end journeys for the "Done means" flow in each nation

- **Depends on:** T-10.1, T-8.12, T-8.13, T-8.14, T-9.4
- **Parallel-safe with:** T-10.3, T-10.4, T-10.5, T-10.6
- **Owns files:** `apps/site/e2e/journey-england.spec.ts`, `apps/site/e2e/journey-wales.spec.ts`, `apps/site/e2e/journey-scotland.spec.ts`
- **Glossary terms:** Home Nation, Specialty, Reporting Unit, Reporting Period, Publication Date, Patient Right
- **ADRs:** ADR-0001, ADR-0002, ADR-0003
- **Context:** PRD "Done means": choose Home Nation and Specialty, see each Reporting Unit's current figures with source and dates, understand they are not a prediction, and read which Patient Rights apply.
- **Steps (per nation):** home → nation link → filter "orthopaedic" (JS project) / scroll (no-JS) → T&O → a Reporting Unit → assert headline sentence with Reporting Period, caption text, published line with Publication Date and source link, status labels on fixture units → follow link to `your-rights` → assert closing "not medical advice" line. England also: NHS Region headings, ISP label; Scotland: two Wait Stage sections, Golden Jubilee note.
- **Acceptance criteria:** all three specs pass in all projects, including `chromium-nojs`.
- **Out of scope:** visual assertions.
- **Size:** M

### T-10.3 — Built-output guard scan (every figure sourced and dated; no banned terms)

- **Depends on:** T-8.12, T-8.13, T-8.14, T-8.16
- **Parallel-safe with:** T-10.2, T-10.4, T-10.5, T-10.6
- **Owns files:** `apps/site/scripts/scan-output.ts`, `apps/site/test/guards/scan-output.test.ts`
- **Glossary terms:** Reporting Period, Publication Date, Suppressed Figure, Official Figure, Derived Figure
- **ADRs:** ADR-0002, ADR-0004, ADR-0005, ADR-0006
- **Context:** A final net over every generated HTML file catches regressions no unit test anticipated.
- **Steps:** parse every `out/**/*.html` (e.g. `node-html-parser`) and assert:
  1. Every element marked `data-figure` contains the caption, a `<time>` for the Reporting Period, a `<time>` for the Publication Date and a source link.
  2. Every `data-figure-status="suppressed"` element's text is the suppressed label and contains no digit `0` as the value.
  3. No banned term from T-8.16's list appears in visible text.
  4. No page under `/england/**` contains Wales or Scotland Reporting Unit names or ids (and each permutation) — cross-nation leak check using reference data.
  5. No `<img>` or SVG referencing NHS logos; no text "NHS Wait Finder".
  6. No outbound links except allow-listed official domains and the GitHub repo.
- **Acceptance criteria:** script runs in CI after build and passes on fixture data; seeded violations make it fail (unit test with tiny HTML fixtures).
- **Out of scope:** accessibility (T-10.4).
- **Size:** M

### T-10.4 — Accessibility and keyboard checks on every route type

- **Depends on:** T-10.1, T-8.12, T-8.13, T-8.14, T-8.15, T-9.4
- **Parallel-safe with:** T-10.2, T-10.3, T-10.5, T-10.6
- **Owns files:** `apps/site/e2e/a11y.spec.ts`
- **Glossary terms:** none
- **ADRs:** none (PRD: WCAG 2.2 AA)
- **Context:** WCAG 2.2 AA with axe in CI; lists of links rather than custom widgets; usable by keyboard and without JS.
- **Steps:** for one representative URL per route type per nation (home, nation, specialty, unit detail, both explainers, static pages, 404): axe check (JS and no-JS), single `<h1>`, heading levels not skipped, skip link moves focus to `<main>`, the filter input has a label and the live region announces, focus visible (CSS `:focus-visible` outline present even unstyled), target size ≥24×24 CSS px for interactive elements (WCAG 2.5.8), page reflows at 320px width without horizontal scroll.
- **Acceptance criteria:** spec passes in all projects.
- **Out of scope:** manual screen reader testing (listed in T-10.9).
- **Size:** M

### T-10.5 — Cloudflare Pages deploy, security headers and Web Analytics

- **Depends on:** T-8.4, T-10.1
- **Parallel-safe with:** T-10.2, T-10.3, T-10.4, T-10.6
- **Owns files:** `.github/workflows/deploy.yml`, `apps/site/public/_headers`, `apps/site/public/_redirects`, `apps/site/src/components/Analytics.tsx`, `docs/deploy.md`
- **Glossary terms:** none
- **ADRs:** ADR-0007
- **Context:** Fully static on Cloudflare Pages; no Workers. Deploy runs after CI on `main`, including commits made by the data pipeline. Analytics are cookieless Cloudflare Web Analytics, so no cookie banner.
- **Steps:**
  1. `deploy.yml`: on `workflow_run` of CI success on `main` (and `workflow_dispatch`), build with real `data/`, deploy `apps/site/out` with `cloudflare/wrangler-action` (`pages deploy`), secrets `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`; PR preview deploys optional.
  2. `_headers`: `Content-Security-Policy` allowing self and `static.cloudflareinsights.com` script + `cloudflareinsights.com` connect; `X-Content-Type-Options: nosniff`; `Referrer-Policy: strict-origin-when-cross-origin`; `Permissions-Policy` denying geolocation/camera/mic; long cache for `/_next/static/*`, short for HTML.
  3. `Analytics.tsx`: renders the beacon `<script defer src="https://static.cloudflareinsights.com/beacon.min.js" data-cf-beacon='{"token":"…"}'>` only when `NEXT_PUBLIC_CF_ANALYTICS_TOKEN` is set; included in layout (one-line import added by this task to `layout.tsx` — coordinate: T-8.4 must be merged).
  4. `docs/deploy.md`: project setup steps for the product owner (Pages project, API token scopes, custom domain without "NHS" per ADR-0004).
- **Acceptance criteria:** a deploy from `main` serves `/`, a unit page and `/404`; response headers include CSP; no cookies set (check in Playwright against preview URL, optional manual).
- **Out of scope:** domain purchase (PO).
- **Size:** M

### T-10.6 — "Spotted a mistake?" issue form, pipeline-failure template and labels

- **Depends on:** T-1.6
- **Parallel-safe with:** all Phase 10 tasks
- **Owns files:** `.github/ISSUE_TEMPLATE/spotted-a-mistake.yml`, `.github/ISSUE_TEMPLATE/config.yml`, `.github/ISSUE_TEMPLATE/pipeline-validation-failed.md`, `.github/labels.yml`, `.github/workflows/labels.yml`
- **Glossary terms:** Reporting Unit, Specialty, Reporting Period, Official Figure
- **ADRs:** ADR-0007
- **Context:** Every page links to a GitHub issue form; the pipeline opens issues on failed validation (T-7.6). Both need templates and labels.
- **Steps:**
  1. Issue form fields: page URL (pre-filled from `page` query param), what looks wrong (textarea), what the official source says (optional URL), checkbox "This is not about my own medical care" (with link to NHS 111 / GP advice text). Label `data-mistake`.
  2. `config.yml`: `blank_issues_enabled: false`, contact link to the email address.
  3. Pipeline failure template with placeholders for nation, Reporting Period, failed checks; label `pipeline-blocked`.
  4. Label sync workflow (e.g. `EndBug/label-sync`).
- **Acceptance criteria:** form renders on GitHub (manual check after push); YAML validates against GitHub's issue-forms schema (CI step using `ajv` or the `issue-form-validator` action).
- **Out of scope:** triage process.
- **Size:** S

### T-10.7 — External link checker for sources and Editorial Content

- **Depends on:** T-8.15, T-9.1
- **Parallel-safe with:** T-10.2–T-10.6
- **Owns files:** `.github/workflows/links.yml`, `lychee.toml`
- **Glossary terms:** Editorial Content, Official Figure
- **ADRs:** ADR-0007
- **Context:** Every figure and claim links to an official source; broken links silently break the "always sourced" principle.
- **Steps:** run `lycheeverse/lychee-action` weekly and on PRs touching `content/**` or `data/**/reference.json`, over `content/**/*.md`, `apps/site/out/**/*.html` and `docs/plan/data-sources.md`; accept 429 with retry; open/update an issue `broken-links` on scheduled failure.
- **Acceptance criteria:** workflow passes `actionlint`; first run report attached to PR.
- **Out of scope:** fixing third-party links (PO).
- **Size:** S

### T-10.8 — Launch readiness checklist and sign-off

- **Depends on:** T-10.2, T-10.3, T-10.4, T-10.5, T-9.5, T-7.7
- **Parallel-safe with:** none (last)
- **Owns files:** `docs/launch-checklist.md`
- **Glossary terms:** all
- **ADRs:** ADR-0001–ADR-0007
- **Context:** Some launch conditions cannot be automated (product-owner review, NHS identity guidance check, domain). One checklist records them with evidence.
- **Steps:** checklist items with evidence links: all CI green on `main`; real data for all three nations committed (England ≥13 monthly releases; Wales and Scotland latest release with same-release year-earlier medians) so Year-Earlier works; `scripts/check-launch-content.ts` passes; PO reviewed T&O content and all six explainers; manual screen-reader pass (VoiceOver + NVDA) on one journey per nation; NHS identity guidance re-checked (PRD open question) and domain contains no "NHS"; privacy page matches analytics; issue form tested; data licences/attributions present on `/sources`.
- **Acceptance criteria:** every item ticked with evidence or explicitly deferred by the product owner.
- **Out of scope:** —
- **Size:** S
