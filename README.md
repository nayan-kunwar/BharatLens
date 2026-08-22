# BharatLens

> See the world through India's lens.

BharatLens turns global geopolitical events into source-backed explanations of what they mean for India. **India Impact** is a feature inside BharatLens, not a second product name.

This repository is at **M0 — Foundation**. There are no events, claims, or AI pipelines yet.

## What runs in M0

| Service    | Role                                                       | Port |
| ---------- | ---------------------------------------------------------- | ---- |
| `web`      | Next.js homepage                                           | 3000 |
| `api`      | Fastify liveness + readiness                               | 3101 (host) → 3001 (container) |
| `worker`   | Idle process (health + Redis/Postgres ping, **no jobs**)   | 3002 |
| `postgres` | Source of truth (empty of domain tables)                   | 5432 |
| `redis`    | Running for connectivity; **not** used as a cache or queue | 6379 |

## Start with Docker

```bash
cp .env.example .env
docker compose up --build
```

Then:

- Frontend: http://localhost:3000
- API liveness: http://localhost:3101/health
- API readiness (Postgres + Redis): http://localhost:3101/ready
- Worker liveness: http://localhost:3002/health

Compose publishes the API on host port **3101** because **3001** is commonly used by other local Node apps. Inside the Docker network the API still listens on 3001. Local `pnpm dev:api` still uses 3001 from `.env.example`.

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
```

## Repository layout

```text
apps/api          Fastify HTTP API
apps/worker       Idle worker (BullMQ arrives in M9)
apps/web          Next.js
packages/config   Zod-validated environment
packages/database Drizzle client (domain schema in M1)
packages/logging  Pino
packages/shared   API envelope types
```

## Docs

- [Architecture](docs/architecture.md)
- [Development](docs/development.md)
- [Database](docs/database.md)
- [Decisions](docs/decisions/)
