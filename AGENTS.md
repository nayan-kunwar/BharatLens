# AGENTS.md

# BharatLens

> **See the world through India's lens.**

BharatLens is an India-focused geopolitical intelligence and context platform.

The core question the product answers is:

> **Something happened in the world. What does it mean for India?**

This is NOT intended to become another generic news aggregator.

The product should transform global events into:

```text
WORLD EVENT
     ↓
WHAT HAPPENED?
     ↓
WHY DID IT HAPPEN?
     ↓
WHY DOES INDIA CARE?
     ↓
WHAT IN INDIA IS EXPOSED?
     ↓
WHAT COULD HAPPEN?
     ↓
WHAT SHOULD WE WATCH NEXT?
```

The product must prioritize:

- factual accuracy
- source transparency
- political neutrality
- explainability
- evidence-backed analysis
- uncertainty
- excellent backend architecture
- maintainability
- learning value

---

# 1. ROLE OF THE CODING AGENT

You are acting as:

- Senior Backend Engineer
- Software Architect
- AI Engineer
- Full-Stack Engineer
- Data Engineer
- DevOps Engineer
- Technical Mentor

You are not merely a code generator.

This project is also a learning project.

The developer working on this project wants to improve:

- backend architecture
- TypeScript
- PostgreSQL
- Redis
- queues
- event-driven architecture
- data ingestion
- search
- AI/LLM pipelines
- distributed systems
- API design
- testing
- Docker
- observability
- system design
- production engineering

Therefore:

> **Teach while building.**

Whenever a significant architectural or technical decision is made, explain:

1. What it is.
2. Why we need it.
3. What problem it solves.
4. Alternatives.
5. Why we chose this approach.
6. Tradeoffs.
7. Failure modes.
8. How the implementation works.

Do not blindly generate code.

---

# 2. PROJECT PRINCIPLES

Follow these principles throughout the project.

## 2.1 Simplicity First

Prefer the simplest architecture that solves the current problem.

Do not introduce infrastructure just because it is popular.

Avoid:

- premature microservices
- premature Kafka
- premature Elasticsearch
- unnecessary abstractions
- unnecessary design patterns
- unnecessary dependencies

---

## 2.2 Modular Monolith First

The initial architecture is:

```text
Modular Monolith
+
PostgreSQL
+
Redis
+
Idle worker process in M0
+
Real BullMQ workers from M9
```

Do NOT start with microservices.

Do NOT start with Kafka.

Do NOT start with Kubernetes.

Do NOT start with Elasticsearch/OpenSearch.

Do NOT start with a vector database.

These can be evaluated later when actual requirements justify them.

---

## 2.3 Domain-Driven Boundaries

Even though the application is a monolith, maintain clear domain boundaries.

Potential modules:

```text
events
sources
articles
countries
entities
topics
claims
evidence
impact
search
ingestion
analysis
admin
users
```

Modules should communicate through clear interfaces.

Avoid arbitrary cross-module database access.

---

# 3. PRODUCT VISION

The long-term product should feel like:

```text
                  🌍 WORLD
                     │
                     ▼
                GLOBAL EVENT
                     │
                     ▼
                  CONTEXT
                     │
                     ▼
              INDIA EXPOSURE
                     │
                     ▼
               INDIA IMPACT
                     │
                     ▼
                SCENARIOS
                     │
                     ▼
               WHAT TO WATCH
```

Example:

```text
Strait of Hormuz disruption
        ↓
Shipping disruption
        ↓
Energy transportation risk
        ↓
Higher energy costs
        ↓
India's import bill
        ↓
Inflation pressure
        ↓
Rupee / monetary policy
        ↓
Indian businesses and consumers
```

The platform should make these relationships understandable.

---

# 4. BRAND

Project name:

# BharatLens

Tagline:

> See the world through India's lens.

Core feature:

# India Impact

Example:

```text
BharatLens
│
├── World Events
├── India Impact
├── Countries
├── Topics
├── Timeline
└── Search
```

Use `BharatLens` consistently across:

- README
- repository
- frontend branding
- documentation
- package names where appropriate
- Docker project naming where appropriate

Do not use both `India Impact` and `BharatLens` as competing product names.

`India Impact` is a feature/concept inside BharatLens.

---

# 5. CORE PRODUCT LOOP

Canonical domain relationship (one `events` table; status distinguishes candidate vs published):

```text
Article → Candidate Event → Event
                         ├── Claims → Evidence
                         ├── Updates
                         └── Impact Assessments
                              ├── v1
                              ├── v2
                              └── v3 (current)
```

Ingestion and review still follow this pipeline:

```text
SOURCE
   ↓
ARTICLE
   ↓
CANDIDATE EVENT
   ↓
DEDUPLICATION
   ↓
EVENT
   ├── Claims → Evidence
   ├── Updates
   └── Impact Assessments
   ↓
HUMAN REVIEW
   ↓
PUBLISHED EVENT
```

Do **not** model an article as an event.

Do **not** use a separate `candidate_events` table. A candidate is an event whose `status` is not yet public.

Do **not** use a 1:1 `india_impacts` table. Impact is versioned (`impact_assessments`).

The user experience should then be:

```text
EVENT
  ↓
What happened?
  ↓
Why did it happen?
  ↓
Why does India care?
  ↓
India's exposure
  ↓
Potential impacts
  ↓
What could happen next?
  ↓
What should we watch?
  ↓
Sources
```

---

# 6. FACT VS ANALYSIS VS SCENARIO

This is a critical product requirement.

Never mix facts and analysis.

Every important claim should have a classification.

Supported types:

```text
FACT
ANALYSIS
SCENARIO
UNKNOWN
```

### FACT

Directly supported by reliable evidence.

### ANALYSIS

Reasoned interpretation based on facts.

### SCENARIO

A possible future outcome.

### UNKNOWN

Insufficient reliable information.

Example:

```text
FACT:
Oil prices increased after the disruption.

ANALYSIS:
A prolonged disruption could increase India's import costs.

SCENARIO:
If the disruption lasts several months, inflationary pressure
could become more significant.

UNKNOWN:
The exact future duration of the disruption.
```

The UI should make these distinctions clear.

---

# 7. POLITICAL NEUTRALITY

BharatLens must remain politically neutral.

Do NOT:

- promote political parties
- promote political ideologies
- tell users who to support
- use nationalist propaganda
- portray countries as inherently good or bad
- use inflammatory language
- manufacture geopolitical predictions
- present speculation as fact
- manipulate users through sensational headlines

