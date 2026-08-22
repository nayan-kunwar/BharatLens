import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { DomainError } from '@bharatlens/shared';
import { closeDatabase, createDatabase, type DatabasePool } from './client.js';
import { EventCatalog } from './catalog.js';
import { events, impactAssessments } from './schema/events.js';

const databaseUrl = process.env.DATABASE_URL;

describe.skipIf(!databaseUrl)('event catalog (postgres)', () => {
  let pool: DatabasePool;
  let catalog: EventCatalog;

  beforeAll(() => {
    pool = createDatabase(databaseUrl!);
    catalog = new EventCatalog(pool.db);
  });

  afterAll(async () => {
    await closeDatabase(pool.sql);
  });

  it('stores a candidate event with claims, evidence, and versioned assessments', async () => {
    const suffix = randomUUID().slice(0, 8);

    const source = await catalog.createSource({
      name: `Reuters ${suffix}`,
      slug: `reuters-${suffix}`,
      type: 'NEWS_AGENCY',
    });

    const iran = await catalog.createCountry({
      code: suffix.slice(0, 2).toUpperCase(),
      name: `Iran ${suffix}`,
      slug: `iran-${suffix}`,
    });

    const energy = await catalog.createTopic({
      slug: `energy-${suffix}`,
      name: 'Energy',
    });

    const event = await catalog.createEvent({
      title: 'Hormuz shipping disruption',
      slug: `hormuz-${suffix}`,
      summary: 'Maritime disruption reported near the Strait of Hormuz.',
      countryIds: [iran.id],
      topicIds: [energy.id],
    });

    expect(event.status).toBe('CANDIDATE');

    const article = await catalog.createArticle({
      sourceId: source.id,
      title: 'Shipping disruption reported',
      url: `https://example.test/hormuz-${suffix}`,
    });

    await catalog.attachArticle(event.id, article.id);

    const claim = await catalog.addClaim({
      eventId: event.id,
      statement: 'Shipping in the strait was disrupted.',
      type: 'FACT',
      sourceId: source.id,
      articleId: article.id,
    });

    const updatedClaim = await catalog.addEvidence({
      claimId: claim.id,
      sourceId: source.id,
      url: article.url,
      excerpt: 'Shipping disruption reported.',
      articleId: article.id,
      official: false,
    });

    expect(updatedClaim?.evidenceStrength).toBe('WEAK');
    expect(updatedClaim?.type).toBe('FACT');

    await catalog.transitionEvent(event.id, 'DRAFT');
    await catalog.transitionEvent(event.id, 'ANALYZED');
    await catalog.transitionEvent(event.id, 'REVIEW_REQUIRED');
    await catalog.transitionEvent(event.id, 'PUBLISHED');

    const v1 = await catalog.createImpactAssessment({
      eventId: event.id,
      overallLevel: 'HIGH',
      reasoning: 'India has significant seaborne crude exposure.',
      evidenceStrength: 'MODERATE',
      analysisConfidence: 'MEDIUM',
      status: 'PUBLISHED',
      categories: [
        {
          category: 'ENERGY',
          level: 'HIGH',
          reasoning: 'Imported crude routes may be affected.',
        },
      ],
    });

    const v2 = await catalog.createImpactAssessment({
      eventId: event.id,
      overallLevel: 'MEDIUM',
      reasoning: 'Alternative routing reduced pressure.',
      evidenceStrength: 'MODERATE',
      analysisConfidence: 'LOW',
      status: 'PUBLISHED',
      categories: [
        {
          category: 'ENERGY',
          level: 'MEDIUM',
          reasoning: 'Some cargoes rerouted.',
        },
      ],
    });

    expect(v1.version).toBe(1);
    expect(v2.version).toBe(2);

    const [fresh] = await pool.db.select().from(events).where(eq(events.id, event.id));
    expect(fresh?.currentImpactAssessmentId).toBe(v2.id);

    await expect(
      catalog.createImpactAssessment({
        eventId: event.id,
        overallLevel: 'LOW',
        reasoning: 'duplicate version probe',
        evidenceStrength: 'WEAK',
        analysisConfidence: 'LOW',
        status: 'DRAFT',
        categories: [],
      }),
    ).resolves.toMatchObject({ version: 3 });

    await catalog.addUpdate({
      eventId: event.id,
      title: 'Rerouting announced',
      occurredAt: new Date(),
    });

    const [afterUpdate] = await pool.db.select().from(events).where(eq(events.id, event.id));
    expect(afterUpdate?.status).toBe('UPDATED');

    const versions = await pool.db
      .select({ version: impactAssessments.version })
      .from(impactAssessments)
      .where(eq(impactAssessments.eventId, event.id));

    expect(versions.map((row) => row.version).sort()).toEqual([1, 2, 3]);
  });

  it('rejects publishing without the review path', async () => {
    const suffix = randomUUID().slice(0, 8);
    const event = await catalog.createEvent({
      title: 'Draft only',
      slug: `draft-${suffix}`,
    });

    await expect(catalog.transitionEvent(event.id, 'PUBLISHED')).rejects.toBeInstanceOf(
      DomainError,
    );
  });
});
