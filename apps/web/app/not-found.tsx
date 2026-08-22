import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="page-shell page-content not-found">
      <p className="eyebrow">Not found</p>
      <h1>This published event or context page is not available.</h1>
      <Link className="button" href="/events">
        Browse events
      </Link>
    </main>
  );
}
