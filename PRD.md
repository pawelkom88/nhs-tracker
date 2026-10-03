# Know Your Wait — PRD

**One-liner:** A free, independent site that explains official NHS waiting-time statistics for England, Wales and Scotland in plain English.
**Status:** Draft v2 (decisions from design grilling folded in)
**Date:** 3 October 2026

Terminology follows [GLOSSARY.md](./GLOSSARY.md). Decisions are recorded in [docs/adr/](./docs/adr/).

## Problem

NHS waiting-time statistics are public, but spread across separate NHS and government sites in each nation and presented for performance reporting, not for patients. Someone referred for planned care struggles to find how long people are currently waiting for their Specialty, what the figures mean, and what Patient Rights apply to them.

Know Your Wait republishes Official Figures with clear explanations. It does not sell healthcare, insurance or referrals, and it does not tell users which provider to choose.

## Who it's for

UK residents in England, Wales or Scotland who are waiting for, or have been referred for, planned NHS care and want to understand the figures and their options. The site informs; it does not recommend.

## Principles

1. **Never compare across nations.** Each Publishing Nation's figures are shown under its own definitions, on its own pages. The data model cannot express a cross-nation join ([ADR-0006](./docs/adr/0006-nation-namespaced-data-model.md)).
2. **Snapshots, not predictions.** Every figure describes people already on the list at a Reporting Period, never how long the user will wait ([ADR-0002](./docs/adr/0002-ongoing-waits-by-stage-as-headline.md)).
3. **Official or exact only.** Figures are Official Figures or Derived Figures (exact sums of Official Figures). Nothing is estimated ([ADR-0005](./docs/adr/0005-exact-sums-only-no-estimates.md)).
4. **No ranking, no nudging.** No "shortest wait" sort, no "near you", no outbound links to providers.
5. **Always sourced and dated.** Every figure shows its source, Reporting Period and Publication Date.
6. **Independent.** No NHS branding, no affiliation implied ([ADR-0004](./docs/adr/0004-name-without-nhs.md)).

## MVP scope

### In v1

- England, Wales and Scotland, each handled separately.
- Flow: Home Nation → Specialty → Reporting Units → Reporting Unit detail.
- All Specialties live with figures and generic Editorial Content; **Trauma & Orthopaedics** gets full, polished Editorial Content in all three nations first.
- Reporting Units: NHS trusts and Independent Sector Providers in England; health boards in Wales and Scotland, including Scotland's Golden Jubilee ([ADR-0003](./docs/adr/0003-include-independent-sector-providers.md)).
- Per-nation explainers of the NHS process and Patient Rights, each claim linked to an official source.
- A "Live near the border?" notice telling users to check each nation separately ([ADR-0001](./docs/adr/0001-home-nation-is-residence.md)).
- English only, with all UI text routed through an i18n layer.

### Not in v1

- Northern Ireland, Jersey, Guernsey, Isle of Man.
- Postcode entry, distance, or "near you" features.
- Showing another nation's figures on a Home Nation's pages.
- Trend charts or revision history.
- Completed Waits as headline figures.
- England figures by commissioner (ICB).
- Per-Hospital Site figures (none are published).
- Welsh language (planned once a native-speaker reviewer is available).
- Medical advice, diagnosis, treatment recommendations, AI-generated guidance.
- Booking, referral, private healthcare sales, insurance comparison, lead generation.
- Paid features, advertising, accounts, selling or collecting user data.

### Done means

A user can choose their Home Nation and Specialty, see each Reporting Unit's current figures with source and dates, understand that the figures describe people already waiting and are not a prediction, and read which Patient Rights and processes apply in their nation.

## User flow

1. **Home Nation:** user picks England, Wales or Scotland ("Where do you live?").
2. **Specialty:** a list of the nation's official Specialty names, each with a one-line plain-English description, plus a filter box matching names and description keywords (e.g. "cataract" finds Ophthalmology). Each Specialty has its own URL, e.g. `/wales/trauma-and-orthopaedics`.
3. **Reporting Units:** list for that Specialty.
   - England: grouped by NHS Region, with a filter matching trust name, Hospital Site names and towns. Alphabetical within groups.
   - Wales and Scotland: plain list, with a "Not sure which board you're in?" link to each nation's official finder.
   - Never sorted by wait.
4. **Reporting Unit detail:** headline figures (below), Hospital Sites run by the unit (context only), Independent Sector Provider label where relevant.
5. **Explainers:** what the figures mean; the nation's process and Patient Rights.

## Figures shown

Per Reporting Unit × Specialty × Wait Stage:

| Figure                             | Wording pattern                                                         | Notes                                                                                  |
| ---------------------------------- | ----------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| **Median Ongoing Wait** (headline) | "Half of people waiting at 31 August 2026 had waited 14 weeks or less." | Never called "average". Scotland publishes days; shown as "about 18 weeks (126 days)". |
| **% within Waiting Standard**      | "6 in 10 had waited less than 18 weeks."                                | Each nation's own standard: England 18 wks, Wales 26 wks, Scotland 12 wks per stage.   |
| **Long Wait count**                | "420 people had waited over a year."                                    | Scotland: Derived Figure summing published bands ≥52 weeks.                            |
| **Year-Earlier Comparison**        | "(a year earlier: 18 weeks)"                                            | Median only. Omitted if the Reporting Unit or Specialty changed (e.g. trust merger).   |

