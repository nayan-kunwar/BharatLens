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

Rejected items (empty title, non-http URL) are counted and not stored. Duplicates are counted; existing rows are not overwritten.

Ingest does **not** create events. Candidate-event creation is later (after M6 deduplication).

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

| Failure            | Effect                                              |
| ------------------ | --------------------------------------------------- |
| Feed HTTP error    | Job `FAILED`; other feeds still run                 |
| Empty parse        | Job `FAILED`                                        |
| Duplicate URL      | Counted as duplicate; no second row                 |
| Publisher ToS/rate | Operator responsibility; keep the source list small |
