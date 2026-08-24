# ADR-008: Impact chains as versioned relational graphs

## Status

Accepted and implemented in M11.

## Context

The impact chain is BharatLens's signature explanation device: the causal pathway from a world event through transmission steps to India-facing consequences (AGENTS.md §19). It was deliberately deferred until the impact domain was stable — assessments, claims, evidence, review, and publishing all existed and were versioned.

The question was how to represent a per-event causal graph that changes over time, renders on public pages, is editable by reviewers, and can be produced by the AI pipeline.

## Decision

Two relational tables plus an append-only version header:

```text
impact_chains        UNIQUE(event_id, version), status DRAFT|PUBLISHED, model/prompt provenance
impact_chain_nodes   kind ROOT|CHANNEL|IMPACT, label, optional category, sort_order
impact_chain_edges   from/to node references, UNIQUE(chain_id, from, to)
events.current_impact_chain_id   denormalized pointer to the published current version
```

- **Versioning mirrors impact assessments** (ADR-consistent mental model): drafts are freely editable; publishing stamps and freezes a version and swaps the pointer. History of "how the causal story changed" is retained.
- **Graph invariants are enforced app-side** by `validateChainGraph` in `@bharatlens/shared` (single ROOT, acyclic, fully reachable, no self-loops/duplicates, size caps). PostgreSQL enforces uniqueness and referential integrity but cannot practically enforce acyclicity; every entry point (AI persistence, admin PUT, publish) passes the same gate.
- **Chains publish independently of event lifecycle**: publishing a chain does not walk event status. Public rendering remains gated behind the existing public-event guards.
- **AI generation** extends `event-analysis-v2`: the model returns keyed nodes/edges inside the validated JSON; the pipeline resolves keys to node ids and stores/refreshes a DRAFT for the same prompt version (same idempotency pattern as assessments).

## Alternatives

- **Single mutable graph per event**: simpler but destroys history, contradicting the append-only principle (§76) that assessments already follow.
- **Attach chains to assessment versions**: inherits versioning "for free" but conflates two concepts — editing a chain would force a new assessment version even when levels are unchanged.
- **JSONB blob column**: loses queryability and integrity; edges/nodes become opaque.
- **Neo4j / graph database**: no requirement justifies a second database (§80); chains are small (≤20 nodes), read-mostly, and always loaded whole per event.
- **Hardcoded diagrams in React**: explicitly forbidden by §19; the UI must render whatever graph data exists.

## Tradeoffs

- Cycle prevention lives in application code; a bug bypassing the gate could store a cyclic graph. The public renderer tolerates degenerate input defensively.
- The v1 admin editor constrains editing UX to node rows with "flows into" toggles; the data model itself supports arbitrary DAGs.
- Pre-v2 analyses have no chains; mixed history is expected and guards key off `promptVersion`.

## Consequences

- Public API: `GET /api/v1/events/:slug/chain` → `{current, history}` published snapshots only.
- Admin API: `PUT /admin/chains/:id`, `POST /admin/chains/:id/publish`.
- The renderer (`layoutChain`) computes layering client-side with zero dependencies.
