import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { DataUnavailable } from '../../components/data-unavailable';
import { EventGrid } from '../../components/event-grid';
import { Pagination } from '../../components/pagination';
import { ApiError, getEvents, getTopic } from '../../lib/api';
import { getOne } from '../../lib/presentation';

type TopicPageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params }: TopicPageProps): Promise<Metadata> {
  const { slug } = await params;
  try {
    const topic = await getTopic(slug);
    return { title: topic.name };
  } catch {
    return { title: 'Topic' };
  }
}

export default async function TopicPage({ params, searchParams }: TopicPageProps) {
  const { slug } = await params;
  const search = await searchParams;
  const pageValue = Number(getOne(search.page) ?? '1');
  const page = Number.isInteger(pageValue) && pageValue > 0 ? pageValue : 1;
  let topic: Awaited<ReturnType<typeof getTopic>>;
  let events: Awaited<ReturnType<typeof getEvents>> | null;

  try {
    [topic, events] = await Promise.all([
      getTopic(slug),
      getEvents({ topic: slug, page, sort: 'updatedAt', order: 'desc' }),
    ]);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      notFound();
    }
    return <DataUnavailable area="Topic events" />;
  }

  return (
    <main className="page-shell page-content">
      <Link className="back-link" href="/topics">
        Back to topics
      </Link>
      <header className="page-intro">
        <p className="eyebrow">Topic context</p>
        <h1>{topic.name}</h1>
        <p>Published events connected to {topic.name}.</p>
      </header>
      {events ? (
        <>
          <EventGrid events={events.items} />
          <Pagination
            page={events.meta.page}
            pageCount={events.meta.pageCount}
            path={`/topics/${topic.slug}`}
            query={{}}
          />
        </>
      ) : (
        <DataUnavailable area="Topic events" />
      )}
    </main>
  );
}
