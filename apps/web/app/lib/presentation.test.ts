import { describe, expect, it } from 'vitest';
import {
  cardImpactLevels,
  formatLabel,
  getOne,
  impactClass,
  isHighIndiaImpact,
  withQuery,
} from './presentation';

describe('presentation helpers', () => {
  it('turns domain enum values into readable labels', () => {
    expect(formatLabel('SUPPLY_CHAIN')).toBe('Supply Chain');
    expect(impactClass('CRITICAL')).toBe('impact--critical');
  });

  it('keeps query links concise and stable', () => {
    expect(withQuery('/events', { country: 'IN', topic: undefined, page: 2 })).toBe(
      '/events?country=IN&page=2',
    );
    expect(getOne(['first', 'second'])).toBe('first');
  });

  it('treats HIGH and CRITICAL overall impact as high India Impact', () => {
    expect(
      isHighIndiaImpact({
        currentImpact: {
          overallLevel: 'HIGH',
          evidenceStrength: 'WEAK',
          analysisConfidence: 'MEDIUM',
          version: 1,
          categories: [],
        },
      }),
    ).toBe(true);
    expect(
      isHighIndiaImpact({
        currentImpact: {
          overallLevel: 'MEDIUM',
          evidenceStrength: 'WEAK',
          analysisConfidence: 'MEDIUM',
          version: 1,
          categories: [],
        },
      }),
    ).toBe(false);
  });

  it('shows Energy, Trade, and Security on cards when those categories exist', () => {
    expect(
      cardImpactLevels([
        { category: 'TRADE', level: 'HIGH' },
        { category: 'ENERGY', level: 'CRITICAL' },
        { category: 'ECONOMY', level: 'MEDIUM' },
      ]),
    ).toEqual([
      { category: 'ENERGY', level: 'CRITICAL' },
      { category: 'TRADE', level: 'HIGH' },
    ]);
  });
});
