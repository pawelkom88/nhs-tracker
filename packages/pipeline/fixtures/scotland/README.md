# Scotland Public Health Scotland (PHS) Fixtures

Trimmed real published Public Health Scotland (PHS) Stage of Treatment Waiting Times data files used for unit and integration tests in `@kyw/pipeline`.
All fixtures are created deterministically from official PHS CKAN releases by `packages/pipeline/scripts/trim-scotland-fixture.ts`.

## Sources and Endpoints

- **Data Provider**: Public Health Scotland (PHS) / NHS Scotland Open Data (`opendata.nhs.scot`).
- **CKAN API Endpoint**: `https://www.opendata.nhs.scot/api/3/action/package_show?id=stage-of-treatment-waiting-times`
- **Dataset ID**: `e9dbef36-a343-4b9a-ab7e-b6e6cbcbb38e`
- **Reporting Period**: Coverage end date `2026-08-31` (August 2026), with Year-Earlier Comparison `2025-08-31` (August 2025).
- **Publication Date**: `2026-09-29`
- **Licence**: Open Government Licence v3.0 (UK OGL)

### 1. Ongoing and Completed Waits – Monthly (`ac63b747-fdcc-410c-ae43-de6fe3c46abf`)

- **Title**: Ongoing and Completed Waits – Monthly
- **Download URL**: `https://www.opendata.nhs.scot/dataset/e9dbef36-a343-4b9a-ab7e-b6e6cbcbb38e/resource/ac63b747-fdcc-410c-ae43-de6fe3c46abf/download/sot_performance_ongoing_completed_waits_monthly_aug26.csv`
- **Last Modified**: `2026-09-29T12:55:00.368498`
- **Original Size**: 3,687,054 bytes (~3.68 MB)
- **Original SHA-256**: `d9d85b5b69516b05a27cd14ecc7de55522b04351ee4e8eabee370f51ccf38499`

### 2. Distribution of Ongoing and Completed Waits – Monthly (`f9232c17-a90e-4d35-a863-11bdb3a748c0`)

- **Title**: Distribution of Ongoing and Completed Waits – Monthly
- **Download URL**: `https://www.opendata.nhs.scot/dataset/e9dbef36-a343-4b9a-ab7e-b6e6cbcbb38e/resource/f9232c17-a90e-4d35-a863-11bdb3a748c0/download/sot_distribution_of_ongoing_completed_waits_monthly_aug26.csv`
- **Last Modified**: `2026-09-29T08:58:15.493218`
- **Original Size**: 5,610,931 bytes (~5.61 MB)
- **Original SHA-256**: `4659695e53f8489b937096d6f0166cc4a8f4017033a6179a94a398bdd9fa51e3`

## Committed Fixture Files and Hashes

| Fixture File | Description | Size | SHA-256 |
|---|---|---|---|
| `stage-of-treatment/package_show.json` | CKAN dataset metadata (resource list, publication timestamp, license) | 33.2 KB | `030cf3f6928eced2e80194087ec7c511e09db878fa6bbfe42cbee3c769985258` |
| `stage-of-treatment/ac63b747-data.csv` | Trimmed Ongoing and Completed monthly performance (totals, medians, 12w / 52w waits) | 13.9 KB | `86ead1bfea80eb9caf7164620e86413d1483f5040ed951e3e268fad69fc9e1fd` |
| `stage-of-treatment/f9232c17-data.csv` | Trimmed 22-band distribution monthly file (used for Derived within-12-weeks sum) | 22.9 KB | `e0b0eb152602da769e3110fa77ade22eca4c982ff116815d8c832c2543c96331` |

**Total fixture size**: 70.0 KB (budget $\le 300\text{ KB}$).

## Content and Scope Retained

- **Reporting Periods**:
  - `20260831` (August 2026, current release)
  - `20250831` (August 2025, Year-Earlier Comparison)
- **Reporting Units (Health Boards and Entities)**:
  - `S08000024` — NHS Lothian (territorial board)
  - `S08000031` — NHS Greater Glasgow and Clyde (territorial board)
  - `SB0801` — NHS Golden Jubilee (national special hospital board)
  - `S08000025` — NHS Orkney (small island board with suppressed figures)
  - `S92000003` — Scotland (national aggregate total, discarded downstream from unit lists)
  - `S27000001` — Non-NHS Provider/Location (independent sector activity, discarded downstream)
  - `RA2702` — Rest-of-UK resident (residency code anomaly, discarded downstream)
- **Specialties**:
  - `Z9` — All specialties
  - `C8` — Trauma and Orthopaedic Surgery
  - `C7` — Ophthalmology
  - `G1` — General Psychiatry (contains `:u` quality flag rows)
- **Wait Stages (`PatientType`)**:
  - `New Outpatient`
  - `Inpatient/Day case`
- **Wait Types (`WaitType`)**:
  - `Ongoing` (retained for pipeline normalisation)
  - `Completed` (retained in fixture to verify downstream filtering)

## Calibration and Suppression Check

1. **Scotland National Aggregate (`S92000003`) $\times$ `Z9` (All specialties) August 2026**:
   - `New Outpatient` Ongoing Total (`Waits`): **506,512** pathways
   - `New Outpatient` Ongoing Over 52 Weeks (`WaitsOver52Weeks`): **14,116** pathways
   - `Inpatient/Day case` Ongoing Total (`Waits`): **157,485** pathways
   - `Inpatient/Day case` Ongoing Over 52 Weeks (`WaitsOver52Weeks`): **16,014** pathways
2. **Suppressed Figure Cells (`MedianQF = ':'`)**:
   - Note that rows with `MedianQF = ':'` in the trimmed fixture are Completed wait type rows, such as:
     - **NHS Orkney (`S08000025`) $\times$ `C8` (Trauma and Orthopaedic Surgery) August 2026 (Inpatient/Day case Completed)**: `Waits`: **4**, `Median`: empty string (`""`), `MedianQF`: `":"` (Not available / suppressed due to small volume)
     - **Non-NHS Provider (`S27000001`) $\times$ `C7` (Ophthalmology) August 2026 (Inpatient/Day case Completed)**: `Waits`: **1**, `Median`: empty string (`""`), `MedianQF`: `":"`
3. **Quality Flag Cell (`:u`)**:
   - Ongoing suppressions in the fixture are `:u` on `G1` (General Psychiatry):
     - **NHS Lothian (`S08000024`) $\times$ `G1` (General Psychiatry) August 2026 (Inpatient/Day case Ongoing)**: `Waits`: empty string (`""`), `WaitsQF`: `":u"` (Low reliability / suppressed)
     - **Scotland National Aggregate (`S92000003`) $\times$ `G1` August 2026 (Inpatient/Day case Ongoing)**: `Waits`: empty string (`""`), `WaitsQF`: `":u"`

## How to Reproduce

Run offline against cached raw downloads:
```bash
pnpm --filter @kyw/pipeline exec tsx scripts/trim-scotland-fixture.ts
```

Run with `--live` to re-fetch live API payloads from opendata.nhs.scot:
```bash
pnpm --filter @kyw/pipeline exec tsx scripts/trim-scotland-fixture.ts --live
```
