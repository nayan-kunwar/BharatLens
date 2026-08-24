import type { EventChainSnapshot } from '../lib/api';
import { layoutChain } from '../lib/chain-layout';
import { formatLabel } from '../lib/presentation';

const KIND_LABELS: Record<string, string> = {
  ROOT: 'Event',
  CHANNEL: 'Transmission',
  IMPACT: 'India impact',
};

/**
 * Renders a published impact chain as a top-down flow. Layout is computed
 * from the graph data (longest-path layering) — never hardcoded per event.
 */
export function ImpactChainFlow({ chain }: { chain: EventChainSnapshot }) {
  const { levels } = layoutChain(chain.nodes, chain.edges);

  return (
    <div className="chain-flow">
      {levels.map((level, levelIndex) => (
        <div key={levelIndex} className="chain-flow__level">
          {level.map((node) => (
            <article key={node.id} className={`chain-node chain-node--${node.kind.toLowerCase()}`}>
              <p className="chain-node__kind">{KIND_LABELS[node.kind] ?? formatLabel(node.kind)}</p>
              <h3>{node.label}</h3>
              {node.description ? <p>{node.description}</p> : null}
              {node.category ? (
                <span className="chain-node__category">{formatLabel(node.category)}</span>
              ) : null}
            </article>
          ))}
        </div>
      ))}
      {levels.length > 0 ? (
        <p className="chain-flow__meta">
          Published impact pathway v{chain.version}. Causal links are interpretive, not
          measurements.
        </p>
      ) : null}
    </div>
  );
}
