import { describe, expect, it } from 'vitest';
import { BUCKET_LABELS, countBucket } from './map-scale';

describe('countBucket', () => {
  it('maps counts to explainable buckets', () => {
    expect(countBucket(0)).toBe('none');
    expect(countBucket(1)).toBe('low');
    expect(countBucket(2)).toBe('low');
    expect(countBucket(3)).toBe('mid');
    expect(countBucket(5)).toBe('mid');
    expect(countBucket(6)).toBe('high');
    expect(countBucket(11)).toBe('high');
    expect(countBucket(12)).toBe('max');
  });

  it('treats invalid input as none', () => {
    expect(countBucket(-3)).toBe('none');
    expect(countBucket(Number.NaN)).toBe('none');
  });

  it('labels every bucket', () => {
    for (const bucket of ['none', 'low', 'mid', 'high', 'max'] as const) {
      expect(BUCKET_LABELS[bucket]).toBeTruthy();
    }
  });
});
