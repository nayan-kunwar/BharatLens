import type { Metadata } from 'next';
import { DataUnavailable } from '../components/data-unavailable';
import { EventFilters } from '../components/event-filters';
import { EventGrid } from '../components/event-grid';
import { Pagination } from '../components/pagination';
import { getCountries, getEvents, getTopics } from '../lib/api';
import { getOne } from '../lib/presentation';

export const metadata: Metadata = { title: 'World Events' };

type EventsPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function EventsPage({ searchParams }: EventsPageProps) {
  const search = await searchParams;
  const country = getOne(search.country);
  const topic = getOne(search.topic);
  const importance = getOne(search.importance) as
    'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' | undefined;
  const sort = getOne(search.sort) as 'occurredAt' | 'publishedAt' | 'updatedAt' | undefined;
  const pageValue = Number(getOne(search.page) ?? '1');
  const page = Number.isInteger(pageValue) && pageValue > 0 ? pageValue : 1;

  const [countries, topics, result] = await Promise.all([
    getCountries(),
    getTopics(),
    getEvents({ country, topic, importance, sort, page, order: 'desc' }),
  ]).catch(() => [null, null, null] as const);

  return (
    <main className="page-shell page-content">
      <header className="page-intro">
        <p className="eyebrow">World events</p>
        <h1>Global developments, India context.</h1>
        <p>Browse published events by country, topic, importance, or recency.</p>
      </header>

      {countries && topics && result ? (
        <>
          <EventFilters
            countries={countries}
            current={{ country, topic, importance, sort }}
            topics={topics}
          />
          <div className="list-summary">
            <p>{result.meta.total} published events</p>
          </div>
          <EventGrid events={result.items} />
          <Pagination
            page={result.meta.page}
            pageCount={result.meta.pageCount}
            path="/events"
            query={{ country, topic, importance, sort, order: 'desc' }}
          />
        </>
      ) : (
        <DataUnavailable area="Event listing" />
      )}
    </main>
  );
}