Avoid language such as:

```text
"India is doomed"
"They are our enemies"
"India will definitely win"
"Country X is evil"
```

Prefer:

```text
FACT
SOURCE
CONTEXT
ANALYSIS
SCENARIO
UNCERTAINTY
```

If a topic is politically sensitive, increase source transparency rather than increasing confidence.

---

# 8. SOURCE TRANSPARENCY

Every important factual claim should have supporting sources where possible.

Potential sources include:

- Reuters
- Associated Press
- BBC
- Financial Times
- Bloomberg
- The Hindu
- Indian Express
- Economic Times
- Government of India
- Ministry of External Affairs
- RBI
- Ministry of Commerce
- UN
- World Bank
- IMF
- reputable think tanks
- official government sources

Source quality matters.

Never fabricate:

- URLs
- article titles
- quotes
- statistics
- government statements
- publication dates
- sources

Do not reproduce copyrighted articles.

Store:

```text
source
article metadata
short summaries
claims
citations
```

rather than copying full articles.

Respect:

- robots.txt
- API terms
- source terms of service
- copyright restrictions
- rate limits

---

# 9. EVIDENCE-FIRST ARCHITECTURE

Do not build the system as:

```text
Article
 ↓
LLM
 ↓
Impact
```

Instead:

```text
Article
 ↓
Claims
 ↓
Evidence
 ↓
Event
 ↓
India Impact Analysis
```

Conceptually:

```text
                    SOURCES
                       │
          ┌────────────┼────────────┐
          ▼            ▼            ▼
       Reuters        MEA          RBI
          │            │            │
          └────────────┼────────────┘
                       ▼
                     CLAIMS
                       │
                       ▼
                     EVENT
                       │
                       ▼
                INDIA IMPACT
```

This allows the product to distinguish:

```text
FACT
↓
FACT
↓
ANALYSIS
```

instead of hiding everything behind an LLM.

---

# 10. CLAIMS

Claims are structured statements extracted from sources.

Example:

```text
Claim:
India imports crude oil through maritime routes
affected by the disruption.

Type:
FACT

Source:
Source A

Evidence strength:
STRONG
```

Claims should have:

```text
id
statement
type
status
createdAt
updatedAt
```

Where appropriate:

```text
eventId
sourceId
articleId
```

Do not automatically treat LLM-generated claims as facts.

Claims belong on the **event**, with optional `articleId` / `sourceId` for provenance. Do not attach claims only to articles — merging articles into one event would then lose a clean home for those statements.

`evidence_strength` lives on claims (and may roll up onto an impact assessment). It is not the same field as analysis confidence.

---

# 11. EVIDENCE

Evidence supports claims.

Possible structure:

```text
evidence

id
sourceId
articleId
claimId
excerpt
url
publishedAt
retrievedAt
```

Do not store large copyrighted excerpts.

Use short supporting excerpts or metadata where legally appropriate.

Evidence should be traceable.

---

# 12. EVIDENCE STRENGTH VS ANALYSIS CONFIDENCE

These are **two different fields**. Never collapse them into one `confidence` number.

| Field                 | Question                                 | Typical owner                             | Allowed values                 |
| --------------------- | ---------------------------------------- | ----------------------------------------- | ------------------------------ |
| `evidence_strength`   | How well is this _supported by sources_? | Deterministic rollup from linked evidence | `WEAK` / `MODERATE` / `STRONG` |
| `analysis_confidence` | How sure is this _interpretation_?       | Reviewer or model, labeled as an estimate | `LOW` / `MEDIUM` / `HIGH`      |

## Evidence strength

Do NOT use fake numerical LLM confidence such as:

```json
{
  "confidence": 0.82
}
```

An LLM saying "82% confident" does not mean it is statistically 82% accurate.

Prefer structured evidence strength on **claims**:

```text
WEAK
MODERATE
STRONG
```

And:

```text
sourceCount
independentSourceCount
officialSourceCount
evidenceReason
```

Example:

```text
Evidence strength:
STRONG

Supporting sources:
4

Independent sources:
3

Official sources:
2
```

Compute evidence strength from linked evidence where possible. Do not let the LLM invent source counts.

## Analysis confidence

`analysis_confidence` belongs on **impact assessments** and **analysis runs**, not on FACT claims.

It must be described in the UI as an analytical estimate, **not** statistical probability.

Do not put a percentage on a FACT. If evidence is insufficient, use claim type `UNKNOWN` rather than "70% sure this is a fact."

An assessment may therefore show both:

```text
evidence_strength: STRONG
analysis_confidence: MEDIUM
```

Meaning: sources support the facts well; the India-impact interpretation is still uncertain.

---

# 13. EVENT DOMAIN

An event represents an underlying geopolitical situation.

Example:

```text
Iran-related shipping disruption
```

It may have many articles.

It may evolve over time.

It may have multiple analyses.

Potential fields:

```text
id
title
slug
summary
description
eventType
status
importance
occurredAt
createdAt
updatedAt
publishedAt
currentImpactAssessmentId
```

`currentImpactAssessmentId` is a denormalized pointer to the latest published assessment. It is not a second impact table. List pages read this FK; history always lives in `impact_assessments`.

Relationships:

```text
Article → Candidate Event → Event
                         ├── Sources / Articles
                         ├── Countries
                         ├── Entities
                         ├── Topics
                         ├── Claims → Evidence
                         ├── Updates
                         └── Impact Assessments (v1, v2, v3, …)
```

Do not create `india_impacts` as a 1:1 row per event.

---

# 14. EVENT LIFECYCLE

Events should have an explicit lifecycle.

Recommended **event** statuses:

```text
CANDIDATE
    ↓
DRAFT
    ↓
ANALYZED
    ↓
REVIEW_REQUIRED
    ↓
PUBLISHED
    ↓
UPDATED
    ↓
ARCHIVED
```

`INGESTED` belongs on **articles** and **ingestion jobs**, not on events. An article is ingested; an event is created as a candidate (or attached to an existing event).

Use **one `events` table**. Do not copy rows from `candidate_events` into `events`.

The exact implementation can evolve.

The lifecycle should make it clear whether an event is:

- candidate
- draft
- AI analyzed
- waiting for human review
- published
- updated
- archived

---

# 15. EVENT UPDATES

A geopolitical event is not static.

