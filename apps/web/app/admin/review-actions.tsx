'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import type { AdminAssessment, AdminClaim } from '../lib/admin-api';

type ChainEditorNode = {
  key: string;
  kind: 'ROOT' | 'CHANNEL' | 'IMPACT';
  label: string;
  description?: string | null;
  category?: string | null;
};

export type EditableChain = {
  id: string;
  version: number;
  status: string;
  reasoning: string | null;
  nodes: Array<{
    id: string;
    kind: string;
    label: string;
    description: string | null;
    category: string | null;
  }>;
  edges: Array<{ id: string; fromNodeId: string; toNodeId: string }>;
};

const KINDS = ['ROOT', 'CHANNEL', 'IMPACT'];
const CATEGORIES = [
  '',
  'ENERGY',
  'TRADE',
  'ECONOMY',
  'SECURITY',
  'DEFENCE',
  'DIPLOMACY',
  'TECHNOLOGY',
  'SUPPLY_CHAIN',
  'INDIAN_CITIZENS',
];

/** Converts persisted ids to the synthetic keys the API contract uses. */
export function toEditableChain(chain: EditableChain) {
  const keyById = new Map(chain.nodes.map((node, index) => [node.id, `n${index}`]));
  return {
    ...chain,
    nodes: chain.nodes.map((node, index) => ({
      key: `n${index}`,
      kind: node.kind as ChainEditorNode['kind'],
      label: node.label,
      description: node.description,
      category: node.category,
      sortOrder: index,
    })),
    edges: chain.edges
      .map((edge) => ({
        from: keyById.get(edge.fromNodeId) ?? '',
        to: keyById.get(edge.toNodeId) ?? '',
      }))
      .filter((edge) => edge.from && edge.to),
  };
}

async function adminAction(path: string, method: string, json?: unknown): Promise<string | null> {
  const response = await fetch(`/api/admin-action?path=${encodeURIComponent(path)}`, {
    method,
    headers: { 'content-type': 'application/json' },
    body: json === undefined ? undefined : JSON.stringify(json),
  });
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { error?: string } | null;
    return body?.error ?? `Request failed (${response.status})`;
  }
  return null;
}

export function ClaimReviewButtons({ claim }: { claim: AdminClaim }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function decide(status: 'APPROVED' | 'REJECTED') {
    setBusy(true);
    const error = await adminAction(`/claims/${claim.id}/review`, 'POST', { status });
    setBusy(false);
    if (error) {
      alert(error);
      return;
    }
    router.refresh();
  }

  return (
    <span className="admin-actions">
      {claim.status !== 'APPROVED' ? (
        <button
          type="button"
          className="button"
          disabled={busy}
          onClick={() => void decide('APPROVED')}
        >
          Approve
        </button>
      ) : null}
      {claim.status !== 'REJECTED' ? (
        <button
          type="button"
          className="button button--ghost"
          disabled={busy}
          onClick={() => void decide('REJECTED')}
        >
          Reject
        </button>
      ) : null}
    </span>
  );
}

const IMPACT_LEVELS = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
const CONFIDENCE_LEVELS = ['LOW', 'MEDIUM', 'HIGH'];