Wait Stages:

- England, Wales: whole referral-to-treatment pathway.
- Scotland: first outpatient appointment and inpatient/day case treatment, shown as two separate sets of figures, never summed.

Fixed caption on every figure:

> This shows people already on the list as of [Reporting Period], from [source]. It is not a prediction of how long you will wait. Waits change month to month and depend on your clinical need.

The headline always uses the Reporting Period. The Publication Date appears in small text beneath ("Published 9 October 2026 by NHS England").

### Figure status

- **Suppressed Figure** → "Not published (small numbers)". Never 0 or blank.
- **Provisional Figure** → "Provisional" tag, as flagged by the source.
- **Revised** → latest published value only.
- **Reporting Unit missing from latest release** → Carried-Forward Figures for up to 12 months, with their own older date in the headline and a warning. After 12 months: "No figures published since [period]."
- **Derived Figure with any suppressed or missing input** → not shown.

## Data sources

| Nation   | Source                                                        | Granularity                                   | Cadence                        |
| -------- | ------------------------------------------------------------- | --------------------------------------------- | ------------------------------ |
| England  | NHS England RTT waiting times                                 | Trust / ISP × treatment function              | Monthly, ~6 weeks after period |
| Wales    | StatsWales RTT key measures                                   | Health board × treatment function             | Monthly, ~7 weeks after period |
| Scotland | Public Health Scotland stage of treatment (opendata.nhs.scot) | Health board of treatment × specialty × stage | Quarterly                      |

Reporting Units are identified by official organisation codes (NHS ODS codes; Scottish board codes). Hospital Site names and towns come from NHS ODS.

## Editorial Content

- Plain English (NHS content style, about reading age 9).
- Patient Right explainers: short summary, every factual claim linked to an official source (nhs.uk, gov.wales, NHS inform). They describe rights and never tell the user what to do.
- "Last reviewed: [date]" on every explainer page; re-reviewed every 6 months and when a source changes. The product owner reviews before launch.
- Every explainer ends: not advice, speak to your GP or care team.

Footer on every page:

> **Know Your Wait is an independent information site.** We are not part of, or endorsed by, the NHS, NHS England, NHS Wales, NHS Scotland or any government. We republish official statistics and link to official sources; always check the source before making decisions. Nothing on this site is medical advice. Speak to your GP or care team about your own care.

## Tech decisions

See [ADR-0006](./docs/adr/0006-nation-namespaced-data-model.md) and [ADR-0007](./docs/adr/0007-fully-static-site-data-in-git.md).

- **Platform:** web.
- **Stack:** Next.js + TypeScript + Tailwind CSS, static export (`output: 'export'`).
- **Hosting:** Cloudflare Pages. No Workers, database or object storage in v1.
- **Pipeline:** scheduled GitHub Actions job, daily. It checks each nation for a new release, then downloads, validates and normalises it, and commits the JSON to the repo.
- **Validation gate:** schema changes, sharp drops in Reporting Unit count, or out-of-range values block publishing. The site keeps its last good data and the job opens a GitHub issue.
- **Data model:** each figure is keyed by Publishing Nation × Reporting Unit × Specialty × Wait Stage × Statistic × Reporting Period, with value, published unit, status, source and Publication Date. All category values are namespaced by nation.
- **Accessibility:** WCAG 2.2 AA, axe checks in CI. Lists of links rather than custom widgets; works without JS.
- **Analytics:** Cloudflare Web Analytics (cookieless). No cookie banner.
- **Feedback:** "Spotted a mistake?" link on every page → GitHub issue form, plus an email contact.
- **Distribution:** public website; open-source code, pipeline and data.

## Constraints

Free for users; no commercial healthcare or insurance incentive; public data only; every figure cited; each nation's definitions preserved; no figure presented as a prediction.

## Resolved questions

| Question                      | Resolution                                                                                             |
| ----------------------------- | ------------------------------------------------------------------------------------------------------ |
| Product name                  | Know Your Wait ([ADR-0004](./docs/adr/0004-name-without-nhs.md))                                       |
| First end-to-end Specialty    | Trauma & Orthopaedics, all three nations                                                               |
| Common data model             | One shape, nation-namespaced values ([ADR-0006](./docs/adr/0006-nation-namespaced-data-model.md))      |
| Postcode/distance in v1       | No. England gets name/site/town filter + NHS Region grouping instead                                   |
| Cloudflare architecture       | Fully static on Pages, daily pipeline ([ADR-0007](./docs/adr/0007-fully-static-site-data-in-git.md))   |
| Minimum consistent metric set | Median Ongoing Wait, % within Waiting Standard, Long Wait count, Year-Earlier Comparison of the median |

## Open questions

- Confirm whether PHS publishes monthly management information that could supplement Scotland's quarterly figures.
- Exact validation thresholds for the pipeline gate.
- Structure of per-nation process and Patient Right explainers.
- Confirm current NHS identity guidance before finalising branding and domain.
- Welsh-language reviewer for a future bilingual Wales section.
