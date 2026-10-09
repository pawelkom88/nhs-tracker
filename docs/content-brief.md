# Editorial Content Brief & Official Source Starting Points

**For:** Product Owner / Editorial Authors  
**Status:** Canonical Brief  
**Verified Source Check Date:** 2026-10-07

Know Your Wait presents official NHS waiting-time statistics for England, Wales, and Scotland. Technical scaffolding, schemas, loaders, and guardrails are maintained in code, while editorial copy is authored and reviewed by the Product Owner.

---

## 1. Editorial Role & Boundaries

- **Product Owner role:** Authors and maintains all user-facing editorial explanations, specialty summaries, and rights guides. Sets `status: reviewed` upon completing factual verification.
- **Engineering / Agent role:** Generates type-safe scaffolding, placeholder files, front matter validation, build-time Markdown rendering, and CI freshness guards. Agents do not draft clinical descriptions or rights claims.

---

## 2. Style & Tone Checklist

All copy in `content/` must follow these core constraints:

1. **Reading age ~9–11:** Plain English, short sentences (under 20 words where possible), active voice, no bureaucratic jargon.
2. **Describe, never instruct:** State processes and entitlements factually as they exist.
   - _Approved pattern:_ "Patients referred to a specialist in England have the right to choose the hospital or clinic for their care."
   - _Avoided pattern:_ "Choose your hospital from the list to get faster care."
3. **Never predict or estimate:** No individual waiting-time predictions, forecasts, or unverified claims.
4. **No unsourced numerical claims:**
   - Numerical values (e.g., `18 weeks`, `12 weeks`, percentages) must never be asserted as free-floating factual statements in editorial prose.
   - Official standards may only be cited within quotes or explicitly linked reference blocks citing primary legislation or official statutory guidance.
5. **No NHS branding:** Know Your Wait is independent. Never use NHS logos, lozenges, or slogans. Use "NHS" only as a descriptive proper noun.
6. **Strict vocabulary enforcement (`GLOSSARY.md`):**
   - Use: `Home Nation`, `PublishingNation`, `Specialty`, `ReportingUnit`, `WaitStage`, `OngoingWait`, `CompletedWait`, `MedianOngoingWait`, `WaitingStandard`, `LongWait`, `PatientRight`, `IndependentSectorProvider`.
   - Never use banned words: `average wait`, `mean wait`, `expected wait`, `estimated wait`, `breach`, `52-week wait`, `private hospital`, `near you`, `local area`, `our data`.
7. **Every claim sourced:** Every section containing factual assertions or rights descriptions must link to an entry in the front matter `sources` list using Markdown reference link syntax: `[consultant-led treatment][nhs-choice]`.
8. **Allow-listed domains only:** Source URLs must use `https://` and belong strictly to official domains:
   - England: `nhs.uk`, `england.nhs.uk`, `gov.uk`, `legislation.gov.uk`
   - Wales: `gov.wales`, `nhs.wales`, `statswales.gov.wales`, `stats.gov.wales`, `111.wales.nhs.uk`
   - Scotland: `nhs.scot`, `nhsinform.scot`, `gov.scot`, `publichealthscotland.scot`, `opendata.nhs.scot`, `legislation.gov.uk`
9. **6-month review lifecycle:** Reviewed pages (`status: reviewed`) must specify `lastReviewed: YYYY-MM-DD` and `reviewedBy: <identifier>`. Content older than 183 days fails CI.

---

## 3. Required Pages and Section Outlines

### 3.1 England

#### `content/england/about-the-figures.md`

- **Front matter:** `kind: about-the-figures`, `nation: england`
- **Section structure:**
  - `## What "people already waiting" means`: Ongoing Wait snapshot concept, referral-to-treatment (RTT) pathway.
  - `## What the median means (half of people)`: 50th percentile explanation, why median is used instead of mean.
  - `## The Waiting Standard in England`: The official 18-week Referral to Treatment (RTT) standard for non-urgent consultant-led care.
  - `## Long Waits`: Published counts of patients waiting over 52 weeks, 65 weeks, or longer.
  - `## Why some figures say "Not published"`: Privacy suppression for small counts.
  - `## Carried-forward figures`: Handling trusts that did not submit in the latest month.
  - `## Where the figures come from`: NHS England Consultant-led Referral to Treatment (RTT) monthly statistics.

#### `content/england/your-rights.md`

- **Front matter:** `kind: your-rights`, `nation: england`
- **Section structure:**
  - `## How referral works`: GP referral to consultant-led services.
  - `## Your right to choose`: Legal right under the NHS Constitution to choose any clinically appropriate provider in England (including qualifying Independent Sector Providers).
  - `## Your right to start treatment within 18 weeks`: The NHS Constitution right and what happens if the wait exceeds the standard.
  - `## If you live near the border`: How rights attach to English GP registration or English residence (ADR-0001 cross-border rules).
  - `## Where to get support`: Patient Advice and Liaison Services (PALS) and NHS 111.

