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
  });
});
