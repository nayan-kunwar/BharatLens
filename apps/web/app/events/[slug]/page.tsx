import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { EventTimeline } from '../../components/event-timeline';
import { ImpactBadge } from '../../components/impact-badge';
import { ImpactChainFlow } from '../../components/impact-chain-flow';
import { ImpactHistory } from '../../components/impact-history';
import { ApiError, getEventPage } from '../../lib/api';
import { formatDate, formatLabel } from '../../lib/presentation';
import { mergeEventChronology } from '@bharatlens/shared';

type EventPageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: EventPageProps): Promise<Metadata> {
  const { slug } = await params;

  try {
    const { event } = await getEventPage(slug);
    return { title: event.title, description: event.summary ?? undefined };
  } catch {
    return { title: 'Event' };
  }
}

export default async function EventPage({ params }: EventPageProps) {
  const { slug } = await params;
  let pageData: Awaited<ReturnType<typeof getEventPage>>;

  try {
    pageData = await getEventPage(slug);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      notFound();
    }
    throw error;
  }

  const { chain, claims, event, impact, sources, updates } = pageData;
  const chronology = mergeEventChronology({
    updates,
    assessments: impact.history,
  });
  const sourcesNote =
    sources.length > 0
      ? 'Linked reporting is listed under Sources. Timeline rows do not invent citations.'
      : 'This example does not attach article URLs to timeline rows. BharatLens does not invent sources.';

  return (
    <main className="page-shell page-content event-detail">
      <Link className="back-link" href="/events">
        Back to events
      </Link>

      <header className="event-detail__header">
        <div className="tag-list">
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
        <h1>{event.title}</h1>
        {event.summary ? <p className="event-detail__summary">{event.summary}</p> : null}
        <div className="event-detail__meta">
          <span>Updated {formatDate(event.updatedAt)}</span>
          <span>{formatLabel(event.importance)} importance</span>
          {event.currentImpact ? <ImpactBadge level={event.currentImpact.overallLevel} /> : null}
        </div>
      </header>

      <div className="detail-layout">
        <div className="detail-layout__main">
          <section className="detail-section" aria-labelledby="what-happened-heading">
            <p className="eyebrow">What happened</p>
            <h2 id="what-happened-heading">Situation overview</h2>
            {event.description ? <p>{event.description}</p> : <p>{event.summary}</p>}
          </section>

          <section className="detail-section" aria-labelledby="why-happened-heading">
            <p className="eyebrow">Why it happened</p>
            <h2 id="why-happened-heading">Drivers and interpretation</h2>
            {claims.filter((claim) => claim.type === 'ANALYSIS').length > 0 ? (
              <ul className="plain-list">
                {claims
                  .filter((claim) => claim.type === 'ANALYSIS')
                  .map((claim) => (
                    <li key={claim.id}>{claim.statement}</li>
                  ))}
              </ul>
            ) : (
              <p className="empty-state">
                No approved ANALYSIS claims are published for why this situation developed.
              </p>
            )}
          </section>

          <section className="detail-section" aria-labelledby="why-india-heading">
            <p className="eyebrow">Why India cares</p>
            <h2 id="why-india-heading">Exposure for India</h2>
            {impact.current && impact.current.categories.length > 0 ? (
              <div className="why-india">
                <p>{impact.current.reasoning}</p>
                {impact.current.categories.map((category) => (
                  <article key={category.category}>
                    <h3>
                      {formatLabel(category.category)} <ImpactBadge level={category.level} />
                    </h3>
                    <p>{category.reasoning}</p>
                  </article>
                ))}
              </div>
            ) : (
              <p className="empty-state">
                No published India Impact categories are available for this event yet.
              </p>
            )}
          </section>

          <section className="detail-section" aria-labelledby="chain-heading">
            <p className="eyebrow">Impact chain</p>
            <h2 id="chain-heading">How this reaches India</h2>
            {chain.current ? (
              <>
                {chain.current.reasoning ? <p>{chain.current.reasoning}</p> : null}
                <ImpactChainFlow chain={chain.current} />
              </>
            ) : (
              <p className="empty-state">
                No published impact chain is available for this event yet.
              </p>
            )}
          </section>

          <section className="detail-section" aria-labelledby="timeline-heading">
            <p className="eyebrow">Timeline</p>
            <h2 id="timeline-heading">How the event has evolved</h2>
            <EventTimeline items={chronology} sourcesNote={sourcesNote} />
          </section>

          <section className="detail-section" aria-labelledby="impact-history-heading">
            <p className="eyebrow">Impact history</p>
            <h2 id="impact-history-heading">Versioned India Impact</h2>
            <p>
              Assessments are append-only. A later version does not overwrite an earlier one. Levels
              are product assessments, not measurements.
            </p>
            <ImpactHistory history={impact.history} />
          </section>

          <section className="detail-section" aria-labelledby="claims-heading">
            <p className="eyebrow">Claims and evidence</p>
            <h2 id="claims-heading">What is known, analysed, and uncertain</h2>
            {claims.length > 0 ? (
              <div className="claim-list">
                {claims.map((claim) => (
                  <article className="claim" key={claim.id}>
                    <div className="claim__meta">
                      <span className={`claim-type claim-type--${claim.type.toLowerCase()}`}>
                        {formatLabel(claim.type)}
                      </span>
                      <span>{formatLabel(claim.evidenceStrength)} evidence</span>
                    </div>
                    <p>{claim.statement}</p>
                    <p className="claim__support">
                      {claim.independentSourceCount} independent source
                      {claim.independentSourceCount === 1 ? '' : 's'}
                    </p>
                    {claim.evidence.length > 0 ? (
                      <ul className="evidence-list">
                        {claim.evidence.map((item) => (
                          <li key={item.id}>
                            <a href={item.url} rel="noreferrer" target="_blank">
                              Open supporting source
                            </a>
                            {item.excerpt ? <span>{item.excerpt}</span> : null}
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </article>
                ))}
              </div>
            ) : (
              <p className="empty-state">No approved claims are published for this event yet.</p>
            )}
          </section>

          <section className="detail-section" aria-labelledby="sources-heading">
            <p className="eyebrow">Sources</p>
            <h2 id="sources-heading">Reporting linked to this event</h2>
            {sources.length > 0 ? (
              <ul className="source-list">
                {sources.map((source) => (
                  <li key={`${source.id}-${source.articleUrl}`}>
                    <span>{source.name}</span>
                    <a href={source.articleUrl} rel="noreferrer" target="_blank">
                      {source.articleTitle}
                    </a>
                    <time dateTime={source.publishedAt ?? undefined}>
                      {formatDate(source.publishedAt)}
                    </time>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="empty-state">No sources are published for this event yet.</p>
            )}
          </section>
        </div>

        <aside className="detail-layout__aside">
          <section className="impact-panel" aria-labelledby="impact-heading">
            <p className="eyebrow">India impact</p>
            <h2 id="impact-heading">Potential exposure</h2>
            {impact.current ? (
              <>
                <div className="impact-panel__headline">
                  <span>Overall assessment</span>
                  <ImpactBadge level={impact.current.overallLevel} />
                </div>
                <p>{impact.current.reasoning}</p>
                <div className="impact-legend">
                  <span>Evidence: {formatLabel(impact.current.evidenceStrength)}</span>
                  <span>Analysis estimate: {formatLabel(impact.current.analysisConfidence)}</span>
                </div>
                {impact.history.length > 1 ? (
                  <p className="impact-history-link">
                    <a href="#impact-history-heading">{impact.history.length} published versions</a>
                  </p>
                ) : null}
                <div className="impact-chart" aria-label="India impact categories">
                  {impact.current.categories.map((category) => (
                    <div className="impact-row" key={category.category}>
                      <div>
                        <span>{formatLabel(category.category)}</span>
                        <ImpactBadge level={category.level} />
                      </div>
                      <span className={`impact-row__bar ${category.level.toLowerCase()}`} />
                      <p>{category.reasoning}</p>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <p className="empty-state">No published India impact assessment is available yet.</p>
            )}
          </section>

          <section className="watch-panel" aria-labelledby="watch-heading">
            <p className="eyebrow">Watch next</p>
            <h2 id="watch-heading">Signals to follow</h2>
            {event.watchItems.length > 0 ? (
              <ul>
                {event.watchItems.map((item) => (
                  <li key={item.id}>{item.label}</li>
                ))}
              </ul>
            ) : (
              <p className="empty-state">No watch items are published for this event yet.</p>
            )}
          </section>
        </aside>
      </div>
    </main>
  );
}
