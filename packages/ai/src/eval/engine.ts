import { IMPACT_LEVEL_RANK, validateChainGraph } from '@bharatlens/shared';
import { parseEventAnalysisJson, sanitizeEventAnalysis, validateEventAnalysis } from '../index.js';
import type { GoldLabels } from './fixtures.js';

export type FixtureResult = {
  id: string;
  /** Raw output parsed and validated against the Zod schema. */
  schemaPass: boolean;
  /** Model emitted a FACT claim before sanitization. null when schema failed. */
  factLeakRaw: boolean | null;
  /** Sanitizer rejected invented evidence URLs. null when schema failed or no fabrication attempted. */
  fabricationCaught: boolean | null;
  /** Impact chain passes graph validation. null when schema failed. */
  chainValid: boolean | null;
  /** overallLevel equals the gold label exactly. null when schema failed. */
  levelExact: boolean | null;
  /** overallLevel within one ordinal rank of gold. null when schema failed. */
  levelAdjacent: boolean | null;
  /** Dominant model claim type matches gold. null when schema failed or no claims. */
  claimTypeAgreement: boolean | null;
};

export type AggregateMetrics = {
  total: number;
  schemaPassCount: number;
  noFactLeakCount: number;
  fabricationCaughtCount: number;
  chainValidCount: number;
  levelExactCount: number;
  levelAdjacentCount: number;
  claimTypeAgreeCount: number;
};

/**
 * Scores one raw model output against gold labels. All metrics are behavioral
 * counts — model-emitted confidence is never treated as an evaluation score.
 */
export function evaluateRaw(
  id: string,
  raw: string,
  allowedUrls: Set<string>,
  gold: GoldLabels,
): FixtureResult {
  const result: FixtureResult = {
    id,
    schemaPass: false,
    factLeakRaw: null,
    fabricationCaught: null,
    chainValid: null,
    levelExact: null,
    levelAdjacent: null,
    claimTypeAgreement: null,
  };

  let validated;
  try {
    const parsed = parseEventAnalysisJson(raw);
    validated = validateEventAnalysis(parsed);
    result.schemaPass = true;
  } catch {
    return result;
  }

  result.factLeakRaw = validated.claims.some((claim) => claim.type === 'FACT');

  try {
    sanitizeEventAnalysis(validated, allowedUrls);
    // Sanitizer only throws on fabricated URLs; reaching here means either
    // nothing was fabricated or everything was within the allowlist.
    result.fabricationCaught = false;
  } catch (error) {
    result.fabricationCaught =
      error instanceof Error && /not in the source set/.test(error.message);
  }

  const chain = validated.impactChain;
  result.chainValid =
    validateChainGraph(
      chain.nodes.map((node) => ({ ...node })),
      chain.edges.map((edge) => ({ from: edge.from, to: edge.to })),
    ) === null;

  const goldRank = IMPACT_LEVEL_RANK[gold.overallLevel];
  const actualRank = IMPACT_LEVEL_RANK[validated.indiaImpact.overallLevel];
  result.levelExact = actualRank === goldRank;
  result.levelAdjacent = !result.levelExact && Math.abs(actualRank - goldRank) === 1;

  if (validated.claims.length > 0) {
    const counts = new Map<string, number>();
    for (const claim of validated.claims) {
      counts.set(claim.type, (counts.get(claim.type) ?? 0) + 1);
    }
    const dominant = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]![0];
    result.claimTypeAgreement = dominant === gold.dominantClaimType;
  }

  return result;
}

/** Sums per-fixture results into reportable totals. Nulls are excluded. */
export function aggregate(results: FixtureResult[]): AggregateMetrics {
  const countTrue = (pick: (result: FixtureResult) => boolean | null) =>
    results.filter((result) => pick(result) === true).length;

  return {
    total: results.length,
    schemaPassCount: countTrue((r) => r.schemaPass),
    noFactLeakCount: countTrue((r) => r.factLeakRaw === false),
    fabricationCaughtCount: countTrue((r) => r.fabricationCaught === true),
    chainValidCount: countTrue((r) => r.chainValid === true),
    levelExactCount: countTrue((r) => r.levelExact === true),
    levelAdjacentCount: countTrue((r) => r.levelAdjacent === true),
    claimTypeAgreeCount: countTrue((r) => r.claimTypeAgreement === true),
  };
}

export type BaselineRegression = {
  metric: keyof Omit<AggregateMetrics, 'total'>;
  baseline: number;
  current: number;
};

/**
 * Compares an aggregate against a stored baseline. Any positive-count metric
 * that dropped below its recorded value is a regression for human review.
 */
export function compareAgainstBaseline(
  current: AggregateMetrics,
  baseline: Partial<Record<string, number>>,
): BaselineRegression[] {
  const metrics: Array<keyof Omit<AggregateMetrics, 'total'>> = [
    'schemaPassCount',
    'noFactLeakCount',
    'fabricationCaughtCount',
    'chainValidCount',
    'levelExactCount',
    'levelAdjacentCount',
    'claimTypeAgreeCount',
  ];

  const regressions: BaselineRegression[] = [];
  for (const metric of metrics) {
    const expected = baseline[metric];
    if (typeof expected === 'number' && current[metric] < expected) {
      regressions.push({ metric, baseline: expected, current: current[metric] });
    }
  }
  return regressions;
}
