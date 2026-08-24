# BharatLens

> See the world through India's lens.

BharatLens turns global geopolitical events into source-backed explanations of what they mean for India. **India Impact** is a feature inside BharatLens, not a second product name.

This repository is at **M14 — Analytics**. `/analytics` derives category exposure, publication trends, and topic/country movers from published records; the admin console shows pipeline health. Levels appear only as counts and distributions — never averaged scores. The `/map` page shows an India-centered globe whose shading derives from published events (shared-event counts); clicking a partner lists their shared published events. The worker ingests RSS feeds on a schedule, refreshes claims, auto-groups unmatched coverage into CANDIDATE events (deterministic, reviewed before publication), and runs schema-validated LLM analysis on demand. Operators review everything in `/admin`; public search is PostgreSQL full-text with relevance ranking.

## What runs

| Service    | Role                                                      | Port                           |
| ---------- | --------------------------------------------------------- | ------------------------------ |
| `web`      | Next.js public site + admin console (`/admin`)            | 3000                           |
| `api`      | Fastify REST + health + guarded admin API                 | 3101 (host) → 3001 (container) |
| `worker`   | BullMQ processors: scheduled RSS ingest, claims, analysis | 3002                           |
| `postgres` | Source of truth                                           | 5433 (host) → 5432 (container) |
| `redis`    | BullMQ queues (`ingest`, `claims`, `analysis`)            | 6379                           |

## Start with Docker

```bash
cp .env.example .env
docker compose up -d postgres redis
pnpm db:migrate
pnpm db:seed
pnpm ingest:rss
docker compose up --build
```

Then:

- Frontend: http://localhost:3000
- API liveness: http://localhost:3101/health
- API readiness (Postgres + Redis): http://localhost:3101/ready
- API events: http://localhost:3101/api/v1/events
- Worker liveness: http://localhost:3002/health
- Worker readiness + queue depth: http://localhost:3002/ready, http://localhost:3002/queues

Compose publishes the API on host port **3101** because **3001** is commonly used by other local Node apps. Postgres is on host **5433** for the same reason. Inside the Docker network the API still listens on 3001 and Postgres on 5432.

## Local development (without Compose for Node apps)

You still need PostgreSQL and Redis. Compose can run only infra:

```bash
docker compose up postgres redis
cp .env.example .env
pnpm install
pnpm --filter @bharatlens/shared build
pnpm --filter @bharatlens/config build
pnpm --filter @bharatlens/logging build
pnpm --filter @bharatlens/database build
pnpm db:migrate
pnpm db:seed
pnpm dev:worker
```

The worker polls RSS feeds every `INGEST_POLL_MINUTES` minutes (default 30), chains claims refresh after new articles, and processes enqueued analysis. To trigger work manually instead of waiting for the schedule:

```bash
pnpm queue ingest --feed=bbc-world
pnpm queue claims --event=strait-of-hormuz-shipping-disruption
pnpm queue analyze --event=strait-of-hormuz-shipping-disruption            # skipped if a draft already exists today
pnpm queue analyze --event=strait-of-hormuz-shipping-disruption --force    # always runs
pnpm dev:api                                                               # requires ADMIN_PASSWORD in .env
pnpm dev:web
```

Review workflow: sign in at http://localhost:3000/admin/login with `ADMIN_PASSWORD`,
then approve claims, edit draft assessments, and publish from `/admin/events`.

Requires Node.js 22+ and [pnpm](https://pnpm.io).

## Checks

```bash
pnpm test
pnpm typecheck
pnpm lint
pnpm format:check
pnpm db:migrate
```

## Repository layout

```text
apps/api          Fastify HTTP API
apps/worker       BullMQ worker (ingest / claims / analysis processors)
apps/web          Next.js
packages/config   Zod-validated environment
packages/database Drizzle schema, migrations, EventCatalog
packages/jobs     Queue names, payload schemas, job ids, enqueue helpers, queue CLI
packages/logging  Pino
packages/ingestion RSS adapter + dedupe + claims extraction
packages/ai         Structured analysis pipeline (Zod, analysis_runs)
packages/shared     API envelope + domain enums/lifecycle
```

## Docs

- [Architecture](docs/architecture.md)
- [API](docs/api.md)
- [Development](docs/development.md)
- [Database](docs/database.md)
- [Ingestion](docs/ingestion.md)
- [Evidence](docs/evidence.md)
- [AI pipeline](docs/ai-pipeline.md)
- [Decisions](docs/decisions/)
