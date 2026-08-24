import { resolveAnalysisModel } from '@bharatlens/ai';
import { loadConfig } from '@bharatlens/config';
import { closeDatabase, createDatabase, EventCatalog } from '@bharatlens/database';
import {
  createAnalysisQueue,
  createClaimsQueue,
  createIngestQueue,
  createJobsConnection,
  QUEUE_NAMES,
  QUEUE_PREFIX,
} from '@bharatlens/jobs';
import { createLogger } from '@bharatlens/logging';
import { Worker } from 'bullmq';
import { buildWorkerApp } from './app.js';
import { createRedis } from './infrastructure/redis.js';
import { createAnalysisProcessor } from './processors/analysis.js';
import { createClaimsProcessor } from './processors/claims.js';
import { createIngestProcessor } from './processors/ingest.js';
import { startIngestScheduler } from './scheduler.js';

/** LLM calls can run ~45s; the lock must outlive processing or jobs stall. */
const ANALYSIS_LOCK_DURATION_MS = 120_000;
const INGEST_LOCK_DURATION_MS = 60_000;
const INGEST_CONCURRENCY = 2;
const CLAIMS_CONCURRENCY = 2;
/** Analysis costs money; one at a time keeps spend predictable. */
const ANALYSIS_CONCURRENCY = 1;

async function main(): Promise<void> {
  const config = loadConfig();
  const logger = createLogger({
    service: 'worker',
    level: config.LOG_LEVEL,
    environment: config.NODE_ENV,
  });

  const database = createDatabase(config.DATABASE_URL);
  const catalog = new EventCatalog(database.db);
  // Kept for readiness probes; BullMQ owns its own connections below.
  const redis = createRedis(config.REDIS_URL);
  await redis.connect();

  // Producers and workers each need their own connection objects.
  const producerConnection = createJobsConnection(config.REDIS_URL);
  const ingestQueue = createIngestQueue(producerConnection);
  const claimsQueue = createClaimsQueue(producerConnection);
  const analysisQueue = createAnalysisQueue(producerConnection);

  const model = resolveAnalysisModel();
  if (model.name === 'deterministic-stub') {
    logger.warn('no LLM_API_KEY set: analysis jobs will use the deterministic stub');
  }

  const ingestWorker = new Worker(
    QUEUE_NAMES.ingest,
    createIngestProcessor({
      catalog,
      ingestQueue,
      claimsQueue,
      logger,
    }),
    {
      connection: createJobsConnection(config.REDIS_URL),
      prefix: QUEUE_PREFIX,
      concurrency: INGEST_CONCURRENCY,
      lockDuration: INGEST_LOCK_DURATION_MS,
    },
  );

  const claimsWorker = new Worker(QUEUE_NAMES.claims, createClaimsProcessor({ catalog, logger }), {
    connection: createJobsConnection(config.REDIS_URL),
    prefix: QUEUE_PREFIX,
    concurrency: CLAIMS_CONCURRENCY,
  });

  const analysisWorker = new Worker(
    QUEUE_NAMES.analysis,
    createAnalysisProcessor({ catalog, model, logger }),
    {
      connection: createJobsConnection(config.REDIS_URL),
      prefix: QUEUE_PREFIX,
      concurrency: ANALYSIS_CONCURRENCY,
      lockDuration: ANALYSIS_LOCK_DURATION_MS,
    },
  );

  for (const worker of [ingestWorker, claimsWorker, analysisWorker]) {
    worker.on('failed', (job, error) => {
      logger.error(
        {
          err: error,
          jobType: worker.name,
          jobId: job?.id,
          attempt: job?.attemptsMade ?? 0,
        },
        'job failed',
      );
    });
    worker.on('error', (error) => {
      logger.error({ err: error, jobType: worker.name }, 'worker error');
    });
  }

  await startIngestScheduler({
    ingestQueue,
    logger,
    pollMinutes: config.INGEST_POLL_MINUTES,
  });

  const deps = { database, redis, queues: [ingestQueue, claimsQueue, analysisQueue] };
  const app = await buildWorkerApp(logger, deps);

  const shutdown = async (signal: string) => {
    logger.info({ signal }, 'shutting down worker');
    // Workers finish active jobs before closing; queues flush after.
    await Promise.all([ingestWorker.close(), claimsWorker.close(), analysisWorker.close()]);
    await app.close();
    await Promise.all([
      ingestQueue.close(),
      claimsQueue.close(),
      analysisQueue.close(),
      closeDatabase(database.sql),
      redis.quit(),
    ]);
    process.exit(0);
  };

  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));

  await app.listen({ host: config.API_HOST, port: config.WORKER_HEALTH_PORT });
  logger.info(
    {
      mode: 'processing',
      pollMinutes: config.INGEST_POLL_MINUTES,
      model: model.name,
    },
    'worker started with job processors (M9)',
  );
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
