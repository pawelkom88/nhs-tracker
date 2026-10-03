# Phase 3 — Pipeline foundations and reference data

**Goal:** shared pipeline plumbing (fetch, cache, canonical JSON, data layout, source-adapter interface) plus each nation's reference data — Reporting Units, Hospital Sites, NHS Regions (England only), Specialty lists with stable slugs, and organisation succession — written to `data/<nation>/reference.json`.

**Starts after:** T-2.1, T-2.8 (and T-1.x). **Unblocks:** Phases 4–6 (pipelines), T-9.2 (content stubs), Phase 8 data loader.

Every fact here is from [data-sources.md](./data-sources.md); read the section for your nation first. Read [MASTER-PLAN.md § Conventions](./MASTER-PLAN.md#conventions).

## `data/` layout (defined by T-3.1)

```
data/
  README.md                         # what each file is; written by T-3.1
  england/
    reference.json                  # ReferenceData<'england'>
    releases/2026-07-31.json        # Release<'england'>, one per Reporting Period
    published.json                  # PublishedNation<'england'> (site input, T-7.4)
    state.json                      # last check, seen source files + sha256, last validation report
  wales/  …same…
  scotland/ …same…
```

---

### T-3.1 — Pipeline foundations: fetch, cache, canonical JSON, data layout, source-adapter interface

- **Depends on:** T-1.2, T-1.3, T-1.5, T-2.4
- **Parallel-safe with:** T-3.2, T-3.3, T-2.5–T-2.11
- **Owns files:** `packages/pipeline/src/http/fetch.ts`, `packages/pipeline/src/io/paths.ts`, `packages/pipeline/src/io/json.ts`, `packages/pipeline/src/io/csv.ts`, `packages/pipeline/src/io/xlsx.ts`, `packages/pipeline/src/source.ts`, `packages/pipeline/src/errors.ts`, `packages/pipeline/test/io/*.test.ts`, `data/README.md`
- **Glossary terms:** Publishing Nation, Reporting Period, Publication Date, Official Figure
- **ADRs:** ADR-0007, ADR-0006
- **Context:** All three nation pipelines and the reference builders need the same plumbing. Committed JSON must be byte-stable so git diffs show only real changes (ADR-0007).
- **Steps:**
  1. `fetch.ts`: `fetchToCache(url, { cacheDir })` using global `fetch`, user agent `KnowYourWait-pipeline (+<repo url>)`, 3 retries with backoff on 5xx/429/network errors, 60s timeout, returns `{ path, sha256, bytes, fetchedAt, finalUrl }`; cache under `packages/pipeline/.cache/` (git-ignored). No network in unit tests: inject a `fetchImpl`.
  2. `json.ts`: `writeCanonicalJson(path, value)` (recursively sorted object keys, 2-space indent, trailing newline, arrays left in given order) and `readJson(path, zodSchema)`.
  3. `paths.ts`: helpers for every path in the layout above; `releasePath(nation, reportingPeriod)`.
  4. `csv.ts`: thin wrapper over `csv-parse/sync` with options for header/no-header, `encoding` (`utf8` | `win1252` via `TextDecoder('windows-1252')`), trimming and non-breaking-space normalisation. `xlsx.ts`: wrapper over `exceljs` returning cell values with formula **cached results**.
  5. `errors.ts`: `SchemaChangeError` (source headers/structure differ from expected), `ValidationError`, `SourceUnavailableError`.
  6. `source.ts`: `interface NationSource<N> { nation: N; discover(state): Promise<ReleaseCandidate[]>; fetch(c): Promise<RawFiles>; normalise(raw, reference): Release<N> }` and `ReleaseCandidate = { reportingPeriod; sourceUrls: string[]; revised: boolean; fingerprint: string }`.
  7. `data/README.md`: explain each file, that files are pipeline-written only, licences (link `DATA-LICENCE.md`).
- **Acceptance criteria:** tests: canonical JSON is byte-identical regardless of key insertion order; retry logic with a fake fetch (2 failures then success); win1252 decoding turns byte `0xA0` into a normal space after normalisation; xlsx wrapper returns cached formula results from a tiny committed `.xlsx` test file.
- **Out of scope:** nation logic.
- **Size:** M

### T-3.2 — ODS bulk CSV client with trimmed real fixtures

- **Depends on:** T-3.1
- **Parallel-safe with:** T-3.3, T-3.7, T-3.8
- **Owns files:** `packages/pipeline/src/reference/ods/client.ts`, `packages/pipeline/src/reference/ods/columns.ts`, `packages/pipeline/fixtures/ods/{etr,ets,ephp,ephpsite,succ,wlhb}.csv`, `packages/pipeline/scripts/trim-ods-fixtures.ts`, `packages/pipeline/test/reference/ods.test.ts`
- **Glossary terms:** Reporting Unit, Hospital Site, Independent Sector Provider, NHS Region
- **ADRs:** ADR-0003, ADR-0006
- **Context:** NHS ODS "Data Search and Export" bulk CSVs (`https://www.odsdatasearchandexport.nhs.uk/api/getReport?report=<name>`) are key-free and refreshed nightly; ORD is under review for deprecation and the FHIR API needs a key (data-sources.md § Reference data). Files have **no header row**; column meanings are fixed by the ODS spec.
- **Steps:**
  1. `columns.ts`: typed positional map for the 27-column layout: 1 code, 2 name, 3 NHS Region code, 4 ICB code, 8 town, 10 postcode (**read and discarded**), 11 open date, 12 close date, 14 site sub-type roles (pipe-separated), 15 parent organisation code. For `succ`: predecessor, successor, _, effective date, has-forward-succession.
  2. `client.ts`: `loadOdsReport(name, { source: 'fixture' | 'live' })` returning typed rows. The postcode column is never placed on the returned object.
  3. Assert column count = 27 (or 5 for `succ`) on every row → `SchemaChangeError` otherwise.
  4. `trim-ods-fixtures.ts`: from live downloads, keep rows for the trusts and ISPs used in England fixtures (T-4.1: e.g. `R1H`, `RRK`, `RAL`, `RAP`, `RA7`, `RVJ`, `RQF`, `NT3`, `A1D1B`) and their sites, plus all `wlhb` rows and the `succ` rows touching them. Commit trimmed files (real rows, unmodified).
- **Acceptance criteria:** tests: parse each fixture; returned objects have no `postcode` key; a 26-column row throws `SchemaChangeError`; RO31 sub-type is exposed so callers can exclude ePACT pseudo-sites.
- **Out of scope:** building reference JSON.
- **Size:** M

### T-3.3 — England NHS Regions with display names

- **Depends on:** T-2.8, T-3.1
- **Parallel-safe with:** T-3.2, T-3.4, T-3.5, T-3.6, T-3.7, T-3.8
- **Owns files:** `packages/pipeline/src/reference/england/regions.ts`, `packages/pipeline/test/reference/england-regions.test.ts`
- **Glossary terms:** NHS Region
- **ADRs:** ADR-0006
- **Context:** NHS England's seven regions are used only to group English Reporting Units for browsing; never a comparison unit. ODS names end in "COMMISSIONING REGION", so display names are ours. Codes Y56–Y63 are verified current (data-sources.md).
- **Steps:** export `ENGLAND_NHS_REGIONS`: Y56 London, Y58 South West, Y59 South East, Y60 Midlands, Y61 East of England, Y62 North West, Y63 North East and Yorkshire, each as `NhsRegion` with id `england:Y5x`, `officialCode`, `officialName` (ODS name) and `name` (display). Function `regionFor(code)` throws on unknown codes (a new region code is a schema change that must block, see T-7.1).
- **Acceptance criteria:** tests: seven regions, unique ids; unknown code throws; no aggregation helpers.
- **Out of scope:** —
- **Size:** S

### T-3.4 — England Reporting Units and Hospital Sites builder

- **Depends on:** T-3.2, T-3.3
- **Parallel-safe with:** T-3.5, T-3.6, T-3.7, T-3.8
- **Owns files:** `packages/pipeline/src/reference/england/units.ts`, `packages/pipeline/src/reference/england/sites.ts`, `packages/pipeline/src/reference/names.ts`, `packages/pipeline/test/reference/england-units.test.ts`
- **Glossary terms:** Reporting Unit, Hospital Site, Independent Sector Provider, NHS Region
- **ADRs:** ADR-0003, ADR-0006
- **Context:** The set of England Reporting Units is whatever appears in the RTT Incomplete Provider file: the `Provider` sheet (NHS trusts) and the `IS Provider` sheet (Independent Sector Providers). The RTT file also gives each provider's NHS Region code, so the region comes from the official statistic itself (data-sources.md § England). ODS supplies Hospital Sites and towns. Many ISP "providers" in RTT are 5-character site-level codes (e.g. `A1D1B`), i.e. themselves a single site.
- **Steps:**
  1. Input interface (filled by T-4.5 from a parsed release; fixtures in tests): `{ code, rttName, kind: 'nhs-trust' | 'independent-sector-provider', regionCode }[]`.
  2. `names.ts`: `toDisplayName(upperCaseName)` title-casing with exceptions list (`NHS`, `UK`, `MSK`, `ENT`, `and`, `of`, `the`, `St`, Welsh/Scottish particles), tested.
  3. `units.ts`: build `ReportingUnit<'england'>` per input row: `officialName` = RTT name, `displayName` via `names.ts`, `nhsRegion` from `regionCode` via T-3.3, operational dates from `etr`/`ephp` if found.
  4. `sites.ts`: Hospital Sites = open `ets` (trusts) / `ephpsite` (ISPs) rows whose parent (col 15) = unit code, **excluding** sub-type RO31, and keeping only sites whose name matches `/HOSPITAL|INFIRMARY|TREATMENT CENTRE|SURGICAL CENTRE|CLINIC/i` or sub-type RO29/RO320 (assumption A-12; product owner may replace with a curated allow-list later). If the unit code itself is a site-level ISP code with no children, the unit has one Hospital Site = itself (name, town from `ephpsite`/`ephp`). Town = col 8 title-cased. No postcode.
- **Acceptance criteria:** tests on fixtures: R1H has its main hospitals and no ePACT rows; an ISP site-level code yields itself as a site; no output object has a postcode; units without an ODS match still build (sites empty) and are listed in a warnings array.
- **Out of scope:** succession (T-3.5), specialties (T-3.6).
- **Size:** M

### T-3.5 — England succession map and Year-Earlier eligibility

- **Depends on:** T-3.2
- **Parallel-safe with:** T-3.3, T-3.4, T-3.6, T-3.7, T-3.8
- **Owns files:** `packages/pipeline/src/reference/england/succession.ts`, `packages/pipeline/test/reference/england-succession.test.ts`
- **Glossary terms:** Year-Earlier Comparison, Reporting Unit
- **ADRs:** ADR-0006
- **Context:** ADR-0006 assumes a merger yields a new code, but verified ODS data shows an absorbing trust often **keeps its code** (e.g. RAP North Middlesex → RAL Royal Free, 2025-01-01; RVJ North Bristol → RA7, 2026-07-01). So Year-Earlier must also be skipped when a unit **received** a predecessor inside the comparison window (data-sources.md § Succession; Blocking finding B-4 refines ADR-0006's consequence without changing its decision).
- **Steps:**
  1. Parse `succ` into `{ predecessor, successor, effectiveDate }[]` (trust-level codes only: 3-character trust codes and ISP codes; ignore site-level rows).
  2. `isSameEntityAcross(code, olderPeriod, newerPeriod)`: `false` if the code has a successor with effective date ≤ newerPeriod, or a predecessor with effective date in `(olderPeriod, newerPeriod]`, or ODS close date ≤ newerPeriod; otherwise `true`.
  3. Populate `predecessors`/`successors` on `ReportingUnit<'england'>`.
- **Acceptance criteria:** tests with real fixture rows: RAL for periods 2024-07-31 → 2025-07-31 is **not** same entity (RAP joined 2025-01-01); RAL for 2025-07-31 → 2026-07-31 is same entity; RRK across 2018-04-02 is not; a unit with no rows is same entity.
- **Out of scope:** Wales/Scotland continuity (T-3.7, T-3.8).
- **Size:** S

### T-3.6 — England Specialty list and slugs

- **Depends on:** T-2.8, T-3.1
- **Parallel-safe with:** T-3.2–T-3.5, T-3.7, T-3.8
- **Owns files:** `packages/pipeline/src/reference/england/specialties.ts`, `packages/pipeline/test/reference/england-specialties.test.ts`
- **Glossary terms:** Specialty
- **ADRs:** ADR-0006
- **Context:** England's Specialties are its 24 RTT treatment functions, under official names (data-sources.md § England codes): C_100 … C_502, X02–X06, and C_999 Total. Slugs must be stable forever (they are URLs) and are per nation; a matching slug in another nation means nothing.
- **Steps:**
  1. Hard-code the 24 codes with official names exactly as published (e.g. `Trauma and Orthopaedic Service`).
  2. Slug table hand-written in the file (not generated at runtime) — e.g. `C_110` → `trauma-and-orthopaedics`, `C_130` → `ophthalmology`, `X05` → `other-surgical-services`, `C_999` → `all-specialties` (`isAllSpecialties: true`). `descriptionKey` = `england/<slug>`.
  3. `assertKnownTreatmentFunctions(codes)` throws `SchemaChangeError` on an unknown code (new treatment functions block publishing until a human adds them).
- **Acceptance criteria:** tests: 24 entries, unique slugs, no slug equals a reserved route (`about-the-figures`, `your-rights`); unknown code throws.
- **Out of scope:** descriptions (Phase 9).
- **Size:** S

### T-3.7 — Wales reference data: health boards, crosswalk, sites, Specialties

- **Depends on:** T-3.1, T-3.2, T-2.8
- **Parallel-safe with:** T-3.3–T-3.6, T-3.8
- **Owns files:** `packages/pipeline/src/reference/wales/boards.ts`, `packages/pipeline/src/reference/wales/sites.ts`, `packages/pipeline/src/reference/wales/specialties.ts`, `packages/pipeline/src/reference/wales/build.ts`, `packages/pipeline/test/reference/wales.test.ts`, `data/wales/reference.json`
- **Glossary terms:** Reporting Unit, Hospital Site, Specialty
- **ADRs:** ADR-0006, ADR-0001
- **Context:** Wales reports RTT by provider health board using **ONS codes** (`W110000xx`) in StatsWales, while ODS uses `7A1`–`7A7`. A hand-maintained crosswalk is required, including legacy codes from the 2019 Bridgend boundary change (data-sources.md § Wales). Reporting Unit ids use the **ODS code** (`wales:7A1`) so codes are stable across the StatsWales change; the crosswalk is the only place ONS codes appear.
- **Steps:**
  1. `boards.ts`: crosswalk table from data-sources.md (W11000023→7A1 Betsi Cadwaladr, W11000024→7A7 Powys, W11000025→7A2 Hywel Dda, W11000031→7A3 Swansea Bay, W11000030→7A5 Cwm Taf Morgannwg, W11000028→7A6 Aneurin Bevan, W11000029→7A4 Cardiff and Vale; legacy W11000026 (Abertawe Bro Morgannwg) and W11000027 (Cwm Taf) are pre-2019 only and are **dropped**). `W92000004` (All Wales) and `A1X` (South East Wales Region) are **not** Reporting Units and are skipped. Any other code → `SchemaChangeError`. Velindre has no RTT rows and is not a Reporting Unit. Year-Earlier continuity: each current board is the same entity across any 12-month window after 2019-04-01.
  2. `sites.ts`: Welsh hospital sites from ODS ORD `RE6` listing (`?RelTypeId=RE6&TargetOrgId=7A1…&Limit=200`, key-free) cached to fixtures, plus town from each site record (or from a DSE Welsh sites report if one is confirmed key-free during the task). Same hospital-name filter as T-3.4. No postcode.
  3. `specialties.ts`: Wales treatment functions from the dataset `filters` endpoint (51 three-digit codes incl. Wales-only `998` Diagnostic Services and `999` Allied Health Profession Services; "All specialties" is `1` in `acd9529c` and `T` in `3ef3a1d8` — normalise both to `wales:all`), official names as published, hand-written slugs (e.g. `110` → `trauma-and-orthopaedics`); unknown codes throw.
  4. `build.ts`: write `data/wales/reference.json` (`ReferenceData<'wales'>`).
- **Acceptance criteria:** tests: crosswalk round-trips; All Wales row excluded; unknown code throws; output validates against the model schema; no NHS Region field.
- **Out of scope:** Welsh-language labels (recorded in data-sources.md for later).
- **Size:** M

### T-3.8 — Scotland reference data: boards, Golden Jubilee, hospital sites, Specialties

- **Depends on:** T-3.1, T-2.8
- **Parallel-safe with:** T-3.2–T-3.7
- **Owns files:** `packages/pipeline/src/reference/scotland/boards.ts`, `packages/pipeline/src/reference/scotland/sites.ts`, `packages/pipeline/src/reference/scotland/specialties.ts`, `packages/pipeline/src/reference/scotland/build.ts`, `packages/pipeline/fixtures/scotland/lookups/*.csv`, `packages/pipeline/test/reference/scotland.test.ts`, `data/scotland/reference.json`
- **Glossary terms:** Reporting Unit, Hospital Site, Specialty
- **ADRs:** ADR-0003, ADR-0006
- **Context:** PHS lookups on opendata.nhs.scot give board codes (`652ff726-…` hb14_hb19; special boards `0450a5a2-…`, Windows-1252 encoded), hospitals with addresses (`c698f450-…`), and specialty names (`6f2e3da0-…`). Golden Jubilee is `SB0801` in waiting-time data but its hospital (D102H) is listed under S08000031 geographically. `Z9` = All specialties (not in the lookup). Residency codes `RA2702`/`RA2704`, the Scotland total `S92000003` and `S27000001` (Non-NHS Provider/Location) are not Reporting Units (Assumption A-11).
- **Steps:**
  1. `boards.ts`: current territorial boards (rows with empty `HBDateArchived`) + `SB0801` as `special-health-board` with note `treats-patients-from-all-boards`. Map archived codes (S08000018/21/23/27) to their current same-name successors for continuity (boundary changes, same entity).
  2. `sites.ts`: hospitals from `c698f450-…` grouped by `HealthBoard`; D102H re-assigned to `SB0801`; town = the last non-empty address line that is not a postcode (document the heuristic; test on fixtures). No postcode.
  3. `specialties.ts`: codes present in the stage-of-treatment files joined to the specialty lookup, plus `Z9` "All specialties" (`isAllSpecialties: true`), hand-written slugs; unknown codes throw.
  4. `build.ts`: write `data/scotland/reference.json`.
- **Acceptance criteria:** tests: 15 Reporting Units (14 territorial + Golden Jubilee); `S92000003`, `S27000001`, `RA2702` excluded; Golden Jubilee has D102H and the note; cp1252 label decoded without the non-breaking space.
- **Out of scope:** —
- **Size:** M

### T-3.9 — Assemble and write England reference data

- **Depends on:** T-3.4, T-3.5, T-3.6, T-4.3
- **Parallel-safe with:** T-4.4, Phase 5/6 tasks
- **Owns files:** `packages/pipeline/src/reference/england/build.ts`, `packages/pipeline/test/reference/england-build.test.ts`, `data/england/reference.json`
- **Glossary terms:** Reporting Unit, Hospital Site, NHS Region, Specialty, Independent Sector Provider
- **ADRs:** ADR-0003, ADR-0006
- **Context:** Combines provider list (from the parsed RTT release, T-4.3), regions, units, sites, succession and Specialties into `ReferenceData<'england'>`.
- **Steps:** `buildEnglandReference(parsedRelease, ods)`; validate with the model schema; write via canonical JSON. Reporting Units are the **union** of providers in the latest release and any provider in releases still eligible for carry-forward (≤12 months), so carried-forward units keep names.
- **Acceptance criteria:** fixture build validates; ISPs have `kind: 'independent-sector-provider'`; every unit has an NHS Region; deterministic output (build twice → identical bytes).
- **Out of scope:** —
- **Size:** S
