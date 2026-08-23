import { describe, expect, it } from 'vitest';
import { parseEventAnalysisJson, validateEventAnalysis } from './schema.js';

const valid = {
  eventType: 'ENERGY_SHOCK',
  indiaRelevant: true,
  indiaRelevanceReason: 'Import exposure is discussed in linked metadata.',
  entities: [{ name: 'India', kind: 'COUNTRY' }],
  summary: 'A shipping disruption was reported.',
  whyItHappened: 'Immediate causes remain UNKNOWN from the supplied metadata.',
  whyIndiaCares: 'Energy import routes are mentioned; this is ANALYSIS.',
  claims: [
    {
      statement: 'A prolonged disruption could raise import costs.',
      type: 'SCENARIO',
      evidenceUrls: ['https://example.test/a'],
    },
  ],
  indiaImpact: {
    overallLevel: 'HIGH',
    analysisConfidence: 'LOW',
    reasoning: 'Estimate only; not a probability.',
    categories: [
      {
        category: 'ENERGY',
        level: 'HIGH',
        reasoning: 'Energy-route language in the source set.',
      },
    ],
  },
  watchNext: ['Official shipping advisories'],
};

describe('event analysis schema', () => {
  it('accepts structured JSON and extracts a fenced block', () => {
    const parsed = parseEventAnalysisJson(`\`\`\`json\n${JSON.stringify(valid)}\n\`\`\``);
    const analysis = validateEventAnalysis(parsed);
    expect(analysis.indiaImpact.analysisConfidence).toBe('LOW');
    expect(analysis.claims[0]?.type).toBe('SCENARIO');
  });

  it('rejects a numeric confidence percentage', () => {
    expect(() =>
      validateEventAnalysis({
        ...valid,
        indiaImpact: { ...valid.indiaImpact, analysisConfidence: 0.82 },
      }),
    ).toThrow();
  });
});
