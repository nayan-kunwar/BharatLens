import type { Metadata } from 'next';
import { getAnalyticsOverview } from '../lib/api';
import { ExposureGrid, MoverLists, TrendChart } from './widgets';

export const metadata: Metadata = {
  title: 'Analytics',
  description: 'Derived trends across published BharatLens records.',
};

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ days?: string }>;
}) {
  const params = await searchParams;
  const requested = Number(params.days ?? '90');
  const days = Number.isInteger(requested) && requested >= 7 && requested <= 365 ? requested : 90;

  const overview = await getAnalyticsOverview(days).catch(() => null);

  return (
    <main className="page-shell page-content">
      <header className="page-intro">
        <p className="eyebrow">Analytics</p>
        <h1>What the record shows</h1>
        <p>
          Everything here is derived from published assessments over the last{' '}
          {overview?.windowDays ?? days} days. Levels are shown as counts and distributions — never
          averaged into a score. More history makes these widgets more meaningful.
        </p>
      </header>

      {!overview ? (
        <p className="empty-state">Live data is temporarily unavailable.</p>
      ) : (
        <>
          <section className="detail-section">
            <h2>India impact exposure by category</h2>
            <ExposureGrid exposure={overview.categoryExposure} />
          </section>

          <section className="detail-section">
            <h2>Publication trend</h2>
            <TrendChart trend={overview.impactTrend} />
          </section>

          <section className="detail-section">
            <h2>Movers vs the prior window</h2>
            <MoverLists topics={overview.topicTrend} countries={overview.countryMovers} />
          </section>
        </>
      )}
    </main>
  );
}
