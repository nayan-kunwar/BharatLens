# ADR-005: Fastify, Drizzle, Next.js

## Context

The stack must teach HTTP, SQL, and UI without hiding them behind a large framework.

## Decision

- **Fastify 5** — REST, plugins, schemas later. Thin routes.
- **Drizzle** — SQL-shaped TypeScript. Domain schema in M1.
- **Next.js 15 (App Router)** — public UI; M0 is a branded shell.

## Alternatives

- Nest + Prisma — faster for some teams, more magic for this learning project.
- Express — less structure for plugins and typing.

## Tradeoffs

More explicit wiring than Nest. Drizzle queries are more verbose than Prisma `include`.

## Consequences

Zod validates env and LLM JSON (`@bharatlens/ai`). HTTP and database are different validation edges.
