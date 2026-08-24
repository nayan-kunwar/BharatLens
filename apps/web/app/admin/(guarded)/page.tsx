import Link from 'next/link';
import { adminFetch, type AdminOverview } from '../../lib/admin-api';

export const metadata = { title: 'Overview' };

export default async function AdminDashboardPage() {
  const overview = await adminFetch<AdminOverview>('/overview');

  return (
    <div className="page-shell">
      <header className="page-intro">
        <p className="eyebrow">Review console</p>
        <h1>Overview</h1>
      </header>

      <section className="admin-stats">
        {Object.entries(overview.countsByStatus).map(([status, count]) => (
          <Link key={status} href={`/admin/events?status=${status}`} className="admin-stat">
            <span className="admin-stat__value">{count}</span>
            <span className="admin-stat__label">{status.replaceAll('_', ' ')}</span>
          </Link>
        ))}
      </section>

      <section className="admin-section">
        <h2>Queue depth</h2>
        <table className="admin-table">
          <thead>
            <tr>
              <th>Queue</th>
              <th>Waiting</th>
              <th>Active</th>
              <th>Completed</th>
              <th>Failed</th>
            </tr>
          </thead>
          <tbody>
            {overview.queues.map((queue) => (
              <tr key={queue.name}>
                <td>{queue.name}</td>
                <td>{queue.counts.waiting ?? 0}</td>
                <td>{queue.counts.active ?? 0}</td>
                <td>{queue.counts.completed ?? 0}</td>
                <td>{queue.counts.failed ?? 0}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="admin-section">
        <h2>Recent analysis runs</h2>
        {overview.recentAnalysisRuns.length === 0 ? (
          <p>No analysis runs yet.</p>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>Event</th>
                <th>Status</th>
                <th>Model</th>
                <th>Prompt</th>
                <th>Run at</th>
              </tr>
            </thead>
            <tbody>
              {overview.recentAnalysisRuns.map((run) => (
                <tr key={run.id}>
                  <td>
                    <Link href={`/admin/events/${run.eventSlug}`}>{run.eventTitle}</Link>
                  </td>
                  <td>{run.status}</td>
                  <td>{run.modelName}</td>
                  <td>{run.promptVersion}</td>
                  <td>{run.createdAt ? new Date(run.createdAt).toLocaleString() : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
