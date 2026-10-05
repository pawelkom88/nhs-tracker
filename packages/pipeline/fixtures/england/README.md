# England RTT Fixtures

Trimmed real published NHS England RTT data files used for unit tests in `@kyw/pipeline`.
All fixtures are created deterministically from official NHS England releases by `packages/pipeline/scripts/trim-england-fixture.ts`.

## Sources and Hashes

Downloaded: 3 October 2026

| Fixture file | Source URL | Original SHA-256 | Original Size | Fixture Size |
|---|---|---|---|---|
| `rtt-data-2026-27.html` | https://www.england.nhs.uk/statistics/statistical-work-areas/rtt-waiting-times/rtt-data-2026-27/ | `d7f69831c154f67a9b224b3f22de89d0a0b67044ed8c5b8541eba856da771081` | 72935 B | 72935 B |
| `rtt-data-2025-26.html` | https://www.england.nhs.uk/statistics/statistical-work-areas/rtt-waiting-times/rtt-data-2025-26/ | `09f5ed594c60d7a11c24845c01be06abf8766f3d0b84c2fc648114dbf2383c2f` | 86568 B | 86568 B |
| `Incomplete-Provider-Jul26.xlsx` | https://www.england.nhs.uk/statistics/wp-content/uploads/sites/2/2026/09/Incomplete-Provider-Jul26-XLSX-9M-97ylx5.xlsx | `2cd20ec22cee9ae8e19339b0f3d317ad4d094ebf7fd23f77e428636eb5d601d2` | 9.72 MB | 58.3 KB |
| `Incomplete-Provider-Jul25.xlsx` | https://www.england.nhs.uk/statistics/wp-content/uploads/sites/2/2026/02/Incomplete-Provider-Jul25-XLSX-9M-revised-2.xlsx | `f370e248190262a8b9e44908dd0b8dc68d09e8cf7e3bb2e83ce0d75c38a69f5c` | 8.79 MB | 68.6 KB |
| `Incomplete-Provider-Mar26-revised.xlsx` | https://www.england.nhs.uk/statistics/wp-content/uploads/sites/2/2026/07/Incomplete-Provider-Mar26-XLSX-9M-revised.xlsx | `d0511b428278dc438aedde65e6d301b98014042595e6462c892775ceca9aa6b8` | 9.72 MB | 67.8 KB |

**Total fixture size**: 350.5 KB (budget $\le 500\text{ KB}$).

## Content Retained

- **Metadata and Headers**: Rows 1–14 kept intact on sheets `Provider` and `IS Provider`. Header row 14 structure and column names untouched.
- **Reference Text**: Sheet `Notes` and `Guidance` kept intact.
- **Reporting Units (NHS Trusts)**:
  - `R1H` — Barts Health NHS Trust (large London trust).
  - `RRK` — University Hospitals Birmingham NHS Foundation Trust.
  - `RAL` — Royal Free London NHS Foundation Trust (absorbed RAP on 2025-01-01).
  - `RAP` — North Middlesex University Hospital NHS Trust (predecessor to RAL).
  - `RA9` — Torbay and South Devon NHS Foundation Trust (present in Jul 2025 / Mar 2026, non-submitter in Jul 2026).
- **Independent Sector Providers (ISPs)**:
  - `A1D1B` — SpaMedica Wembley (site-level ISP code with Suppressed Figure medians `-` on small/zero pathway rows).
  - `NT314` — Spire London East (ISP with active pathways across surgical specialties).
- **Specialties**: All 24 treatment functions retained per provider.

## How to Reproduce

```bash
pnpm --filter @kyw/pipeline exec tsx scripts/trim-england-fixture.ts
```

Pass `--live` to re-download originals from NHS England:
```bash
pnpm --filter @kyw/pipeline exec tsx scripts/trim-england-fixture.ts --live
```
