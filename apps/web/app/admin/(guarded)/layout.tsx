import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';
import Link from 'next/link';
import { cookies } from 'next/headers';
import { ADMIN_SESSION_COOKIE } from '../../lib/admin-api';
import { LogoutButton } from '../logout-button';

export const metadata = {
  title: {
    default: 'Admin',
    template: '%s | BharatLens Admin',
  },
  robots: { index: false, follow: false },
};

/** Single guard point for every console page. */
export default async function GuardedAdminLayout({ children }: { children: ReactNode }) {
  const jar = await cookies();
  if (!jar.get(ADMIN_SESSION_COOKIE)?.value) {
    redirect('/admin/login');
  }

  return (
    <div className="admin-shell">
      <nav className="admin-nav">
        <span className="admin-nav__brand">BharatLens Admin</span>
        <div className="admin-nav__links">
          <Link href="/admin">Overview</Link>
          <Link href="/admin/events">Events</Link>
          <Link href="/">Public site</Link>
        </div>
        <LogoutButton />
      </nav>
      <main className="page-content">{children}</main>
    </div>
  );
}
