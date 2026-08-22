import type { SourceType } from '@bharatlens/shared';

export type FeedConfig = {
  slug: string;
  name: string;
  type: SourceType;
  homepageUrl: string;
  feedUrl: string;
};

/**
 * Small, well-known public RSS feeds. Operators should still respect each
 * publisher's terms. Metadata only — no full-article scrape.
 */
export const DEFAULT_FEEDS: FeedConfig[] = [
  {
    slug: 'bbc-world',
    name: 'BBC World',
    type: 'NEWS_AGENCY',
    homepageUrl: 'https://www.bbc.com/news/world',
    feedUrl: 'https://feeds.bbci.co.uk/news/world/rss.xml',
  },
  {
    slug: 'un-news',
    name: 'UN News',
    type: 'INTERNATIONAL_ORG',
    homepageUrl: 'https://news.un.org/',
    feedUrl: 'https://news.un.org/feed/subscribe/en/news/all/rss.xml',
  },
];

export function resolveFeeds(slug?: string): FeedConfig[] {
  if (!slug) {
    return DEFAULT_FEEDS;
  }

  const match = DEFAULT_FEEDS.filter((feed) => feed.slug === slug);
  if (match.length === 0) {
    throw new Error(`Unknown ingest source slug: ${slug}`);
  }
  return match;
}
