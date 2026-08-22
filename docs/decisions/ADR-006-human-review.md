# ADR-006: Human-in-the-loop AI

## Context

Geopolitical analysis can hallucinate sources, quotes, and certainty. Publishing model output as fact would violate the product.

## Decision

AI analysis will never auto-publish. Pipeline: candidate event → analysis run → human review → publish. Evidence and claims come before impact prose.

This ADR records the product rule now; implementation is M8–M10.

## Alternatives

- Autonomous agents — faster, unsafe for this domain.
- No AI — possible for MVP with hand-authored events (M1–M4).

## Tradeoffs

Slower publication. Higher trust.

## Consequences

`analysis_runs` store model, prompt version, and output. Evaluation harnesses wait until M15.
