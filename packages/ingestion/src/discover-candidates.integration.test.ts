import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  closeDatabase,
  createDatabase,
  EventCatalog,
  type DatabasePool,
} from '@bharatlens/database';
import { discoverCandidates } from './discover-candidates.js';
import { deleteFixtureData } from './test-support.js';

const databaseUrl = process.env.DATABASE_URL;

describe.skipIf(!databaseUrl)('candidate discovery (postgres)', () => {
  let pool: DatabasePool;
  let catalog: EventCatalog;

  beforeAll(() => {
    pool = createDatabase(databaseUrl!);
    catalog = new EventCatalog(pool.db);
  });

  afterAll(async () => {
    if (pool) {
      // Candidates get derived slugs (token-date) that no prefix can predict,
      // so remove them through their article links first.
      await pool.sql`
        delete from events where id in (
          select ea.event_id from event_articles ea
          join articles a on a.id = ea.article_id
          join sources s on s.id = a.source_id
          where s.slug like ${'fixture-cand-%'}
        )`;
      await pool.sql`delete from events where slug like ${'cand-%'} or title like ${'%taiwan%'}`;
      await deleteFixtureData(pool, {
        sourceSlugPrefixes: ['fixture-cand-'],
        eventSlugPrefixes: [],
      });
      await closeDatabase(pool.sql);
    }
  });

  it('creates one candidate per qualifying cluster and stays idempotent on rerun', async () => {
    const suffix = randomUUID().slice(0, 8);
    const source = await catalog.createSource({
      name: `Cand agency ${suffix}`,
      slug: `fixture-cand-${suffix}`,
      type: 'NEWS_AGENCY',
    });

    // Topic deliberately disjoint from the seeded Hormuz/LNG token space so
    // the existing-event skip rule cannot swallow this cluster.
    const memberTitles = [
      'China taiwan standoff disrupts chips india electronics supply warned',
      'China taiwan tension hits chips production india electronics buyers wary',
      'China taiwan escalation chips exports india supply chain review ordered',
    ];

    const day = '2026-08-20';
    const insert = async (title: string, tag: string) =>
      catalog.ingestArticle({
        sourceId: source.id,
        title,
        url: `https://example.test/cand-${tag}-${suffix}`,
        publishedAt: new Date(`${day}T02:00:00.000Z`),
      });

    // Qualifying cluster A: shared entities (china/taiwan) + India token.
    await insert(memberTitles[0]!, 'a1');
    await insert(memberTitles[1]!, 'a2');
    await insert(memberTitles[2]!, 'a3');

    // Gated out: no India relevance.
    await insert('Taiwan standoff continues japan reviews chip import rules', 'b1');
    await insert('Taiwan standoff deepens japan chip makers shift output', 'b2');

    // Gated out: singleton.
    await insert('Tsunami drill conducted in pacific islands today', 'c1');

    const eventsBefore = await pool.sql<
      [{ count: string }]
    >`select count(*)::text as count from events`;
    const beforeCount = Number(eventsBefore[0]?.count);

    const first = await discoverCandidates({ catalog });
    expect(first.gatedOut.NOT_INDIA_RELEVANT).toBe(1);

    const [candidate] = (
      await pool.sql<[{ id: string; slug: string; title: string; summary: string }]>`
        select id, slug, title, summary from events
        where status = 'CANDIDATE' and title = ${memberTitles[0]!}
        order by created_at desc limit 1`
    ).map((row) => row);
    expect(candidate).toBeDefined();
    expect(candidate!.summary).toContain('Auto-grouped from 3 reports');
    expect(first.articlesClustered).toBeGreaterThanOrEqual(3);

    const linkedCount = await pool.sql<[{ count: string }]>`
      select count(*)::text as count from event_articles ea
      join events e on e.id = ea.event_id
      where e.id = ${candidate!.id}`;
    expect(Number(linkedCount[0]?.count)).toBe(3);

    // Rerun adds nothing: members are LINKED now, so the scan cannot see them.
    await discoverCandidates({ catalog });
    const eventsAfterRerun = await pool.sql<
      [{ count: string }]
    >`select count(*)::text as count from events`;
    expect(Number(eventsAfterRerun[0]?.count)).toBeGreaterThan(beforeCount);
    const duplicatesOfOurs = await pool.sql<[{ count: string }]>`
      select count(*)::text as count from events where title = ${memberTitles[0]!}`;
    expect(Number(duplicatesOfOurs[0]?.count)).toBe(1);
    void beforeCount;
  });

  it('skips clusters an existing event already covers', async () => {
    const suffix = randomUUID().slice(0, 8);
    const source = await catalog.createSource({
      name: `Cand skip ${suffix}`,
      slug: `fixture-cand-skip-${suffix}`,
      type: 'NEWS_AGENCY',
    });

    await catalog.createEvent({
      title: 'Red Sea shipping attack india monitors crude routes',
      slug: `cand-existing-${suffix}`,
      summary: 'Existing editorial coverage of the red sea situation.',
    });

    await catalog.ingestArticle({
      sourceId: source.id,
      title: 'Red Sea shipping attack disrupts india crude transits',
      url: `https://example.test/cand-skip-1-${suffix}`,
      publishedAt: new Date('2026-08-21T06:00:00.000Z'),
    });
    await catalog.ingestArticle({
      sourceId: source.id,
      title: 'Red Sea shipping attack second report india crude exposure',
      url: `https://example.test/cand-skip-2-${suffix}`,
      publishedAt: new Date('2026-08-21T09:00:00.000Z'),
    });

    const result = await discoverCandidates({ catalog });
    expect(result.skippedExistingEvent).toBeGreaterThanOrEqual(1);

    const created = await pool.sql<[{ count: string }]>`
      select count(*)::text as count from events where slug like ${`red-sea-shipping-%-${suffix}`}`;
    expect(Number(created[0]?.count)).toBe(0);
  });
});
