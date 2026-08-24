# Public API

Base path: `/api/v1`

Envelope:

```json
{ "success": true, "data": {}, "meta": {} }
```

```json
{ "success": false, "error": { "code": "EVENT_NOT_FOUND", "message": "Event not found" } }
```

Every response includes `x-request-id`.

## Public visibility

List, detail, search, and nested event resources only return events in `PUBLISHED` or `UPDATED`. Candidates and drafts are not leaked (404).

Claims on the public API are `APPROVED` only.

## Endpoints

| Method | Path                         | Notes                                                                                                                                                               |
| ------ | ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| GET    | `/health`                    | Liveness                                                                                                                                                            |
| GET    | `/ready`                     | Postgres + Redis                                                                                                                                                    |
| GET    | `/api/v1/events`             | Query: `page`, `limit` (max 100), `country` (ISO-2), `topic` (slug), `importance`, `sort` (`occurredAt` \| `publishedAt` \| `updatedAt`), `order` (`asc` \| `desc`) |
| GET    | `/api/v1/events/:slug`       | Detail                                                                                                                                                              |
| GET    | `/api/v1/events/:id/sources` | `:id` is event UUID                                                                                                                                                 |
| GET    | `/api/v1/events/:id/claims`  | Includes evidence; FACT vs ANALYSIS vs SCENARIO vs UNKNOWN                                                                                                          |
| GET    | `/api/v1/events/:id/impact`  | Current published assessment and **published** version history (full snapshots: reasoning, evidence vs analysis fields, categories). Draft assessments are omitted. |
| GET    | `/api/v1/events/:id/chain`   | Published impact-chain snapshots `{current, history}` with nodes and edges (M11). Drafts are omitted.                                                               |
| GET    | `/api/v1/events/:id/updates` | Timeline                                                                                                                                                            |
| GET    | `/api/v1/countries`          |                                                                                                                                                                     |
| GET    | `/api/v1/countries/:code`    |                                                                                                                                                                     |
| GET    | `/api/v1/topics`             |                                                                                                                                                                     |
| GET    | `/api/v1/topics/:slug`       |                                                                                                                                                                     |
| GET    | `/api/v1/search`             | `q` (min 2 chars), `sort=relevance` by default — PostgreSQL FTS (`websearch_to_tsquery` + `ts_rank`) with ILIKE fallback for partial words (M12)                    |
| GET    | `/api/v1/map/overview`       | India-centered partners derived from published events: `{code, name, eventCount, lastSharedAt}` ordered by count desc (M13)                                         |
| GET    | `/api/v1/analytics/overview` | `days` clamped 7–365 (default 90). Bundled derived analytics: category exposure, weekly impact trend + transitions, topic/country movers (M14)                      |

Offset pagination: `meta.page`, `meta.limit`, `meta.total`, `meta.pageCount`.

# Admin API (M10)

Base path: `/api/v1/admin`. Authenticated with the HMAC-signed session cookie from
`POST /auth/login` (see `ADR-007-admin-auth.md`). Errors use the same envelope with
`UNAUTHORIZED` / `INVALID_CREDENTIALS` / `FORBIDDEN`.

## Auth

| Method | Path           | Notes                                                                 |
| ------ | -------------- | --------------------------------------------------------------------- |
| POST   | `/auth/login`  | `{ password }`. Rate limited to 10/min. Sets httpOnly session cookie. |
| POST   | `/auth/logout` | Clears the cookie.                                                    |

## Review workflow

| Method | Path                        | Notes                                                                                                                  |
| ------ | --------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| GET    | `/overview`                 | Per-status event counts, recent analysis runs, queue depth                                                             |
| GET    | `/events`                   | Query: `status`, `q`, pagination. Meta includes `countsByStatus`                                                       |
| GET    | `/events/:slug`             | Full detail incl. PENDING/REJECTED claims, DRAFT assessments, analysis runs                                            |
| POST   | `/events`                   | `{ title, slug?, summary?, description?, importance?, occurredAt?, countryCodes[], topicSlugs[] }`. Creates CANDIDATE. |
| PATCH  | `/events/:id`               | Edit title/summary/description/importance/eventType                                                                    |
| POST   | `/claims/:id/review`        | `{ status: APPROVED \| REJECTED }` — controls public visibility                                                        |
| PUT    | `/assessments/:id`          | Edit DRAFT only: overallLevel, reasoning, analysisConfidence, categories (replaces category rows)                      |
| POST   | `/assessments/:id/publish`  | Transaction: DRAFT → PUBLISHED, event walks lifecycle to public state, `current_impact_assessment_id` swap             |
| POST   | `/analysis-runs/:id/review` | Stamps `reviewedBy`/`reviewedAt` on a run                                                                              |
| PUT    | `/chains/:id`               | Replace a DRAFT chain's graph: `nodes[] of {key, kind, label, description?, category?}`, `edges[] of {from, to}`       |
| POST   | `/chains/:id/publish`       | Freeze the draft version and move `events.current_impact_chain_id`                                                     |
| POST   | `/events/:id/analyze`       | Enqueues an analysis job on the worker (no LLM call on the API path)                                                   |
| POST   | `/feeds/:slug/ingest`       | Enqueues an ingest job for a configured feed                                                                           |

Publishing refuses assessments without categories and rejects re-publishing
already-published versions; history is immutable and corrections create new versions.
