import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { DataUnavailable } from '../../components/data-unavailable';
import { EventGrid } from '../../components/event-grid';
import { Pagination } from '../../components/pagination';
import { ApiError, getCountry, getEvents } from '../../lib/api';
import { getOne } from '../../lib/presentation';

type CountryPageProps = {
  params: Promise<{ code: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params }: CountryPageProps): Promise<Metadata> {
  const { code } = await params;
  try {
    const country = await getCountry(code);
    return { title: country.name };
  } catch {
    return { title: 'Country' };
  }
}

export default async function CountryPage({ params, searchParams }: CountryPageProps) {
  const { code } = await params;
  const search = await searchParams;
  const pageValue = Number(getOne(search.page) ?? '1');
  const page = Number.isInteger(pageValue) && pageValue > 0 ? pageValue : 1;
  let country: Awaited<ReturnType<typeof getCountry>>;
  let events: Awaited<ReturnType<typeof getEvents>> | null;

  try {
    [country, events] = await Promise.all([
      getCountry(code),
      getEvents({ country: code, page, sort: 'updatedAt', order: 'desc' }),
    ]);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      notFound();
    }
    return <DataUnavailable area="Country events" />;
  }

  return (
    <main className="page-shell page-content">
      <Link className="back-link" href="/countries">
        Back to countries
      </Link>
      <header className="page-intro">
        <p className="eyebrow">Country context</p>
        <h1>{country.name}</h1>
        <p>Published events connected to {country.name}.</p>
      </header>
      {events ? (
        <>
          <EventGrid events={events.items} />
          <Pagination
            page={events.meta.page}
            pageCount={events.meta.pageCount}
            path={`/countries/${country.code}`}
            query={{}}
          />
        </>
      ) : (
        <DataUnavailable area="Country events" />
      )}
    </main>
  );
}
