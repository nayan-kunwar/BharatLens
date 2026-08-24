import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { DomainError } from '@bharatlens/shared';
import { closeDatabase, createDatabase, type DatabasePool } from './client.js';
import { EventCatalog } from './catalog.js';
import { events, impactAssessments } from './schema/events.js';

const databaseUrl = process.env.DATABASE_URL;

/** User-assigned ISO-like codes (X*) avoid colliding with seeded IN/IR/US and hex prefixes like "29". */
function countryCodeFromSuffix(suffix: string): string {
  const n = Number.parseInt(suffix.replace(/[^0-9a-f]/gi, '').slice(0, 8) || '1', 16);
  const reserved = new Set(['AE', 'CN', 'DE', 'GB', 'IN', 'IR', 'JP', 'PK', 'RU', 'SA', 'US']);
  for (let i = 0; i < 700; i += 1) {
    const value = n + i;
    const code = `${String.fromCharCode(65 + (value % 26))}${String.fromCharCode(65 + (Math.floor(value / 26) % 26))}`;
    if (!reserved.has(code)) {
      return code;
    }
  }
  return 'ZZ';
}

describe.skipIf(!databaseUrl)('event catalog (postgres)', () => {
  let pool: DatabasePool;
  let catalog: EventCatalog;

  beforeAll(() => {
    pool = createDatabase(databaseUrl!);
    catalog = new EventCatalog(pool.db);
  });

  afterAll(async () => {
    // Fixture slugs are namespaced so cleanup can never match other suites.
    await pool.sql`delete from events where slug like ${'hormuz-%'} or slug like ${'draft-%'}`;
    await pool.sql`delete from evidence where source_id in (select id from sources where slug like ${'reuters-%'})`;
    await pool.sql`delete from articles where source_id in (select id from sources where slug like ${'reuters-%'})`;
    await pool.sql`delete from sources where slug like ${'reuters-%'}`;
    await pool.sql`delete from countries where slug like ${'iran-%'}`;
    await pool.sql`delete from topics where slug like ${'energy-%'}`;
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
      code: countryCodeFromSuffix(suffix),
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

  it('stores, publishes, and freezes an impact chain with a pointer swap', async () => {
    const suffix = randomUUID().slice(0, 8);
    const event = await catalog.createEvent({
      title: 'Chain fixture',
      slug: `draft-${suffix}`,
    });

    const chain = await catalog.createDraftChain(event.id, {
      nodes: [
        { key: 'root', kind: 'ROOT', label: 'Disruption reported' },
        { key: 'route', kind: 'CHANNEL', label: 'Transport risk rises' },
        { key: 'bill', kind: 'IMPACT', label: 'Import bill pressure' },
      ],
      edges: [
        { from: 'root', to: 'route' },
        { from: 'route', to: 'bill' },
      ],
      modelName: 'test',
      promptVersion: 'chain-test-v1',
    });
    expect(chain.version).toBe(1);
    expect(chain.nodes).toHaveLength(3);
    expect(chain.edges).toHaveLength(2);

    // Invalid graphs must be rejected before persistence.
    await expect(
      catalog.createDraftChain(event.id, {
        nodes: [
          { key: 'root', kind: 'ROOT', label: 'A' },
          { key: 'a', kind: 'CHANNEL', label: 'B' },
          { key: 'b', kind: 'IMPACT', label: 'C' },
        ],
        edges: [
          { from: 'root', to: 'a' },
          { from: 'a', to: 'root' },
        ],
      }),
    ).rejects.toThrow(/CYCLE/);

    const published = await catalog.publishChain(chain.id);
    expect(published.chain.status).toBe('PUBLISHED');
    expect(published.event.currentImpactChainId).toBe(chain.id);

    // Published chains are immutable history.
    await expect(
      catalog.updateDraftChain(chain.id, {
        nodes: [
          { key: 'root', kind: 'ROOT', label: 'Rewritten root' },
          { key: 'a', kind: 'CHANNEL', label: 'B' },
          { key: 'b', kind: 'IMPACT', label: 'C' },
        ],
        edges: [
          { from: 'root', to: 'a' },
          { from: 'a', to: 'b' },
        ],
      }),
    ).rejects.toThrow(/DRAFT/);

    await expect(catalog.publishChain(chain.id)).rejects.toThrow(/DRAFT/);

    // A second draft takes the next version and publishing swaps the pointer.
    const second = await catalog.createDraftChain(event.id, {
      nodes: [
        { key: 'root', kind: 'ROOT', label: 'Updated root' },
        { key: 'direct', kind: 'CHANNEL', label: 'Direct channel' },
        { key: 'bill2', kind: 'IMPACT', label: 'New impact' },
      ],
      edges: [
        { from: 'root', to: 'direct' },
        { from: 'direct', to: 'bill2' },
      ],
    });
    expect(second.version).toBe(2);

    const republished = await catalog.publishChain(second.id);
    expect(republished.event.currentImpactChainId).toBe(second.id);
  });
});
