import { describe, expect, it } from 'vitest';
import { layoutChain } from './chain-layout';

const node = (id: string, kind: 'ROOT' | 'CHANNEL' | 'IMPACT' = 'CHANNEL') => ({
  id,
  kind,
  label: `Label ${id}`,
});

describe('layoutChain', () => {
  it('places children one row below their deepest parent', () => {
    const nodes = [node('a', 'ROOT'), node('b'), node('c', 'IMPACT')];
    const edges = [
      { id: 'e1', fromNodeId: 'a', toNodeId: 'b' },
      { id: 'e2', fromNodeId: 'b', toNodeId: 'c' },
    ];

    const { levels, maxDepth } = layoutChain(nodes, edges);
    expect(maxDepth).toBe(2);
    expect(levels[0]!.map((n) => n.id)).toEqual(['a']);
    expect(levels[1]!.map((n) => n.id)).toEqual(['b']);
    expect(levels[2]!.map((n) => n.id)).toEqual(['c']);
  });

  it('uses the longest path when a node has several parents', () => {
    const nodes = [node('a', 'ROOT'), node('b'), node('c'), node('d', 'IMPACT')];
    const edges = [
      { id: 'e1', fromNodeId: 'a', toNodeId: 'b' },
      { id: 'e2', fromNodeId: 'a', toNodeId: 'c' },
      { id: 'e3', fromNodeId: 'b', toNodeId: 'd' },
      { id: 'e4', fromNodeId: 'c', toNodeId: 'd' },
    ];

    const { maxDepth, levels } = layoutChain(nodes, edges);
    expect(maxDepth).toBe(2);
    expect(levels.flat().find((n) => n.id === 'd')?.depth).toBe(2);
  });

  it('handles an empty graph and survives cycles defensively', () => {
    expect(layoutChain([], []).levels).toEqual([]);

    const nodes = [node('a'), node('b')];
    const edges = [
      { id: 'e1', fromNodeId: 'a', toNodeId: 'b' },
      { id: 'e2', fromNodeId: 'b', toNodeId: 'a' },
    ];
    // Degenerate input must not hang or throw.
    expect(() => layoutChain(nodes, edges)).not.toThrow();
  });
});
