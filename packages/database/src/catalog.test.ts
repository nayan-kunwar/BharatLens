import { describe, expect, it } from 'vitest';
import { computeEvidenceStrength } from './catalog.js';

describe('computeEvidenceStrength', () => {
  it('is weak with a single source', () => {
    expect(
      computeEvidenceStrength({
        sourceCount: 1,
        independentSourceCount: 1,
        officialSourceCount: 0,
      }),
    ).toBe('WEAK');
  });

  it('is moderate with two independent sources', () => {
    expect(
      computeEvidenceStrength({
        sourceCount: 2,
        independentSourceCount: 2,
        officialSourceCount: 0,
      }),
    ).toBe('MODERATE');
  });

  it('is strong with official plus two independent sources', () => {
    expect(
      computeEvidenceStrength({
        sourceCount: 3,
        independentSourceCount: 2,
        officialSourceCount: 1,
      }),
    ).toBe('STRONG');
  });
});
