import { describe, expect, it } from 'vitest';
import { resolveAnalysisModel } from '../provider.js';
import { buildAnalysisPrompt } from '../prompt.js';
import { aggregate, compareAgainstBaseline, evaluateRaw } from './engine.js';
import { ADVERSARIAL_CASES, EVAL_FIXTURES } from './fixtures.js';

const ALLOWED = new Set(['https://example.test/allowed']);
const NEUTRAL_GOLD = { overallLevel: 'MEDIUM', dominantClaimType: 'UNKNOWN' } as const;

describe('evaluation harness (offline tier)', () => {
  it('adversarial corpus behaves exactly as expected through the real pipeline stages', () => {
    for (const testCase of ADVERSARIAL_CASES) {
      const result = evaluateRaw(testCase.id, testCase.raw, ALLOWED, NEUTRAL_GOLD);

      expect(result.schemaPass, `${testCase.id}: schemaPass`).toBe(testCase.expect.schemaPass);

      if (testCase.expect.factLeakRaw !== undefined) {
        expect(result.factLeakRaw, `${testCase.id}: factLeakRaw`).toBe(testCase.expect.factLeakRaw);
      }
      if (testCase.expect.fabricationCaught !== undefined) {
        expect(result.fabricationCaught ?? false, `${testCase.id}: fabricationCaught`).toBe(
          testCase.expect.fabricationCaught,
        );
      }
      if (testCase.expect.chainValid !== undefined) {
        expect(result.chainValid, `${testCase.id}: chainValid`).toBe(testCase.expect.chainValid);
      }
    }
  });

  it('stub model produces schema-valid, leak-free output for every scenario fixture', async () => {
    const stub = resolveAnalysisModel({});
    const results = [];

    for (const fixture of EVAL_FIXTURES) {
      const prompt = buildAnalysisPrompt({
        ...fixture.prompt,
        claims: [],
        evidenceUrls: fixture.evidenceUrls,
      });
      const raw = await stub.complete(prompt);
      results.push(evaluateRaw(fixture.id, raw, new Set(fixture.evidenceUrls), fixture.gold));
    }

    const metrics = aggregate(results);
    // The deterministic stub must always clear the structural bars.
    expect(metrics.schemaPassCount).toBe(metrics.total);
    expect(metrics.noFactLeakCount).toBe(metrics.total);
    expect(metrics.chainValidCount).toBe(metrics.total);
    // Gold alignment is measured and reported, not forced: stub quality is
    // allowed to be imperfect, but adjacent-or-exact should hold for most.
    expect(metrics.levelExactCount + metrics.levelAdjacentCount).toBeGreaterThanOrEqual(3);
  });

  it('flags baseline regressions and ignores improvements', () => {
    const current = {
      total: 12,
      schemaPassCount: 10,
      noFactLeakCount: 9,
      fabricationCaughtCount: 2, // improved over baseline
      chainValidCount: 8, // dropped
      levelExactCount: 2,
      levelAdjacentCount: 6,
      claimTypeAgreeCount: 3,
    };

    const regressions = compareAgainstBaseline(current, {
      schemaPassCount: 10,
      noFactLeakCount: 9,
      fabricationCaughtCount: 1,
      chainValidCount: 9,
    });

    expect(regressions).toHaveLength(1);
    expect(regressions[0]).toMatchObject({ metric: 'chainValidCount', baseline: 9, current: 8 });
  });
});