Make updates a first-class concept.

Example:

```text
Iran Conflict

Aug 20
Initial escalation

Aug 21
Shipping disruption reported

Aug 22
India changes crude sourcing

Aug 23
Diplomatic talks announced
```

Conceptually:

```text
Event
 │
 ├── Update 1
 ├── Update 2
 ├── Update 3
 └── Update 4
```

This enables:

- event timelines
- evolving analysis
- impact history
- historical reconstruction

---

# 16. VERSIONED IMPACT ASSESSMENTS

Do NOT assume an event has only one permanent impact record.

Do NOT use a 1:1 `india_impacts` model.

Geopolitical situations change. Store append-only versions:

```text
Event
 │
 ├── Impact Assessment v1
 ├── Impact Assessment v2
 ├── Impact Assessment v3
 └── currentImpactAssessmentId → v3
```

Potential fields:

```text
id
eventId
version
status

overallLevel

energyLevel
tradeLevel
economicLevel
securityLevel
defenceLevel
diplomaticLevel
technologyLevel
supplyChainLevel

reasoning

evidenceStrength
analysisConfidence

modelName
promptVersion

createdAt
publishedAt
```

`evidenceStrength` is a rollup from linked claims/evidence.

`analysisConfidence` is the interpretation estimate for this version.

Constraint: unique `(eventId, version)`. Publishing a new version updates `events.currentImpactAssessmentId` in the same transaction.

This enables:

```text
Impact evolution
```

Example:

```text
Aug 20   HIGH
Aug 21   HIGH
Aug 22   HIGH
Aug 25   MEDIUM
```

---

# 17. INDIA IMPACT CATEGORIES

Initial categories:

```text
ENERGY
TRADE
ECONOMY
SECURITY
DEFENCE
DIPLOMACY
TECHNOLOGY
SUPPLY_CHAIN
INDIAN_CITIZENS
```

Impact levels:

```text
LOW
MEDIUM
HIGH
CRITICAL
```

These are product assessments.

They must never be presented as objective measurements.

Every impact assessment should include reasoning.

Example:

```text
Energy:
HIGH

Reason:
India has significant exposure to imported energy,
and prolonged disruption could affect import costs.
```

---

# 18. IMPACT ASSESSMENT

Conceptually:

```text
ImpactAssessment

eventId
version
status

overallLevel

energyLevel
tradeLevel
economicLevel
securityLevel
defenceLevel
diplomaticLevel
technologyLevel
supplyChainLevel

reasoning

evidenceStrength
analysisConfidence

modelName
promptVersion
createdAt
publishedAt
```

Keep the model extensible.

Do not hardcode impact categories into frontend logic.

Do not overwrite v1 when v2 is created. History is a product feature.

---

# 19. IMPACT CHAIN

One of the long-term signature features is the Impact Chain.

Example:

```text
Hormuz disruption
       ↓
Shipping disruption
       ↓
Oil transportation risk
       ↓
Higher energy costs
       ↓
India's import bill
       ↓
Inflation pressure
       ↓
Rupee / monetary policy
```

This should eventually be represented as graph-like data.

Potential structures:

```text
impact_chain_nodes
impact_chain_edges
```

But do NOT implement this too early.

First establish:

- events
- claims
- evidence
- impact assessments
- updates

Then introduce graph structures when the domain is understood.

Never hardcode the entire impact chain into React components.

---

# 20. COUNTRIES

Countries are first-class entities.

Example:

```text
India
China
USA
Russia
Iran
Pakistan
Saudi Arabia
UAE
Japan
Germany
```

An event can involve many countries.

Relationship:

```text
Event
 ├── India
 ├── Iran
 └── USA
```

Do not reduce international relationships to:

```text
friend
enemy
```

Relationships are multidimensional.

Potential future dimensions:

```text
Trade
Energy
Defence
Diplomacy
Technology
Supply Chain
Strategic
Border
```

---

# 21. TOPICS

Initial topics:

```text
MILITARY_CONFLICT
DIPLOMACY
TRADE
ENERGY
TECHNOLOGY
ECONOMY
SECURITY
MARITIME
DEFENCE
SUPPLY_CHAIN
CLIMATE
MIGRATION
```

Topics must be extensible.

---

# 22. NEWS INGESTION

Create an ingestion abstraction.

Conceptually:

```typescript
interface NewsSourceAdapter {
  fetchArticles(): Promise<RawArticle[]>;
}
```

Potential source types:

```text
RSS
News APIs
Official government feeds
Other approved feeds
```

Do not tightly couple the application to one provider.

Start with a small number of sources.

---

# 23. ARTICLE MODEL

Raw articles should be distinct from geopolitical events.

Conceptually:

```text
Article

id
sourceId
externalId
title
url
author
publishedAt
retrievedAt
summary
contentHash
metadata
```

An article may reference an existing event.

Multiple articles can refer to the same event.

Example:

```text
Reuters → Event A
BBC → Event A
AP → Event A
The Hindu → Event A
```

---

# 24. DEDUPLICATION

Deduplication is required because multiple sources may report the same event.

Initial strategy:

```text
URL / external ID
       ↓
content hash
       ↓
normalized title
       ↓
time window
       ↓
entity overlap
```

Only later consider semantic embeddings.

Do not start with a vector database.

Explain tradeoffs before implementing semantic deduplication.

---

# 25. CANDIDATE EVENT CREATION

Ingestion should not automatically publish everything.

Pipeline:

```text
Article
   ↓
Normalize
   ↓
Extract entities
   ↓
Identify possible event
   ↓
Check duplicate
   ↓
Existing event?
   │
   ├── YES
   │     ↓
   │  Attach article
   │
   └── NO
         ↓
     Candidate event
```

This allows review before publication.

The candidate is still a row in `events` with status `CANDIDATE`. Later statuses (`DRAFT`, `ANALYZED`, `PUBLISHED`, …) are updates to that same row.

---

# 26. AI PIPELINE

Do not begin with an autonomous agent.

Use a deterministic pipeline.

Initial pipeline:

```text
Article
   ↓
Normalization
   ↓
Entity Extraction
   ↓
Event Classification
   ↓
India Relevance
   ↓
Claim Extraction
   ↓
Evidence Association
   ↓
India Impact Analysis
   ↓
Validation
   ↓
Human Review
   ↓
Publish
```

---

# 27. LLM OUTPUT

Never trust raw LLM output.

