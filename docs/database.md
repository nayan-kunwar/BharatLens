# Database (M1)

PostgreSQL 16 is the source of truth. Schema lives in `packages/database`. Apply it with:

```bash
docker compose up -d postgres redis
pnpm db:migrate
pnpm db:seed
```

Host port is **5433** (container 5432) so a local Postgres on 5432 does not intercept connections. Inside Compose, apps still use `postgres:5432`.

## Entities

| Table                                                 | Role                                                                                             |
| ----------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `sources`                                             | Publishers (Reuters, MEA, …)                                                                     |
| `articles`                                            | Ingested article metadata. Status starts at `INGESTED`, not on events.                           |
| `events`                                              | One table for candidates and published events (`status`).                                        |
| `event_articles` / `event_countries` / `event_topics` | Many-to-many                                                                                     |
| `claims`                                              | Statements on an **event**. Optional `article_id` / `source_id`. `evidence_strength` lives here. |
| `evidence`                                            | Short excerpts + URLs supporting a claim (max 500 chars).                                        |
| `event_updates`                                       | Timeline rows                                                                                    |
| `watch_items`                                         | “What to watch”                                                                                  |
| `impact_assessments`                                  | Versioned India Impact (`v1`, `v2`, …). `analysis_confidence` lives here.                        |
| `impact_category_levels`                              | Per-category levels so the UI does not hardcode columns                                          |
| `events.current_impact_assessment_id`                 | Pointer to the current published assessment. Not a second impact table.                          |
| `ingestion_jobs`                                      | CLI ingest runs (counts, success/failure). Not a BullMQ table.                                   |
| `analysis_runs`                                       | CLI analysis audit (model, prompt version, input refs, output). Not published.                   |

There is **no** `india_impacts` 1:1 table and **no** `candidate_events` table.

## Constraints worth knowing

- `events.slug` unique — public URLs
- `articles.url` unique — ingest URL dedupe
- `articles (source_id, external_id)` unique — RSS guid per source
- `articles.duplicate_of_article_id` — soft duplicate pointer (`ON DELETE SET NULL`)
- `claims (event_id, statement)` unique — idempotent extract
- `evidence (claim_id, url)` unique — one URL per claim
- `impact_assessments (event_id, version)` unique — append-only versions
- `analysis_runs.event_id` indexed — audit history per event
- Circular FK: assessments reference events; events reference the current assessment (`ON DELETE SET NULL`)

## Indexes (and why)

| Index                                                                 | Why                      |
| --------------------------------------------------------------------- | ------------------------ |
| `events_status_idx`                                                   | Admin vs public listings |
| `events_occurred_at_idx` / `events_published_at_idx`                  | Chronological pages      |
| `articles_content_hash_idx` / `articles_normalized_title_idx`         | Dedupe lookups           |
| `claims_event_id_idx`                                                 | Event detail             |
| `evidence_claim_id_idx`                                               | Evidence panel           |
| `impact_assessments_event_id_idx`                                     | History                  |
| `analysis_runs_event_id_idx` / `analysis_runs_status_idx`             | Analysis audit           |
| `impact_chains_event_id_idx` / `impact_chains_status_idx`             | Chain history            |
| `impact_chain_nodes_chain_id_idx` / `impact_chain_edges_chain_id_idx` | Whole-graph loads        |

## Domain service

`EventCatalog` in `packages/database` is the write API (create event, attach article, claims/evidence, versioned assessments and **versioned impact chains**, timeline, **idempotent article ingest**, **analysis runs**). Graph validity for chains (one ROOT, acyclic, reachable) lives in `validateChainGraph` in `@bharatlens/shared`. REST is M2. RSS ingest is a CLI in `@bharatlens/ingestion`. Analysis is a CLI in `@bharatlens/ai`.

`pnpm db:seed` is idempotent by event slug and **additive for M4**: if the Hormuz example already exists from M3, a second published impact assessment and extra timeline rows are attached instead of skipping the event.

Evidence strength is **computed** from linked sources, not an LLM percentage. Analysis confidence is a separate field on assessments.
