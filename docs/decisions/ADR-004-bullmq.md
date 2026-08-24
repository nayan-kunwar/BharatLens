# ADR-004: BullMQ for background processing (implemented in M9)

## Status

Accepted and implemented (M9). Supersedes the earlier "defer until M9" record; the deferral rationale is preserved below because it still explains why M0–M8 ran without queues.

## Context

Ingest and LLM work must not block public HTTP or depend on an operator remembering to run CLIs. Queues solve scheduling, retries, and observability. Introducing BullMQ before there are jobs creates unused `Queue` classes, so it was deferred until the jobs actually existed.

By the end of M8 three real units of background work existed: feed ingestion (`ingestFeed`), claims extraction (`extractClaimsForEvent`), and event analysis (`analyzeEvent`). All were reachable only through manual CLI runs.

## Decision

Introduce BullMQ in M9 with:

- **Three queues**: `ingest`, `claims`, `analysis` under the Redis key prefix `bharatlens`.
- **A new `packages/jobs` package** owning queue names, Zod payload schemas, job-id builders, and enqueue helpers. Producers (worker scheduler + `pnpm queue` CLI) and consumers (worker processors) share these definitions so payloads cannot drift.
- **A repeatable scheduler tick** on the ingest queue (every `INGEST_POLL_MINUTES`, `0` disables). The tick fans out one ingest job per configured feed. The schedule lives in Redis and survives restarts; re-registering is an upsert.
- **Retry policy**: 5 attempts with exponential backoff starting at 5 s. Completions are retained 24 h, failures 7 days, bounding Redis memory while keeping recent history inspectable.
- **Per-job idempotency policy** (see below).
- **Lock durations sized to the work**: analysis locks live 120 s because the HTTP model call may run ~45 s — a default 30 s lock would let a stalled check double-run a job mid-LLM-call.

### Job id semantics

| Job      | Job id                              | Why                                                                                  |
| -------- | ----------------------------------- | ------------------------------------------------------------------------------------ |
| ingest   | unique per request                  | freshness matters more than suppression; article-level dedupe makes repeats harmless |
| claims   | unique per request                  | unique `(event, statement)` and `(claim, url)` constraints make repeats harmless     |
| analysis | deterministic per event per UTC day | prevents duplicate LLM spend; `force` bypasses with a nonced id                      |

Analysis additionally has a **second guard in the processor**: if a DRAFT assessment already exists for the same prompt version, the job completes as `SKIPPED`. Enqueue-level dedupe and processor-level state checks protect against different failure modes (duplicate adds vs. retained-but-failed jobs).

### Chaining

After a successful ingest that inserted new articles, the processor enqueues claims-refresh jobs for every non-archived event. Claims extraction is deterministic and free. **LLM analysis is never chained automatically** — cost control requires it to stay an explicit operator or (later, M10) admin decision.

## Alternatives

- BullMQ in M0 — ceremony, nothing to enqueue.
- Kafka now — operationally heavier, no replay/consumer-group requirement.
- Keep CLI-only execution — no retries, no scheduling, no failure observability; does not scale past a demo.
- cron + direct function calls — loses visibility (queue depth, per-job attempts) and distributed safety once more than one worker runs.

## Tradeoffs

- Redis becomes load-bearing for ingestion/analysis. Public reads remain PostgreSQL-only and keep working when Redis is down; background work pauses instead.
- Retained job ids suppress same-day duplicate _enqueues_ of analysis; operators must pass `--force` to intentionally re-run the same day.
- Return values are kept small; large outputs belong in PostgreSQL (`analysis_runs.output`), not Redis.

## Consequences

- The idle M0 worker is replaced by a processing worker with `/health`, `/ready` (Postgres + Redis), and `GET /queues` (per-queue depth).
- CLIs split roles: `pnpm ingest:rss | claims:extract | analyze:event` still run logic directly (useful for tests/local), while `pnpm queue <ingest|claims|analyze>` enqueues without executing.
- Failed jobs are logged with `jobType`, `jobId`, and attempt count; nothing fails silently.