LLM responses must be:

1. structured
2. schema validated
3. sanitized
4. checked for required fields
5. checked for unsupported claims

Use Zod or equivalent.

Example:

```typescript
const analysisSchema = z.object({
  summary: z.string(),
  claims: z.array(
    z.object({
      statement: z.string(),
      type: z.enum(['FACT', 'ANALYSIS', 'SCENARIO', 'UNKNOWN']),
    }),
  ),
  indiaImpact: z.object({
    energy: z.object({
      level: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
      reasoning: z.string(),
    }),
  }),
  watchNext: z.array(z.string()),
});
```

Do not use an LLM to determine facts without source evidence.

---

# 28. AI SAFETY REQUIREMENTS

AI must never:

- fabricate events
- fabricate sources
- fabricate quotes
- fabricate statistics
- fabricate government statements
- invent URLs
- present speculation as fact
- claim certainty without evidence
- create fake citations

If evidence is insufficient:

```text
UNKNOWN
```

is a valid result.

The system should prefer:

> "There is insufficient evidence to determine..."

over hallucinating.

---

# 29. AI VERSIONING

Every AI-generated analysis must be auditable.

Store:

```text
modelName
promptVersion
inputReferences
output
generatedAt
reviewedAt
reviewedBy
status
```

This allows us to answer:

> Which model generated this analysis?

> Which prompt version was used?

> Which sources were used?

> Was the result reviewed?

---

# 30. HUMAN-IN-THE-LOOP

AI analysis should not automatically become public.

Workflow:

```text
Article
 ↓
Candidate Event
 ↓
AI Analysis
 ↓
Review Queue
 ↓
Human Review
 ↓
Approve / Reject / Edit
 ↓
Publish
```

Admin users should be able to:

- inspect sources
- inspect claims
- inspect evidence
- inspect AI analysis
- edit summaries
- change impact levels
- reject analysis
- approve analysis
- publish event

---

# 31. ADMIN DASHBOARD

Admin dashboard should eventually contain:

```text
Incoming Articles

Candidate Events

Events Requiring Review

AI Analyses

Low Evidence Events

Published Events

Recently Updated Events
```

Useful statuses:

```text
PENDING
PROCESSING
REVIEW_REQUIRED
APPROVED
REJECTED
PUBLISHED
```

---

# 32. BACKEND STACK

Initial backend stack:

```text
Node.js
TypeScript
Fastify
PostgreSQL
Drizzle ORM
Redis
BullMQ
Zod
```

Use the versions currently appropriate for the project.

Do not blindly downgrade packages.

---

# 33. FRONTEND STACK

Use:

```text
Next.js
TypeScript
```

Use the current project conventions.

Potential UI libraries may be introduced when useful, but avoid unnecessary dependencies.

---

# 34. API ARCHITECTURE

Use REST APIs initially.

Potential endpoints:

```http
GET /api/v1/events
GET /api/v1/events/:slug
GET /api/v1/events/trending
GET /api/v1/events/high-impact

GET /api/v1/countries
GET /api/v1/countries/:code

GET /api/v1/topics
GET /api/v1/topics/:slug

GET /api/v1/search

GET /api/v1/events/:id/sources
GET /api/v1/events/:id/claims
GET /api/v1/events/:id/impact
GET /api/v1/events/:id/updates
```

Admin:

```http
POST /api/v1/admin/events

PATCH /api/v1/admin/events/:id

POST /api/v1/admin/events/:id/analyze

POST /api/v1/admin/events/:id/review

POST /api/v1/admin/events/:id/publish
```

---

# 35. API REQUIREMENTS

Use:

- API versioning
- validation
- pagination
- filtering
- sorting
- consistent errors
- request IDs
- proper HTTP status codes
- rate limiting
- structured logging

Example success:

```json
{
  "success": true,
  "data": {},
  "meta": {}
}
```

Example error:

```json
{
  "success": false,
  "error": {
    "code": "EVENT_NOT_FOUND",
    "message": "Event not found"
  }
}
```

Follow existing project conventions if they are better.

---

# 36. PAGINATION

For initial APIs, offset pagination is acceptable.

Example:

```text
?page=1&limit=20
```

Later, if event volume grows significantly, evaluate cursor pagination.

Do not implement cursor pagination prematurely.

---

# 37. SEARCH

Start with PostgreSQL.

Potential capabilities:

```text
Event title
Summary
Countries
Topics
Entities
```

Use PostgreSQL full-text search initially.

Do NOT introduce Elasticsearch/OpenSearch until:

- search requirements exceed PostgreSQL
- dataset size justifies it
- relevance tuning requires it
- actual performance measurements demonstrate the need

---

# 38. REDIS

Redis should only be used when it solves a real problem.

In **M0**, Redis exists so Compose is production-shaped and the worker process can prove connectivity. Do not implement caching, locks, or queues in M0 unless a concrete M0 need appears.

Later legitimate uses:

```text
Rate limiting
Queue infrastructure (when BullMQ is introduced)
Job coordination
Distributed locks where necessary
Hot event cache (only after measuring)
```

Do not use Redis simply because it is available.

Every Redis use should have an explanation.

If Redis is down: public reads should still work from PostgreSQL. Ingest and jobs may fail until Redis returns.

---

# 39. BULLMQ

Do **not** implement a real BullMQ job system in M0–M8.

M0 worker: a process that starts, connects to Redis if configured, exposes health, and stays idle. No processors, no enqueue from the API.

M5–M8 may run ingest/analysis via **admin HTTP, a CLI, or an in-process call**. That is an acceptable learning tradeoff. Do not block public GET handlers on LLMs.

**M9** is when BullMQ becomes real:

Potential jobs:

```text
article-ingestion
article-normalization
event-deduplication
entity-extraction
claim-extraction
impact-analysis
event-reindex
```

Jobs must be:

- retryable
- idempotent
- observable

Use exponential backoff where appropriate.

Handle failed jobs.

Do not silently lose jobs.

Do not create unused Queue classes in M0 "for later." That is ceremony.

---

# 40. IDEMPOTENCY

Background jobs may execute more than once.

Therefore operations must be safe to repeat.

Examples:

```text
Article ingestion
Event creation
AI analysis
Publishing
Notifications
```

Use:

- unique constraints
- idempotency keys
- deterministic identifiers
- job state checks

where appropriate.

---

# 41. DATABASE

Use PostgreSQL.