#### `content/england/specialties/trauma-and-orthopaedics.md`

- **Front matter:** `kind: specialty`, `nation: england`, `specialtyId: england:C_110`, `summary: "..."`, `keywords: [...]`
- **Section structure:**
  - `## What this specialty covers`: Bones, joints, ligaments, tendons (e.g. hip and knee replacements).
  - `## What the figures for this specialty include`: Consultant-led RTT waiting list figures for Trauma & Orthopaedic surgery in England.
  - `## Related patient rights`: Link to `[your rights in England](/england/your-rights)`.

---

### 3.2 Wales

#### `content/wales/about-the-figures.md`

- **Front matter:** `kind: about-the-figures`, `nation: wales`
- **Section structure:**
  - `## What "people already waiting" means`: Ongoing Wait open pathways for patients referred to hospital specialists.
  - `## What the median means (half of people)`: Explanation of the median wait for open pathways across Welsh Local Health Boards.
  - `## The Waiting Standard in Wales`: The Welsh Government 26-week RTT target (and maximum target thresholds).
  - `## Long Waits`: Published figures for waits over 36 weeks and over 52 weeks.
  - `## Why some figures say "Not published"`: Statistical suppression rules applied by StatsWales.
  - `## Where the figures come from`: Welsh Government / StatsWales NHS Referral to Treatment waiting times.

#### `content/wales/your-rights.md`

- **Front matter:** `kind: your-rights`, `nation: wales`
- **Section structure:**
  - `## How referral works`: Primary care referral to secondary care within Welsh Health Boards.
  - `## Standards of care and waiting times in Wales`: The Welsh NHS standards and NHS Wales guidelines.
  - `## If you live near the border`: Welsh residents receiving care in English NHS trusts or vice versa (commissioning arrangements).
  - `## Where to get support`: Llais (independent citizen voice for health and social care in Wales) and NHS 111 Wales.

#### `content/wales/specialties/trauma-and-orthopaedics.md` (or Welsh official slug)

- **Front matter:** `kind: specialty`, `nation: wales`, `specialtyId: wales:110`, `summary: "..."`, `keywords: [...]`
- **Section structure:**
  - `## What this specialty covers`: Planned orthopaedic surgery, joint replacements, musculoskeletal treatment.
  - `## What the figures for this specialty include`: Open pathway referral-to-treatment waiting lists for Welsh health boards.
  - `## Related patient rights`: Link to `[your rights in Wales](/wales/your-rights)`.

---

### 3.3 Scotland

#### `content/scotland/about-the-figures.md`

- **Front matter:** `kind: about-the-figures`, `nation: scotland`
- **Section structure:**
  - `## Two separate wait stages in Scotland`: Essential distinction — New Outpatient stage vs Inpatient/Day Case stage (ADR-0002: these figures are never added together).
  - `## What "people already waiting" means`: Ongoing waits snapshot for each distinct stage of planned care.
  - `## What the median means (half of people)`: Median weeks waited for patients currently on the outpatient or inpatient list.
  - `## The Waiting Standards in Scotland`: The 12-week New Outpatient standard and the statutory 12-week Treatment Time Guarantee (TTG) for inpatient/day case.
  - `## Long Waits`: Counts of patients waiting over 52 weeks or 78 weeks per stage.
  - `## Where the figures come from`: Public Health Scotland (PHS) Stage of Treatment waiting times reports.

#### `content/scotland/your-rights.md`

- **Front matter:** `kind: your-rights`, `nation: scotland`
- **Section structure:**
  - `## How referral works`: Referral by GP to outpatient clinic in NHS Scotland territorial health boards.
  - `## The Treatment Time Guarantee (TTG)`: Legal right under the Patient Rights (Scotland) Act 2011 for eligible inpatient and day case treatments within 12 weeks of agreement to treat.
  - `## The 12-week Outpatient Standard`: NHS Scotland target standard for new outpatient consultations.
  - `## If you live near the border`: Cross-border treatment arrangements with NHS England.
  - `## Where to get support`: Patient Advice and Support Service (PASS) through Citizens Advice Scotland.

#### `content/scotland/specialties/trauma-and-orthopaedics.md` (or Scottish official slug)

- **Front matter:** `kind: specialty`, `nation: scotland`, `specialtyId: scotland:C8`, `summary: "..."`, `keywords: [...]`
- **Section structure:**
  - `## What this specialty covers`: Planned musculoskeletal care, joint surgeries, trauma care follow-up.
  - `## What the figures for this specialty include`: Explanation showing separate figures for outpatient appointments and inpatient/day case admissions.
  - `## Related patient rights`: Link to `[your rights in Scotland](/scotland/your-rights)`.

---

## 4. Official Source Starting Points

All URLs checked and verified active on 2026-10-07.

### 4.1 England Sources

