import type { Metadata } from 'next';
import Link from 'next/link';
import { DataUnavailable } from '../components/data-unavailable';
import { getCountries } from '../lib/api';

export const metadata: Metadata = { title: 'Countries' };

export default async function CountriesPage() {
  const countries = await getCountries().catch(() => null);

  return (
    <main className="page-shell page-content">
      <header className="page-intro">
        <p className="eyebrow">Countries</p>
        <h1>Country context</h1>
        <p>Explore the published events associated with each country.</p>
      </header>
      {countries ? (
        <div className="directory-grid">
          {countries.map((country) => (
            <Link className="directory-item" href={`/countries/${country.code}`} key={country.code}>
              <span>{country.code}</span>
              <strong>{country.name}</strong>
            </Link>
          ))}
        </div>
      ) : (
        <DataUnavailable area="Countries" />
      )}
    </main>
  );
}