Potential entities:

```text
users

sources

articles

events
  (includes candidates via status; current_impact_assessment_id)

event_articles

countries

event_countries

entities

event_entities

topics

event_topics

claims
  (event_id required; optional article_id / source_id)
  (evidence_strength)

claim_sources

evidence

event_updates

impact_assessments
  (versioned: v1, v2, v3, …)
  (evidence_strength + analysis_confidence)
  unique (event_id, version)

watch_items

analysis_runs

ingestion_jobs
```

Do **not** create `india_impacts` as a 1:1 table.

Do **not** create a separate `candidate_events` table.

The exact schema can evolve.

Before creating the schema:

1. Explain entities.
2. Explain relationships.
3. Explain indexes.
4. Explain constraints.
5. Explain normalization decisions.
6. Explain denormalization decisions.
7. Then create migrations.

---

# 42. DATABASE DESIGN PRINCIPLES

Use:

- foreign keys
- unique constraints
- indexes
- timestamps
- explicit enums where appropriate
- transactions where necessary

Do not use database-level JSON for everything.

Use structured columns for important queryable data.

Use JSON only where flexibility genuinely provides value.

---

# 43. DATABASE INDEXING

Consider indexes for:

```text
events.slug
events.status
events.occurred_at
events.published_at

articles.published_at
articles.source_id

event_countries(event_id, country_id)
event_topics(event_id, topic_id)

claims.event_id
evidence.claim_id

impact_assessments.event_id
impact_assessments.version
  unique (event_id, version)
events.current_impact_assessment_id
```

Do not create indexes blindly.

Explain why an index exists.

---

# 44. TRANSACTIONS

Use database transactions for operations that must be atomic.

Examples:

```text
Create event + relationships

Publish event + publication timestamp

Create impact assessment + version update

Create candidate event + source associations
```

Do not wrap unrelated operations in large transactions.

---

# 45. FOLDER STRUCTURE

Use a modular structure.

A possible backend structure:

```text
apps/
  api/
    src/
      modules/
        events/
        articles/
        sources/
        countries/
        entities/
        topics/
        claims/
        evidence/
        impact/
        search/
        admin/
      shared/
      infrastructure/
      app.ts
      server.ts

  worker/
    src/
      jobs/
      processors/
      workers/
      app.ts

packages/
  database/
  config/
  shared/
  ai/
  ingestion/
```

Adapt this to the actual repository.

Do not force this exact structure if a better structure emerges.

---

# 46. MODULE RULES

Each domain module should have clear responsibilities.

Example:

```text
events/
  domain/
  application/
  infrastructure/
  routes/
```

Do not create five layers for every tiny CRUD operation just for architectural aesthetics.

Use layers where complexity justifies them.

---

# 47. ERROR HANDLING

Errors should be explicit.

Use typed/domain errors where appropriate.

Examples:

```text
EVENT_NOT_FOUND
INVALID_EVENT_STATUS
SOURCE_NOT_FOUND
ANALYSIS_FAILED
INSUFFICIENT_EVIDENCE
DUPLICATE_EVENT
UNAUTHORIZED
FORBIDDEN
```

Do not leak:

- database internals
- stack traces
- secrets
- internal service details

to public users.

---

# 48. LOGGING

Use structured logging.

Every request should ideally include:

```text
requestId
method
path
statusCode
duration
```

Background jobs should include:

```text
jobId
jobType
attempt
duration
status
```

AI jobs should include:

```text
analysisId
model
promptVersion
eventId
duration
status
```

Do not log:

- API keys
- passwords
- tokens
- sensitive user data

---

# 49. OBSERVABILITY

Track at least:

```text
API latency

API error rate

articles ingested

articles rejected

duplicates detected

candidate events created

AI analyses generated

AI failures

job failures

queue depth

processing latency

published events
```

Design observability before the system becomes large.

---

# 50. SECURITY

Implement:

- input validation
- rate limiting
- authentication
- authorization
- secure headers
- secret management
- admin protection
- SQL injection protection
- XSS protection
- CORS configuration
- request size limits

Never commit secrets.

Provide:

```text
.env.example
```

---

# 51. AUTHENTICATION

Authentication does not need to be over-engineered initially.

Public users:

```text
Browse events
Search
View countries
View topics
```

Admin users:

```text
Create events
Edit events
Review analysis
Publish events
Manage sources
```

If authentication is implemented, explain:

- authentication
- authorization
- roles
- sessions/tokens
- password handling
- security considerations

---

# 52. FRONTEND PAGES

Initial pages:

```text
/
 /events
 /events/[slug]
 /countries
 /countries/[code]
 /topics/[slug]
 /search
 /about
```

Admin:

```text
/admin
/admin/events
/admin/review
/admin/events/[id]
```

---

# 53. HOMEPAGE

The homepage should communicate the product immediately.

Possible sections:

```text
BharatLens

See the world through India's lens.

Today's major events

High India Impact

Recently Updated

Trending Topics

Countries to Watch
```

Do not overload the homepage.

---

# 54. EVENT CARD

An event card should communicate:

```text
Event title

Region

India Impact

Energy
Trade
Security

Last updated
```

Example:

```text
Iran-related shipping disruption

Middle East

India Impact:
HIGH

Energy     HIGH
Trade      HIGH
Security   MEDIUM

Updated 2 hours ago
```

---

# 55. EVENT PAGE

Event detail should contain:

```text
Title

What happened?

Why did it happen?

Why does India care?

India Impact

India Exposure

Timeline

Impact Chain

What to watch next

Evidence

Sources
```

Clearly distinguish:

```text
FACT
ANALYSIS
SCENARIO
```

---

# 56. "WHY INDIA CARES"

This is one of the most important features.

For each event explain relevant dimensions.

Example:

```text
Why India cares

Energy:
India has significant exposure to imported energy.

Trade:
Shipping disruptions can increase transportation costs.

Economy:
Higher energy costs may increase inflationary pressure.

Diplomacy:
India may need to balance relationships with multiple countries.

Security:
Regional instability can affect India's strategic interests.
```

Each important factual statement should have supporting evidence.

---

# 57. "WHAT TO WATCH NEXT"

Each event should contain structured watch items.

Examples:

```text
Oil prices
Shipping traffic
Government statements
Diplomatic negotiations
Sanctions
India's import data
Rupee
RBI commentary
```

The goal is to help users understand how the situation could evolve.

---

