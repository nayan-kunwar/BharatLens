# ADR-007: Single-operator admin auth (password + signed cookie)

## Status

Accepted and implemented in M10.

## Context

M10 introduces the human-in-the-loop console: reviewing AI analysis, approving/rejecting claims, editing draft assessments, and publishing events. These are privileged write operations and must not be publicly reachable.

AGENTS.md explicitly warns against over-engineering authentication early (§51): there is exactly one operator, no self-service signup, and no multi-user requirement yet.

## Decision

- The API requires an `ADMIN_PASSWORD` environment variable and **refuses to boot without it** (fail fast where the feature lives; worker/CLI processes do not need it).
- `POST /api/v1/admin/auth/login` verifies the password (constant-time comparison) and sets an HMAC-SHA256-signed session cookie (`bharatlens_admin_session`) containing `{sessionId}.{expiry}`.
- The signing key is derived directly from the admin password. Rotating the password therefore invalidates every live session — the desired property for a single-operator console and one fewer secret to manage.
- All `/api/v1/admin/*` routes except login/logout sit behind a `preHandler` guard that verifies the signature and expiry. Errors map to `401 UNAUTHORIZED` / `401 INVALID_CREDENTIALS` envelopes.
- Cookie flags: httpOnly, SameSite=Lax, path-scoped to `/api/v1/admin`. `ADMIN_COOKIE_SECURE=true` opts into Secure for HTTPS deployments (default off because local Compose serves production mode over plain HTTP).
- Login is rate-limited (10 requests/minute) via `@fastify/rate-limit`; public GETs get a generous default bucket.

## Alternatives

- **Static bearer token**: simplest, but tokens pasted into JS storage outlive sessions and cannot be revoked by rotation as cleanly.
- **Username/password users table + sessions**: needed eventually for multi-operator review trails, but premature now; `analysis_runs.reviewedBy` already records who acted.
- **OAuth/SSO**: no external identity provider exists for this project yet.

## Tradeoffs

- One operator role means authorization is binary; when multiple reviewers exist this must be revisited (users table + roles).
- Password-derived signing key means no independent session secret; acceptable because the password is the only credential by design.
- The Next.js console proxies mutations through Route Handlers so the API base URL never reaches browser bundles.

## Consequences

- Publishing is a two-step, auditable action: edit DRAFT assessment → publish (transaction stamps status, pointer swap, and reviewer on the producing analysis run).
- Public read surface remains unchanged and unauthenticated.
