import { randomUUID } from 'node:crypto';
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { Worker } from 'bullmq';
import {
  closeDatabase,
  createDatabase,
  EventCatalog,
  type DatabasePool,
} from '@bharatlens/database';
import { DeterministicAnalysisModel, PROMPT_VERSION } from '@bharatlens/ai';
import type { FeedConfig } from '@bharatlens/ingestion';
import {
  createAnalysisQueue,
  createClaimsQueue,
  createIngestQueue,
  createJobsConnection,
  enqueueAnalysis,
  enqueueIngest,
  QUEUE_NAMES,
} from '@bharatlens/jobs';
import type { Logger } from '@bharatlens/logging';
import { buildWorkerApp } from './app.js';
import { createAnalysisProcessor } from './processors/analysis.js';
import { createClaimsProcessor } from './processors/claims.js';
import { createIngestProcessor } from './processors/ingest.js';

const databaseUrl = process.env.DATABASE_URL;
const redisUrl = process.env.REDIS_URL ?? 'redis://localhost:6379';

/** Dedicated prefix so tests never share jobs with the compose worker. */
const TEST_PREFIX = 'bharatlens-test';

const silentLogger = {
  level: 'silent',
  info: () => {},
  warn: () => {},
  error: () => {},
  debug: () => {},
} as unknown as Logger;

async function waitFor<T>(
  probe: () => Promise<T | null | undefined | false>,
  label: string,
  timeoutMs = 15_000,
): Promise<T> {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const value = await probe();
    if (value !== null && value !== undefined && value !== false) {
      return value;
    }
    if (Date.now() > deadline) {
      throw new Error(`waitFor timed out: ${label}`);
    }
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
}

