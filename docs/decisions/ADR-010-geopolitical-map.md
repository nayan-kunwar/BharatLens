# ADR-010: Geopolitical map — d3-geo direct, derived evidence only

## Status

Accepted and implemented in M13.

## Context

AGENTS.md §60 calls for an India-centered world map where clicking a country shows the India↔Country relationship: recent events, trade/energy/defence/diplomacy dimensions, strategic relevance.

Two constraints shaped the design:

1. **§8 / §20 discipline** — never fabricate statistics; relationships are multidimensional, not friend/enemy. BharatLens currently holds exactly one honest relationship signal: co-occurrence in published events.
2. **§70 dependency restraint**, plus React 19 on the frontend — popular map wrappers (react-simple-maps) target older React peers and add a fragile layer over what is, fundamentally, SVG path generation.

## Decision

- **Rendering**: `d3-geo` + `topojson-client` used directly inside a `'use client'` island, with Natural Earth data from the `world-atlas` npm package (countries-110m, ~100 KB gzipped, imported dynamically so only /map downloads it). Orthographic projection rotated to ~78°E/22°N so India sits at the center.
- **Relationship content is derived-only**: a SQL aggregation over `event_countries × events(PUBLISHED|UPDATED)` produces `{code, name, eventCount, lastSharedAt}` per partner. Choropleth intensity uses plain explainable count buckets (1–2 / 3–5 / 6–11 / 12+). The panel lists recent shared events with links — every claim a user sees is backed by a published record they can open.
- **No curated dimension tables**: trade/energy/defence prose would be editorial ANALYSIS requiring ongoing maintenance and clear labeling; nothing in the product today keeps such assessments honest at scale. Deferred until an editorial process exists to own it.

## Alternatives

- **react-simple-maps**: fastest to ship, but peer-dep friction with React 19, less projection control, and one more abstraction that hides the (teachable) projection/path pipeline.
- **Leaflet/MapLibre slippy maps**: built for zoomable tile maps; wrong tool for a fixed single-globe choropleth.
- **Curated relationship seed/table**: richer panels now, stale-opinion risk later; rejected for v1.
- **Equirectangular projection**: preserves familiar shapes but distorts high latitudes badly; orthographic's globe presentation matches the "India-centered" framing even though far partners sit near the limb (marker dots + panel list mitigate).

## Tradeoffs

- Country click resolution requires an ISO numeric→alpha-2 mapping kept alongside the atlas asset; it is small, static, and documented.
- Orthographic hides the back hemisphere — acceptable because the panel list works without map interaction.
- Derived counts measure _coverage overlap_, not relationship depth; UI copy states this explicitly ("derived evidence… not opinions about relationships").

## Consequences

- New public endpoint `GET /api/v1/map/overview`; new `/map` page with nav link.
- Adding curated context later means a labeled overlay table + admin CRUD — an additive change that does not disturb the derived core.

## Addendum: full-boundary India overlay

Natural Earth draws the de facto Line of Control, so the atlas India polygon
renders a clipped north. Because this product shows the world through India's
lens, `/map` overrides exactly one country: atlas feature `356` is skipped
and a simplified DataMeet composite (`Country/india-composite.geojson`,
retrieved October 2026, [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/))
is projected and drawn last so it covers the atlas Pakistan/China slivers.
Attribution ("India boundary © DataMeet community, CC BY 4.0") lives in this
file and the code comment in `world-map.tsx`. All other countries still come
from the atlas; clicks on Kashmir resolve to `IN` like the rest of India.
`india-boundary.test.ts` pins the choice (Kashmir probes inside, neighbours
outside, islands present). Replacing the whole atlas was rejected: 200-country
churn for a one-country problem.
