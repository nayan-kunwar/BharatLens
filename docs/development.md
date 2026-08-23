# Development

## Prerequisites

- Node.js 22+
- pnpm 10 (via Corepack: `corepack enable`)
- Docker Desktop (or equivalent) for Compose

## Environment

Copy `.env.example` to `.env`. Configuration is parsed once at process start in `@bharatlens/config` with Zod. Missing `DATABASE_URL` or `REDIS_URL` crashes the process on boot (fail fast).

Do not read `process.env` in route handlers.

Variables actually used in M0:

```text
NODE_ENV
LOG_LEVEL
API_HOST
API_PORT
WORKER_HEALTH_PORT
WEB_ORIGIN
DATABASE_URL
REDIS_URL
API_BASE_URL   (web; default http://localhost:3001, Compose uses http://api:3001)
```

`LLM_API_KEY` is optional and used only by `pnpm analyze:event`. The API and worker do not read it. `NEWS_API_KEY` is not defined yet.

## Scripts

From the repository root:

| Command               | Purpose                                              |
| --------------------- | ---------------------------------------------------- |
| `pnpm db:migrate`     | Apply Drizzle SQL migrations                         |
| `pnpm db:seed`        | Hand-authored published events                       |
| `pnpm ingest:rss`     | Pull RSS metadata into articles                      |
| `pnpm claims:extract` | Attach article evidence; PENDING claims              |
| `pnpm analyze:event`  | Draft India Impact + `analysis_runs` (not published) |
| `pnpm test`           | Unit tests (Vitest)                                  |
| `pnpm typecheck`      | `tsc --noEmit` in each package                       |
| `pnpm lint`           | ESLint                                               |
| `pnpm format`         | Prettier                                             |

API and worker run TypeScript directly in development via `tsx`.

## Health endpoints

- `GET /health` — process is up. Does not touch Postgres or Redis.
- `GET /ready` — `SELECT 1` and Redis `PING`. Use this for Compose/orchestration.

With Docker Compose, call the API at `http://localhost:3101` (container port 3001). The worker is at `http://localhost:3002`.

Responses use the envelope `{ success, data, meta }` / `{ success, error }`.

## Logging

Pino JSON logs in production. Pretty printing only when `NODE_ENV=development`. Secrets in known fields are redacted.

## What not to add yet

- BullMQ queues or processors
- Admin write APIs (M10)
- AI evaluation harnesses (M15)
- Elasticsearch, Kafka, extra services in Compose
