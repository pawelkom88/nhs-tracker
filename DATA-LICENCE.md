# Data Licences and Attribution

Know Your Wait republishes public sector healthcare statistics under the [Open Government Licence v3.0](https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/).

The `data/` directory contains **Official Figures** republished from government sources and **Derived Figures** calculated by Know Your Wait.

---

## Publishing Nation Attributions

### England

- **Publisher**: NHS England
- **Dataset**: Consultant-led Referral to Treatment Waiting Times
- **Source URL**: https://www.england.nhs.uk/statistics/statistical-work-areas/rtt-waiting-times/
- **Licence**: Open Government Licence v3.0
- **Attribution Statement**:
  > Contains public sector information licensed under the Open Government Licence v3.0. Source: NHS England, Consultant-led Referral to Treatment Waiting Times.

### Wales

- **Publisher**: Welsh Government / StatsWales (data provider: Digital Health and Care Wales)
- **Dataset**: NHS activity and performance summary / Performance and waiting times
- **Source URL**: https://stats.gov.wales
- **Licence**: Open Government Licence v3.0
- **Attribution Statement**:
  > Source: Welsh Government, StatsWales (data provider: Digital Health and Care Wales). Contains public sector information licensed under the Open Government Licence v3.0.

### Scotland

- **Publisher**: Public Health Scotland
- **Dataset**: Stage of Treatment Waiting Times
- **Source URL**: https://www.opendata.nhs.scot/dataset/stage-of-treatment-waiting-times
- **Licence**: Open Government Licence v3.0 (`uk-ogl`)
- **Attribution Statement**:
  > Source: Public Health Scotland, Stage of Treatment Waiting Times (opendata.nhs.scot). Contains public sector information licensed under the Open Government Licence v3.0.

---

## Reference Data

### NHS Organisation Data Service (ODS)

- **Publisher**: NHS England
- **Dataset**: Organisation Data Service (ODS) Reference Data
- **Source URL**: https://digital.nhs.uk/services/organisation-data-service
- **Licence**: Open Government Licence v3.0
- **Attribution Statement**:
  > Contains information from NHS England, licenced under the current version of the Open Government Licence.

---

## Derived Figures

In accordance with [ADR-0005](docs/adr/0005-exact-sums-only-no-estimates.md), all **Derived Figures** produced by Know Your Wait are exact mathematical sums of Official Figures published within the very same release (such as summing published wait duration bands).

Know Your Wait:

- Never estimates, interpolates, or models missing values.
- Never calculates cross-nation comparisons or combined figures.
- Omits Derived Figures entirely if any component input is suppressed or missing.

---

## Disclaimer and Independence

Know Your Wait is an independent open-source project. In accordance with [ADR-0004](docs/adr/0004-name-without-nhs.md), Know Your Wait is not affiliated with, maintained by, or endorsed by NHS England, NHS Wales, NHS Scotland, the Department of Health and Social Care, the Welsh Government, the Scottish Government, or any health board, trust, or healthcare provider.
