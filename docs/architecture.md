# Architecture

BharatLens is a **modular monolith**: one API process, one idle worker process, one Next.js frontend, PostgreSQL as the source of truth, Redis present but unused for product logic until there is a real need.

```text
Next.js (apps/web)
        │
        ▼
Fastify API (apps/api, host port 3101 in Compose)
        │
        ├── GET /health
        ├── GET /ready
        └── GET /api/v1/*  public events, countries, topics, search
        │
        ▼
   PostgreSQL

Worker (apps/worker)
        │
        ├── GET /health   idle liveness
        └── heartbeat     ping Postgres + Redis every 30s
```

There are **no write/admin routes** yet (M10). Public GETs are implemented and consumed by the Next.js M3 interface.

## M3 public interface

The web application uses server-rendered, no-cache reads to the existing public API. It does not query PostgreSQL directly and it does not invent fallback event data when the API is unavailable.

```text
Next.js routes
    |
    +-- /, /events, /events/:slug
    +-- /countries, /countries/:code
    +-- /topics, /topics/:slug
    +-- /search
    +-- /about
    |
    v
Fastify public GET endpoints
    |
    v
PostgreSQL
```

Event detail pages render the M2 detail, claims, sources, updates, and impact endpoints together. The UI labels evidence strength separately from the analysis-confidence estimate so readers do not mistake an interpretation for a measured fact.

The homepage splits High India Impact from recently updated events, and lists topics and countries linked to published records. Event cards show Energy / Trade / Security when those category levels exist on the current assessment.

Hand-authored published examples are loaded with `pnpm db:seed` so the public UI is not empty. Seed claims are labeled ANALYSIS / SCENARIO / UNKNOWN and do not invent news article URLs.

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

## M4 timeline and impact history

Event updates (`GET /api/v1/events/:id/updates`) and published impact assessments (`GET /api/v1/events/:id/impact`) stay as separate resources. The web app merges them into one chronology so a reader can see what changed in the situation and when India Impact was reassessed.

Public impact history is **published snapshots only**. Draft assessments are not listed. Each history row includes category levels so the UI can show what moved between v1 and v2 without a second table.

`pnpm db:seed` is additive: it will attach a second Hormuz assessment and extra timeline rows if the M3 seed already ran.

## M5 news ingestion

`packages/ingestion` fetches public RSS/Atom feeds from a CLI (`pnpm ingest:rss`). It stores source + article **metadata** only, hashes a normalized fingerprint, and records `ingestion_jobs`. It does not create events and does not use BullMQ.

## M6 article deduplication

After M5 unique URL / guid, ingest classifies remaining items:

1. Content hash of normalized title + day + summary
2. Exact normalized title inside a 48-hour window
3. Token overlap inside that window (not embeddings)

Hard matches skip insert. Soft matches insert `articles.status = DUPLICATE` with `duplicate_of_article_id`. No candidate events yet.

## M7 claims and evidence

Deterministic extraction (`pnpm claims:extract`) attaches RSS articles that share a gazetteer entity and two significant tokens with a published event, then records short evidence URLs. That coverage matcher is looser than M6 duplicate detection. New claims are **PENDING** and never typed FACT. `evidence_strength` is recounted from distinct linked sources (official = government / international org). Public GET still returns approved claims only.

## M8 structured analysis

`pnpm analyze:event -- --event=<slug>` loads event metadata, calls a model (or a deterministic stub), validates JSON with Zod, and stores an `analysis_runs` row plus a **DRAFT** impact assessment. `evidence_strength` is still computed from linked evidence. `analysis_confidence` is an estimate. Public GET does not invoke a model.

## Next

M9 is real BullMQ (move ingest/analysis off the CLI). M10 is human review of `REVIEW_REQUIRED` events.
