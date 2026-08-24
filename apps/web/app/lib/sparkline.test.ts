import { describe, expect, it } from 'vitest';
import { sparklinePoints } from './sparkline';

describe('sparklinePoints', () => {
  it('maps values across the full width with headroom padding', () => {
    const points = sparklinePoints([0, 5, 10], 100, 40);
    const [first, middle, last] = points.split(' ');

    expect(first).toBe('0.0,39.0');
    expect(middle).toBe('50.0,20.0');
    expect(last).toBe('100.0,1.0');
  });

  it('handles single values and empty series', () => {
    expect(sparklinePoints([], 100, 40)).toBe('');
    expect(sparklinePoints([7], 100, 40)).toBe('50.0,1.0');
  });

  it('clamps negatives to the baseline', () => {
    const points = sparklinePoints([-3, 2], 10, 10);
    expect(points.startsWith('0.0,9.0')).toBe(true);
  });
});
