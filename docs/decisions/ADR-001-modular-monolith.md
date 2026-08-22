# ADR-001: Modular monolith

## Context

BharatLens needs an API, background work, a frontend, PostgreSQL, and later ingestion/AI. Microservices, Kafka, and Kubernetes are popular but expensive to operate.

## Decision

Ship a modular monolith: `apps/api`, `apps/worker`, `apps/web`, shared packages. Domain folders appear when the domain exists.

## Alternatives

- Microservices per domain — independent deploys, high operational cost and distributed transactions too early.
- Single Node process for API + worker — simpler, but we want process isolation and a realistic Compose topology.

## Tradeoffs

One database and one deployable API keep transactions simple. Process boundaries (API vs worker) exist without network RPC between domains.

## Consequences

Cross-module calls stay in-process. Kafka and extra databases wait for measured need.
