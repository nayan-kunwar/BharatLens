import { describe, expect, it } from 'vitest';
import { validateChainGraph } from './chain.js';

const root = { key: 'root', kind: 'ROOT' as const, label: 'Event root' };
const channel = (key: string) => ({ key, kind: 'CHANNEL' as const, label: `Channel ${key}` });
const impact = (key: string) => ({ key, kind: 'IMPACT' as const, label: `Impact ${key}` });

describe('validateChainGraph', () => {
  const validNodes = [root, channel('a'), impact('out')];
  const validEdges = [
    { from: 'root', to: 'a' },
    { from: 'a', to: 'out' },
  ];

  it('accepts a well-formed chain', () => {
    expect(validateChainGraph(validNodes, validEdges)).toBeNull();
  });

  it('rejects empty graphs and duplicate keys', () => {
    expect(validateChainGraph([], [])).toBe('EMPTY');
    expect(validateChainGraph([root, channel('a'), channel('a')], validEdges)).toBe(
      'DUPLICATE_KEY',
    );
  });

  it('requires exactly one ROOT', () => {
    expect(validateChainGraph([channel('a'), impact('b'), channel('c')], validEdges)).toBe(
      'ROOT_COUNT',
    );
    expect(
      validateChainGraph(
        [root, { ...root, key: 'root2' }, impact('x')],
        [{ from: 'root', to: 'x' }],
      ),
    ).toBe('ROOT_COUNT');
  });

  it('rejects edges referencing unknown nodes, self loops, and duplicates', () => {
    expect(validateChainGraph(validNodes, [{ from: 'root', to: 'ghost' }])).toBe('UNKNOWN_NODE');
    expect(validateChainGraph(validNodes, [...validEdges, { from: 'a', to: 'a' }])).toBe(
      'SELF_LOOP',
    );
    expect(validateChainGraph(validNodes, [...validEdges, ...validEdges])).toBe('DUPLICATE_EDGE');
  });

  it('rejects cycles and unreachable nodes', () => {
    const cyclic = [root, channel('a'), channel('b'), impact('out')];
    expect(
      validateChainGraph(cyclic, [
        { from: 'root', to: 'a' },
        { from: 'a', to: 'b' },
        { from: 'b', to: 'a' },
      ]),
    ).toBe('CYCLE');

    const orphaned = [root, channel('a'), channel('island'), impact('out')];
    expect(
      validateChainGraph(orphaned, [
        { from: 'root', to: 'a' },
        { from: 'a', to: 'out' },
      ]),
    ).toBe('UNREACHABLE');
  });

  it('enforces size limits', () => {
    const many = Array.from({ length: 21 }, (_, i) => (i === 0 ? root : channel(`n${i}`)));
    expect(validateChainGraph(many, [])).not.toBe('DUPLICATE_EDGE');
    // >20 nodes reports EMPTY (size violation) before edge checks.
    expect(['EMPTY']).toContain(validateChainGraph(many, []));
  });
});