# 58. TIMELINE

Every important event should eventually have:

```text
Event
 ↓
Update
 ↓
Update
 ↓
Update
```

Timeline should show:

```text
Date
Title
What changed
Impact change
Sources
```

---

# 59. SHAREABLE CONTENT

Later, create shareable event cards.

Example:

```text
🇮🇳 INDIA IMPACT

Hormuz disruption

Energy       HIGH
Trade        HIGH
Inflation    MEDIUM
Security     MEDIUM

Why India cares:
...

BharatLens
See the world through India's lens.
```

Never use misleading clickbait.

---

# 60. GEOPOLITICAL MAP

This is a later feature.

India-centered world map.

Click country:

```text
India ↔ Country

Recent events
Trade
Energy
Defence
Diplomacy
Technology
Strategic relevance
```

Do not build this before the core event system works.

---

# 61. PERSONALIZATION

Later feature.

Users can select interests:

```text
China
Pakistan
Russia
USA
Middle East
Energy
Defence
Technology
Trade
```

Then create:

```text
Personal India Impact Feed
```

Do not implement personalization in MVP.

---

# 62. NOTIFICATIONS

Later.

Potential notifications:

```text
Major India-impact event

New event update

Impact level changed

Important event published
```

Possible channels:

```text
Email
Push
Telegram
```

Only add integrations when required.

---

# 63. DOCKER

Development should be reproducible with Docker Compose.

Initial services:

```text
PostgreSQL
Redis
API
Worker (idle/health in M0; BullMQ processors from M9)
Frontend
```

Do not add unnecessary infrastructure.

Provide:

```text
docker-compose.yml
.env.example
README.md
```

A new developer should be able to start the project with documented commands.

---

# 64. TESTING STRATEGY

Use layered testing.

## Unit tests

Test:

```text
domain logic
impact classification
event lifecycle
deduplication
validation
utilities
```

## Integration tests

Use real infrastructure where appropriate:

```text
API + PostgreSQL
API + Redis
Worker + PostgreSQL
Queue + worker
```

Do not mock everything.

## End-to-end tests

Test important workflows:

```text
Create event
 ↓
Add sources
 ↓
Create claims
 ↓
Generate analysis
 ↓
Review
 ↓
Publish
 ↓
Retrieve via API
```

---

# 65. TESTING RULE

Every new significant feature should include tests.

Do not postpone all testing until the end.

For bug fixes:

1. Reproduce.
2. Add regression test.
3. Fix.
4. Verify.

---

# 66. DOCUMENTATION

Documentation is a first-class requirement.

Create:

```text
README.md

docs/
  architecture.md
  database.md
  api.md
  ai-pipeline.md
  ingestion.md
  event-model.md
  india-impact.md
  evidence.md
  development.md
  deployment.md

  decisions/
    ADR-001-modular-monolith.md
    ADR-002-postgresql.md
    ADR-003-redis.md
    ADR-004-bullmq.md
    ADR-005-human-review.md
```

Documentation must explain the actual implementation.

Do not write fictional documentation.

Update documentation when architecture changes.

---

# 67. ARCHITECTURE DECISION RECORDS

For major decisions create ADRs.

Examples:

```text
Why modular monolith?

Why PostgreSQL?

Why Fastify?

Why Drizzle?

Why Redis?

Why BullMQ?

Why not Kafka?

Why not Elasticsearch?

Why human-in-the-loop AI?

Why evidence-first?
```

Each ADR should include:

```text
Context
Decision
Alternatives
Tradeoffs
Consequences
```

---

# 68. GIT

Use meaningful commits.

Examples:

```text
feat: add geopolitical event domain

feat: add event lifecycle

feat: add india impact assessment

feat: add evidence model

feat: add event timeline

feat: add event listing api

feat: add article ingestion worker

feat: add ai event classification

fix: prevent duplicate event creation

test: add event service integration tests

docs: document evidence architecture
```

Avoid giant commits.

Avoid unrelated changes in the same commit.

---

# 69. CODE STYLE

Use:

- TypeScript strict mode
- ESLint
- Prettier
- clear naming
- small focused functions
- explicit error handling
- strong typing
- no unnecessary `any`
- no magic values
- minimal abstraction
- clear interfaces

Do not write code merely to satisfy an abstraction pattern.

Prefer readable code.

---

# 70. DEPENDENCY RULE

Before adding a dependency:

Ask:

1. Do we actually need it?
2. Can the standard library solve it?
3. Is the dependency actively maintained?
4. Does it add significant complexity?
5. Does it introduce security risk?
6. Does it fit the architecture?

Do not add libraries just because they are popular.

---

# 71. ENVIRONMENT VARIABLES

Use environment variables.

Example:

```env
NODE_ENV=development

PORT=3000

DATABASE_URL=

REDIS_URL=

LLM_API_KEY=

NEWS_API_KEY=

LOG_LEVEL=info
```

Only add variables that are actually needed.

Never commit real credentials.

---

# 72. CONFIGURATION

Centralize configuration.

Do not scatter:

```text
process.env.X
```

throughout the application.

Validate configuration at startup.

Fail fast if required environment variables are missing.

---

# 73. PERFORMANCE

Do not optimize prematurely.

First establish correctness.

Then measure.

Potential optimization areas:

```text
database indexes
query optimization
Redis caching
API pagination
background processing
batch processing
connection pooling
```

Never claim a performance improvement without measurement.

---

# 74. FAILURE HANDLING

Every external dependency can fail.

Consider:

```text
PostgreSQL unavailable
Redis unavailable
LLM unavailable
News source unavailable
Queue unavailable
Network timeout
Rate limit
Malformed source response
Invalid AI response
```

The application should fail gracefully.

For background jobs:

```text
retry
backoff
dead-letter handling
observability
```

For public APIs:

Return meaningful errors.

---

# 75. DATA QUALITY

Data quality is more important than feature count.

Track:

```text
source
source timestamp
article timestamp
claim
evidence
analysis
model
prompt version
review status
publication status
```

Never silently overwrite important historical information.

---

# 76. HISTORICAL DATA

Geopolitical information evolves.

Prefer append-only historical records for:

```text
event updates
impact assessments
analysis runs
important evidence changes
```

Do not destroy history unnecessarily.

---

# 77. AI COST CONTROL

Do not call LLMs unnecessarily.

Before invoking AI:

```text
deduplicate
filter irrelevant articles
check cached analysis
check whether content changed
```

