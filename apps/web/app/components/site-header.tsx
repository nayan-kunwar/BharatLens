import Link from 'next/link';

const links = [
  { href: '/events', label: 'Events' },
  { href: '/map', label: 'Map' },
  { href: '/analytics', label: 'Analytics' },
  { href: '/countries', label: 'Countries' },
  { href: '/topics', label: 'Topics' },
  { href: '/search', label: 'Search' },
  { href: '/about', label: 'About' },
];

export function SiteHeader() {
  return (
    <header className="site-header">
      <div className="site-header__inner">
        <Link className="wordmark" href="/">
          BharatLens
        </Link>
        <nav aria-label="Primary navigation" className="site-nav">
          {links.map((link) => (
            <Link href={link.href} key={link.href}>
              {link.label}
            </Link>
          ))}
        </nav>
        <form action="/search" className="header-search">
          <label className="visually-hidden" htmlFor="header-search">
            Search events
          </label>
          <input
            id="header-search"
            minLength={2}
            name="q"
            placeholder="Search events"
            type="search"
          />
          <button type="submit">Search</button>
        </form>
      </div>
    </header>
  );
}
