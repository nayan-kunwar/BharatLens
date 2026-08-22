# BharatLens

> See the world through India's lens.

BharatLens turns global geopolitical events into source-backed explanations of what they mean for India. **India Impact** is a feature inside BharatLens, not a second product name.

This repository is at **M3 — Public Event UI**. PostgreSQL holds the domain; Fastify serves read-only `/api/v1` for published events, and Next.js presents the public event experience.

## What runs in M0

| Service    | Role                                                       | Port                           |
| ---------- | ---------------------------------------------------------- | ------------------------------ |
| `web`      | Next.js public event browser                               | 3000                           |
| `api`      | Fastify public REST + health                               | 3101 (host) → 3001 (container) |
| `worker`   | Idle process (health + Redis/Postgres ping, **no jobs**)   | 3002                           |
| `postgres` | Source of truth                                            | 5433 (host) → 5432 (container) |
| `redis`    | Running for connectivity; **not** used as a cache or queue | 6379                           |

## Start with Docker

```bash
cp .env.example .env
docker compose up -d postgres redis
pnpm db:migrate
pnpm db:seed
docker compose up --build
```

Then:

- Frontend: http://localhost:3000
- API liveness: http://localhost:3101/health
- API readiness (Postgres + Redis): http://localhost:3101/ready
- API events: http://localhost:3101/api/v1/events
- Worker liveness: http://localhost:3002/health

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
pnpm dev:api
pnpm dev:worker
pnpm dev:web
```

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
apps/worker       Idle worker (BullMQ arrives in M9)
apps/web          Next.js
packages/config   Zod-validated environment
packages/database Drizzle schema, migrations, EventCatalog
packages/logging  Pino
packages/shared   API envelope + domain enums/lifecycle
```

## Docs

- [Architecture](docs/architecture.md)
- [API](docs/api.md)
- [Development](docs/development.md)
- [Database](docs/database.md)
- [Decisions](docs/decisions/)
