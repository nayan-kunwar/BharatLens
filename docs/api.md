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
| GET    | `/api/v1/events/:id/updates` | Timeline                                                                                                                                                            |
| GET    | `/api/v1/countries`          |                                                                                                                                                                     |
| GET    | `/api/v1/countries/:code`    |                                                                                                                                                                     |
| GET    | `/api/v1/topics`             |                                                                                                                                                                     |
| GET    | `/api/v1/topics/:slug`       |                                                                                                                                                                     |
| GET    | `/api/v1/search`             | `q` (min 2 chars) plus pagination. ILIKE on title/summary until M12 FTS                                                                                             |

Offset pagination: `meta.page`, `meta.limit`, `meta.total`, `meta.pageCount`.
