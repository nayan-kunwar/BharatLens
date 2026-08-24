# ADR-011: Analytics as derived distributions — no averages, no chart library

## Status

Accepted and implemented in M14.

## Context

The roadmap's M14 lists impact/event/country trends, exposure views, and pipeline health. BharatLens's data model stores impact levels as ordinal product assessments (`LOW < MEDIUM < HIGH < CRITICAL`), and the project's discipline (§8, §73, §75) forbids presenting invented precision or unmeasured claims.

Any "analytics" layer therefore had to answer two questions before writing a line of code: what is legitimately computable, and how should ordinal levels be presented?

## Decision

- **Everything is derived at read time** from existing audit/published tables (`impact_assessments`, `impact_category_levels`, `event_topics`, `event_countries`, `ingestion_jobs`, `analysis_runs`). No analytics counters, no new write paths.
- **Distributions and counts, never averages**: the exposure widget shows per-category level counts; the trend shows weekly publication counts with a HIGH+ overlay plus upgrade/downgrade transitions between consecutive versions (PostgreSQL compares the level enum in declaration order). No "average impact score" exists anywhere in the product — averaging ordinals would fabricate a metric with fake precision.
- **One public endpoint** (`GET /api/v1/analytics/overview?days=`) bundling exposure/trend/movers; one guarded admin endpoint (`GET /api/v1/admin/analytics/pipeline`) for ingestion-funnel and analysis-run health (§49 observability).
- **Windows are explicit**: default 90 days, clamped 7–365, so widgets cannot silently sweep unbounded history; movers compare the window against an equal-length preceding window.
- **Charts are hand-rolled CSS bars and a single SVG polyline** (`sparklinePoints` is a tested pure function). No chart library.

## Alternatives

- **Average/weighted impact scores**: rejected — ordinal levels are product assessments, not measurements; a mean implies arithmetic the data does not support.
- **Chart library (recharts/visx)**: bundle weight and styling drift for two polylines and some bars; §70 restraint wins while visuals stay this simple.
- **Precomputed/materialized analytics tables**: unnecessary at current scale; every query is bounded by the window clamp and indexed on published/status columns. Revisit with measurement.
- **Third-party metrics stack for pipeline health**: the admin view reads the same audit tables the logs already populate; a metrics system earns its operational cost only when alerting requirements appear.

## Tradeoffs

- Sparse early data makes trends look empty; widgets render honest empty states instead of decorative axes.
- UTC week boundaries may split local weekends; documented, immaterial at this scale.
- Movers' delta can be noisy for low-volume topics; sorted lists show absolute counts alongside deltas.

## Consequences

- Public `/analytics` page and nav link; admin dashboard gains a pipeline-health section.
- Future curated metrics must follow the same rule: derived from records, labeled when interpretive.
