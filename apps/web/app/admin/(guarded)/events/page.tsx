import Link from 'next/link';
import { adminFetch, type AdminEventRow } from '../../../lib/admin-api';

export const metadata = { title: 'Events' };

const STATUS_FILTERS = [
  '',
  'CANDIDATE',
  'DRAFT',
  'ANALYZED',
  'REVIEW_REQUIRED',
  'PUBLISHED',
  'UPDATED',
  'ARCHIVED',
] as const;

export default async function AdminEventsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string; page?: string }>;
}) {
  const params = await searchParams;
  const query = new URLSearchParams();
  if (params.status) {
    query.set('status', params.status);
  }
  if (params.q) {
    query.set('q', params.q);
  }
  if (params.page) {
    query.set('page', params.page);
  }

  const events = await adminFetch<AdminEventRow[]>(`/events?${query.toString()}`);

  return (
    <div className="page-shell">
      <header className="page-intro">
        <p className="eyebrow">Review console</p>
        <h1>Events</h1>
      </header>

      <nav className="admin-filter">
        {STATUS_FILTERS.map((status) => (
          <Link
            key={status || 'all'}
            href={status ? `/admin/events?status=${status}` : '/admin/events'}
            className={
              status === (params.status ?? '') ? 'admin-chip admin-chip--active' : 'admin-chip'
            }
          >
            {status || 'All'}
          </Link>
        ))}
      </nav>

      {events.length === 0 ? (
        <p>No events match this filter.</p>
      ) : (
        <table className="admin-table">
          <thead>
            <tr>
              <th>Title</th>
              <th>Status</th>
              <th>Importance</th>
              <th>Updated</th>
            </tr>
          </thead>
          <tbody>
            {events.map((event) => (
              <tr key={event.id}>
                <td>
                  <Link href={`/admin/events/${event.slug}`}>{event.title}</Link>
                  <div className="admin-table__sub">{event.slug}</div>
                </td>
                <td>{event.status}</td>
                <td>{event.importance}</td>
                <td>{event.updatedAt ? new Date(event.updatedAt).toLocaleString() : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
