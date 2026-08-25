# ADR-012: Fixture-based AI evaluation — behavior over percentages

## Status

Accepted and implemented in M15.

## Context

AGENTS.md §78.1 deferred evaluation until analysis was auditable (`analysis_runs`, prompt versions) and human review existed — both landed in M8–M10. The rule for the harness itself was fixed in advance: measure **behavior against fixtures**, never trust a model-emitted percentage, never build a generic LLM-as-judge loop. A small fixture set beats an elaborate one.

## Decision

A two-tier harness living inside `packages/ai/src/eval/`:

**Tier 1 — offline defense checks (run in every `pnpm test`).** An adversarial corpus of raw model outputs (malformed JSON, numeric confidence, FACT leaks, invented URLs, cyclic chains) flows through the real pipeline stages: `parseEventAnalysisJson → validateEventAnalysis → sanitizeEventAnalysis` plus the shared chain-graph gate. Each case asserts exact expected flags. These tests are deterministic, network-free, and prove the _defenses_ work.

**Tier 2 — live-model scenario runs (`pnpm eval:ai --model=live`).** Six gold-labeled scenarios exercise the full prompt path; outputs are scored on behavioral counts:

- schema conformance
- raw FACT leaks (pre-sanitization)
- fabricated URLs caught by the sanitizer
- impact-chain graph validity
- overall-level agreement with gold, reported as **exact and adjacent-rank counts separately** (ordinal distance ≤ 1 is reported, never merged into a "score")
- dominant claim-type agreement

The deterministic stub runs Tier 2 offline too — its output is stable, so CI gets a real regression net for prompt/schema changes without spending tokens.

**Regression gate:** totals are compared against a committed `baseline.json`. `--check` fails when any positive metric drops below the recorded value; `--update-baseline` regenerates it as a deliberate, reviewable commit. Improvements never fail the run.

## Alternatives

- **LLM-as-judge**: replaces measurement with another model's opinion; costs per run; non-deterministic. Rejected outright by §78.1.
- **Model-emitted confidence as accuracy**: meaningless — an LLM saying "82% confident" is not 82% accurate.
- **Exact-only level scoring**: stricter but noisy for genuinely debatable ordinal levels; showing both counts keeps humans informed without inventing a blended score.
- **Separate packages/eval workspace**: cleaner boundary, more ceremony; the harness is tightly coupled to ai-package internals and stays there.

## Tradeoffs

- Gold labels are editorial judgments committed to the repo; they document intent rather than ground truth. Human review remains the arbiter.
- Small N means single-fixture flips are visible regressions — treated as information for human judgment, which is exactly what the baseline gate is for.
- Stub drift changes baselines; updating `baseline.json` must be part of any intentional stub/prompt change's commit.

## Consequences

- `pnpm eval:ai --model=stub` is safe to run anywhere, anytime.
- Prompt version bumps should include refreshed baseline + fixture review.
- This completes the MVP milestone list in AGENTS.md §79.
