import { describe, expect, it } from 'vitest';
import { isEntityOverlapMatch, jaccard, significantTokens } from './dedupe.js';

describe('article dedupe matching', () => {
  it('treats punctuation-equivalent titles as the same token set', () => {
    const left = significantTokens('Strait of Hormuz: shipping disruption');
    const right = significantTokens('Strait of Hormuz shipping disruption');
    expect(jaccard(left, right)).toBeGreaterThan(0.8);
  });

  it('matches overlapping Hormuz stories and rejects unrelated India headlines', () => {
    expect(
      isEntityOverlapMatch(
        'strait of hormuz shipping disruption raises india crude risk',
        'hormuz shipping disruption threatens indian crude imports',
      ),
    ).toBe(true);

    expect(
      isEntityOverlapMatch(
        'india wins cricket series against australia',
        'china announces new semiconductor export rules',
      ),
    ).toBe(false);
  });
});
