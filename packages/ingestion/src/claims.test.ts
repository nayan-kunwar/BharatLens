import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  closeDatabase,
  createDatabase,
  EventCatalog,
  type DatabasePool,
} from '@bharatlens/database';
import { extractClaimsForEvent } from './claims.js';
import { deleteFixtureData } from './test-support.js';

const databaseUrl = process.env.DATABASE_URL;

describe.skipIf(!databaseUrl)('claim extraction (postgres)', () => {
  let pool: DatabasePool;
  let catalog: EventCatalog;

  beforeAll(() => {
    pool = createDatabase(databaseUrl!);
    catalog = new EventCatalog(pool.db);
  });

  afterAll(async () => {
    await deleteFixtureData(pool, {
      sourceSlugPrefixes: ['fixture-agency-', 'fixture-un-'],
      eventSlugPrefixes: ['claims-hormuz-'],
    });
    await closeDatabase(pool.sql);
  });

  it('links overlapping articles, creates PENDING claims, and recounts official evidence', async () => {
    const suffix = randomUUID().slice(0, 8);
    const agency = await catalog.createSource({
      name: `Agency ${suffix}`,
      // Namespaced under fixture- so cross-package cleanup patterns never
      // match another suite's sources.
      slug: `fixture-agency-${suffix}`,
      type: 'NEWS_AGENCY',
    });
    const official = await catalog.createSource({
      name: `UN ${suffix}`,
      slug: `fixture-un-${suffix}`,
      type: 'INTERNATIONAL_ORG',
    });
    const event = await catalog.createEvent({
      title: 'Strait of Hormuz shipping disruption',
      slug: `claims-hormuz-${suffix}`,
      summary: 'Maritime disruption reported near Hormuz affecting crude shipping.',
    });

    await catalog.ingestArticle({
      sourceId: agency.id,
      title: 'Hormuz shipping disruption raises India crude import risk',
      url: `https://example.test/agency-${suffix}`,
      summary: 'Disruption near the strait raises exposure for Indian energy imports.',
      status: 'NORMALIZED',
    });
    await catalog.ingestArticle({
      sourceId: official.id,
      title: 'UN notes Hormuz shipping disruption and India energy exposure',
      url: `https://example.test/un-${suffix}`,
      summary: 'Official note on shipping disruption near Hormuz.',
      status: 'NORMALIZED',
    });

    const first = await extractClaimsForEvent(catalog, event.slug);
    const second = await extractClaimsForEvent(catalog, event.slug);

    expect(first.articlesLinked).toBeGreaterThanOrEqual(2);
    expect(first.claimsCreated).toBeGreaterThan(0);
    expect(second.claimsCreated).toBe(0);

    const claims = await catalog.listClaimsForEvent(event.id);
    expect(claims.every((claim) => claim.status === 'PENDING')).toBe(true);
    expect(claims.every((claim) => claim.type !== 'FACT')).toBe(true);

    const withOfficial = claims.find((claim) => claim.officialSourceCount >= 1);
    expect(
      withOfficial?.evidenceStrength === 'MODERATE' || withOfficial?.evidenceStrength === 'STRONG',
    ).toBe(true);
    expect(withOfficial?.evidenceReason).toContain('not a model score');
  });
});
