import { describe, expect, it } from 'vitest';
import { classifyClaimType, computeEvidenceStrength, describeEvidenceCounts } from './evidence.js';

describe('evidence strength', () => {
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

  it('describes counts without a percentage', () => {
    expect(
      describeEvidenceCounts({
        sourceCount: 1,
        independentSourceCount: 1,
        officialSourceCount: 0,
        evidenceStrength: 'WEAK',
      }),
    ).toContain('not a model score');
  });
});

describe('claim type classification', () => {
  it('labels speculative language as SCENARIO, interpretive as ANALYSIS, else UNKNOWN', () => {
    expect(classifyClaimType('If the disruption lasts months, inflation could rise.')).toBe(
      'SCENARIO',
    );
    expect(classifyClaimType('This raises India energy exposure through import costs.')).toBe(
      'ANALYSIS',
    );
    expect(classifyClaimType('Shipping disruption reported near Hormuz')).toBe('UNKNOWN');
  });

  it('never classifies a headline as FACT', () => {
    expect(classifyClaimType('UN announces ceasefire talks in Geneva')).not.toBe('FACT');
  });
});
