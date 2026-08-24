import type { Metadata } from 'next';
import { DataUnavailable } from '../components/data-unavailable';
import { EventGrid } from '../components/event-grid';
import { Pagination } from '../components/pagination';
import { searchEvents } from '../lib/api';
import { getOne } from '../lib/presentation';

export const metadata: Metadata = { title: 'Search' };

type SearchPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const search = await searchParams;
  const query = getOne(search.q)?.trim() ?? '';
  const pageValue = Number(getOne(search.page) ?? '1');
  const page = Number.isInteger(pageValue) && pageValue > 0 ? pageValue : 1;
  const result =
    query.length >= 2
      ? await searchEvents(query, { page, sort: 'relevance' }).catch(() => null)
      : null;

  return (
    <main className="page-shell page-content">
      <header className="page-intro">
        <p className="eyebrow">Search</p>
        <h1>Find an event</h1>
        <p>Search published event titles and summaries.</p>
      </header>

      <form action="/search" className="search-form">
        <label htmlFor="event-search">Search events</label>
        <div>
          <input
            defaultValue={query}
            id="event-search"
            minLength={2}
            name="q"
            placeholder="Search events"
            required
            type="search"
          />
          <button type="submit">Search</button>
        </div>
      </form>

      {query.length > 0 && query.length < 2 ? (
        <p className="empty-state">Enter at least two characters to search.</p>
      ) : null}
      {result ? (
        <section className="search-results" aria-labelledby="search-results-heading">
          <div className="list-summary">
            <h2 id="search-results-heading">Results for &quot;{query}&quot;</h2>
            <p>{result.meta.total} published events</p>
          </div>
          <EventGrid events={result.items} />
          <Pagination
            page={result.meta.page}
            pageCount={result.meta.pageCount}
            path="/search"
            query={{ q: query }}
          />
        </section>
      ) : null}
      {query.length >= 2 && !result ? <DataUnavailable area="Search results" /> : null}
    </main>
  );
}
