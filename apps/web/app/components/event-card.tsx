import Link from 'next/link';
import type { EventSummary } from '../lib/api';
import { cardImpactLevels, formatDate, formatLabel } from '../lib/presentation';
import { ImpactBadge } from './impact-badge';

export function EventCard({ event }: { event: EventSummary }) {
  const region = event.countries[0]?.name;
  const categoryLevels = cardImpactLevels(event.currentImpact?.categories);

  return (
    <article className="event-card">
      <div className="event-card__meta">
        <span>{formatDate(event.updatedAt ?? event.publishedAt ?? event.occurredAt)}</span>
        {region ? <span>{region}</span> : null}
        <span>{formatLabel(event.importance)} importance</span>
      </div>
      <h2>
        <Link href={`/events/${event.slug}`}>{event.title}</Link>
      </h2>
      {event.summary ? <p>{event.summary}</p> : null}
      {categoryLevels.length > 0 ? (
        <ul className="event-card__impacts" aria-label="India Impact categories">
          {categoryLevels.map((item) => (
            <li key={item.category}>
              {formatLabel(item.category)} {formatLabel(item.level)}
            </li>
          ))}
        </ul>
      ) : null}
      <div className="event-card__footer">
        <div className="tag-list" aria-label="Countries and topics">
          {event.countries.map((country) => (
            <Link href={`/countries/${country.code}`} key={country.code}>
              {country.name}
            </Link>
          ))}
          {event.topics.map((topic) => (
            <Link href={`/topics/${topic.slug}`} key={topic.slug}>
              {topic.name}
            </Link>
          ))}
        </div>
        {event.currentImpact ? <ImpactBadge level={event.currentImpact.overallLevel} /> : null}
      </div>
    </article>
  );
}
