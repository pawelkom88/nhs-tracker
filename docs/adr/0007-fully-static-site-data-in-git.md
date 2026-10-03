# Fully static site; pipeline commits data to the repo

v1 has no per-request server logic (no postcode lookup, no accounts, browser-side filtering) and a few MB of data that changes monthly or quarterly. So a daily scheduled GitHub Actions job checks each nation for a new release, then downloads, validates and normalises it, and commits the result to the repo; the Next.js site is statically exported and deployed to Cloudflare Pages. Data in git gives a free, public audit trail and revision history, fitting the open-source goal; no database, Workers or object storage are needed.

## Consequences

- A release that fails validation is not published; the site keeps its last good data and the pipeline opens an issue.
- The check runs daily rather than monthly because publication dates slip and the check costs nothing on a public repo.
- Anything needing runtime (postcode lookup, trend history API) is a future change requiring a Worker.