export function DraftAssessmentEditor({ assessment }: { assessment: AdminAssessment }) {
  const router = useRouter();
  const [overall, setOverall] = useState(assessment.overallLevel);
  const [confidence, setConfidence] = useState(assessment.analysisConfidence);
  const [reasoning, setReasoning] = useState(assessment.reasoning);
  const [categories, setCategories] = useState(
    assessment.categories.length > 0
      ? assessment.categories.map((category) => ({ ...category }))
      : [{ category: 'ENERGY', level: 'MEDIUM', reasoning: '' }],
  );
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function save(publishAfter: boolean) {
    setBusy(true);
    setMessage(null);

    const payload = {
      overallLevel: overall,
      analysisConfidence: confidence,
      reasoning,
      categories: categories.map((category) => ({
        category: category.category,
        level: category.level,
        reasoning: category.reasoning || 'No category-specific reasoning recorded.',
      })),
    };

    let error = await adminAction(`/assessments/${assessment.id}`, 'PUT', payload);
    if (!error && publishAfter) {
      error = await adminAction(`/assessments/${assessment.id}/publish`, 'POST');
    }

    setBusy(false);
    if (error) {
      setMessage(error);
      return;
    }

    setMessage(publishAfter ? 'Published.' : 'Draft saved.');
    router.refresh();
  }

  function updateCategory(index: number, patch: Partial<(typeof categories)[number]>) {
    setCategories(
      categories.map((category, i) => (i === index ? { ...category, ...patch } : category)),
    );
  }

  return (
    <form
      className="admin-form"
      onSubmit={(event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        void save(true);
      }}
    >
      <div className="admin-form__row">
        <label className="admin-form__field">
          <span>Overall level</span>
          <select value={overall} onChange={(event) => setOverall(event.target.value)}>
            {IMPACT_LEVELS.map((level) => (
              <option key={level}>{level}</option>
            ))}
          </select>
        </label>
        <label className="admin-form__field">
          <span>Analysis confidence (estimate)</span>
          <select value={confidence} onChange={(event) => setConfidence(event.target.value)}>
            {CONFIDENCE_LEVELS.map((level) => (
              <option key={level}>{level}</option>
            ))}
          </select>
        </label>
      </div>

      <label className="admin-form__field">
        <span>Reasoning</span>
        <textarea
          value={reasoning}
          onChange={(event) => setReasoning(event.target.value)}
          rows={4}
        />
      </label>

      <fieldset className="admin-categories">
        <legend>Category levels</legend>
        {categories.map((category, index) => (
          <div key={index} className="admin-form__row">
            <label className="admin-form__field">
              <span>Category</span>
              <select
                value={category.category}
                onChange={(event) => updateCategory(index, { category: event.target.value })}
              >
                {[
                  'ENERGY',
                  'TRADE',
                  'ECONOMY',
                  'SECURITY',
                  'DEFENCE',
                  'DIPLOMACY',
                  'TECHNOLOGY',
                  'SUPPLY_CHAIN',
                  'INDIAN_CITIZENS',
                ].map((option) => (
                  <option key={option}>{option}</option>
                ))}
              </select>
            </label>
            <label className="admin-form__field">
              <span>Level</span>
              <select
                value={category.level}
                onChange={(event) => updateCategory(index, { level: event.target.value })}
              >
                {IMPACT_LEVELS.map((level) => (
                  <option key={level}>{level}</option>
                ))}
              </select>
            </label>
            <label className="admin-form__field admin-form__field--grow">
              <span>Reason</span>
              <input
                value={category.reasoning}
                onChange={(event) => updateCategory(index, { reasoning: event.target.value })}
              />
            </label>
          </div>
        ))}
        <button
          type="button"
          className="button button--ghost"
          onClick={() =>
            setCategories([...categories, { category: 'TRADE', level: 'LOW', reasoning: '' }])
          }
        >
          Add category
        </button>
      </fieldset>

      {message ? <p className="admin-form__message">{message}</p> : null}

      <div className="admin-actions">
        <button type="submit" disabled={busy} className="button">
          {busy ? 'Working…' : 'Save + publish'}
        </button>
        <button
          type="button"
          disabled={busy}
          className="button button--ghost"
          onClick={() => void save(false)}
        >
          Save draft only
        </button>
      </div>
    </form>
  );
}

export function AnalyzeButton({ eventId }: { eventId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  return (
    <div className="admin-actions">
      <button
        type="button"
        className="button"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setMessage(null);
          const error = await adminAction(`/events/${eventId}/analyze`, 'POST');
          setBusy(false);
          setMessage(error ?? 'Analysis job queued. Refresh in a moment to see results.');
          if (!error) {
            router.refresh();
          }
        }}
      >
        {busy ? 'Queueing…' : 'Run AI analysis'}
      </button>
      {message ? <span>{message}</span> : null}
    </div>
  );
}

