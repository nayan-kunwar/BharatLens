# Database (M0)

PostgreSQL 16 is the source of truth.

Drizzle ORM is wired in `packages/database`:

- `createDatabase(url)` — `postgres.js` pool + Drizzle
- `pingDatabase(sql)` — `SELECT 1`
- `src/schema.ts` — empty on purpose

There are **no domain migrations** in M0. Drizzle Kit config (`drizzle.config.ts`) exists so M1 migrations use the same path.

## What M1 will add

See `AGENTS.md`: `events` (candidates via `status`), `articles`, `claims`, `evidence`, versioned `impact_assessments`, unique `(event_id, version)`, `events.current_impact_assessment_id`.

No `india_impacts` 1:1 table. No separate `candidate_events` table.

## Indexes

None yet. Indexes will be added with the tables they serve, each with a written reason.
