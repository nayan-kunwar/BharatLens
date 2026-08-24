export type ChainLayoutNode = {
  id: string;
  kind: 'ROOT' | 'CHANNEL' | 'IMPACT';
  label: string;
  description?: string | null;
  category?: string | null;
};

export type ChainLayoutEdge = {
  id: string;
  fromNodeId: string;
  toNodeId: string;
};

export type LaidOutNode = ChainLayoutNode & { depth: number };

/**
 * Computes a top-down layering for rendering an impact chain as a vertical
 * stepper: every node sits one row below its deepest parent, so no edge ever
 * points upward. Falls back to insertion order for degenerate graphs.
 */
export function layoutChain(
  nodes: ChainLayoutNode[],
  edges: ChainLayoutEdge[],
): { levels: LaidOutNode[][]; maxDepth: number } {
  if (nodes.length === 0) {
    return { levels: [], maxDepth: 0 };
  }

  const depthByNode = new Map<string, number>();
  const parents = new Map<string, string[]>();
  for (const edge of edges) {
    parents.set(edge.toNodeId, [...(parents.get(edge.toNodeId) ?? []), edge.fromNodeId]);
  }

  // Longest-path layering with memoization; guards against pathological input.
  const visiting = new Set<string>();
  const depthOf = (id: string): number => {
    const known = depthByNode.get(id);
    if (known !== undefined) {
      return known;
    }
    if (visiting.has(id)) {
      return 0;
    }
    visiting.add(id);

    const nodeParents = parents.get(id) ?? [];
    const depth =
      nodeParents.length === 0 ? 0 : Math.max(...nodeParents.map((parent) => depthOf(parent) + 1));

    visiting.delete(id);
    depthByNode.set(id, depth);
    return depth;
  };

  for (const node of nodes) {
    depthOf(node.id);
  }

  const maxDepth = Math.max(0, ...depthByNode.values());
  const levels: LaidOutNode[][] = Array.from({ length: maxDepth + 1 }, () => []);

  for (const node of nodes) {
    const depth = depthByNode.get(node.id) ?? 0;
    levels[Math.min(depth, maxDepth)]!.push({ ...node, depth });
  }

  return { levels, maxDepth };
}
