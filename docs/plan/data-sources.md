# Data sources — verified findings

**Verified:** 3 October 2026, against live sources (downloads, APIs, release pages). Items not verified are listed per section under **Unverified**. Where a finding contradicts `PRD.md`, it is listed under **Blocking / PRD-contradicting findings** and repeated at the top of [MASTER-PLAN.md](./MASTER-PLAN.md#blocking-findings).

Terminology follows [GLOSSARY.md](../../GLOSSARY.md). "Treatment function" appears only where quoting England/Wales source data.

## Summary

| | England | Wales | Scotland |
|---|---|---|---|
| Publisher | NHS England | Welsh Government (data: Digital Health and Care Wales) | Public Health Scotland |
| Best source | Monthly **Incomplete Provider XLSX** | stats.gov.wales API, datasets `acd9529c…` + `3ef3a1d8…` | opendata.nhs.scot CKAN, **monthly** resources `ac63b747…` + `f9232c17…` |
| Grain | Provider (trust / ISP) × treatment function | Provider health board × treatment function | Health board of treatment × specialty × patient type (Wait Stage) |
| Cadence | Monthly, ~6 weeks lag, usually 2nd Thursday 09:30 | Monthly, ~7 weeks lag, Thursday 09:30 | **Monthly**, ~4 weeks lag, usually last Tuesday |
| Median Ongoing Wait | Official, weeks (decimal); suppressed (`-`) under 20 pathways | Official, weeks (1 dp); **row absent** for small cells | Official, **days** (may be decimal); `:` flag when suppressed |
| Within Waiting Standard | Official proportion `% within 18 weeks` (0–1) | Official percent < 26 weeks (1 dp) | **Not published.** Derived count = exact sum of 3 bands < 12 weeks |
| Long Wait (> 1 year) | Official `Total 52 plus weeks` | Official measure `52` ("more than 52 weeks") | Official `WaitsOver52Weeks` (band sum matches exactly) |
| Revisions | Periodic (~6-monthly); revised files replace links (`-revised`) | Silent; boards resubmit up to 12 months each update | Silent; history revised every release |
| Provisional flag | None | None | Flag `p` defined, never seen |
| Licence | OGL v3 | OGL v3 | OGL v3 (`uk-ogl`) |
| Next release (as of 3 Oct 2026) | 8 Oct 2026 (Aug 2026 data) | 22 Oct 2026 (Aug 2026 data) | 27 Oct 2026 (Sep 2026 data) |

---

## England — NHS England, Consultant-led RTT Waiting Times

### Sources
- Work area: https://www.england.nhs.uk/statistics/statistical-work-areas/rtt-waiting-times/
- Yearly pages (financial year, April–March): `https://www.england.nhs.uk/statistics/statistical-work-areas/rtt-waiting-times/rtt-data-YYYY-YY/` — current `rtt-data-2026-27/`.
- File URL pattern: `https://www.england.nhs.uk/statistics/wp-content/uploads/sites/2/{uploadYYYY}/{uploadMM}/{Name}-{Mon}{YY}-{TYPE}-{SIZE}-{random6}.{ext}`. `{uploadYYYY}/{uploadMM}` is the **publication** month; `{random6}` is per release; revised files end `-revised`. **URLs are not predictable: discover links by scraping the yearly pages.**
- Latest (July 2026 data, published 10 Sep 2026):
  - Incomplete Provider: https://www.england.nhs.uk/statistics/wp-content/uploads/sites/2/2026/09/Incomplete-Provider-Jul26-XLSX-9M-97ylx5.xlsx
  - Full CSV: https://www.england.nhs.uk/statistics/wp-content/uploads/sites/2/2026/09/Full-CSV-data-file-Jul26-ZIP-4M-97ylx5.zip
  - Press notice: https://www.england.nhs.uk/statistics/wp-content/uploads/sites/2/2026/09/Jul26-RTT-statistical-press-notice-PDF-578K-97ylx5.pdf
- Calendar: https://www.england.nhs.uk/statistics/12-months-statistics-calendar/
- Revisions policy: https://www.england.nhs.uk/statistics/code-compliance/
- Terms: https://www.england.nhs.uk/terms-and-conditions/
- Status: Accredited Official Statistics.

### Chosen file: Incomplete Provider XLSX
- Sheets: `Provider` (146 NHS trusts), `IS Provider` (387 Independent Sector Providers), plus `… with DTA` variants (ignore), `Notes`, `Guidance`.
- Metadata cells in rows 2–11: `Period`, `Published: 10th September 2026`, `Revised: N/A`, `Status: Published`.
- Header row 14, data from row 15, **column A empty** (data starts in B). Locate the header row by content, then assert it is row 14.
- Columns (exact): `Region Code, Provider Code, Provider Name, Treatment Function Code, Treatment Function`, week bands `>0-1` … `>103-104`, `104 plus`, then `Total number of incomplete pathways, Total within 18 weeks, % within 18 weeks, Average (median) waiting time (in weeks), 92nd percentile waiting time (in weeks), Total 52 plus weeks, Total 78 plus weeks, Total 65 plus weeks, % 52 plus weeks`.
- `% within 18 weeks` is a **proportion** (e.g. `0.650234…`). `% 52 plus weeks` is an Excel formula (read cached value or ignore).
- `Region Code` = NHS Region (Y56, Y58–Y63) — **official region per provider**, used for grouping.
- Every provider has all 24 treatment-function rows, zero-filled where it has none.
- Sample: `Y56 | R1H | BARTS HEALTH NHS TRUST | C_100 | General Surgery Service | … | 4483 | 2915 | 0.650234218157484 | 12.5229007633588 | 39.5857777777778 | 47 | 0 | 2 | 0.01048`; IS sheet: `Y56 | A1D1B | SPAMEDICA WEMBLEY | C_100 | … | 0 | 0 | 0 | - | - | 0 | 0 | 0 | 0`.

### Mapping to Statistics (all Official Figures)
| Statistic | Field | Unit |
|---|---|---|
| Median Ongoing Wait | `Average (median) waiting time (in weeks)` | weeks |
| Within Waiting Standard (18 weeks) | `% within 18 weeks` | proportion |
| Long Wait count | `Total 52 plus weeks` | count |
| Total waiting (validation only) | `Total number of incomplete pathways` | count |

NHS England's median is itself interpolated by NHS England from weekly bands (method note in the XLSX `Notes`; changed October 2022). It is still an Official Figure: we republish it unchanged and never compute our own.

### Codes
- RTT parts (CSV only): `Part_1A`, `Part_1B` completed; **`Part_2` incomplete pathways**; `Part_2A` incomplete with DTA; `Part_3` new periods.
- Treatment functions (24, same in CSV and XLSX): C_100 General Surgery Service; C_101 Urology Service; C_110 Trauma and Orthopaedic Service; C_120 Ear Nose and Throat Service; C_130 Ophthalmology Service; C_140 Oral Surgery Service; C_150 Neurosurgical Service; C_160 Plastic Surgery Service; C_170 Cardiothoracic Surgery Service; C_300 General Internal Medicine Service; C_301 Gastroenterology Service; C_320 Cardiology Service; C_330 Dermatology Service; C_340 Respiratory Medicine Service; C_400 Neurology Service; C_410 Rheumatology Service; C_430 Elderly Medicine Service; C_502 Gynaecology Service; X02 Other - Medical Services; X03 Other - Mental Health Services; X04 Other - Paediatric Services; X05 Other - Surgical Services; X06 Other - Other Services; C_999 Total.

### Independent Sector Providers
- No flag column: **ISPs are the rows on the `IS Provider` sheet.** Do not infer from code prefixes (mixed N/A/D/M…; 344 five-character, 43 three-character codes).
- Many ISP codes are site-level (e.g. `A1D1B` SpaMedica Wembley).

### Schedule
- Monthly, 09:30, usually second Thursday, ~6 weeks after month end. 2026/27: 16 Apr (Feb), 14 May (Mar), 11 Jun (Apr), 9 Jul (May + Dec/Mar revisions), 13 Aug (Jun), 10 Sep (Jul), **8 Oct (Aug)**, 12 Nov (Sep), 10 Dec (Oct), 14 Jan 2027 (Nov), 11 Feb (Dec), 11 Mar (Jan).

### Revisions and provisional
- "Revisions are published periodically (usually every six months)". Revised files **replace** the original links on the yearly page and live in the revision month's upload folder (e.g. `…/2026/07/Incomplete-Provider-Mar26-XLSX-9M-revised.xlsx`). Not every file of a month is revised.
- **No provisional flag** (`Status: Published`, `Revised: N/A|<date>`).

### Missing data and suppression
- **Non-submitting providers have no rows at all** (July 2026: RHQ, RA9, RK9, NMG). Named only in the press notice "Missing data" section and XLSX Notes caveat 5. → handled by Carried-Forward logic.
- Median and 92nd percentile are `-` when the provider × treatment-function total is **under 20 pathways** ("Values are not calculated for organisations (and treatment functions) with fewer than 20 pathways"). → Suppressed Figure.
- When total = 0, `% within 18 weeks` shows `0`: **not applicable**, not 0 %. → no entry for that provider × treatment function.
- Counts are never suppressed.

### Full CSV (not used for headline figures)
- ZIP with one CSV (82 MB, 182,372 rows), grain provider × commissioner × RTT part × treatment function; counts only, 105 weekly bands. `Provider Parent Org Code` = ICB, no region.
- Summing to provider level matches the XLSX **only if `NONC` commissioner rows are excluded** (meaning unverified). Not needed because the XLSX publishes provider-level Official Figures.

### Licence and attribution
- OGL v3 (site footer; terms page: reuse "free of charge in any format or medium, under the terms of the Open Government Licence"; logos excluded).
- Attribution used: "Contains public sector information licensed under the Open Government Licence v3.0. Source: NHS England, Consultant-led Referral to Treatment Waiting Times, [Month YYYY]."

### Unverified
- Meaning of `NONC`; older years' XLSX layout (only July 2026 inspected — fixtures task must check a 2025 file); RTT-specific attribution wording.

---

## Wales — Welsh Government / StatsWales (stats.gov.wales)

### Sources
- Legacy `statswales.gov.wales` and its OData host `open.statswales.gov.wales` are **retired** (OData host does not resolve; old URLs redirect to the new portal). Old `HLTH00xx` ids are not used.
- New portal: https://stats.gov.wales (Welsh: https://stats.llyw.cymru). Topic: https://stats.gov.wales/en-GB/topic/50/performance-and-waiting-times
- API docs: https://api.stats.gov.wales/docs/ (OpenAPI `/v2/docs/swagger.json`, `/v2/docs/swagger-cy.json`). Public, no key, responses cached 60 s.
- Release series: https://www.gov.wales/nhs-activity-and-performance-summary (latest: https://www.gov.wales/nhs-activity-and-performance-summary-july-and-august-2026, 17 Sep 2026).
- Quality report: https://www.gov.wales/nhs-activity-and-performance-summary-quality-report-html
- Calendar: https://www.gov.wales/statistics-and-research/upcoming
- Status: Accredited official statistics; source system DHCW RTT.

### Datasets
| Id | Content | Use |
|---|---|---|
| `acd9529c-979a-48ef-a773-870b3ebe4391` | **Key measures** by provider board × specialty × month (from Sep 2011): MeasureCode 1 total waiting, 2 % < 26 weeks, 3 > 36 weeks, 4 **median** (decimal weeks), 5 90th centile, 6 < 26 weeks count | Median, % within 26 weeks, total |
| `3ef3a1d8-1467-4afe-ad60-4fc3d92228a1` | Threshold counts by provider × specialty × stage × age: Measure `26`, `36`, **`52`**, `104`, `TP` | Long Wait (`52`, stage `T`, age `T`) |
| `6bd7d5c9-844e-4e7c-85ba-7256e39f7214` | Weekly bands (from Aug 2024 only) | Validation cross-check only |
| `27c78e17-…`, `5b27909c-…` | Residence × provider splits | Not used |
| `4fbb5f7b-…` | Unique-patient estimate (uses 7A codes) | Not used (estimate) |

### Endpoints
- Metadata (current version, publish time, next update): `GET https://api.stats.gov.wales/v2/{uuid}` — use the **version id** as the release fingerprint.
- Dimensions/codes: `GET /v2/{uuid}/filters` (`?lang=cy` for Welsh).
- Coded download (two steps): `POST /v2/{uuid}/data` with `{"filters":[{"DateCode":["202607","202507"]},{"StageOfPathwayCode":["T"]}],"options":{"data_value_type":"raw_extended"}}` → `{ filterId }` (deterministic for the same body), then `GET /v2/{uuid}/data/{filterId}?format=csv` → each column gets `<col>_reference` (code), `_sort`, `_hierarchy`. Use `_reference` columns for codes.
- Plain `GET /v2/{uuid}/data?format=csv` gives labels only (no codes) — do not use.
- JSON pages ≤ 10,000 rows.

### Columns and codes
- `acd9529c` CSV header: `Data values,Data description,Date,Local health board provider,Specialty,Notes` (+ `_reference` columns in coded download). `3ef3a1d8` adds stage of pathway and age group.
- Provider board codes (**ONS**, not ODS): W92000004 All Wales (not a Reporting Unit); W11000023 Betsi Cadwaladr (ODS 7A1); W11000024 Powys (7A7); W11000025 Hywel Dda (7A2); W11000031 Swansea Bay (7A3); W11000030 Cwm Taf Morgannwg (7A5); W11000028 Aneurin Bevan (7A6); W11000029 Cardiff and Vale (7A4); legacy W11000026 Abertawe Bro Morgannwg and W11000027 Cwm Taf (pre-2019 only); `A1X` South East Wales Region (non-standard, meaning unverified; not a Reporting Unit). **No Velindre rows.**
- Specialty: "All specialties" = `1` in `acd9529c`, `T` in `3ef3a1d8`; 51 three-digit codes (100 General Surgery, 101 Urology, 110 Trauma and Orthopaedic, 120 ENT, 130 Ophthalmology, 140 Oral Surgery, 330 Dermatology, 502 Gynaecology, …; Wales-only 998 Diagnostic Services, 999 Allied Health Profession Services). From April 2025, 180, 370, 810 removed from RTT scope.
- Stage of pathway `T` (all), 1–4. Age `T`, 17, 18, 99. Month `DateCode` = `YYYYMM` (201109–202607).
- Weekly bands (`6bd7d5c9`): `0`…`40` single weeks, then 4-week bands `41 - 44` … `101 - 104`, `105` = over 105 weeks. Weeks are completed weeks.

### Availability per health board × treatment function
- **Median: published, but absent (no row) for small cells** — 36 of 243 cells in July 2026; threshold undocumented. → Suppressed Figure, never estimated.
- **% within 26 weeks:** published (1 dp).
- **Over 52 weeks:** published directly (Measure `52`). Cross-check verified: 52 = sum of bands starting ≥ 53 (2,435 checks, 0 mismatches). Note "over 36" includes band 36 while "over 52" excludes `49 - 52`: use published measures as-is.
- **95th percentile: not published anywhere** (not needed by the PRD).
- Figures are by **provider (treating) board**, not residence.

### Schedule, revisions, provisional
- Monthly, 09:30, ~7 weeks lag. 2026: 22 Jan, 19 Feb, 19 Mar, 23 Apr, 21 May, 18 Jun, 23 Jul, 20 Aug, 17 Sep; **next 22 Oct 2026** (Aug 2026 data).
- "New month added and revisions applied to previous data where applicable"; boards resubmit up to 12 months. **Re-download each update; take year-earlier values from the same download.**
- No provisional flag in data (provisional next-month figures appear only in release text; not used).
- Series breaks: Apr 2019 Bridgend boundary change; Jul 2019 Cwm Taf additions; COVID from Mar 2020; Apr 2025 scope change; Jun 2026 ~1,000 restorative dentistry pathways removed at Cardiff and Vale.

### Missing values and suppression
- No `:`/`.` markers; Notes column empty; all values numeric.
- **Missing count row where the cell's total row exists = 0** (confirmed by band sums). Missing median/90th = not published (Suppressed), never 0. (Assumption A-13.)

### Welsh labels
- Any endpoint with `?lang=cy`; same codes; metadata carries en-GB and cy-GB. Welsh header: `Gwerthoedd data,Disgrifiad o'r data,Dyddiad,Darparwr bwrdd iechyd lleol,Arbenigedd,Nodiadau`. Recorded for the future Welsh-language version; not used in v1.

### Health board finder
- **No official Welsh Government postcode finder** (`gov.wales/find-your-local-health-board` → 404). Use https://www.gov.wales/nhs-wales-health-boards-and-trusts (boards listed with the local authorities they cover). NHS 111 Wales local services (https://111.wales.nhs.uk/localservices/) is postcode-based; do not link (no postcode features).

### Licence and attribution
- https://www.gov.wales/copyright-statement: reuse "free of charge in any format or medium, under the terms of the Open Government Licence" (logos excluded). Datasets carry no licence field.
- Attribution used: "Source: Welsh Government, StatsWales (data provider: Digital Health and Care Wales). Contains public sector information licensed under the Open Government Licence v3.0."

### Unverified
- Median withholding rule (ask stats.healthinfo@gov.wales); meaning of `A1X`; whether Velindre activity is inside board figures; API rate limits (none hit over ~510 MB).

---

## Scotland — Public Health Scotland, Stage of Treatment Waiting Times

### Sources
- CKAN dataset: https://www.opendata.nhs.scot/api/3/action/package_show?id=stage-of-treatment-waiting-times (dataset id `e9dbef36-a343-4b9a-ab7e-b6e6cbcbb38e`).
- Latest release (29 Sep 2026, data to 31 Aug 2026, Accredited official statistics): https://publichealthscotland.scot/publications/stage-of-treatment-waiting-times/stage-of-treatment-waiting-times-new-outpatients-inpatients-and-day-cases-29-september-2026/
- Quality flags ("Statistical Qualifiers"): https://www.opendata.nhs.scot/dataset/statistical-qualifiers, resource `b80f9af0-b115-4245-b591-fb22775226c4`.
- Forthcoming publications: https://publichealthscotland.scot/publications/forthcoming-publications/
- Standards: https://www.gov.scot/policies/healthcare-standards/waiting-times/ ; LDP pages `…/12-weeks-first-outpatient-appointment/` and `…/treatment-time-guarantee/` ; Patient Rights (Scotland) Act 2011 s.8 https://www.legislation.gov.uk/asp/2011/5/section/8

### Resources (16, all CSV + datastore)
Download URLs: `https://www.opendata.nhs.scot/dataset/e9dbef36-a343-4b9a-ab7e-b6e6cbcbb38e/resource/<id>/download/<file>`; **file names change each release** — read them from `package_show`.

| Id | Name | Notes |
|---|---|---|
| **`ac63b747-fdcc-410c-ae43-de6fe3c46abf`** | Ongoing and Completed Waits – Monthly | **Primary**: rolling 25 months |
| **`f9232c17-a90e-4d35-a863-11bdb3a748c0`** | Distribution of Ongoing and Completed Waits – Monthly | **Primary**: bands |
| `5816ec92-66bf-4033-ae55-9df45ff19d49` | Ongoing Waits – Long Trend | Monthly from Oct 2012, **no HBR**, refreshed ~quarterly |
| `093f04a5-bb8f-4ce6-9016-d4fa0a912630` | Distribution of Ongoing Waits – Long Trend | quarter-ends; date column `MonthEnd` |
| `b2dc7934-9597-412d-abad-b605439855da` | Distribution of Ongoing Waits CBF | quarterly, HBR × HBT |
| `2cb06778-a9d9-4fde-ae26-0f6886fc59d2` | Ongoing Waits CBF | quarterly, no over-52 column |
| others | Completed waits, additions/removals, unavailability, non-attendance | not used |

The PRD's assumed resources were partly wrong: `5816ec92` is monthly (column `MonthEnding`, no `HBR`), and the October 2025 release added a better monthly pair, used here.

### Columns (exact, excluding `_id`)
- `ac63b747`: `MonthEnding, HBT, HBTQF, PatientType, WaitType, Specialty, SpecialtyQF, Waits, WaitsQF, WaitsOver12Weeks, WaitsOver12WeeksQF, WaitsOver52Weeks, WaitsOver52WeeksQF, WaitsOver78Weeks, WaitsOver78WeeksQF, WaitsOver104Weeks, WaitsOver104WeeksQF, Median, MedianQF, 90thPercentile, 90thPercentileQF`. `WaitType` ∈ {`Ongoing`, `Completed`}. Median/90th in **days**, may be decimal.
- `f9232c17`: `MonthEnding, HBT, HBTQF, PatientType, WaitType, Specialty, SpecialtyQF` + 22 bands, each followed by its `…QF` column: `LessThan4WeekWait, 4To8WeekWait, 8To12WeekWait, 12To16WeekWait, 16To20WeekWait, 20To24WeekWait, 24To28WeekWait, 28To32WeekWait, 32To36WeekWait, 36To40WeekWait, 40To44WeekWait, 44To48WeekWait, 48To52WeekWait, 52To65WeekWait, 65To78WeekWait, 78To91WeekWait, 91To104WeekWait, 104To117WeekWait, 117To130WeekWait, 130To143WeekWait, 143To156WeekWait, Over156WeekWait`.
- `MonthEnding` format `YYYYMMDD` (e.g. `20260831`).

### Statistics mapping (WaitType = `Ongoing`)
| Statistic | Source | Provenance |
|---|---|---|
| Median Ongoing Wait | `Median` (days) | Official |
| Within Waiting Standard (12 weeks) | `LessThan4WeekWait + 4To8WeekWait + 8To12WeekWait` (same row of `f9232c17`) | **Derived** (exact sum), count |
| Long Wait count | `WaitsOver52Weeks` | Official |
| Total waiting | `Waits` | Official |

Verified over all 39,775 unsuppressed monthly rows: 3 bands < 12 weeks = `Waits − WaitsOver12Weeks`; all 22 bands = `Waits`; bands ≥ 12 = `WaitsOver12Weeks`; bands `52To65`…`Over156` = `WaitsOver52Weeks` (also 78/104). Headline release figures reproduce exactly (Aug 2026, Scotland, all specialties: new outpatients 506,512 ongoing, 14,116 over 52 weeks; inpatient/day case 157,485 ongoing, 16,014 over 52 weeks).

**No "% within 12 weeks" for ongoing waits is published.** A percentage would require dividing two figures, which ADR-0005 does not allow (Blocking finding B-1). Also: Scotland's standards are measured on **completed** waits; the ongoing within-12-weeks figure is context, not the standard's performance measure (explainer must say so).

### Codes
- `PatientType` (= Wait Stage): exactly `New Outpatient`, `Inpatient/Day case`.
- `Specialty`: `Z9` = All specialties (always `SpecialtyQF = d`; not in the lookup). Lookup: dataset `specialty-codes`, resource `6f2e3da0-b1b5-46cc-ac04-78495daedfa3` (`Specialty, SpecialtyName`). **Specialty rows do not sum to Z9** (low-volume specialties omitted; 625 of 1,799 keys differ): always take `Z9` for all specialties; never sum.
- `HBT`: 14 territorial boards `S08000015`–`S08000032` (current: rows with empty `HBDateArchived` in resource `652ff726-e676-4a20-abda-435b98dd7bdc`; Fife S08000029, Tayside S08000030, GG&C S08000031, Lanarkshire S08000032), `SB0801` Golden Jubilee (resource `0450a5a2-f600-4569-a9ae-5d6317141899`, Windows-1252, label contains byte `0xA0`), `S92000003` Scotland, `S27000001` Non-NHS Provider/Location (resource `042f9b17-a42d-4112-b40b-32c094fdc01d`; since Oct 2025 NHS-commissioned independent-sector treatment), `RA2702` rest-of-UK resident / `RA2704` unknown residency (resource `32164b83-c9ec-495a-ac9f-dbeeb6ed5e59`; residency codes appearing as HBT — PHS anomaly).
- Reporting Units: 14 territorial boards + SB0801. Excluded: S92000003, S27000001 (A-11), RA27xx.

### Quality flags (PHS Statistical Qualifiers, ONS-based)
`d` derived (PHS totals: Scotland, all specialties) · `:` not available · `u` low reliability · `c` confidential · `p` provisional · `r` revised · `z` not applicable · `e` estimated · `b` break in series · `x` archived · `y` incomplete · `~` rounds to zero.
Seen: `d` on Scotland/Z9 rows; `:` on median/90th for small cells (counts still shown); `:u` on whole rows with empty values. `c`, `p`, `r` never seen.
Handling: empty or `d` → published (a PHS `d` total is still an Official Figure for us); `p` → Provisional; any other flag or empty value → **Suppressed**; `e` → **never shown** (estimate).

### Grain and filtering
- Monthly files: one row per `MonthEnding × HBT × PatientType × WaitType × Specialty`; no HBR; no duplicates. The Scotland row = sum of all other HBT rows.
- Filter: `WaitType = 'Ongoing'`; HBT in allow-list; keep all Specialty codes present (+ Z9).
- **Do not mix releases**: e.g. Jun 2026 Scotland new outpatients ongoing = 496,349 in July files vs 496,153 in August files. Revisions are silent. Year-earlier values come from **the same release file** (it carries 25 months).

### Schedule
- Monthly, ~4 weeks lag (29 Sep 2026 → data to 31 Aug 2026); usually the last Tuesday. **Next: 27 Oct 2026.** Release page: "data files … updated quarterly while the report, summary, dashboard and open data are updated monthly" — Long Trend/CBF files are quarterly in practice; the monthly pair is monthly.
- PHS warns a review may change content and frequency.
- Since 30 Jul 2025 waits use the Dec-2023 clock-adjustment guidance (comparability break, not flagged `b`).

### Monthly management information (PRD open question)
- **Resolved:** the monthly release *is* Accredited official statistics and the monthly open-data files match it exactly. No separate MI source is needed. The patient count (588,073) in the release is labelled an estimate — never republish it.

### Standards and Patient Rights
- New outpatients: "95% of new outpatients should receive an outpatient appointment within 12 weeks" (LDP standard; **not** a legal right).
- Inpatient/day case: Treatment Time Guarantee, 12 weeks from agreeing treatment, statutory under Patient Rights (Scotland) Act 2011 s.8 (a Patient Right).

### Health board finder
- No official postcode finder. Use https://www.scot.nhs.uk/organisations/ (official list of 14 regional and 7 special boards).

### Licence and attribution
- CKAN `license_id: uk-ogl`; PHS site OGL v3. No PHS-specific wording.
- Attribution used: "Source: Public Health Scotland, Stage of Treatment Waiting Times (opendata.nhs.scot). Contains public sector information licensed under the Open Government Licence v3.0."

### Unverified
- Release dates after 27 Oct 2026; meaning of `:u`; why RA codes appear in HBT; why two completed-waits resources changed on 29 Sep.

---

## Reference data

### NHS ODS (England; also Welsh boards)
- **Bulk CSVs (key-free, nightly):** `https://www.odsdatasearchandexport.nhs.uk/api/getReport?report={etr|ets|ephp|ephpsite|succ|wlhb}`. No header row, every value quoted, GET only. `report=nhser` → HTTP 400 (no regions file).
- Report index: https://digital.nhs.uk/services/organisation-data-service/data-search-and-export/csv-downloads/other-nhs-organisations and …/non-nhs-organisations. Column spec: https://www.odsdatasearchandexport.nhs.uk/referenceDataCatalogue/NHS-Trusts-and-NHS-Trust-Sites_565791609.html ; succession spec: …/Succession_587381243.html.
- **ORD API** (key-free, "under review for deprecation"): `https://directory.spineservices.nhs.uk/ORD/2-0-0/organisations/{code}`; site listing `?RelTypeId=RE6&TargetOrgId={code}&Limit=200&Offset=` (total in `x-total-count`).
- **Organisation Data Terminology FHIR API**: production needs an API key → not used.
- Dead: `files.digital.nhs.uk/assets/ods/current/etr.zip` (403).

| Report | Content | Rows (open) |
|---|---|---|
| `etr` | NHS trusts (RO197; includes Welsh RQF, RT4, RYT) | 273 (202) |
| `ets` | Trust sites (RO198); ~11,341 RO31 ePACT pseudo-sites | 46,310 (35,141) |
| `ephp` | Independent Sector Providers (RO172) | 6,914 (6,757) |
| `ephpsite` | ISP sites (col 15 = parent) | 20,087 (17,024) |
| `succ` | Successions | 11,537 |
| `wlhb` | Welsh LHBs 7A1–7A7 | 7 |

Columns (27): 1 code · 2 name (upper case) · 3 NHS Region (Y5x, postcode-derived; blank in Wales) · 4 ICB · 5–7 address · **8 town** · 10 postcode (**discard**) · 11 open date · 12 close date · 14 site sub-type roles (RO29 treatment centre, RO31 ePACT — exclude, RO317 CDC, RO320 elective surgical hub) · 15 parent organisation · 24 Government Office Region. `succ`: predecessor, successor, blank, effective date (YYYYMMDD), has-forward-succession.

Sample: `"RRK02","QUEEN ELIZABETH HOSPITAL","Y60","QHL",…,"BIRMINGHAM","","B15 2TH","19950401","","","","RRK",…`

### NHS Regions
Y56 London · Y58 South West · Y59 South East · Y60 Midlands · Y61 East of England · Y62 North West · Y63 North East and Yorkshire (ODS names end "COMMISSIONING REGION"; Y54/Y55/Y57 inactive). Region comes from the RTT XLSX `Region Code` per provider (official). ICB codes changed on 1 Apr 2026 and more mergers are planned for Apr 2027 — **never key anything on ICBs**; ORD `Status` is unreliable for closed ICBs.

### Succession and mergers
- Successions use legal start dates, immediate links only, never closed.
- **An absorbing trust often keeps its code** (e.g. RAP → RAL 2025-01-01; RVJ → RA7 2026-07-01; RY2 → RWW 2026-04-01). Year-Earlier must be skipped if the unit has a successor **or received a predecessor inside the comparison window** (B-4).
- Recent: R1C→RW1 2024-10-01; RRP, TAF→G6V2S 2024-11-01; RY9→RAX 2024-11-01; RAP→RAL 2025-01-01; RNK→G6V2S 2026-04-01; RY2→RWW 2026-04-01; RYV→RY3 2026-04-01; RVJ→RA7 2026-07-01.
- Name-only changes have no succession record; ODS stores only the current name.

### Wales boards
ODS `wlhb` 7A1 Betsi Cadwaladr, 7A2 Hywel Dda, 7A3 Swansea Bay, 7A4 Cardiff and Vale, 7A5 Cwm Taf Morgannwg, 7A6 Aneurin Bevan, 7A7 Powys. StatsWales uses ONS W11 codes → crosswalk in § Wales. 2019 Bridgend change: ODS kept 7A3/7A5 (renamed, no succession record).

### Scotland boards and hospitals
- Boards: dataset `geography-codes-and-labels` (`9f942fdb-…`), resource `652ff726-e676-4a20-abda-435b98dd7bdc` (`HB,HBName,HBDateEnacted,HBDateArchived,Country`). Archived 2018/2019 codes (S08000018 Fife, S08000027 Tayside, S08000021 GG&C, S08000023 Lanarkshire) replaced by same-name codes — boundary changes, treat as continuous.
- Special boards: `non-standard-geography-codes-and-labels`, resource `0450a5a2-…` (SB0801 Golden Jubilee …), Windows-1252.
- Hospitals: dataset `hospital-codes`, resource `c698f450-eeed-41a0-88f7-c1e40a568acc` (244 rows; `HospitalCode, HospitalName, AddressLine1–4, Postcode, HealthBoard, …`). Town position varies by row. Golden Jubilee hospital D102H is listed under S08000031 geographically but reported under SB0801.

### Licences
- ODS: OGL (v3 linked). Wording (NHS England Digital terms §8): adapted/combined use → "Contains information from NHS England, licenced under the current version of the Open Government Licence". Do not use NHS England branding.
- PHS lookups: `uk-ogl`.

### No-postcode rule
Drop ODS column 10 and PHS `Postcode` at parse time; keep only town. Do not link to postcode finders.

---

## Blocking / PRD-contradicting findings

| Id | Finding | Proposed minimal change (consistent with ADRs) | Decision needed from |
|---|---|---|---|
| **B-1** | Scotland publishes no "% within 12 weeks" for ongoing waits. A percentage = division of two figures, which ADR-0005 ("exactly adding") does not allow. | Show Scotland's within-standard figure as **counts**: "{within} of {total} people had waited less than 12 weeks." (Derived count + Official total; no division.) Alternative needing an ADR-0005 amendment: allow exact ratios of figures from the same row. | Product owner |
| **B-2** | Scotland data is **monthly** (Accredited, matches release), not quarterly as PRD states; Long Wait is published directly (`WaitsOver52Weeks`), so it is an **Official**, not Derived, Figure. | Use the monthly files; update PRD § Data sources and § Figures shown notes. No ADR change. | PRD edit (flagged, not made) |
| **B-3** | Wales withholds the median for small cells (~15 % of board × specialty cells) with no marker (row absent). | Show as Suppressed Figure "Not published (small numbers)". Never estimate. | None (consistent with PRD) |
| **B-4** | ADR-0006 says a merger yields a new code so Year-Earlier is "naturally skipped". ODS shows absorbing trusts keep their code (RAL, RA7, RWW). | Add succession check (successor exists, or predecessor arrived within the window). ADR decision unchanged; its consequence needs a note. | ADR-0006 note (flagged) |
| **B-5** | No official postcode "find your board" tool in Wales or Scotland. PRD says "link to each nation's official finder". | Link to official lists: https://www.gov.wales/nhs-wales-health-boards-and-trusts and https://www.scot.nhs.uk/organisations/ ; label "Not sure which board you're in? See the official list of health boards." | PRD wording (flagged) |
| **B-6** | Scotland's 12-week standards are measured on **completed** waits; the PRD frames "% within Waiting Standard" per stage. | Show the ongoing within-12 figure with explainer text saying the standard is measured differently. | Product owner (content) |
