# Ingestion (M5)

BharatLens does **not** scrape full articles. Ingestion stores:

```text
source metadata
article title
canonical URL
optional short summary (max 500 characters)
publication time
content hash
```

That is enough to attach evidence later. It is not a news mirror.

## Adapter

```text
NewsSourceAdapter.fetchArticles() → RawArticle[]
```

M5 ships one adapter: `RssAdapter`. A future News API adapter can implement the same interface without changing storage.

RSS is pulled over HTTP with a timeout and an identifying User-Agent. There is **no BullMQ**. Run ingest from the CLI.

## Pipeline

```text
Feed config
 ↓
Fetch RSS/Atom
 ↓
Parse items (title, link, guid, date, short description)
 ↓
Normalize (canonical URL, collapsed title, stripped HTML)
 ↓
SHA-256 content hash
 ↓
Insert article or skip on unique URL / (source, external id)
 ↓
Record ingestion_jobs row
```

Normalization happens **before** insert. Stored status is `NORMALIZED`, not a second rewrite pass.

Rejected items (empty title, non-http URL) are counted and not stored.

## M6 deduplication

Hard matches (unique constraints — no second row):

```text
canonical URL
source + external ID (RSS guid)
```

Soft matches (second URL is stored with status `DUPLICATE` and `duplicate_of_article_id`):

```text
content hash (match title + calendar day + summary)
exact normalized title within 48 hours
token overlap within 48 hours (shared significant tokens + a gazetteer entity)
```

This is **not** semantic embeddings and not a vector database. False positives are reduced by requiring a time window and, for the overlap layer, a named token such as a country or "hormuz". False negatives (same story, different wording, no shared tokens) are accepted until there is evidence they matter.

Ingest still does **not** create events. `pnpm claims:extract` (M7) may attach articles to existing published events when they share a gazetteer entity and at least two significant tokens with the event. That matcher is looser than M6 dedupe on purpose: collapsing two URLs as duplicates must be precise; attaching evidence can tolerate a shorter official brief.

## CLI

```bash
pnpm db:migrate
pnpm ingest:rss
pnpm ingest:rss -- --source=bbc-world
```

Default feeds (small set, public RSS):

| slug        | Source    |
| ----------- | --------- |
| `bbc-world` | BBC World |
| `un-news`   | UN News   |

Re-running the CLI is safe: unique `articles.url` makes it idempotent.

## Why not Elasticsearch / a queue yet

Volume is tiny. Postgres unique constraints are the dedupe. BullMQ is M9, when ingest should not block a developer terminal.

## Failure modes

| Failure              | Effect                                              |
| -------------------- | --------------------------------------------------- |
| Feed HTTP error      | Job `FAILED`; other feeds still run                 |
| Empty parse          | Job `FAILED`                                        |
| Duplicate URL / guid | Counted as duplicate; no second row                 |
| Soft duplicate       | Row stored as `DUPLICATE` pointing at the original  |
| Publisher ToS/rate   | Operator responsibility; keep the source list small |
