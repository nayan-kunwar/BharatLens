import type { EventSummary } from '../lib/api';
import { EventCard } from './event-card';

export function EventGrid({ events }: { events: EventSummary[] }) {
  if (events.length === 0) {
    return <p className="empty-state">No published events match this view.</p>;
  }

  return (
    <div className="event-grid">
      {events.map((event) => (
        <EventCard event={event} key={event.id} />
      ))}
    </div>
  );
}
