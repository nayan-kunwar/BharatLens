import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  closeDatabase,
  createDatabase,
  EventQueries,
  type DatabasePool,
} from '@bharatlens/database';

const databaseUrl = process.env.DATABASE_URL;

describe.skipIf(!databaseUrl)('event search (postgres FTS)', () => {
  let pool: DatabasePool;
  let queries: EventQueries;

  beforeAll(async () => {
    pool = createDatabase(databaseUrl!);
    queries = new EventQueries(pool.db);

    // Relevance fixture: the term sits in a weighted title (A) versus a
    // description (C) versus nowhere. Published so public filters apply.
    await pool.sql`
      insert into events (id, title, summary, description, status, slug, published_at)
      values (
        gen_random_uuid(),
        'Sanctions regime expansion', 'Broad sanctions package announced.', null,
        'PUBLISHED', ${`srch-title-${randomUUID().slice(0, 8)}`}, now()
      )`;
    await pool.sql`
      insert into events (id, title, summary, description, status, slug, published_at)
      values (
        gen_random_uuid(),
        'Trade council meeting', 'Routine session.',
        'Delegates discussed whether the sanctions list should be revisited next quarter.',
        'PUBLISHED', ${`srch-desc-${randomUUID().slice(0, 8)}`}, now()
      )`;
    // Unrelated control.
    await pool.sql`
      insert into events (id, title, summary, description, status, slug, published_at)
      values (
        gen_random_uuid(),
        'Unrelated diplomatic note', 'A brief courtesy visit.', null,
        'PUBLISHED', ${`srch-none-${randomUUID().slice(0, 8)}`}, now()
      )`;
  });

  afterAll(async () => {
    if (pool) {
      await pool.sql`delete from events where slug like ${'srch-%'}`;
      await closeDatabase(pool.sql);
    }
  });

  it('ranks title matches above description-only matches and keeps ILIKE fallback', async () => {
    const relevant = await queries.listEvents({
      page: 1,
      limit: 10,
      query: 'sanctions',
      sort: 'relevance',
      order: 'desc',
    });

    expect(relevant.total).toBe(2);
    const titles = relevant.items.map((item) => item.title);
    expect(titles[0]).toBe('Sanctions regime expansion');

    // Partial word falls back to ILIKE substring matching.
    const partial = await queries.listEvents({
      page: 1,
      limit: 10,
      query: 'sanct',
      sort: 'relevance',
      order: 'desc',
    });
    expect(partial.total).toBeGreaterThanOrEqual(1);
    expect(partial.items.map((item) => item.title)).toContain('Sanctions regime expansion');
  });
});
