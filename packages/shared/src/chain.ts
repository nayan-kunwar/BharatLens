import { CHAIN_LIMITS, type ChainNodeKind } from './domain.js';

export type ChainNodeInput = {
  key: string;
  kind: ChainNodeKind;
  label: string;
  description?: string;
  category?: string | null;
};

export type ChainEdgeInput = {
  from: string;
  to: string;
};

export type ChainGraphIssue =
  | 'EMPTY'
  | 'DUPLICATE_KEY'
  | 'ROOT_COUNT'
  | 'UNKNOWN_NODE'
  | 'SELF_LOOP'
  | 'DUPLICATE_EDGE'
  | 'CYCLE'
  | 'UNREACHABLE';

/**
 * Validates an impact-chain graph before it touches the database.
 * PostgreSQL can enforce uniqueness but not acyclicity or reachability, so
 * both callers (AI pipeline persistence and admin editing) must pass through
 * this gate.
 */
export function validateChainGraph(
  nodes: ChainNodeInput[],
  edges: ChainEdgeInput[],
): ChainGraphIssue | null {
  if (nodes.length === 0 || nodes.length > CHAIN_LIMITS.MAX_NODES) {
    return 'EMPTY';
  }
  if (edges.length > CHAIN_LIMITS.MAX_EDGES) {
    return 'DUPLICATE_EDGE';
  }

  const keys = new Set<string>();
  let rootCount = 0;
  for (const node of nodes) {
    if (keys.has(node.key)) {
      return 'DUPLICATE_KEY';
    }
    keys.add(node.key);
    if (node.kind === 'ROOT') {
      rootCount += 1;
    }
  }

  if (rootCount !== 1) {
    return 'ROOT_COUNT';
  }

  const adjacency = new Map<string, string[]>();
  const seenEdges = new Set<string>();

  for (const edge of edges) {
    if (!keys.has(edge.from) || !keys.has(edge.to)) {
      return 'UNKNOWN_NODE';
    }
    if (edge.from === edge.to) {
      return 'SELF_LOOP';
    }

    const edgeKey = `${edge.from}->${edge.to}`;
    if (seenEdges.has(edgeKey)) {
      return 'DUPLICATE_EDGE';
    }
    seenEdges.add(edgeKey);

    adjacency.set(edge.from, [...(adjacency.get(edge.from) ?? []), edge.to]);
  }

  const root = nodes.find((node) => node.kind === 'ROOT')!.key;
  if (hasCycle(adjacency)) {
    return 'CYCLE';
  }

  const reachable = collectReachable(root, adjacency);
  for (const key of keys) {
    if (!reachable.has(key)) {
      return 'UNREACHABLE';
    }
  }

  return null;
}

/** Depth-first cycle detection with a visiting set. */
function hasCycle(adjacency: Map<string, string[]>): boolean {
  const visiting = new Set<string>();
  const visited = new Set<string>();

  const visit = (key: string): boolean => {
    if (visited.has(key)) {
      return false;
    }
    if (visiting.has(key)) {
      return true;
    }

    visiting.add(key);
    for (const next of adjacency.get(key) ?? []) {
      if (visit(next)) {
        return true;
      }
    }
    visiting.delete(key);
    visited.add(key);
    return false;
  };

  for (const key of adjacency.keys()) {
    if (visit(key)) {
      return true;
    }
  }
  return false;
}

function collectReachable(root: string, adjacency: Map<string, string[]>): Set<string> {
  const reachable = new Set<string>([root]);
  const queue = [root];

  while (queue.length > 0) {
    const current = queue.shift()!;
    for (const next of adjacency.get(current) ?? []) {
      if (!reachable.has(next)) {
        reachable.add(next);
        queue.push(next);
      }
    }
  }

  return reachable;
}
