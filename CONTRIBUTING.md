# Contributing to Know Your Wait

Thank you for contributing to Know Your Wait. Know Your Wait is an open-source project that explains official NHS waiting-time statistics for England, Wales, and Scotland.

---

## Guiding Principles

All contributors (human and AI agents) must adhere strictly to the project rules and architectural decisions:

1. **Adhere to [GLOSSARY.md](./GLOSSARY.md)**: Use canonical domain terms (`HomeNation`, `PublishingNation`, `ReportingUnit`, `Specialty`, `OfficialFigure`, `DerivedFigure`, `ReportingPeriod`, etc.). Never use terms marked `_Avoid_`.
2. **Never Compare Nations ([ADR-0006](docs/adr/0006-nation-namespaced-data-model.md))**: Every nation's data model, statistics, and specialties remain separate. Never combine or rank nations.
3. **Never Estimate ([ADR-0005](docs/adr/0005-exact-sums-only-no-estimates.md))**: Publish only Official Figures or exact sums from the same release. Never interpolate medians or fill gaps.
4. **No NHS Branding ([ADR-0004](docs/adr/0004-name-without-nhs.md))**: No NHS logos, no official NHS visual branding, and no claim of NHS affiliation.
5. **Static Site and Pipeline Isolation ([ADR-0007](docs/adr/0007-fully-static-site-data-in-git.md))**: `data/` is written only by automated pipeline runs. Never hand-edit files in `data/`.

---

## Development Workflow

### Requirements

- Node.js (see `.nvmrc`)
- pnpm >= 10.6.1 (via `corepack enable`)

### Local Commands

```bash
pnpm install          # Install all dependencies
pnpm format:check    # Check Prettier formatting
pnpm format          # Apply Prettier formatting
pnpm lint            # Run ESLint
pnpm typecheck       # Verify TypeScript types
pnpm test            # Run Vitest test suite
```

All five checks must pass before opening a PR.

### Branching and Commits

- **Branches**: `t-<phase>-<n>-<slug>` (e.g. `t-1-7-licence-and-contributing`).
- **Commit Messages**: [Conventional Commits](https://www.conventionalcommits.org/) format:
  - `feat(pipeline): ...`
  - `fix(site): ...`
  - `docs(plan): ...`
  - `test(model): ...`
  - `refactor(pipeline): ...`
  - `chore(repo): ...`

---

## Reporting Data Mistakes

To report discrepancies between Know Your Wait and source official figures:

1. Open a GitHub Issue using the **Data Issue** template.
2. Specify the Publishing Nation, Reporting Unit, Specialty, and Reporting Period.
3. Provide a link or citation to the relevant official release file.
