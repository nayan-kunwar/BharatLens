# Development

## Prerequisites

- Node.js 22+
- pnpm 10 (via Corepack: `corepack enable`)
- Docker Desktop (or equivalent) for Compose

## Environment

Copy `.env.example` to `.env`. Configuration is parsed once at process start in `@bharatlens/config` with Zod. Missing `DATABASE_URL` or `REDIS_URL` crashes the process on boot (fail fast).

Do not read `process.env` in route handlers.

Variables actually used:

```text
NODE_ENV
LOG_LEVEL
API_HOST
API_PORT
WORKER_HEALTH_PORT
WEB_ORIGIN
DATABASE_URL
REDIS_URL
INGEST_POLL_MINUTES   (worker; minutes between scheduled RSS polls, 0 = off)
ADMIN_PASSWORD        (api only; required — the API refuses to boot without it)
ADMIN_SESSION_TTL_HOURS
ADMIN_COOKIE_SECURE   (true ONLY behind HTTPS in real deployments)
API_BASE_URL          (web; default http://localhost:3001, Compose uses http://api:3001)
```

`LLM_API_KEY` is optional. Without it the worker's analysis jobs (and `pnpm analyze:event`) use a deterministic stub whose output is still schema-validated and never published. `NEWS_API_KEY` is not defined yet.

## Scripts

From the repository root:

| Command                                       | Purpose                                                                   |
| --------------------------------------------- | ------------------------------------------------------------------------- |
| `pnpm db:migrate`                             | Apply Drizzle SQL migrations                                              |
| `pnpm db:seed`                                | Hand-authored published events                                            |
| `pnpm ingest:rss`                             | Pull RSS metadata into articles (direct run)                              |
| `pnpm claims:extract`                         | Attach article evidence; PENDING claims (direct run)                      |
| `pnpm analyze:event`                          | Draft India Impact + `analysis_runs` (direct run)                         |
| `pnpm queue ingest --feed=<slug>`             | Enqueue feed ingestion for the worker                                     |
| `pnpm queue claims --event=<slug>`            | Enqueue claims refresh for the worker                                     |
| `pnpm queue analyze --event=<slug> [--force]` | Enqueue LLM analysis (`--force` bypasses same-day dedupe and draft guard) |
| `pnpm test`                                   | Unit tests (Vitest)                                                       |
| `pnpm typecheck`                              | `tsc --noEmit` in each package                                            |
| `pnpm lint`                                   | ESLint                                                                    |
| `pnpm format`                                 | Prettier                                                                  |

The direct-run CLIs execute immediately in-process. The `queue` commands only enqueue — start the worker first (`pnpm dev:worker`). See `ADR-004-bullmq.md` for job semantics.

## Worker

```sh
pnpm dev:worker
```

- Registers three BullMQ queues: `ingest`, `claims`, `analysis` (Redis prefix `bharatlens`).
- Schedules RSS polling every `INGEST_POLL_MINUTES` minutes (`0` disables scheduling).
- Retries failed jobs 5× with exponential backoff from 5 s.
- Endpoints on `WORKER_HEALTH_PORT`: `/health`, `/ready`, `/queues`.

## Health endpoints

- `GET /health` — process is up. Does not touch Postgres or Redis.
- `GET /ready` — `SELECT 1` and Redis `PING`. Use this for Compose/orchestration.
- `GET /queues` (worker only) — per-queue depth for observability.

With Docker Compose, call the API at `http://localhost:3101` (container port 3001). The worker is at `http://localhost:3002`.

Responses use the envelope `{ success, data, meta }` / `{ success, error }`.

## Logging

Pino JSON logs in production. Pretty printing only when `NODE_ENV=development`. Secrets in known fields are redacted.

## What not to add yet

- Elasticsearch, Kafka, extra services in Compose

See `docs/ops-local.md` for local backup, restore, and secrets rules.

Integration tests that touch Redis use a dedicated `bharatlens-test` queue prefix so they never consume jobs from a running worker. Test fixtures across packages are namespaced under `fixture-` slugs so one suite's cleanup can never delete another suite's rows.
