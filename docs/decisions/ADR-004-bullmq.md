# ADR-004: Defer BullMQ until M9

## Context

Ingest and LLM work must not block public HTTP. Queues solve that. Introducing BullMQ before there are jobs creates unused `Queue` classes.

## Decision

M0 worker is idle (health + dependency ping). M5–M8 may invoke ingest/analysis from a CLI or admin request. **M9** introduces real BullMQ (retries, backoff, dead-letter, idempotency).

## Alternatives

- BullMQ in M0 — ceremony, nothing to enqueue.
- Kafka now — operationally heavier, no replay/consumer-group requirement.

## Tradeoffs

Analysis may briefly run in-process before M9. Public GET handlers must never wait on LLMs.

## Consequences

Do not add `bullmq` until M9. Document job idempotency when processors exist.