describe.skipIf(!databaseUrl)('worker processors (postgres + redis)', () => {
  let pool: DatabasePool;
  let catalog: EventCatalog;
  let ingestQueue: ReturnType<typeof createIngestQueue>;
  let claimsQueue: ReturnType<typeof createClaimsQueue>;
  let analysisQueue: ReturnType<typeof createAnalysisQueue>;
  let ingestWorker: Worker;
  let claimsWorker: Worker;
  let analysisWorker: Worker;
  let rssServer: http.Server;
  let fixtureFeed: FeedConfig;
  const suffix = randomUUID().slice(0, 8);
  const articleUrl = `https://example.test/worker-fixture-${suffix}`;
  const eventSlug = `worker-hormuz-${suffix}`;

  const rssXml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"><channel>
  <title>Fixture Feed ${suffix}</title>
  <item>
    <title>Hormuz shipping disruption raises India crude import risk</title>
    <link>${articleUrl}</link>
    <description>Maritime disruption near the Strait of Hormuz affects crude flows and shipping.</description>
    <pubDate>Sat, 22 Aug 2026 08:00:00 GMT</pubDate>
  </item>
</channel></rss>`;

  beforeAll(async () => {
    pool = createDatabase(databaseUrl!);
    catalog = new EventCatalog(pool.db);

    const connection = createJobsConnection(redisUrl);
    ingestQueue = createIngestQueue(connection, { prefix: TEST_PREFIX });
    claimsQueue = createClaimsQueue(connection, { prefix: TEST_PREFIX });
    analysisQueue = createAnalysisQueue(connection, { prefix: TEST_PREFIX });

    rssServer = http.createServer((_request, response) => {
      response.writeHead(200, { 'content-type': 'application/xml' });
      response.end(rssXml);
    });
    await new Promise<void>((resolve) => rssServer.listen(0, '127.0.0.1', resolve));
    const { port } = rssServer.address() as AddressInfo;

    fixtureFeed = {
      slug: `fixture-worker-${suffix}`,
      name: `Fixture worker ${suffix}`,
      type: 'NEWS_AGENCY',
      homepageUrl: 'https://example.test',
      feedUrl: `http://127.0.0.1:${port}/rss.xml`,
    };

    const listFeeds = () => [fixtureFeed];
    const resolveFeed = (slug: string) => {
      if (slug !== fixtureFeed.slug) {
        throw new Error(`Unknown feed slug: ${slug}`);
      }
      return fixtureFeed;
    };

    ingestWorker = new Worker(
      QUEUE_NAMES.ingest,
      createIngestProcessor({
        catalog,
        ingestQueue,
        claimsQueue,
        logger: silentLogger,
        listFeeds,
        resolveFeed,
        // Hermetic: fixture ingests only refresh the fixture event's claims.
        listClaimTargets: async () => [eventSlug],
      }),
      { connection: createJobsConnection(redisUrl), prefix: TEST_PREFIX, concurrency: 1 },
    );

    claimsWorker = new Worker(
      QUEUE_NAMES.claims,
      createClaimsProcessor({ catalog, logger: silentLogger }),
      { connection: createJobsConnection(redisUrl), prefix: TEST_PREFIX, concurrency: 1 },
    );

    analysisWorker = new Worker(
      QUEUE_NAMES.analysis,
      createAnalysisProcessor({
        catalog,
        model: new DeterministicAnalysisModel(),
        logger: silentLogger,
      }),
      { connection: createJobsConnection(redisUrl), prefix: TEST_PREFIX, concurrency: 1 },
    );
  }, 30_000);

  afterAll(async () => {
    await Promise.allSettled([
      ingestWorker?.close(),
      claimsWorker?.close(),
      analysisWorker?.close(),
    ]);
    await Promise.allSettled([
      ingestQueue?.obliterate().then(() => ingestQueue.close()),
      claimsQueue?.obliterate().then(() => claimsQueue.close()),
      analysisQueue?.obliterate().then(() => analysisQueue.close()),
    ]);
    await new Promise<void>((resolve) => rssServer?.close(() => resolve()));
    if (pool) {
      await pool.sql`delete from events where slug like ${'worker-hormuz-%'} or slug like ${'worker-analyze-%'}`;
      await pool.sql`delete from evidence where source_id in (
        select id from sources where slug like ${`fixture-worker-${suffix}%`}
      )`;
      await pool.sql`delete from articles where source_id in (
        select id from sources where slug like ${`fixture-worker-${suffix}%`}
      )`;
      await pool.sql`delete from ingestion_jobs where source_id in (
        select id from sources where slug like ${`fixture-worker-${suffix}%`}
      )`;
      await pool.sql`delete from sources where slug like ${`fixture-worker-${suffix}%`}`;
      await closeDatabase(pool.sql);
    }
  }, 30_000);

  afterEach(async () => {
    await Promise.all([ingestQueue.drain(), claimsQueue.drain(), analysisQueue.drain()]);
  });

  it('ingests a feed, chains claims extraction, and stays idempotent on replay', async () => {
    await catalog.createEvent({
      title: 'Strait of Hormuz shipping disruption',
      slug: eventSlug,
      summary: 'Maritime disruption near Hormuz affecting crude shipping.',
    });

    const first = await enqueueIngest(ingestQueue, { feedSlug: fixtureFeed.slug });
    expect(first.enqueued).toBe(true);

    const inserted = await waitFor(async () => {
      const rows = await pool.sql<[{ id: string }]>`
        select id from articles where url = ${articleUrl}
      `;
      return rows[0] ?? null;
    }, 'article ingested');
    expect(inserted).toBeTruthy();

    const linkedClaims = await waitFor(async () => {
      const event = await catalog.getEventBySlug(eventSlug);
      if (!event) {
        return null;
      }
      const rows = await catalog.listClaimsForEvent(event.id);
      return rows.length > 0 ? rows : null;
    }, 'claims chained from ingest');
    expect(linkedClaims.length).toBeGreaterThan(0);

    const replay = await enqueueIngest(ingestQueue, { feedSlug: fixtureFeed.slug });
    expect(replay.enqueued).toBe(true);

    await waitFor(async () => {
      const counts = await ingestQueue.getJobCounts('completed');
      return (counts.completed ?? 0) >= 2 ? true : null;
    }, 'replay ingest processed');

    const urlRows = await pool.sql<[{ count: string }]>`
      select count(*)::text as count from articles where url = ${articleUrl}
    `;
    expect(Number(urlRows[0]?.count)).toBe(1);
  });

  it('skips duplicate analysis while a draft exists and runs when forced', async () => {
    const analyzeSlug = `worker-analyze-${suffix}`;
    const event = await catalog.createEvent({
      title: `LNG supply disruption ${suffix}`,
      slug: analyzeSlug,
      summary: 'Energy supply disruption with India exposure.',
    });

    await catalog.createImpactAssessment({
      eventId: event.id,
      overallLevel: 'MEDIUM',
      reasoning: 'Seeded draft to exercise the idempotency guard.',
      evidenceStrength: 'WEAK',
      analysisConfidence: 'LOW',
      categories: [{ category: 'DIPLOMACY', level: 'LOW', reasoning: 'Seeded draft category.' }],
      status: 'DRAFT',
      modelName: 'test-fixture',
      promptVersion: PROMPT_VERSION,
    });

    const guarded = await enqueueAnalysis(analysisQueue, { eventSlug: analyzeSlug });
    expect(guarded.enqueued).toBe(true);

    const skippedResult = await waitFor(async () => {
      const job = await analysisQueue.getJob(guarded.jobId);
      if (!job) {
        return null;
      }
      if (job.failedReason) {
        throw new Error(`guarded job failed: ${job.failedReason}`);
      }
      return job.returnvalue === undefined ? null : (job.returnvalue as { status: string });
    }, 'guarded analysis job completed');
    expect(skippedResult.status).toBe('SKIPPED');

    const forced = await enqueueAnalysis(analysisQueue, { eventSlug: analyzeSlug, force: true });
    expect(forced.jobId).not.toBe(guarded.jobId);

    const forcedResult = await waitFor(async () => {
      const job = await analysisQueue.getJob(forced.jobId);
      if (!job) {
        return null;
      }
      if (job.failedReason) {
        throw new Error(`forced job failed: ${job.failedReason}`);
      }
      return job.returnvalue === undefined ? null : (job.returnvalue as { status: string });
    }, 'forced analysis job completed');
    expect(forcedResult.status).toBe('SUCCEEDED');

    const assessments = await pool.sql<[{ count: string }]>`
      select count(*)::text as count from impact_assessments where event_id = ${event.id}
    `;
    expect(Number(assessments[0]?.count)).toBe(2);
  });

  it('exposes queue depth on the health app', async () => {
    const app = await buildWorkerApp(silentLogger, {
      database: pool,
      redis: { ping: async () => 'PONG' },
      queues: [{ name: 'ingest', getJobCounts: async () => ({ waiting: 3, active: 0 }) }],
    } as never);

    const queuesResponse = await app.inject({ method: 'GET', url: '/queues' });
    expect(queuesResponse.statusCode).toBe(200);
    const body = JSON.parse(queuesResponse.body);
    expect(body.data.queues[0].counts.waiting).toBe(3);

    const readyResponse = await app.inject({ method: 'GET', url: '/ready' });
    expect(readyResponse.statusCode).toBe(200);

    await app.close();
  });
});
