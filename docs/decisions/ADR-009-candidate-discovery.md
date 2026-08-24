# ADR-009: Deterministic candidate-event discovery

## Status

Accepted and implemented. Closes the deferred slice of the original M10 scope; AGENTS.md §25's "no existing event → candidate event" step now runs automatically.

## Context

Ingestion stored canonical articles, and claims extraction could only attach coverage to _existing_ events. Unmatched reporting about a brand-new situation never became an event unless an operator created one by hand — the review queue could not fill itself.

The missing piece is clustering: several outlets writing about the same new situation must be grouped without any anchor event to match against.

## Decision

After each successful ingest that inserted new articles, the worker runs a deterministic discovery pass over unmatched canonical articles:

1. **Union-find clustering** with the same precision matcher used for dedupe (`isEntityOverlapMatch`), restricted to a ±48 h window.
2. **Gates** before anything is created:
   - cluster size ≥ 2 (single articles stay noise),
   - ≥ 1 shared named entity from the gazetteer,
   - a deterministic India-relevance token (`INDIA_RELEVANCE_TOKENS` in `@bharatlens/shared`).
3. **Existing-event skip**: if any member already coverage-matches a non-archived event, the cluster is dropped — the claims pipeline attaches those articles instead.
4. Surviving clusters become **CANDIDATE events** in one transaction with all members attached and marked LINKED. Title/summary derive strictly from member headlines plus a provenance line ("Auto-grouped from N reports across M outlets. Not yet reviewed.").

Idempotency is structural: attached articles leave the unmatched set, so rescans converge to no-ops.

## Alternatives

- **Manual-only creation**: keeps control but the review loop never closes; operators become the bottleneck.
- **Embedding/semantic clustering now**: explicitly deferred by §24 until lexical precision demonstrably fails; adds a model dependency and vector storage to a deterministic stage.
- **LLM clustering/classification**: costs money per article per tick (§77) and injects hallucination risk into what should be a mechanical grouping step.

## Tradeoffs

- Gazetteer quality bounds recall: situations outside the entity list are discovered late (when more articles accumulate tokens that do collide).
- False-positive candidates can reach the review queue — by design; review is the filter, not the gate.
- Discovery shares the ingest tick's budget; the scan is bounded (`scanLimit`) so large backlogs cannot stall ingestion.

## Consequences

- The §5 product loop is complete end-to-end: SOURCE → ARTICLE → CANDIDATE EVENT → review → PUBLISHED without manual event creation.
- Analysis of new candidates remains operator-triggered (cost control unchanged).
