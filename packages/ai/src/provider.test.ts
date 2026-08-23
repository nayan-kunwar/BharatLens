import { describe, expect, it } from 'vitest';
import { DeterministicAnalysisModel } from './provider.js';
import { parseEventAnalysisJson, validateEventAnalysis } from './schema.js';
import { sanitizeEventAnalysis } from './sanitize.js';

describe('DeterministicAnalysisModel', () => {
  it('returns schema-valid JSON that only cites URLs present in the prompt', async () => {
    const model = new DeterministicAnalysisModel();
    const raw = await model.complete(
      'Event: Hormuz crude\nAllowed evidence URLs\n["https://example.test/hormuz"]',
    );
    const analysis = validateEventAnalysis(parseEventAnalysisJson(raw));
    const sanitized = sanitizeEventAnalysis(analysis, new Set(['https://example.test/hormuz']));
    expect(sanitized.indiaImpact.analysisConfidence).toBe('LOW');
    expect(sanitized.claims.every((claim) => claim.type !== 'FACT')).toBe(true);
  });
});