| ID                              | Resource Title                                     | Primary URL                                                                                                                               | Topic / Scope                                       |
| ------------------------------- | -------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------- |
| `england-nhs-constitution`      | The NHS Constitution for England                   | `https://www.gov.uk/government/publications/the-nhs-constitution-for-england`                                                             | Principles, patient rights, legal entitlements      |
| `england-constitution-handbook` | Handbook to the NHS Constitution                   | `https://www.gov.uk/government/publications/supplements-to-the-nhs-constitution-for-england/handbook-to-the-nhs-constitution-for-england` | Explanations of rights, 18-week standard details    |
| `england-choice-framework`      | NHS Choice Framework / Your choices in the NHS     | `https://www.nhs.uk/using-the-nhs/about-the-nhs/your-choices-in-the-nhs/`                                                                 | Legal right to choose hospital or clinic            |
| `england-rtt-data`              | NHS England Referral to Treatment (RTT) Statistics | `https://www.england.nhs.uk/statistics/statistical-work-areas/rtt-waiting-times/`                                                         | Statistical methodology, definitions, open pathways |

### 4.2 Wales Sources

| ID                      | Resource Title                               | Primary URL                                                                                                      | Topic / Scope                                            |
| ----------------------- | -------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| `wales-rtt-standards`   | NHS Referral to Treatment Times Standards    | `https://www.gov.wales/nhs-referral-treatment-times-standards`                                                   | Welsh Government 26-week / 36-week RTT policies          |
| `wales-statswales-data` | StatsWales NHS Waiting Times                 | `https://statswales.gov.wales/Catalogue/Health-and-Social-Care/NHS-Hospital-Waiting-Times/Referral-to-Treatment` | Official publication, health board pathways              |
| `wales-nhs111-services` | NHS 111 Wales Health Services                | `https://111.wales.nhs.uk/`                                                                                      | Welsh health board services, patient rights              |
| `wales-llais`           | Llais — Your Voice in Health and Social Care | `https://www.llaiswales.org/`                                                                                    | Independent patient advocacy and representation in Wales |

### 4.3 Scotland Sources

| ID                            | Resource Title                                 | Primary URL                                                                                      | Topic / Scope                                                 |
| ----------------------------- | ---------------------------------------------- | ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------- |
| `scotland-patient-rights-act` | Patient Rights (Scotland) Act 2011             | `https://www.legislation.gov.uk/asp/2011/5/contents`                                             | Primary legislation establishing the Treatment Time Guarantee |
| `scotland-nhsinform-ttg`      | NHS inform — Treatment Time Guarantee (TTG)    | `https://www.nhsinform.scot/care-support-and-rights/health-rights/treatment-time-guarantee-ttg/` | Explanations of the 12-week TTG and exceptions                |
| `scotland-gov-guidance`       | Scottish Government NHS Waiting Times Guidance | `https://www.gov.scot/publications/nhs-waiting-times-guidance/`                                  | Outpatient standard and inpatient rules                       |
| `scotland-phs-data`           | Public Health Scotland Waiting Times           | `https://publichealthscotland.scot/publications/nhs-waiting-times-stage-of-treatment/`           | Stage of treatment reports, outpatient and inpatient data     |
| `scotland-pass`               | Patient Advice and Support Service (PASS)      | `https://www.pass-scotland.org.uk/`                                                              | Free, independent patient advice in Scotland                  |

---

## 5. Front Matter Template for Editorial Copy

```yaml
---
kind: about-the-figures # or 'your-rights' or 'specialty'
nation: england # 'england' | 'wales' | 'scotland' (must match directory)
# specialtyId: england:C_110  # required only when kind: specialty
# summary: "Plain English summary under 20 words." # required only when kind: specialty
# keywords: ["keyword1", "keyword2"] # required only when kind: specialty
status: reviewed # 'placeholder' | 'draft' | 'reviewed'
lastReviewed: 2026-10-07 # YYYY-MM-DD (required when status: reviewed)
reviewedBy: product-owner # identifier (required when status: reviewed)
sources:
  - id: england-choice-framework
    title: 'Your choices in the NHS'
    url: 'https://www.nhs.uk/using-the-nhs/about-the-nhs/your-choices-in-the-nhs/'
  - id: england-nhs-constitution
    title: 'The NHS Constitution for England'
    url: 'https://www.gov.uk/government/publications/the-nhs-constitution-for-england'
---
```

---

## 6. Review & Approval Process

Before setting `status: reviewed` on any file:

1. Confirm all referenced URLs are in `sources` and resolve with HTTP 200.
2. Confirm every factual claim in Markdown body uses a reference link matching a source ID: `[chosen provider][england-choice-framework]`.
3. Check text for forbidden terms (no "average", no "expected wait", no "52-week wait", no "breach").
4. Ensure tone is descriptive and never prescriptive/instructive.
5. Set `lastReviewed` to today's date (`YYYY-MM-DD`) and `reviewedBy` to the reviewer username or initials.
