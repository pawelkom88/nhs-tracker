# Phase 11 — Visual design (placeholder)

**Status:** not planned yet. UI design is a separate effort that starts after the semantic skeleton (Phase 8–10) is live with real data.

**How it slots in without restructuring:**

- Styling is added through Tailwind classes and `apps/site/src/app/globals.css` only. Markup, routes, data loading, i18n keys and tests from Phases 8–10 stay as they are.
- Components already isolate presentation (`FigureBlock`, `StatusLabels`, `BorderNotice`, `ListFilter`, `Footer`, per-nation `FigureStatements`, `UnitList`, `UnitDetail`), so design work restyles these rather than rewriting them.
- e2e, axe and output-scan tests (T-10.2–T-10.4) are the regression net: a design change that breaks wording, captions, status labels, keyboard use or contrast fails CI.
- Constraints that design must keep: no NHS branding, fonts, NHS blue lozenge or anything implying affiliation (ADR-0004); no visual ranking (e.g. colour scales or bars that invite comparison between Reporting Units; ADR-0003, PRD principle 4); no charts or trends (PRD "Not in v1"); Scotland's two Wait Stages visually separate (ADR-0002); WCAG 2.2 AA; works without JS.

Tasks (`T-11.x`) will be written when this phase is planned.
