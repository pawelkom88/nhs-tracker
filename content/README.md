# Editorial Content Guidelines — Know Your Wait

This directory contains all Editorial Content for Know Your Wait, structured by Publishing Nation:

```
content/
  README.md
  england/
    about-the-figures.md
    your-rights.md
    specialties/<specialty-slug>.md
  wales/
    about-the-figures.md
    your-rights.md
    specialties/<specialty-slug>.md
  scotland/
    about-the-figures.md
    your-rights.md
    specialties/<specialty-slug>.md
```

## 1. Content Style & Tone

- **NHS Content Style:** Aim for a reading age of approximately 9 to 11 years (simple words, short sentences, active voice).
- **Describe, never instruct:** Explain Patient Rights, options, and processes objectively (e.g. "Patients in England have the right to...", "You can ask your GP about..."). Never instruct patients on medical choices or prescribe clinical action.
- **Avoid glossary forbidden terms:** Never use prohibited terms in user-facing text (consult `GLOSSARY.md` for the complete list of terms to avoid, including misleading wait duration descriptions and comparative rankings).
- **No NHS branding:** Product is "Know Your Wait". Use "NHS" only descriptively.

## 2. Figures & Claims

- **Never include unsourced figures or predictions:** Editorial content must not make numerical claims (e.g. duration counts, percentages) in prose.
- **Quotes of official standards:** Numerical standards (such as the 18-week RTT target or 12-week Treatment Time Guarantee) may only appear when quoted directly within blockquotes citing official documentation.
- **Never estimate:** Only Official Figures and exact Derived Figures are allowed in the product.

## 3. Sources & Citations

- Every factual claim or rights description must cite an entry in the front matter `sources` list.
- Citations in Markdown use reference links matching the source ID: `[your choice of hospital][nhs-choice]`.
- All source URLs must use `https://` and belong to the allow-listed official domains:
  - `nhs.uk`
  - `england.nhs.uk`
  - `gov.uk`
  - `legislation.gov.uk`
  - `gov.wales`
  - `nhs.wales`
  - `nhs.scot`
  - `nhsinform.scot`
  - `gov.scot`
  - `publichealthscotland.scot`
  - `opendata.nhs.scot`
  - `statswales.gov.wales`
  - `stats.gov.wales`

## 4. Front Matter & Review Lifecycle

Front matter is strictly validated by Zod at build time:

```yaml
---
kind: specialty | about-the-figures | your-rights
nation: england # must match folder name
specialtyId: england:C_110 # specialty files only
summary: 'One plain-English sentence.' # specialty: displayed in specialty lists
keywords: [hip, knee, joint replacement] # specialty: filter keywords
status: placeholder | draft | reviewed
lastReviewed: 2026-10-03 # required when status = reviewed (YYYY-MM-DD)
reviewedBy: product-owner # required when status = reviewed
sources:
  - id: nhs-choice
    title: 'Your choices in the NHS'
    url: https://www.nhs.uk/your-choices/
---
```

### Review Rules:

- **Review frequency:** Reviewed content must be re-checked every 6 months (183 days).
- **Launch gate:** All explainer pages and core specialties must reach `status: reviewed` before production release.
- **Placeholders:** Placeholder files (`status: placeholder`) indicate pending copy and render fallback notices or suppressed descriptions.
