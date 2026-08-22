import { describe, expect, it } from 'vitest';
import { compareImpactLevel, diffCategoryLevels, mergeEventChronology } from './timeline.js';

describe('impact chronology', () => {
  it('classifies overall level movement', () => {
    expect(compareImpactLevel(null, 'HIGH')).toBe('NEW');
    expect(compareImpactLevel('HIGH', 'HIGH')).toBe('UNCHANGED');
    expect(compareImpactLevel('MEDIUM', 'HIGH')).toBe('INCREASED');
    expect(compareImpactLevel('HIGH', 'LOW')).toBe('DECREASED');
  });

  it('diffs category levels without inventing dropped categories as increases', () => {
    expect(
      diffCategoryLevels(
        [
          { category: 'ENERGY', level: 'HIGH' },
          { category: 'TRADE', level: 'HIGH' },
        ],
        [
          { category: 'ENERGY', level: 'MEDIUM' },
          { category: 'SECURITY', level: 'LOW' },
        ],
      ),
    ).toEqual([
      { category: 'ENERGY', from: 'HIGH', to: 'MEDIUM', change: 'DECREASED' },
      { category: 'SECURITY', from: null, to: 'LOW', change: 'NEW' },
    ]);
  });

  it('merges updates and published assessments in time order', () => {
    const items = mergeEventChronology({
      updates: [
        {
          id: 'u2',
          occurredAt: '2026-08-21T00:00:00.000Z',
          title: 'Freight risk',
          body: 'Coverage focused on transportation.',
          impactChange: null,
        },
        {
          id: 'u1',
          occurredAt: '2026-08-20T00:00:00.000Z',
          title: 'Initial reports',
          body: null,
          impactChange: null,
        },
      ],
      assessments: [
        {
          id: 'a2',
          version: 2,
          overallLevel: 'MEDIUM',
          reasoning: 'Prolonged closure is not established.',
          publishedAt: '2026-08-23T00:00:00.000Z',
          categories: [{ category: 'ENERGY', level: 'MEDIUM' }],
        },
        {
          id: 'a1',
          version: 1,
          overallLevel: 'HIGH',
          reasoning: 'Import-route exposure.',
          publishedAt: '2026-08-20T12:00:00.000Z',
          categories: [{ category: 'ENERGY', level: 'HIGH' }],
        },
      ],
    });

    expect(items.map((item) => item.kind)).toEqual([
      'UPDATE',
      'ASSESSMENT',
      'UPDATE',
      'ASSESSMENT',
    ]);
    expect(items[1]).toMatchObject({ kind: 'ASSESSMENT', version: 1, overallChange: 'NEW' });
    expect(items[3]).toMatchObject({
      kind: 'ASSESSMENT',
      version: 2,
      previousOverallLevel: 'HIGH',
      overallChange: 'DECREASED',
    });
  });
});
