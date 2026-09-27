# Local Ops

Local-only operations for BharatLens. No production assumptions: no TLS,
no reverse proxy, no managed database. When a production target is chosen,
add a separate `docker-compose.prod.yml` instead of editing this flow.

## Services

`docker-compose.yml` runs five services: `postgres` (host `5433→5432`),
`redis` (`6379`), `api` (host `3101→3001`), `worker` (`3002`), `web`
(`3000`). All services use `restart: unless-stopped` so a laptop reboot
does not silently leave Postgres or Redis down.

## Health checks

- `GET http://localhost:3101/health` — API process is up (no DB touch).
- `GET http://localhost:3101/ready` — API + `SELECT 1` on Postgres + Redis `PING`. Use this to decide if the stack is usable.
- `GET http://localhost:3002/health` — worker process is up.
- `GET http://localhost:3002/ready` — worker + Postgres + Redis.
- `GET http://localhost:3002/queues` — per-queue depth (`ingest`, `claims`, `analysis`).

## Secrets (local rules)

- `.env` is local-only and gitignored. Never commit it; never copy it to a
  future production host — create fresh values there.
- `ADMIN_PASSWORD` (min 8 chars) is required: the API refuses to boot
  without it. Rotate by changing `.env` and recreating the `api` container.
  Rotation invalidates all admin sessions (single shared secret by design).
- `ADMIN_COOKIE_SECURE` stays `false` for local http. Set `true` only behind
  HTTPS in a real deployment.
- `LLM_API_KEY` is optional. Unset = deterministic stub analysis (still
  schema-validated, never auto-published). Setting it only affects future
  analysis runs, not stored history.
- Logs redact `DATABASE_URL`, `REDIS_URL`, passwords, tokens, and cookies
  (`packages/logging`). Do not `echo` secrets into shared terminals.

## Backup (Postgres only)

Everything durable lives in the `postgres_data` volume. Redis holds only
transient BullMQ jobs — no backup needed. `pnpm db:seed` loads fixtures;
it is **not** a backup and must never be treated as one.

Back up before risky operations (volume prune, migration edits, bulk admin
actions):

```sh
docker compose exec -t postgres pg_dump -U bharatlens -d bharatlens > backup-YYYY-MM-DD.sql
```

Restore into a running stack:

```sh
docker compose exec -T postgres psql -U bharatlens -d bharatlens < backup-YYYY-MM-DD.sql
```

Verify after restore:

```sh
pnpm db:migrate
curl http://localhost:3101/ready
curl http://localhost:3101/api/v1/events?limit=1
```

## Fresh start vs restore

- Fixtures only: `docker compose down -v && docker compose up -d postgres redis && pnpm db:migrate && pnpm db:seed`.
- Real data back: use the restore command above, then `pnpm db:migrate`
  (migrations are additive; a restore never replaces them).
