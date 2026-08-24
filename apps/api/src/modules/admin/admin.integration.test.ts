import type { FastifyInstance } from 'fastify';
import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { AppConfig } from '@bharatlens/config';
import {
  closeDatabase,
  createDatabase,
  EventCatalog,
  type DatabasePool,
} from '@bharatlens/database';
import { buildApp } from '../../app.js';

const databaseUrl = process.env.DATABASE_URL;
const redisUrl = process.env.REDIS_URL ?? 'redis://localhost:6379';

const testConfig: AppConfig = {
  NODE_ENV: 'test',
  LOG_LEVEL: 'warn',
  API_HOST: '127.0.0.1',
  API_PORT: 0,
  WORKER_HEALTH_PORT: 0,
  WEB_ORIGIN: 'http://localhost:3000',
  DATABASE_URL: databaseUrl ?? '',
  REDIS_URL: redisUrl,
  INGEST_POLL_MINUTES: 0,
  ADMIN_PASSWORD: 'integration-test-password',
  ADMIN_SESSION_TTL_HOURS: 1,
  ADMIN_COOKIE_SECURE: false,
};

describe.skipIf(!databaseUrl)('admin api v1', () => {
  let pool: DatabasePool;
  let catalog: EventCatalog;
  let app: FastifyInstance;
  let cookie: string;
  const suffix = randomUUID().slice(0, 8);
  let eventSlug = '';

  beforeAll(async () => {
    pool = createDatabase(databaseUrl!);
    catalog = new EventCatalog(pool.db);
    const built = await buildApp(testConfig);
    app = built.app;
    eventSlug = `admin-it-${suffix}`;
  }, 30_000);

  afterAll(async () => {
    if (pool) {
      await pool.sql`delete from events where slug like ${'admin-it-%'}`;
      await closeDatabase(pool.sql);
    }
    await app?.close();
  }, 30_000);

  const login = async (password: string) =>
    app.inject({ method: 'POST', url: '/api/v1/admin/auth/login', payload: { password } });

  it('blocks unauthenticated access and bad passwords', async () => {
    const denied = await app.inject({ method: 'GET', url: '/api/v1/admin/overview' });
    expect(denied.statusCode).toBe(401);
    expect(JSON.parse(denied.body).error.code).toBe('UNAUTHORIZED');

    const badLogin = await login('totally-wrong');
    expect(badLogin.statusCode).toBe(401);
    expect(JSON.parse(badLogin.body).error.code).toBe('INVALID_CREDENTIALS');
  });

  it('issues a session cookie on login and guards admin routes', async () => {
    const good = await login('integration-test-password');
    expect(good.statusCode).toBe(200);
    expect(good.cookies.some((c) => c.name === 'bharatlens_admin_session')).toBe(true);

    cookie = good.cookies.map((c) => `${c.name}=${c.value}`).join('; ');

    const overview = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/overview',
      headers: { cookie },
    });
    expect(overview.statusCode).toBe(200);
    expect(JSON.parse(overview.body).data.countsByStatus.CANDIDATE).toBeDefined();
  });

  it('creates, edits, reviews claims, edits draft assessment, and publishes atomically', async () => {
    const created = await app.inject({
      method: 'POST',
      url: '/api/v1/admin/events',
      headers: { cookie },
      payload: {
        title: `Admin IT disruption ${suffix}`,
        slug: eventSlug,
        summary: 'Integration fixture event for the review workflow.',
        countryCodes: [],
        topicSlugs: [],
      },
    });
    expect(created.statusCode).toBe(200);
    const event = JSON.parse(created.body).data;
    expect(event.slug).toBe(eventSlug);
    expect(event.status).toBe('CANDIDATE');

    const patched = await app.inject({
      method: 'PATCH',
      url: `/api/v1/admin/events/${event.id}`,
      headers: { cookie },
      payload: { summary: 'Edited summary for review.' },
    });
    expect(patched.statusCode).toBe(200);

    const approve = await catalog.addClaim({
      eventId: event.id,
      statement: `Approved fact ${suffix}`,
      type: 'ANALYSIS',
      status: 'PENDING',
    });
    const reject = await catalog.addClaim({
      eventId: event.id,
      statement: `Rejected claim ${suffix}`,
      type: 'SCENARIO',
      status: 'PENDING',
    });

    const approveRes = await app.inject({
      method: 'POST',
      url: `/api/v1/admin/claims/${approve.id}/review`,
      headers: { cookie },
      payload: { status: 'APPROVED' },
    });
    expect(approveRes.statusCode).toBe(200);

    const rejectRes = await app.inject({
      method: 'POST',
      url: `/api/v1/admin/claims/${reject.id}/review`,
      headers: { cookie },
      payload: { status: 'REJECTED' },
    });
    expect(rejectRes.statusCode).toBe(200);

    const assessment = await catalog.createImpactAssessment({
      eventId: event.id,
      overallLevel: 'MEDIUM',
      reasoning: 'Draft seeded for the edit-before-publish test.',
      evidenceStrength: 'WEAK',
      analysisConfidence: 'LOW',
      categories: [{ category: 'DIPLOMACY', level: 'LOW', reasoning: 'Seeded category.' }],
      status: 'DRAFT',
      modelName: 'integration-test',
      promptVersion: 'admin-integration-v1',
    });

    const edited = await app.inject({
      method: 'PUT',
      url: `/api/v1/admin/assessments/${assessment.id}`,
      headers: { cookie },
      payload: {
        overallLevel: 'HIGH',
        categories: [
          { category: 'ENERGY', level: 'HIGH', reasoning: 'Edited during review.' },
          { category: 'TRADE', level: 'MEDIUM', reasoning: 'Edited during review.' },
        ],
      },
    });
    expect(edited.statusCode).toBe(200);
    expect(JSON.parse(edited.body).data.overallLevel).toBe('HIGH');
    expect(JSON.parse(edited.body).data.categories).toHaveLength(2);

    const published = await app.inject({
      method: 'POST',
      url: `/api/v1/admin/assessments/${assessment.id}/publish`,
      headers: { cookie },
    });
    expect(published.statusCode).toBe(200);
    const body = JSON.parse(published.body).data;
    expect(body.event.status).toBe('PUBLISHED');
    expect(body.event.currentImpactAssessmentId).toBe(assessment.id);
    expect(body.assessment.status).toBe('PUBLISHED');

    // Public surface now shows the event with only the approved claim.
    const publicDetail = await app.inject({
      method: 'GET',
      url: `/api/v1/events/${eventSlug}`,
    });
    expect(publicDetail.statusCode).toBe(200);

    const publicClaims = await app.inject({
      method: 'GET',
      url: `/api/v1/events/${event.id}/claims`,
    });
    const claimsData = JSON.parse(publicClaims.body).data;
    expect(claimsData).toHaveLength(1);
    expect(claimsData[0].statement).toBe(`Approved fact ${suffix}`);

    // Publishing again must fail cleanly (immutable history).
    const republish = await app.inject({
      method: 'POST',
      url: `/api/v1/admin/assessments/${assessment.id}/publish`,
      headers: { cookie },
    });
    expect(republish.statusCode).toBe(400);

    // Draft editing is closed once published.
    const editPublished = await app.inject({
      method: 'PUT',
      url: `/api/v1/admin/assessments/${assessment.id}`,
      headers: { cookie },
      payload: { overallLevel: 'LOW' },
    });
    expect(editPublished.statusCode).toBe(400);
  });

  it('enqueues an analysis job through the admin trigger', async () => {
    const [event] = (
      await pool.sql<[{ id: string; slug: string }]>`
        select id, slug from events where slug = ${eventSlug} limit 1`
    ).map((row) => row);

    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/admin/events/${event!.id}/analyze`,
      headers: { cookie },
    });
    expect(res.statusCode).toBe(200);
    const result = JSON.parse(res.body).data;
    expect(result.enqueued).toBe(true);
    expect(result.jobId.startsWith(`analyze__${eventSlug}__`)).toBe(true);
  });

  it('edits and publishes an impact chain, exposing only the published version publicly', async () => {
    const [event] = (
      await pool.sql<[{ id: string; slug: string }]>`
        select id, slug from events where slug = ${eventSlug} limit 1`
    ).map((row) => row);

    const chain = await catalog.createDraftChain(event!.id, {
      nodes: [
        { key: 'root', kind: 'ROOT', label: 'Integration chain root' },
        { key: 'step', kind: 'CHANNEL', label: 'Integration channel step' },
        { key: 'impact', kind: 'IMPACT', label: 'Integration India impact' },
      ],
      edges: [
        { from: 'root', to: 'step' },
        { from: 'step', to: 'impact' },
      ],
      promptVersion: 'admin-integration-v1',
    });

    // Public surface must stay empty while the chain is a draft.
    const draftPublic = await app.inject({
      method: 'GET',
      url: `/api/v1/events/${event!.id}/chain`,
    });
    expect(JSON.parse(draftPublic.body).data.current).toBeNull();

    const edited = await app.inject({
      method: 'PUT',
      url: `/api/v1/admin/chains/${chain.id}`,
      headers: { cookie },
      payload: {
        reasoning: 'Edited during integration test.',
        nodes: [
          { key: 'n0', kind: 'ROOT', label: 'Rewritten root label' },
          { key: 'n1', kind: 'CHANNEL', label: 'Rewritten channel label' },
          { key: 'n2', kind: 'IMPACT', label: 'Rewritten impact label' },
        ],
        edges: [
          { from: 'n0', to: 'n1' },
          { from: 'n1', to: 'n2' },
        ],
      },
    });
    expect(edited.statusCode).toBe(200);
    expect(JSON.parse(edited.body).data.nodes[0].label).toBe('Rewritten root label');

    const published = await app.inject({
      method: 'POST',
      url: `/api/v1/admin/chains/${chain.id}/publish`,
      headers: { cookie },
    });
    expect(published.statusCode).toBe(200);
    expect(JSON.parse(published.body).data.event.currentImpactChainId).toBe(chain.id);

    const publicChain = await app.inject({
      method: 'GET',
      url: `/api/v1/events/${event!.id}/chain`,
    });
    const data = JSON.parse(publicChain.body).data;
    expect(data.current.version).toBe(1);
    expect(data.history).toHaveLength(1);
    expect(
      data.history.every((snapshot: { status: string }) => snapshot.status === 'PUBLISHED'),
    ).toBe(true);

    // Cycle payloads are rejected at the route boundary.
    const cycleAttempt = await catalog.createDraftChain(event!.id, {
      nodes: [
        { key: 'r', kind: 'ROOT', label: 'Cycle root' },
        { key: 'a', kind: 'CHANNEL', label: 'Cycle a' },
        { key: 'b', kind: 'IMPACT', label: 'Cycle b' },
      ],
      edges: [
        { from: 'r', to: 'a' },
        { from: 'a', to: 'b' },
      ],
      promptVersion: 'admin-integration-v1-cycle',
    });
    const rejected = await app.inject({
      method: 'PUT',
      url: `/api/v1/admin/chains/${cycleAttempt.id}`,
      headers: { cookie },
      payload: {
        nodes: [
          { key: 'n0', kind: 'ROOT', label: 'Cycle root' },
          { key: 'n1', kind: 'CHANNEL', label: 'Cycle a' },
          { key: 'n2', kind: 'IMPACT', label: 'Cycle b' },
        ],
        edges: [
          { from: 'n0', to: 'n1' },
          { from: 'n1', to: 'n2' },
          { from: 'n2', to: 'n1' },
        ],
      },
    });
    expect(rejected.statusCode).toBe(400);
    expect(JSON.parse(rejected.body).error.message).toMatch(/CYCLE/);
  });
});
