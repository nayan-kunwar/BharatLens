# AI analysis pipeline (M8)

M8 adds **structured, auditable analysis**. It is not an autonomous agent and it does not publish.

```text
Event metadata + linked claims/articles
        │
        ▼
Versioned prompt (event-analysis-v1)
        │
        ▼
Model (HTTP if LLM_API_KEY is set, otherwise a deterministic stub)
        │
        ▼
JSON parse → Zod → URL allowlist
        │
        ▼
analysis_runs row + DRAFT impact assessment
        │
        ▼
Human review (M10) → publish
```

Public GET handlers do **not** call a model. Since M9 analysis runs as a BullMQ job (`pnpm queue analyze --event=<slug> [--force]`) with a per-day duplicate guard and a DRAFT-assessment guard; the CLI still works as a direct run. There is **no evaluation harness** (M15).

## What is stored

| Field                                    | Meaning                                          |
| ---------------------------------------- | ------------------------------------------------ |
| `analysis_runs.model_name`               | Which model produced the JSON                    |
| `analysis_runs.prompt_version`           | `event-analysis-v1` today                        |
| `analysis_runs.input_references`         | Event, claim ids, article ids, allowed URLs      |
| `analysis_runs.output`                   | Validated JSON after sanitization                |
| `impact_assessments.analysis_confidence` | LOW / MEDIUM / HIGH **estimate**                 |
| `impact_assessments.evidence_strength`   | Computed from linked evidence, **not** the model |

A successful run creates a **DRAFT** assessment version. It does not set `events.current_impact_assessment_id`. Existing published pages keep the last published assessment.

Unpublished events move `CANDIDATE → DRAFT → ANALYZED → REVIEW_REQUIRED`. Published events stay public.

## Safety checks

1. Schema validation (Zod). Extra fields are stripped; wrong enums fail the run.
2. Any `http(s)` URL not in the input allowlist fails the run (`ANALYSIS_FAILED` / run status `FAILED`).
3. Model claims are stored `PENDING` and never as `FACT`.
4. `analysisConfidence` cannot be a percentage.

If evidence is thin, UNKNOWN / LOW confidence is the correct outcome.

## CLI

```bash
pnpm analyze:event -- --event=strait-of-hormuz-shipping-disruption
```

Without `LLM_API_KEY`, the CLI uses `deterministic-stub`. That stub still goes through Zod and the URL allowlist. It is for local wiring, not a substitute for a reviewed analysis.

Optional env:

```text
LLM_API_KEY
LLM_MODEL          (default gpt-4o-mini)
LLM_BASE_URL       (default https://api.openai.com/v1)
```

The API process does not require these variables. Missing keys must not take public reads down.

## Why not call the model from GET /events/:slug

Latency, cost, and hallucination risk. Readers should see reviewed assessments. Re-analysis is an explicit CLI (later: admin or BullMQ job).

## Failure modes

| Failure                  | Effect                                     |
| ------------------------ | ------------------------------------------ |
| Invalid JSON / Zod       | `analysis_runs` FAILED; no assessment      |
| Invented URL             | FAILED; no assessment                      |
| LLM HTTP error / timeout | FAILED; no assessment                      |
| Re-run                   | New run + next DRAFT version (append-only) |

M10 will add `reviewed_at` / `reviewed_by` usage and publish/reject. Those columns exist now so the audit row is complete.

## Evaluation harness (M15)

`pnpm eval:ai --model=stub|live [--check] [--update-baseline] [--json=path]`

Two tiers (see `ADR-012-eval-harness.md`):

- **Offline (runs inside the normal test suite):** an adversarial output corpus
  is pushed through parse -> validate -> sanitize and the chain-graph gate.
  Proves schema enforcement, FACT stripping, URL-fabrication rejection, and
  chain validity without any network call.
- **Live scenarios:** six gold-labeled fixtures scored on behavioral counts —
  schema pass, raw FACT leaks, fabrication caught, chain validity, overall-level
  exact vs adjacent-rank agreement, dominant claim-type agreement. Results are
  compared against a committed `baseline.json`; `--check` fails on any dropped
  metric. Levels are never merged into a score, and model-emitted confidence is
  never treated as accuracy.

Update `baseline.json` only as a deliberate commit alongside intentional
prompt/stub changes.
