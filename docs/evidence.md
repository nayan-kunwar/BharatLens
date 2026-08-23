# Evidence and claims (M7)

Claims live on the **event**, not only on articles. Optional `articleId` / `sourceId` record provenance.

## Types

| Type     | Meaning                               |
| -------- | ------------------------------------- |
| FACT     | Directly supported by linked evidence |
| ANALYSIS | Interpretation based on facts         |
| SCENARIO | A possible future                     |
| UNKNOWN  | Insufficient reliable information     |

RSS headline extraction **never** assigns FACT. A headline is not a verified fact. FACT stays a reviewer/seed decision.

## Evidence strength vs analysis confidence

These stay separate fields.

`evidence_strength` (`WEAK` / `MODERATE` / `STRONG`) is computed from linked `evidence` rows:

- distinct `source_id` → `sourceCount` / `independentSourceCount`
- distinct sources whose type is `GOVERNMENT` or `INTERNATIONAL_ORG` → `officialSourceCount`

An LLM percentage is not stored. `evidenceReason` is a sentence that restates those counts.

## Extractor (deterministic)

```bash
pnpm claims:extract
pnpm claims:extract -- --event=strait-of-hormuz-shipping-disruption
```

```text
Published event
 ↓
Canonical articles whose titles overlap the event (coverage match: shared gazetteer entity + two tokens)
 ↓
Attach article to event
 ↓
If the article overlaps an existing claim → add evidence URL + short excerpt
Else → PENDING claim (UNKNOWN / ANALYSIS / SCENARIO) + evidence
```

Re-runs are idempotent: unique `(event, statement)` and `(claim, url)`. Auto-extracted claims stay **PENDING** until human review (M10). Public GETs still return **APPROVED** claims only.

Do not copy full articles. Excerpts are capped at 500 characters.
