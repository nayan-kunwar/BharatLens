import { describe, expect, it } from 'vitest';
import { sanitizeEventAnalysis, validateEventAnalysis } from './index.js';

const allowed = new Set(['https://example.test/real']);

function baseClaim(overrides: Record<string, unknown> = {}) {
  return validateEventAnalysis({
    eventType: 'ENERGY_SHOCK',
    indiaRelevant: true,
    indiaRelevanceReason: 'Linked metadata mentions India energy imports.',
    entities: [],
    summary: 'Disruption reported.',
    whyItHappened: 'UNKNOWN from metadata.',
    whyIndiaCares: 'Import exposure is an interpretation.',
    claims: [
      {
        statement: 'Ships were delayed.',
        type: 'FACT',
        evidenceUrls: ['https://example.test/real'],
        ...overrides,
      },
    ],
    indiaImpact: {
      overallLevel: 'MEDIUM',
      analysisConfidence: 'LOW',
      reasoning: 'Estimate.',
      categories: [{ category: 'ENERGY', level: 'MEDIUM', reasoning: 'Estimate.' }],
    },
    watchNext: [],
  });
}

describe('sanitizeEventAnalysis', () => {
  it('never keeps FACT on a model-emitted claim', () => {
    const sanitized = sanitizeEventAnalysis(baseClaim(), allowed);
    expect(sanitized.claims[0]?.type).not.toBe('FACT');
  });

  it('rejects fabricated URLs instead of storing them', () => {
    const analysis = baseClaim({ evidenceUrls: ['https://example.test/invented'] });
    expect(() => sanitizeEventAnalysis(analysis, allowed)).toThrow(/not in the source set/);
  });
});
