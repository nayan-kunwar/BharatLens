import Image from 'next/image';
import Link from 'next/link';
import { DataUnavailable } from './components/data-unavailable';
import { EventGrid } from './components/event-grid';
import { getCountries, getEvents, getTopics } from './lib/api';
import { countriesFromEvents, isHighIndiaImpact, topicsFromEvents } from './lib/presentation';

export default async function HomePage() {
  const result = await Promise.all([
    getEvents({ limit: 6, sort: 'updatedAt', order: 'desc' }),
    getEvents({ limit: 20, sort: 'publishedAt', order: 'desc' }),
    getCountries(),
    getTopics(),
  ]).catch(() => null);

  const [latest, catalog, countries, topics] = result ?? [];
  const highImpact = catalog ? catalog.items.filter(isHighIndiaImpact).slice(0, 6) : [];
  const watchCountries = catalog && countries ? countriesFromEvents(catalog.items, countries) : [];
  const watchTopics = catalog && topics ? topicsFromEvents(catalog.items, topics) : [];

  return (
    <main>
      <section className="hero">
        <Image
          alt="Illustrative Indian Ocean view with maritime routes leading towards India"
          className="hero__image"
          fill
          priority
          sizes="100vw"
          src="/indian-ocean-context.png"
        />
        <div className="hero__shade" />
        <div className="hero__content page-shell">
          <p className="eyebrow">BharatLens</p>
          <h1>See the world through India&apos;s lens.</h1>
          <p className="hero__lede">
            Global developments, their context, and the potential implications for India.
          </p>
          <Link className="button button--light" href="/events">
            Explore events
          </Link>
        </div>
      </section>

      {latest ? (
        <>
          <section className="page-shell content-section" aria-labelledby="high-impact-heading">
            <div className="section-heading">
              <div>
                <p className="eyebrow">India Impact</p>
                <h2 id="high-impact-heading">High India Impact</h2>
              </div>
              <Link className="text-link" href="/events">
                View all events
              </Link>
            </div>
            {highImpact.length > 0 ? (
              <EventGrid events={highImpact} />
            ) : (
              <p className="empty-state">
                No published events currently carry a HIGH or CRITICAL India Impact assessment.
              </p>
            )}
          </section>

          <section className="page-shell content-section" aria-labelledby="latest-events-heading">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Recently updated</p>
                <h2 id="latest-events-heading">Events to watch</h2>
              </div>
              <Link className="text-link" href="/events">
                View all events
              </Link>
            </div>
            <EventGrid events={latest.items} />
          </section>

          <section className="page-shell content-section" aria-labelledby="topics-heading">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Topics</p>
                <h2 id="topics-heading">Trending topics</h2>
              </div>
              <Link className="text-link" href="/topics">
                All topics
              </Link>
            </div>
            {watchTopics.length > 0 ? (
              <div className="directory-grid">
                {watchTopics.map((topic) => (
                  <Link className="directory-item" href={`/topics/${topic.slug}`} key={topic.slug}>
                    <span>Topic</span>
                    <strong>{topic.name}</strong>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="empty-state">No published topics are linked to events yet.</p>
            )}
          </section>

          <section className="page-shell content-section" aria-labelledby="countries-heading">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Countries</p>
                <h2 id="countries-heading">Countries to watch</h2>
              </div>
              <Link className="text-link" href="/countries">
                All countries
              </Link>
            </div>
            {watchCountries.length > 0 ? (
              <div className="directory-grid">
                {watchCountries.map((country) => (
                  <Link
                    className="directory-item"
                    href={`/countries/${country.code}`}
                    key={country.code}
                  >
                    <span>{country.code}</span>
                    <strong>{country.name}</strong>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="empty-state">No published countries are linked to events yet.</p>
            )}
          </section>
        </>
      ) : (
        <section className="page-shell content-section">
          <DataUnavailable area="Homepage events" />
        </section>
      )}
    </main>
  );
}
