import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  closeDatabase,
  createDatabase,
  EventCatalog,
  EventQueries,
  type DatabasePool,
} from '@bharatlens/database';

const databaseUrl = process.env.DATABASE_URL;

describe.skipIf(!databaseUrl)('india map overview (postgres)', () => {
  let pool: DatabasePool;
  let catalog: EventCatalog;
  let queries: EventQueries;

  const suffix = randomUUID().slice(0, 6);

  beforeAll(async () => {
    pool = createDatabase(databaseUrl!);
    catalog = new EventCatalog(pool.db);
    queries = new EventQueries(pool.db);
  });

  afterAll(async () => {
    if (pool) {
      await pool.sql`delete from events where slug like ${'map-%'}`;
      await pool.sql`delete from countries where slug like ${'map-%'}`;
      await closeDatabase(pool.sql);
    }
  });

  async function publish(eventId: string) {
    await catalog.transitionEvent(eventId, 'DRAFT');
    await catalog.transitionEvent(eventId, 'ANALYZED');
    await catalog.transitionEvent(eventId, 'REVIEW_REQUIRED');
    await catalog.transitionEvent(eventId, 'PUBLISHED');
  }

  it('aggregates shared published partners and excludes unpublished pairs', async () => {
    // Unique codes per run so parallel suites never collide on country PK.
    const codeFor = (letter: string, n: number) =>
      `${letter}${(n + suffix.charCodeAt(0)) % 26}${(n * 7 + suffix.charCodeAt(1)) % 26}`
        .toUpperCase()
        .slice(0, 2);

    const [indiaRow] = (
      await pool.sql<[{ id: string }]>`select id from countries where code = 'IN' limit 1`
    ).map((row) => row);
    const india = indiaRow
      ? { id: indiaRow.id }
      : await catalog.createCountry({ code: 'IN', name: 'India', slug: `map-india-${suffix}` });
    const us = await catalog.createCountry({
      code: codeFor('U', 1),
      name: `Map US ${suffix}`,
      slug: `map-us-${suffix}`,
    });
    const france = await catalog.createCountry({
      code: codeFor('F', 2),
      name: `Map FR ${suffix}`,
      slug: `map-fr-${suffix}`,
    });
    const germany = await catalog.createCountry({
      code: codeFor('G', 3),
      name: `Map DE ${suffix}`,
      slug: `map-de-${suffix}`,
    });

    // Two shared published events with the US partner.
    for (let i = 0; i < 2; i += 1) {
      const event = await catalog.createEvent({
        title: `Map US fixture ${i} ${suffix}`,
        slug: `map-us-ev-${i}-${suffix}`,
        summary: undefined,
        countryIds: [india.id, us.id],
      });
      await publish(event.id);
    }

    // One shared published event with France.
    const frEvent = await catalog.createEvent({
      title: `Map FR fixture ${suffix}`,
      slug: `map-fr-ev-${suffix}`,
      summary: undefined,
      countryIds: [india.id, france.id],
    });
    await publish(frEvent.id);

    // Candidate-only pair must not appear.
    const draftEvent = await catalog.createEvent({
      title: `Map DE draft ${suffix}`,
      slug: `map-de-draft-${suffix}`,
      summary: undefined,
      countryIds: [india.id, germany.id],
    });
    void draftEvent;

    const overview = await queries.getIndiaMapOverview();
    const byName = new Map(overview.map((partner) => [partner.name, partner]));

    expect(byName.get(`Map US ${suffix}`)?.eventCount).toBe(2);
    expect(byName.get(`Map FR ${suffix}`)?.eventCount).toBe(1);
    expect(byName.get(`Map DE ${suffix}`)).toBeUndefined();

    const usIndex = overview.findIndex((partner) => partner.name === `Map US ${suffix}`);
    const frIndex = overview.findIndex((partner) => partner.name === `Map FR ${suffix}`);
    expect(usIndex).toBeLessThan(frIndex);
    expect(
      overview.find((partner) => partner.name === `Map FR ${suffix}`)?.lastSharedAt,
    ).toBeTruthy();
  });
});
