# ADR-003: Redis in M0

## Context

Redis will be needed for BullMQ (M9) and likely rate limiting. AGENTS.md forbids using Redis as a second database or adding it “because it is available.”

## Decision

Run Redis in Compose from M0. The only use is **connectivity**: `/ready` and the worker heartbeat `PING`. No cache, no locks, no queues.

## Alternatives

- Add Redis only in M9 — Compose would change shape late; worker could not prove Redis reachability.
- Use Redis as a cache in M0 — no hot path exists; that would be premature.

## Tradeoffs

One extra container to run locally. If Redis is down, liveness still succeeds; readiness fails. Later product reads must not require Redis.

## Consequences

Every new Redis use must be explained in code/docs. BullMQ must not appear before M9.