export function ChainEditor({ chain }: { chain: EditableChain }) {
  const router = useRouter();
  const initial = toEditableChain(chain);
  const [reasoning, setReasoning] = useState(chain.reasoning ?? '');
  const [nodes, setNodes] = useState<ChainEditorNode[]>(initial.nodes);
  const [edges, setEdges] = useState(initial.edges);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  function updateNode(key: string, patch: Partial<ChainEditorNode>) {
    setNodes(nodes.map((node) => (node.key === key ? { ...node, ...patch } : node)));
  }

  function removeNode(key: string) {
    if (nodes.length <= 3) {
      setMessage('A chain needs at least three nodes.');
      return;
    }
    setNodes(nodes.filter((node) => node.key !== key));
    setEdges(edges.filter((edge) => edge.from !== key && edge.to !== key));
  }

  function addNode() {
    let index = nodes.length;
    let key = `n${index}`;
    while (nodes.some((node) => node.key === key)) {
      index += 1;
      key = `n${index}`;
    }
    setNodes([...nodes, { key, kind: 'CHANNEL', label: '', description: '', category: '' }]);
  }

  function toggleEdge(from: string, to: string, connected: boolean) {
    if (connected) {
      setEdges([...edges, { from, to }]);
    } else {
      setEdges(edges.filter((edge) => !(edge.from === from && edge.to === to)));
    }
  }

  async function save(publishAfter: boolean) {
    setBusy(true);
    setMessage(null);

    // Node keys are positional (n0, n1, …); removals shift positions, so
    // rebuild edge wiring through an explicit old-key → new-key map.
    const keyRemap = new Map(nodes.map((node, index) => [node.key, `n${index}`]));
    const wiredPayload = {
      reasoning,
      nodes: nodes.map((node, index) => ({
        key: `n${index}`,
        kind: node.kind,
        label: node.label,
        description: node.description || undefined,
        category: node.category || undefined,
      })),
      edges: edges.map((edge) => ({
        from: keyRemap.get(edge.from) ?? '',
        to: keyRemap.get(edge.to) ?? '',
      })),
    };

    let error = await adminAction(`/chains/${chain.id}`, 'PUT', wiredPayload);
    if (!error && publishAfter) {
      error = await adminAction(`/chains/${chain.id}/publish`, 'POST');
    }

    setBusy(false);
    if (error) {
      setMessage(error);
      return;
    }

    setMessage(publishAfter ? 'Published.' : 'Draft saved.');
    router.refresh();
  }

  return (
    <form
      className="admin-form"
      onSubmit={(event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        void save(true);
      }}
    >
      <label className="admin-form__field">
        <span>Reasoning (shown with the published chain)</span>
        <textarea
          value={reasoning}
          onChange={(event) => setReasoning(event.target.value)}
          rows={2}
        />
      </label>

      <div className="admin-chain-editor">
        {nodes.map((node) => (
          <fieldset key={node.key} className="admin-chain-node">
            <legend>
              {node.kind} · {node.key}
            </legend>
            <label className="admin-form__field">
              <span>Label</span>
              <input
                value={node.label}
                onChange={(event) => updateNode(node.key, { label: event.target.value })}
                required
                minLength={3}
                maxLength={200}
              />
            </label>
            <div className="admin-form__row">
              <label className="admin-form__field">
                <span>Kind</span>
                <select
                  value={node.kind}
                  onChange={(event) =>
                    updateNode(node.key, { kind: event.target.value as ChainEditorNode['kind'] })
                  }
                >
                  {KINDS.map((kind) => (
                    <option key={kind}>{kind}</option>
                  ))}
                </select>
              </label>
              <label className="admin-form__field">
                <span>Category</span>
                <select
                  value={node.category ?? ''}
                  onChange={(event) => updateNode(node.key, { category: event.target.value })}
                >
                  {CATEGORIES.map((category) => (
                    <option key={category || 'none'} value={category}>
                      {category || '—'}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                className="button button--ghost"
                onClick={() => removeNode(node.key)}
              >
                Remove
              </button>
            </div>
            <div className="admin-chain-flows">
              <span>Flows into:</span>
              {nodes
                .filter((other) => other.key !== node.key)
                .map((other) => {
                  const connected = edges.some(
                    (edge) => edge.from === node.key && edge.to === other.key,
                  );
                  return (
                    <label key={other.key} className="admin-chain-flow-toggle">
                      <input
                        type="checkbox"
                        checked={connected}
                        onChange={(event) => toggleEdge(node.key, other.key, event.target.checked)}
                      />
                      {other.label || other.key}
                    </label>
                  );
                })}
            </div>
          </fieldset>
        ))}
        <button type="button" className="button button--ghost" onClick={addNode}>
          Add node
        </button>
      </div>

      {message ? <p className="admin-form__error">{message}</p> : null}

      <div className="admin-actions">
        <button type="submit" disabled={busy} className="button">
          {busy ? 'Working…' : 'Save + publish chain'}
        </button>
        <button
          type="button"
          disabled={busy}
          className="button button--ghost"
          onClick={() => void save(false)}
        >
          Save draft only
        </button>
      </div>
    </form>
  );
}
