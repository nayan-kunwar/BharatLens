import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  closeDatabase,
  createDatabase,
  EventCatalog,
  type DatabasePool,
} from '@bharatlens/database';
import type { RawArticle } from './adapter.js';
import { ingestFeed } from './pipeline.js';

const databaseUrl = process.env.DATABASE_URL;

describe.skipIf(!databaseUrl)('ingest pipeline (postgres)', () => {
  let pool: DatabasePool;
  let catalog: EventCatalog;

  beforeAll(() => {
    pool = createDatabase(databaseUrl!);
    catalog = new EventCatalog(pool.db);
  });

  afterAll(async () => {
    await closeDatabase(pool.sql);
  });

  it('inserts new articles once and records the job', async () => {
    const suffix = randomUUID().slice(0, 8);
    const articles: RawArticle[] = [
      {
        title: 'First shipping report',
        url: `https://example.test/ingest-${suffix}`,
        summary: 'Metadata only.',
      },
      {
        title: '  ',
        url: `https://example.test/reject-${suffix}`,
      },
    ];

    const feed = {
      slug: `fixture-${suffix}`,
      name: `Fixture ${suffix}`,
      type: 'NEWS_AGENCY' as const,
      homepageUrl: 'https://example.test',
      feedUrl: 'https://example.test/rss.xml',
    };

    const first = await ingestFeed({
      catalog,
      feed,
      adapter: { fetchArticles: async () => articles },
    });
    const second = await ingestFeed({
      catalog,
      feed,
      adapter: { fetchArticles: async () => articles },
    });

    expect(first.status).toBe('SUCCEEDED');
    expect(first.itemsInserted).toBe(1);
    expect(first.itemsRejected).toBe(1);
    expect(second.itemsInserted).toBe(0);
    expect(second.itemsDuplicate).toBe(1);
    expect(second.itemsRejected).toBe(1);
    expect(second.duplicateReasons.URL).toBe(1);
  });

  it('stores a second URL as DUPLICATE when title and time window match', async () => {
    const suffix = randomUUID().slice(0, 8);
    const feed = {
      slug: `fixture-title-${suffix}`,
      name: `Fixture title ${suffix}`,
      type: 'NEWS_AGENCY' as const,
      homepageUrl: 'https://example.test',
      feedUrl: 'https://example.test/rss.xml',
    };

    const first = await ingestFeed({
      catalog,
      feed,
      adapter: {
        fetchArticles: async () => [
          {
            title: 'Strait of Hormuz shipping disruption',
            url: `https://example.test/a-${suffix}`,
            publishedAt: '2026-08-20T00:00:00.000Z',
            summary: 'Maritime disruption near Hormuz.',
          },
        ],
      },
    });
    const second = await ingestFeed({
      catalog,
      feed: { ...feed, slug: `fixture-title-b-${suffix}`, name: `Fixture title B ${suffix}` },
      adapter: {
        fetchArticles: async () => [
          {
            title: 'Strait of Hormuz: shipping disruption',
            url: `https://example.test/b-${suffix}`,
            publishedAt: '2026-08-20T06:00:00.000Z',
            summary: 'Different outlet, same situation.',
          },
        ],
      },
    });

    expect(first.itemsInserted).toBe(1);
    expect(second.itemsInserted).toBe(0);
    expect(second.itemsDuplicate).toBe(1);
    expect(
      second.duplicateReasons.TITLE_WINDOW + second.duplicateReasons.CONTENT_HASH,
    ).toBeGreaterThan(0);
  });
});