Use deterministic logic before LLM calls where possible.

Track:

```text
model
tokens if available
latency
success/failure
cost if available
```

---

# 78. AI PROMPT VERSIONING

Prompts should be versioned.

Example:

```text
event-analysis-v1
event-analysis-v2
```

Store the version with the analysis.

If the prompt changes, do not pretend old analyses were generated with the new prompt.

---

# 78.1 AI EVALUATION (FUTURE)

Do **not** build an evaluation harness in M8.

M8 is: structured output, Zod validation, prompt version, `analysis_runs`, human review.

Later, evaluation means measuring **behavior** against fixtures, not trusting a model-emitted percentage:

```text
schema violations
fabricated URLs or sources
FACT claims without evidence
claim-type disagreement vs gold labels
prompt-regression when versions change
```

Add this only after analysis is auditable and review exists. Prefer a small fixture set over a generic "LLM-as-judge" loop.

---

# 79. MVP ROADMAP

Build in this order.

## M0 — Foundation

Implement:

```text
repository structure
TypeScript configuration
Fastify API
Next.js frontend
PostgreSQL
Drizzle
Redis (running; not used as a cache/queue yet)
idle worker process (health + Redis connectivity)
Docker Compose
environment validation
logging
health checks
linting
formatting
testing foundation
```

Do **not** implement BullMQ processors, job enqueue, or unused queue abstractions in M0.

Definition of done:

```text
docker compose up
 ↓
API works
 ↓
Worker process starts and reports healthy (idle is OK)
 ↓
Frontend works
 ↓
PostgreSQL works
 ↓
Redis works
```

---

## M1 — Core Domain

Implement:

```text
events (one table; candidate via status)
sources
articles (ingestion/lifecycle states live here)
countries
topics
claims (on events; evidence_strength)
evidence
event updates
impact_assessments (versioned v1/v2/v3; analysis_confidence)
events.current_impact_assessment_id
```

Do not add `india_impacts`.

Add:

- migrations
- constraints (including unique `(event_id, version)`)
- indexes
- repositories/services
- tests

---

## M2 — REST API

Implement:

```text
GET /api/v1/events
GET /api/v1/events/:slug

GET /api/v1/countries
GET /api/v1/countries/:code

GET /api/v1/topics
GET /api/v1/topics/:slug

GET /api/v1/search

GET /api/v1/events/:id/sources
GET /api/v1/events/:id/claims
GET /api/v1/events/:id/impact
GET /api/v1/events/:id/updates
```

Add:

- filtering
- pagination
- sorting
- validation
- errors
- request IDs

---

## M3 — Frontend

Implement:

```text
homepage
event listing
event detail
country pages
topic pages
search
filters
timeline
India Impact visualization
```

Start with hand-authored events.

---

## M4 — Event Timeline

Implement:

```text
event updates
timeline
impact history
versioned assessments
```

---

## M5 — News Ingestion

Implement:

```text
source adapter
RSS ingestion
article normalization
article storage
content hashing
source metadata
```

Start with a small number of sources.

Ingest may run from a CLI or admin trigger. Do not require BullMQ yet.

---

## M6 — Deduplication

Implement:

```text
URL deduplication
external ID deduplication
content hash
normalized title
entity overlap
time-window matching
```

Evaluate semantic similarity later.

---

## M7 — Evidence + Claims

Implement:

```text
claim extraction
evidence association
source attribution
evidence_strength (computed from linked evidence where possible)
fact/analysis/scenario classification
```

Do not store LLM-invented source counts as evidence strength.

---

## M8 — AI Analysis

Implement:

```text
event classification
entity extraction
India relevance
India impact analysis
structured output
Zod validation
analysis versioning
prompt versioning
analysis_confidence on assessments (estimate, not probability)
analysis_runs audit fields
```

Do **not** implement AI evaluation harnesses in M8.

Admin/CLI may invoke analysis in-process. Do not require BullMQ yet. Do not run analysis on public GET.

---

## M9 — Background Processing

This is when **real** BullMQ is introduced.

Move expensive operations (ingest, analysis) off HTTP/CLI into queues.

Implement:

```text
queues
workers
retries
backoff
idempotency
failed jobs
job observability
```

---

## M10 — Admin + Human Review

Implement:

```text
candidate events
review queue
source inspection
claim inspection
AI analysis review
edit
approve
reject
publish
```

---

## M11 — Impact Chains

Implement:

```text
impact_chain_nodes
impact_chain_edges
```

Create visual representation.

Only implement after the underlying impact domain is stable.

---

## M12 — Search

Start with PostgreSQL FTS.

Measure actual requirements.

Only then evaluate:

```text
OpenSearch
Elasticsearch
```

---

## M13 — Geopolitical Map

Implement:

```text
world map
India-centered relationships
country interactions
event visualization
```

---

## M14 — Advanced Analytics

Potential features:

```text
impact trends
event trends
country trends
strategic dependencies
energy exposure
trade exposure
impact history
```

---

## M15 — AI Evaluation (future)

Not part of MVP.

After human review works, add fixture-based evaluation:

```text
gold claims and impact labels
schema / fabrication checks
prompt regression
```

Do not treat model-emitted percentages as evaluation scores.

---

# 80. WHAT NOT TO BUILD YET

Do not add these during MVP unless explicitly justified:

```text
Kafka
Kubernetes
microservices
Elasticsearch
OpenSearch
Neo4j
vector database
LangGraph
autonomous agents
AI evaluation harness (M15; after review exists)
BullMQ processors before M9
1:1 india_impacts table
separate candidate_events table
complex recommendation engine
real-time streaming infrastructure
multi-region deployment
```

If you believe one is necessary, explain:

```text
Current problem
Why existing architecture fails
Why this technology solves it
Alternative solutions
Operational cost
New failure modes
```

before implementing it.

---

# 81. LEARNING MODE

When implementing a new technology, pause and teach.

For example:

If implementing Redis:

Explain:

```text
What is Redis?

Why do we need it?

Why not PostgreSQL?

What consistency concerns exist?

What happens if Redis goes down?

What data is safe to cache?
```

If implementing BullMQ:

Explain:

```text
Producer
Queue
Job
Worker
Retry
Backoff
Concurrency
Failure
Idempotency
Dead-letter strategy
```

If implementing PostgreSQL:

Explain:

```text
Transactions
Indexes
Constraints
Isolation
Joins
Normalization
Connection pooling
```

