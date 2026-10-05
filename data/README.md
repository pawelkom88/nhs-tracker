# Know Your Wait — Data Directory

This directory contains committed, normalised data for England, Wales, and Scotland.

> [!IMPORTANT]
> **Pipeline-written only.** Never edit files in this directory manually. All files are generated and updated deterministically by the automated data pipeline (`@kyw/pipeline`).

## Layout

```text
data/
  README.md                         # Documentation of the data directory (this file)
  england/
    reference.json                  # ReferenceData<'england'> (providers, hospital sites, regions, specialties)
    releases/YYYY-MM-DD.json        # ReleaseFile<'england'> (one normalised release per Reporting Period)
    published.json                  # PublishedNation<'england'> (aggregated payload for static site generation)
    state.json                      # Ingestion tracker (last check timestamp, observed source file SHA-256 hashes)
  wales/
    reference.json                  # ReferenceData<'wales'>
    releases/YYYY-MM-DD.json        # ReleaseFile<'wales'>
    published.json                  # PublishedNation<'wales'>
    state.json
  scotland/
    reference.json                  # ReferenceData<'scotland'>
    releases/YYYY-MM-DD.json        # ReleaseFile<'scotland'>
    published.json                  # PublishedNation<'scotland'>
    state.json
```

## File Definitions

- **`reference.json`**: Static structural reference data for the nation. Includes official reporting units (health boards, trusts, independent sector providers), physical hospital sites, NHS regions (England only), official specialties with permanent URL slugs, and predecessor/successor relationships for year-earlier continuity.
- **`releases/<reportingPeriod>.json`**: Normalised figures for a specific monthly or quarterly Reporting Period snapshot. Stored in compact JSON format with recursively sorted keys for minimal, deterministic git diffs ([ADR-0007](../docs/adr/0007-fully-static-site-data-in-git.md)).
- **`published.json`**: Current publication bundle consumed by the Next.js static site generator during build.
- **`state.json`**: Ingestion checkpoint recorded by pipeline runs to track seen source URLs, SHA-256 fingerprints, and scheduled run history.

## Licences & Attribution

All statistical data contained in this directory originates from official government and NHS publication releases:
- NHS England / Department of Health and Social Care
- Welsh Government / StatsWales
- Public Health Scotland / NHS National Services Scotland

All upstream data is licensed under the **Open Government Licence v3.0 (OGL-3.0)**. See [`../DATA-LICENCE.md`](../DATA-LICENCE.md) for full licensing details and attribution terms.
