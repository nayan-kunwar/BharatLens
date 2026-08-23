import Fastify, { type FastifyInstance } from 'fastify';
import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  closeDatabase,
  createDatabase,
  EventCatalog,
  type DatabasePool,
} from '@bharatlens/database';
import errorHandler from './plugins/error-handler.js';
import requestId from './plugins/request-id.js';
import { publicApi } from './plugins/public-api.js';

const databaseUrl = process.env.DATABASE_URL;

function testCountryCode(suffix: string): string {
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

describe.skipIf(!databaseUrl)('public API v1', () => {
  let pool: DatabasePool;
  let catalog: EventCatalog;
  let app: FastifyInstance;
  let slug: string;
  let eventId: string;
  let countryCode: string;

  beforeAll(async () => {
    pool = createDatabase(databaseUrl!);
    catalog = new EventCatalog(pool.db);
    const suffix = randomUUID().slice(0, 8);
    slug = `hormuz-api-${suffix}`;
    countryCode = testCountryCode(suffix);

    const source = await catalog.createSource({
      name: `AP ${suffix}`,
      slug: `ap-${suffix}`,
      type: 'NEWS_AGENCY',
    });
    const country = await catalog.createCountry({
      code: countryCode,
      name: `Testland ${suffix}`,
      slug: `testland-${suffix}`,
    });
    const topic = await catalog.createTopic({
      slug: `maritime-${suffix}`,
      name: 'Maritime',
    });
    const event = await catalog.createEvent({
      title: 'Hormuz shipping disruption',
      slug,
      summary: 'Maritime disruption reported near Hormuz.',
      countryIds: [country.id],
      topicIds: [topic.id],
    });
    eventId = event.id;

    const article = await catalog.createArticle({
      sourceId: source.id,
      title: 'Disruption reported',
      url: `https://example.test/${suffix}`,
    });
    await catalog.attachArticle(event.id, article.id);
    await catalog.addClaim({
      eventId: event.id,
      statement: 'Shipping was disrupted.',
      type: 'FACT',
      status: 'APPROVED',
      sourceId: source.id,
      articleId: article.id,
    });

    await catalog.transitionEvent(event.id, 'DRAFT');
    await catalog.transitionEvent(event.id, 'ANALYZED');
    await catalog.transitionEvent(event.id, 'REVIEW_REQUIRED');
    await catalog.transitionEvent(event.id, 'PUBLISHED');

    await catalog.createImpactAssessment({
      eventId: event.id,
      overallLevel: 'HIGH',
      reasoning: 'India has seaborne crude exposure.',
      evidenceStrength: 'MODERATE',
      analysisConfidence: 'MEDIUM',
      status: 'PUBLISHED',
      categories: [
        { category: 'ENERGY', level: 'HIGH', reasoning: 'Import routes may be affected.' },
      ],
    });

    await catalog.addUpdate({
      eventId: event.id,
      title: 'Initial reports',
      occurredAt: new Date('2026-08-20T00:00:00.000Z'),
    });

    app = Fastify({ logger: false });
    await app.register(requestId);
    await app.register(errorHandler);
    await app.register(publicApi, { db: pool.db });
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
    await closeDatabase(pool.sql);
  });

  it('lists published events and hides unpublished ones', async () => {
    const unpublished = await catalog.createEvent({
      title: 'Secret draft',
      slug: `draft-${randomUUID().slice(0, 8)}`,
    });

    const list = await app.inject({ method: 'GET', url: '/api/v1/events?limit=100' });
    expect(list.statusCode).toBe(200);
    const body = list.json() as {
      success: boolean;
      data: Array<{ slug: string }>;
      meta: { total: number };
    };
    expect(body.success).toBe(true);
    expect(body.data.some((item) => item.slug === slug)).toBe(true);
    expect(body.data.some((item) => item.slug === unpublished.slug)).toBe(false);

    const hidden = await app.inject({
      method: 'GET',
      url: `/api/v1/events/${unpublished.slug}`,
    });
    expect(hidden.statusCode).toBe(404);
  });

  it('returns event detail, nested resources, and search', async () => {
    const detail = await app.inject({ method: 'GET', url: `/api/v1/events/${slug}` });
    expect(detail.statusCode).toBe(200);
    const eventBody = detail.json() as { data: { id: string; title: string } };
    expect(eventBody.data.title).toContain('Hormuz');

    const sources = await app.inject({
      method: 'GET',
      url: `/api/v1/events/${eventId}/sources`,
    });
    expect(sources.statusCode).toBe(200);
    expect((sources.json() as { data: unknown[] }).data.length).toBeGreaterThan(0);

    const claims = await app.inject({
      method: 'GET',
      url: `/api/v1/events/${eventId}/claims`,
    });
    expect((claims.json() as { data: Array<{ type: string }> }).data[0]?.type).toBe('FACT');

    const impact = await app.inject({
      method: 'GET',
      url: `/api/v1/events/${eventId}/impact`,
    });
    const impactBody = impact.json() as {
      data: { current: { analysisConfidence: string; evidenceStrength: string; version: number } };
    };
    expect(impactBody.data.current.version).toBe(1);
    expect(impactBody.data.current.analysisConfidence).toBe('MEDIUM');
    expect(impactBody.data.current.evidenceStrength).toBe('MODERATE');

    const updates = await app.inject({
      method: 'GET',
      url: `/api/v1/events/${eventId}/updates`,
    });
    expect((updates.json() as { data: unknown[] }).data).toHaveLength(1);

    const search = await app.inject({ method: 'GET', url: '/api/v1/search?q=Hormuz' });
    expect(search.statusCode).toBe(200);
    expect(
      (search.json() as { data: Array<{ slug: string }> }).data.some((item) => item.slug === slug),
    ).toBe(true);

    const country = await app.inject({
      method: 'GET',
      url: `/api/v1/countries/${countryCode}`,
    });
    expect(country.statusCode).toBe(200);

    const missing = await app.inject({ method: 'GET', url: '/api/v1/events/does-not-exist' });
    expect(missing.statusCode).toBe(404);
  });

  it('returns published impact history snapshots and hides drafts', async () => {
    const draft = await catalog.createImpactAssessment({
      eventId,
      overallLevel: 'LOW',
      reasoning: 'Draft must not appear on the public API.',
      evidenceStrength: 'WEAK',
      analysisConfidence: 'LOW',
      status: 'DRAFT',
      categories: [{ category: 'ENERGY', level: 'LOW', reasoning: 'Draft only.' }],
    });
    expect(draft.status).toBe('DRAFT');

    await catalog.createImpactAssessment({
      eventId,
      overallLevel: 'MEDIUM',
      reasoning: 'Alternative routing reduced immediate pressure.',
      evidenceStrength: 'MODERATE',
      analysisConfidence: 'MEDIUM',
      status: 'PUBLISHED',
      publishedAt: new Date('2026-08-23T00:00:00.000Z'),
      categories: [
        { category: 'ENERGY', level: 'MEDIUM', reasoning: 'Some cargoes can be rerouted.' },
      ],
    });

    const impact = await app.inject({
      method: 'GET',
      url: `/api/v1/events/${eventId}/impact`,
    });
    const body = impact.json() as {
      data: {
        current: { version: number; overallLevel: string; reasoning: string };
        history: Array<{
          version: number;
          status: string;
          overallLevel: string;
          reasoning: string;
          categories: Array<{ category: string; level: string }>;
        }>;
      };
    };

    expect(body.data.history.every((item) => item.status === 'PUBLISHED')).toBe(true);
    expect(body.data.history.some((item) => item.reasoning.includes('must not appear'))).toBe(
      false,
    );
    expect(body.data.current.overallLevel).toBe('MEDIUM');
    expect(body.data.history.at(-1)?.categories[0]?.level).toBe('MEDIUM');
    expect(body.data.history[0]?.reasoning).toContain('seaborne crude');
  });

  it('validates pagination', async () => {
    const response = await app.inject({ method: 'GET', url: '/api/v1/events?page=0' });
    expect(response.statusCode).toBe(400);
  });
});
