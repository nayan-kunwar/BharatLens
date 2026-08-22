# Architecture

BharatLens is a **modular monolith**: one API process, one idle worker process, one Next.js frontend, PostgreSQL as the source of truth, Redis present but unused for product logic until there is a real need.

```text
Next.js (apps/web)
        │
        ▼
Fastify API (apps/api, host port 3101 in Compose)
        │
        ├── GET /health   liveness (no I/O)
        └── GET /ready    Postgres + Redis ping
        │
        ▼
   PostgreSQL

Worker (apps/worker)
        │
        ├── GET /health   idle liveness
        └── heartbeat     ping Postgres + Redis every 30s
```

There are **no HTTP event routes** yet (M2). Domain tables and `EventCatalog` live in `packages/database`.

## Why an idle worker exists now

Compose should look like production: API and worker are separate processes. The worker proves it can start, log, and reach Redis and PostgreSQL. It does **not** enqueue or process jobs. BullMQ processors are M9.

## Why Redis exists now

Redis is required later for rate limiting and BullMQ. M0 only checks connectivity on `/ready`. If Redis is down, public liveness (`/health`) still returns 200; readiness returns 503. Product reads in later milestones should still be served from PostgreSQL if Redis is down.

## Failure modes (M0)

| Failure       | Effect                                                   |
| ------------- | -------------------------------------------------------- |
| Postgres down | `/ready` is 503; `/health` still 200                     |
| Redis down    | same                                                     |
| Worker crash  | API and web still run                                    |
| API crash     | Web homepage still renders; API status shows unreachable |

## Next

M2 adds public REST for events, claims, impact, and updates.
