import Link from 'next/link';

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="site-footer__inner">
        <p>BharatLens — see the world through India&apos;s lens.</p>
        <nav aria-label="Footer">
          <Link href="/about">About</Link>
          <Link href="/events">Events</Link>
          <Link href="/search">Search</Link>
        </nav>
      </div>
    </footer>
  );
}
