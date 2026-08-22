# ADR-002: PostgreSQL

## Context

Events, claims, evidence, and versioned impact assessments are relational. We need foreign keys, unique constraints, and later full-text search.

## Decision

PostgreSQL 16 is the only source of truth in M0+.

## Alternatives

- MongoDB — weak fit for FKs and version uniqueness.
- MySQL — workable, weaker FTS than Postgres for our planned search.

## Tradeoffs

We operate one database well instead of many databases poorly. JSONB is allowed for LLM payloads, not for core queryable facts.

## Consequences

Drizzle talks to Postgres. Elasticsearch is out of scope until FTS is proven insufficient.
