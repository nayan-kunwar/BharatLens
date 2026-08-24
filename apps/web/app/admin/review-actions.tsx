'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import type { AdminAssessment, AdminClaim } from '../lib/admin-api';

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
