import Link from 'next/link';
import type { AnalyticsOverview } from '../lib/api';
import { formatLabel } from '../lib/presentation';
import { sparklinePoints } from '../lib/sparkline';

const LEVELS = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const;

/**
 * Exposure grid: level distributions per impact category across current
 * published assessments. Counts, never averages (ADR-011).
 */
export function ExposureGrid({ exposure }: { exposure: AnalyticsOverview['categoryExposure'] }) {
  const maxCount = Math.max(
    1,
    ...exposure.flatMap((row) => LEVELS.map((level) => row.counts[level])),
  );

  return (
    <div className="exposure-grid">
      {exposure.map((row) => (
        <article key={row.category} className="exposure-row">
          <h3>{formatLabel(row.category)}</h3>
          <div className="exposure-row__cells">
            {LEVELS.map((level) => (
              <div key={level} className={`exposure-cell exposure-cell--${level.toLowerCase()}`}>
                <span className="exposure-cell__count">{row.counts[level]}</span>
                <span
                  className={`exposure-row__bar ${level.toLowerCase()}`}
                  style={{ width: `${(row.counts[level] / maxCount) * 100}%` }}
                />
                <span className="exposure-cell__label">{formatLabel(level)}</span>
              </div>
            ))}
          </div>
        </article>
      ))}
    </div>
  );
}

/** Weekly published-assessment trend as an inline SVG sparkline. */
export function TrendChart({ trend }: { trend: AnalyticsOverview['impactTrend'] }) {
  const totals = trend.weeks.map((week) => week.newAssessments);
  const highs = trend.weeks.map((week) => week.highPlus);
  const width = 560;
  const height = 120;

  if (totals.length === 0) {
    return <p className="empty-state">No published assessments in this window yet.</p>;
  }

  return (
    <figure className="trend-chart">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label="Published assessments per week"
      >
        <polyline
          points={sparklinePoints(totals, width, height)}
          fill="none"
          stroke="#2e7d4f"
          strokeWidth={2}
        />
        {highs.some((value) => value > 0) ? (
          <polyline
            points={sparklinePoints(highs, width, height)}
            fill="none"
            stroke="#c0392b"
            strokeWidth={2}
            strokeDasharray="4 3"
          />
        ) : null}
      </svg>
      <figcaption>
        Solid: new published assessments per week. Dashed: HIGH or CRITICAL.{' '}
        {trend.transitions.upgrades} upgrade{trend.transitions.upgrades === 1 ? '' : 's'} and{' '}
        {trend.transitions.downgrades} downgrade{trend.transitions.downgrades === 1 ? '' : 's'}{' '}
        between versions.
      </figcaption>
    </figure>
  );
}

export function MoverLists({
  topics,
  countries,
}: {
  topics: AnalyticsOverview['topicTrend'];
  countries: AnalyticsOverview['countryMovers'];
}) {
  const renderList = (
    entries: Array<{
      key: string;
      label: string;
      href?: string;
      delta: number;
      currentCount: number;
    }>,
  ) => (
    <ul className="mover-list">
      {entries.length === 0 ? <li className="empty-state">Not enough history yet.</li> : null}
      {entries.map((entry) => (
        <li key={entry.key}>
          {entry.href ? <Link href={entry.href}>{entry.label}</Link> : <span>{entry.label}</span>}
          <span className="mover-list__counts">
            {entry.currentCount} in window · Δ {entry.delta >= 0 ? `+${entry.delta}` : entry.delta}
          </span>
        </li>
      ))}
    </ul>
  );

  return (
    <div className="mover-columns">
      <section>
        <h3>Topic movers</h3>
        {renderList(
          topics.slice(0, 6).map((topic) => ({
            key: topic.slug,
            label: topic.name,
            href: `/topics/${topic.slug}`,
            delta: topic.delta,
            currentCount: topic.currentCount,
          })),
        )}
      </section>
      <section>
        <h3>Country movers</h3>
        {renderList(
          countries.slice(0, 6).map((country) => ({
            key: country.code,
            label: country.name,
            href: `/countries/${country.code}`,
            delta: country.delta,
            currentCount: country.currentCount,
          })),
        )}
      </section>
    </div>
  );
}
