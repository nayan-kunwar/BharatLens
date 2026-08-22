import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { SiteFooter } from './components/site-footer';
import { SiteHeader } from './components/site-header';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'BharatLens',
    template: '%s | BharatLens',
  },
  description: "See the world through India's lens.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="app-shell">
          <SiteHeader />
          <div className="app-shell__content">{children}</div>
          <SiteFooter />
        </div>
      </body>
    </html>
  );
}
