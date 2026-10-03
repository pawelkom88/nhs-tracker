# One record shape, nation-namespaced values; no shared categories

Every figure is keyed by Publishing Nation × Reporting Unit × Specialty × Wait Stage × Statistic × Reporting Period, with value, unit as published, status, source and Publication Date. All three nations share this shape, but every Specialty, Reporting Unit, Wait Stage and Statistic value is namespaced by its nation, and there is no shared cross-nation category (no common "orthopaedics" ID). We rejected shared mapped categories because they would encode the false equivalences the product must never present; with namespacing, a cross-nation ranking cannot even be expressed in the data.

## Consequences

- Reporting Units use official organisation codes (NHS ODS codes, Scottish board codes); a merger yields a new code, so Year-Earlier Comparison is naturally skipped.
- Values keep their published unit (Scotland medians are in days); conversion to weeks happens only for display, alongside the original.
- Display logic is written per nation; some duplication is accepted.
