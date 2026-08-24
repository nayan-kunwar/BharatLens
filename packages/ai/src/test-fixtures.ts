import type { ImpactChainAnalysis } from './schema.js';

/** Minimal valid chain used by unit tests that build EventAnalysis objects. */
export const TEST_IMPACT_CHAIN: ImpactChainAnalysis = {
  nodes: [
    { key: 'event', kind: 'ROOT', label: 'Test event root' },
    { key: 'step', kind: 'CHANNEL', label: 'Transmission step' },
    { key: 'impact', kind: 'IMPACT', label: 'India-facing consequence' },
  ],
  edges: [
    { from: 'event', to: 'step' },
    { from: 'step', to: 'impact' },
  ],
};
