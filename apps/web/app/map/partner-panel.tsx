'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import type { MapPartner } from './world-map';

type PartnerEvent = {
  id: string;
  slug: string;
  title: string;
  updatedAt: string | null;
  countries: Array<{ code: string }>;
};

/**
 * India ↔ Country panel. Content is strictly derived: shared published-event
 * counts plus recent shared events. No curated relationship claims exist.
 */
export function PartnerPanel({
  partner,
  selectedCode,
}: {
  partner: MapPartner | null;
  selectedCode: string | null;
}) {
  const [events, setEvents] = useState<PartnerEvent[] | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!selectedCode) {
      setEvents(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    fetch(`/api/map-events?country=${encodeURIComponent(selectedCode)}`)
      .then((response) => (response.ok ? response.json() : null))
      .then((body) => {
        if (!cancelled && body?.success) {
          // Shared with India only — the panel is a bilateral view.
          setEvents(
            (body.data as PartnerEvent[]).filter((event) =>
              event.countries.some((country) => country.code === 'IN'),
            ),
          );
        } else if (!cancelled) {
          setEvents([]);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setEvents([]);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [selectedCode]);

  if (!partner || !selectedCode) {
    return (
      <aside className="map-panel">
        <h2>Explore partners</h2>
        <p className="empty-state">
          Click a shaded country or a marker dot to see what the published record shares between
          India and that country. Intensity reflects counts of published events, not opinions about
          relationships.
        </p>
      </aside>
    );
  }

  return (
    <aside className="map-panel">
      <p className="eyebrow">India ↔ {partner.name}</p>
      <h2>
        {partner.eventCount} shared published event{partner.eventCount === 1 ? '' : 's'}
      </h2>
      <Link className="back-link" href={`/countries/${selectedCode}`}>
        Open the {partner.name} page
      </Link>

      <h3>Recent shared events</h3>
      {loading ? (
        <p>Loading…</p>
      ) : !events || events.length === 0 ? (
        <p className="empty-state">No published events involve both countries yet.</p>
      ) : (
        <ul className="map-panel__events">
          {events.map((event) => (
            <li key={event.id}>
              <Link href={`/events/${event.slug}`}>{event.title}</Link>
              {event.updatedAt ? (
                <time>{new Date(event.updatedAt).toLocaleDateString()}</time>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </aside>
  );
}