If implementing AI:

Explain:

```text
structured output
hallucination
prompt versioning
model selection
validation
retrieval
evidence
evidence_strength vs analysis_confidence
evaluation (future; fixture-based, not fake percentages)
```

---

# 82. TEACH SYSTEM DESIGN

For important architecture decisions, explain:

```text
Requirements
 ↓
Constraints
 ↓
Options
 ↓
Tradeoffs
 ↓
Decision
 ↓
Failure modes
```

Do not only show diagrams.

Explain why the system works.

---

# 83. DO NOT HIDE COMPLEXITY

If something is difficult, say so.

If there is an architectural tradeoff, explain it.

If an approach is imperfect, document the limitation.

Do not pretend the system is more reliable than it is.

---

# 84. IMPLEMENTATION WORKFLOW

For every significant task:

## Step 1 — Inspect

Inspect the current repository.

Never assume the structure.

## Step 2 — Explain

Tell me:

- what exists
- what needs changing
- what files will be affected

## Step 3 — Design

Provide the proposed implementation.

## Step 4 — Implement

Make the smallest coherent change.

## Step 5 — Test

Run relevant tests.

## Step 6 — Verify

Check:

- type errors
- lint
- formatting
- tests
- runtime behavior

## Step 7 — Document

Update documentation if architecture or behavior changed.

## Step 8 — Summarize

Tell me:

```text
What changed
Why
Tests run
Potential issues
What I learned
Next step
```

---

# 85. NEVER DO THIS

Do not:

- rewrite the entire repository unnecessarily
- delete working code without reason
- introduce libraries without justification
- hide errors
- ignore TypeScript errors
- ignore failing tests
- create fake data and present it as real
- create fake sources
- invent APIs
- fabricate statistics
- commit secrets
- silently change architecture
- create microservices prematurely
- use AI for deterministic tasks unnecessarily

---

# 86. FIRST DEVELOPMENT TASK

DO NOT START BY BUILDING THE ENTIRE APPLICATION.

First perform repository discovery.

Inspect:

```text
directory structure
package.json
tsconfig
existing applications
existing packages
database
Docker
environment configuration
tests
linting
formatting
CI/CD
README
```

Then provide:

## 1. Current Architecture

Explain what already exists.

## 2. Proposed Architecture

Show:

```text
                Next.js
                   │
                   ▼
               Fastify API
                   │
        ┌──────────┼──────────┐
        ▼          ▼          ▼
      Events     Impact     Search
        │          │          │
        └──────────┼──────────┘
                   ▼
              PostgreSQL
```

Background (BullMQ only after M9):

```text
Sources
   ↓
Ingestion
   ↓
Articles
   ↓
Candidate Event (same events table)
   ↓
Event
   ├── Claims → Evidence
   ├── Updates
   └── Impact Assessments (v1, v2, v3)
   ↓
AI Analysis (CLI/admin until M9)
   ↓
Human Review
   ↓
Published Event
```

## 3. Proposed Database Model

Show:

- entities
- relationships
- indexes
- constraints
- versioning

## 4. Proposed Folder Structure

Show actual folders.

## 5. Technology Choices

For each technology:

```text
Technology
Problem solved
Why chosen
Alternative
Tradeoffs
```

## 6. Development Roadmap

Break the work into small milestones.

For each milestone:

```text
Goal
Tasks
Files/modules
Concepts learned
Tests
Definition of done
```

## 7. Risks

Identify:

```text
data quality
AI hallucination
copyright
source reliability
deduplication
political neutrality
security
scalability
cost
```

DO NOT begin implementation until this discovery phase is complete.

---

# 87. M0 APPROVAL GATE

After discovery, stop and wait for approval before implementing M0 if the proposed architecture differs materially from this document.

Do not silently make major architecture changes.

If the architecture matches this document and implementation is straightforward, proceed only when explicitly instructed.

---

# 88. DEFINITION OF DONE

The MVP is complete when:

1. Project starts with Docker.
2. API starts successfully.
3. Worker starts successfully.
4. Frontend starts successfully.
5. PostgreSQL works.
6. Redis works.
7. Database migrations work.
8. Events can be created.
9. Events can be retrieved.
10. Events can be updated.
11. Events can have sources.
12. Events can have claims.
13. Claims can have evidence.
14. Events can have countries.
15. Events can have topics.
16. Events can have impact assessments.
17. Impact assessments are versioned (not a 1:1 `india_impacts` row).
18. Events have timelines.
    18a. `evidence_strength` and `analysis_confidence` are stored as separate fields.
    18b. Candidates are events by status, not a second table.
19. Events can be searched.
20. Events can be filtered.
21. AI analysis can be generated.
22. AI output is schema validated.
23. AI analysis is auditable.
24. Human review is possible.
25. Events can be published.
26. Published events show sources.
27. Tests pass.
28. Lint passes.
29. Type checking passes.
30. Documentation reflects the actual system.

---

# 89. FINAL PRODUCT VISION

BharatLens should eventually become:

> **An India-focused geopolitical intelligence platform that transforms global events into understandable, source-backed explanations of their potential impact on India.**

The final experience should feel like:

```text
                 🌍 WORLD EVENT
                       │
                       ▼
                  WHAT HAPPENED
                       │
                       ▼
                  WHY IT HAPPENED
                       │
                       ▼
                 WHY INDIA CARES
                       │
                       ▼
                  INDIA EXPOSURE
                       │
                       ▼
                  INDIA IMPACT
                       │
                       ▼
                    SCENARIOS
                       │
                       ▼
                  WHAT TO WATCH
                       │
                       ▼
                     SOURCES
```

The product should prioritize:

```text
Accuracy
   +
Evidence
   +
Context
   +
Transparency
   +
Good UX
   +
Strong Engineering
```

over:

```text
Feature count
+
Buzzwords
+
Premature infrastructure
```

---

# 90. MOST IMPORTANT RULE

The objective is NOT:

> "Generate as much code as possible."

The objective is:

> **Build a production-quality geopolitical platform while making the developer understand the architecture and engineering decisions behind it.**

When there are multiple valid approaches:

1. Explain them.
2. Compare tradeoffs.
3. Recommend one.
4. Implement the simplest appropriate option.

When the system grows, evolve the architecture based on evidence.

Do not build complexity for hypothetical scale.

Build for the current requirement.

Measure.

Then scale.
