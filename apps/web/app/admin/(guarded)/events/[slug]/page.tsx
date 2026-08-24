import Link from 'next/link';
import { notFound } from 'next/navigation';
import { adminFetch, type AdminEventDetail } from '../../../../lib/admin-api';
import { AnalyzeButton, ClaimReviewButtons, DraftAssessmentEditor } from '../../../review-actions';

export const metadata = { title: 'Review event' };

function statusClass(status: string): string {
  return `admin-status admin-status--${status.toLowerCase()}`;
}

export default async function AdminEventReviewPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  let event: AdminEventDetail;
  try {
    event = await adminFetch<AdminEventDetail>(`/events/${encodeURIComponent(slug)}`);
  } catch (error) {
    if (error instanceof Error && error.message.includes('not found')) {
      notFound();
    }
    throw error;
  }

  const draft = event.assessments.filter((item) => item.status === 'DRAFT').at(-1) ?? null;
  const publishedCount = event.assessments.filter((item) => item.status === 'PUBLISHED').length;

  return (
    <div className="page-shell">
      <header className="page-intro">
        <p className="eyebrow">
          <Link href="/admin/events">Events</Link> / {event.slug}
        </p>
        <h1>{event.title}</h1>
        <p>
          <span className={statusClass(event.status)}>{event.status}</span>{' '}
          <span className="admin-muted">
            Importance {event.importance} · Updated{' '}
            {event.updatedAt ? new Date(event.updatedAt).toLocaleString() : '—'}
          </span>
        </p>
      </header>

      <section className="admin-section">
        <h2>Summary</h2>
        <p>{event.summary ?? 'No summary yet.'}</p>
        {event.description ? <p className="admin-muted">{event.description}</p> : null}
      </section>

      <section className="admin-section">
        <div className="admin-section__head">
          <h2>Claims ({event.claims.length})</h2>
          <span className="admin-muted">Only APPROVED claims appear on the public site.</span>
        </div>
        {event.claims.length === 0 ? (
          <p>No claims recorded.</p>
        ) : (
          <ul className="admin-claims">
            {event.claims.map((claim) => (
              <li
                key={claim.id}
                className={`admin-claim admin-claim--${claim.status.toLowerCase()}`}
              >
                <div className="admin-claim__head">
                  <strong>{claim.type}</strong>
                  <span className={statusClass(claim.status)}>{claim.status}</span>
                  <ClaimReviewButtons claim={claim} />
                </div>
                <p>{claim.statement}</p>
                <p className="admin-muted">
                  Evidence: {claim.evidenceStrength ?? '—'} · {claim.sourceCount} sources (
                  {claim.independentSourceCount} independent, {claim.officialSourceCount} official)
                </p>
                {claim.evidence.length > 0 ? (
                  <ul className="admin-evidence">
                    {claim.evidence.map((item) => (
                      <li key={item.id}>
                        <a href={item.url} target="_blank" rel="noreferrer noopener">
                          {item.excerpt || item.url}
                        </a>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="admin-section">
        <div className="admin-section__head">
          <h2>Impact assessments</h2>
          <AnalyzeButton eventId={event.id} />
        </div>
        <p className="admin-muted">
          {publishedCount} published version{publishedCount === 1 ? '' : 's'} · history is
          immutable.
        </p>
        {draft ? (
          <>
            <h3>Draft v{draft.version} (editable)</h3>
            <DraftAssessmentEditor assessment={draft} />
          </>
        ) : (
          <p>No draft assessment. Run AI analysis to generate one for review.</p>
        )}
      </section>

      <section className="admin-section">
        <h2>Analysis runs</h2>
        {event.analysisRuns.length === 0 ? (
          <p>No analysis runs.</p>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>Status</th>
                <th>Model</th>
                <th>Prompt</th>
                <th>Run at</th>
                <th>Reviewed</th>
              </tr>
            </thead>
            <tbody>
              {event.analysisRuns.map((run) => (
                <tr key={run.id}>
                  <td>
                    {run.status}
                    {run.errorMessage ? ` — ${run.errorMessage}` : ''}
                  </td>
                  <td>{run.modelName}</td>
                  <td>{run.promptVersion}</td>
                  <td>{run.createdAt ? new Date(run.createdAt).toLocaleString() : '—'}</td>
                  <td>
                    {run.reviewedAt
                      ? `${new Date(run.reviewedAt).toLocaleString()} by ${run.reviewedBy}`
                      : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
