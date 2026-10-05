# Wales StatsWales RTT Fixtures

Trimmed real published Welsh Government / StatsWales RTT data files used for unit tests in `@kyw/pipeline`.
All fixtures are created deterministically from official StatsWales releases by `packages/pipeline/scripts/trim-wales-fixture.ts`.

## Sources and Endpoints

- **Data Provider**: Digital Health and Care Wales (DHCW) / Welsh Government StatsWales.
- **Base URL**: `https://api.stats.gov.wales/v2`
- **Retrieval Date**: 3 October 2026
- **Reporting Period**: Coverage end date `2026-07-31` (July 2026), with Year-Earlier Comparison `2025-07-31` (July 2025).
- **Publication Date**: `2026-09-17`

### 1. Key Measures Dataset (`acd9529c-979a-48ef-a773-870b3ebe4391`)

- **Title**: NHS waiting lists: referral to treatment performance measures, median and 90th centile waiting times, September 2011 onwards
- **Version ID**: `25c7133b-288b-4d7f-87c1-d8b7258a7a49`
- **Metadata URL**: `GET https://api.stats.gov.wales/v2/acd9529c-979a-48ef-a773-870b3ebe4391`
- **Filters URL**: `GET https://api.stats.gov.wales/v2/acd9529c-979a-48ef-a773-870b3ebe4391/filters`
- **Coded Download Request Body** (`POST /v2/acd9529c-979a-48ef-a773-870b3ebe4391/data`):
  ```json
  {
    "filters": [
      { "DateCode": ["202607", "202507"] }
    ],
    "options": {
      "data_value_type": "raw_extended"
    }
  }
  ```
- **Filter ID**: `y7ceh5pckt00`
- **CSV Download URL**: `GET https://api.stats.gov.wales/v2/acd9529c-979a-48ef-a773-870b3ebe4391/data/y7ceh5pckt00?format=csv`

### 2. Threshold Counts Dataset (`3ef3a1d8-1467-4afe-ad60-4fc3d92228a1`)

- **Title**: NHS waiting lists: pathways waiting 26 weeks, 36 weeks, one year and two years, September 2011 onwards
- **Version ID**: `a74af7bb-c186-4a69-9b62-3489cfd34e74`
- **Metadata URL**: `GET https://api.stats.gov.wales/v2/3ef3a1d8-1467-4afe-ad60-4fc3d92228a1`
- **Filters URL**: `GET https://api.stats.gov.wales/v2/3ef3a1d8-1467-4afe-ad60-4fc3d92228a1/filters`
- **Coded Download Request Body** (`POST /v2/3ef3a1d8-1467-4afe-ad60-4fc3d92228a1/data`):
  ```json
  {
    "filters": [
      { "DateCode": ["202607", "202507"] },
      { "StageOfPathwayCode": ["T"] },
      { "AgeGroupAtReferralCode": ["T"] }
    ],
    "options": {
      "data_value_type": "raw_extended"
    }
  }
  ```
- **Filter ID**: `qu6la2fxwwua`
- **CSV Download URL**: `GET https://api.stats.gov.wales/v2/3ef3a1d8-1467-4afe-ad60-4fc3d92228a1/data/qu6la2fxwwua?format=csv`

## Committed Fixture Files and Hashes

| Fixture File | Description | Size | SHA-256 |
|---|---|---|---|
| `acd9529c-metadata.json` | Key Measures dataset metadata (version ID, publish time, coverage dates) | 10.9 KB | `20e63df21bde49538c2338cdc4e1315de2620d907c647fbaaaf33ab5f72a1bc4` |
| `acd9529c-filters.json` | Key Measures dimension codes and value lists | 29.5 KB | `8312932c59cd475643b0f5e90ba409967f765f46e0d77807fcd81fbc0a6b427d` |
| `acd9529c-data.csv` | Trimmed coded CSV containing Key Measures (totals, % < 26w, medians) | 77.1 KB | `f6c22b8c43539d18f083ce02f1b40aa9af5198113ef3dd7fe9be3d7e3c237d04` |
| `3ef3a1d8-metadata.json` | Threshold Counts dataset metadata (version ID, publish time, coverage dates) | 10.8 KB | `3f6e65516f0a5e8bcb251753fb1c3f76e96674dca0648d2b63a73b087f23b328` |
| `3ef3a1d8-filters.json` | Threshold Counts dimension codes and value lists | 31.1 KB | `348dbb127c783fbb6061c9677531f3ca10b6a5941a4064e4973f62b11a1d96c2` |
| `3ef3a1d8-data.csv` | Trimmed coded CSV containing Threshold Counts (over 52 weeks Long Wait counts) | 73.4 KB | `74ab956a89c5f5ff40137a5c7b7e231c54c68f96941bef028a1e6c10aba0f5b4` |

**Total fixture size**: 227.4 KB (budget $\le 300\text{ KB}$).

## Content and Scope Retained

- **Reporting Periods**:
  - `202607` (July 2026, current release)
  - `202507` (July 2025, Year-Earlier Comparison)
- **Reporting Units (Health Boards)**:
  - `W11000023` — Betsi Cadwaladr University Local Health Board (`7A1`)
  - `W11000024` — Powys Teaching Local Health Board (`7A7`)
  - `W11000025` — Hywel Dda University Local Health Board (`7A2`)
  - `W11000031` — Swansea Bay University Local Health Board (`7A3`)
  - `W11000030` — Cwm Taf Morgannwg University Local Health Board (`7A5`)
  - `W11000028` — Aneurin Bevan University Local Health Board (`7A6`)
  - `W11000029` — Cardiff and Vale University Local Health Board (`7A4`)
  - `W92000004` — All Wales LHB (national aggregate total, verified discarded downstream)
  - `A1X` — South East Wales Region (non-reporting aggregate entity, verified discarded downstream)
- **Specialties**:
  - `1` / `T` — All specialties
  - `110` — Trauma and Orthopaedic
  - `130` — Ophthalmology
  - `320` — Cardiology (contains cell with total but suppressed median)

## Calibration and Suppression Check

1. **Cardiff and Vale (`W11000029`) $\times$ `110` (Trauma and Orthopaedic) July 2026**:
   - `Median Ongoing Wait` (`acd9529c` MeasureCode 4): **29.5** weeks
   - `Waiting Standard` (% under 26 weeks, `acd9529c` MeasureCode 2): **45.9** %
   - `Total waiting` (`acd9529c` MeasureCode 1): **14090** pathways
   - `Long Wait` count (> 52 weeks, `3ef3a1d8` Measure 52): **4341** pathways
2. **Suppressed Figure Cell**:
   - **Powys Teaching Health Board (`W11000024`) $\times$ Cardiology (`320`) July 2026**:
     - Total pathways (`MeasureCode 1`): **161**
     - Median waiting time (`MeasureCode 4`): **Absent** (row omitted by StatsWales $\rightarrow$ Suppressed Figure)
     - % under 26 weeks (`MeasureCode 2`): **93.2** %
     - Long Wait count (`3ef3a1d8` Measure 52): **0** pathways

## How to Reproduce

Run offline against cached raw downloads:
```bash
pnpm --filter @kyw/pipeline exec tsx scripts/trim-wales-fixture.ts
```

Run with `--live` to re-fetch live API payloads from StatsWales:
```bash
pnpm --filter @kyw/pipeline exec tsx scripts/trim-wales-fixture.ts --live
```
