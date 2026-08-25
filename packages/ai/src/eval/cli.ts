import { readFileSync, writeFileSync } from 'node:fs';
import { resolveAnalysisModel } from '../provider.js';
import { buildAnalysisPrompt } from '../prompt.js';
import { aggregate, compareAgainstBaseline, evaluateRaw, type AggregateMetrics } from './engine.js';
import { ADVERSARIAL_CASES, EVAL_FIXTURES } from './fixtures.js';

const BASELINE_PATH = new URL('./baseline.json', import.meta.url);

function usage(): never {
  console.error(`Usage:
  pnpm eval:ai --model=stub [--json=<path>]
  pnpm eval:ai --model=live [--check] [--update-baseline] [--json=<path>]

--model=stub  Offline deterministic model; safe for CI.
--model=live  Uses LLM_API_KEY / LLM_MODEL / LLM_BASE_URL.
--check       Fail when any metric drops below the committed baseline.
--update-baseline
              Overwrite baseline.json with this run's totals (deliberate act).`);
  process.exit(1);
}

function parseArgs(): {
  model: 'stub' | 'live';
  check: boolean;
  updateBaseline: boolean;
  jsonPath?: string;
} {
  const args = process.argv.slice(2);
  const get = (name: string) =>
    args.find((arg) => arg.startsWith(`--${name}=`))?.slice(name.length + 3);
  const has = (name: string) => args.includes(`--${name}`);

  const model = get('model');
  if (model !== 'stub' && model !== 'live') {
    usage();
  }
  return {
    model,
    check: has('check'),
    updateBaseline: has('update-baseline'),
    jsonPath: get('json'),
  };
}

function renderTable(rows: Array<Record<string, unknown>>): string {
  const header = [
    'fixture'.padEnd(26),
    'schema',
    'noFactLeak',
    'fabCaught',
    'chainValid',
    'exact',
    'adjacent',
    'claimType',
  ];
  const lines = [header.join(' | ')];
  for (const row of rows) {
    const mark = (value: boolean | null) => (value === null ? '  —  ' : value ? ' ✓  ' : ' ✗  ');
    lines.push(
      [
        String(row.id).padEnd(26),
        mark(row.schemaPass as boolean)
          .trimEnd()
          .padStart(6),
        mark(row.noFactLeak as boolean | null).padStart(10),
        mark(row.fabricationCaught as boolean | null).padStart(9),
        mark(row.chainValid as boolean | null).padStart(10),
        mark(row.levelExact as boolean | null).padStart(5),
        mark(row.levelAdjacent as boolean | null).padStart(8),
        mark(row.claimTypeAgreement as boolean | null).padStart(9),
      ].join(' | '),
    );
  }
  return lines.join('\n');
}

async function main() {
  const options = parseArgs();

  let model;
  if (options.model === 'stub') {
    model = resolveAnalysisModel({});
  } else {
    if (!process.env.LLM_API_KEY?.trim()) {
      console.error('LLM_API_KEY is required for --model=live');
      process.exit(1);
    }
    model = resolveAnalysisModel();
  }

  console.log(`Running ${EVAL_FIXTURES.length} fixtures against model "${model.name}"...\n`);

  const results = [];
  for (const fixture of EVAL_FIXTURES) {
    const prompt = buildAnalysisPrompt({
      ...fixture.prompt,
      claims: [],
      evidenceUrls: fixture.evidenceUrls,
    });
    let raw: string;
    try {
      raw = await model.complete(prompt);
    } catch (error) {
      console.error(
        `fixture ${fixture.id}: model call failed:`,
        error instanceof Error ? error.message : error,
      );
      process.exit(1);
    }

    const result = evaluateRaw(fixture.id, raw, new Set(fixture.evidenceUrls), fixture.gold);
    results.push({
      ...result,
      noFactLeak: result.factLeakRaw === null ? null : !result.factLeakRaw,
    });
  }

  // Adversarial corpus joins the report so defenses are visible in one place.
  for (const testCase of ADVERSARIAL_CASES) {
    const gold = { overallLevel: 'MEDIUM', dominantClaimType: 'UNKNOWN' } as const;
    const result = evaluateRaw(
      testCase.id,
      testCase.raw,
      new Set(['https://example.test/allowed']),
      gold,
    );
    results.push({
      ...result,
      noFactLeak: result.factLeakRaw === null ? null : !result.factLeakRaw,
    });
  }

  const metrics: AggregateMetrics = aggregate(results);

  console.log(renderTable(results));
  console.log('\nTotals:', JSON.stringify(metrics, null, 2));

  if (options.jsonPath) {
    writeFileSync(
      options.jsonPath,
      JSON.stringify({ model: model.name, metrics, results }, null, 2),
    );
    console.log(`Report written to ${options.jsonPath}`);
  }

  if (options.updateBaseline) {
    writeFileSync(BASELINE_PATH, `${JSON.stringify(metrics, null, 2)}\n`);
    console.log('Baseline updated.');
    return;
  }

  try {
    const baselineText = readFileSync(BASELINE_PATH, 'utf8');
    const baseline = JSON.parse(baselineText) as Partial<Record<string, number>>;
    const regressions = compareAgainstBaseline(metrics, baseline);

    if (regressions.length > 0) {
      console.error('\nRegressions against committed baseline:');
      for (const regression of regressions) {
        console.error(
          `  ${regression.metric}: ${regression.current} < baseline ${regression.baseline}`,
        );
      }
      if (options.check) {
        process.exitCode = 1;
      } else {
        console.error('(informational; pass --check to fail the run)');
      }
    } else {
      console.log('\nNo regressions against the committed baseline.');
    }
  } catch {
    console.warn('\nNo baseline.json found yet — run with --update-baseline to record one.');
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
