import Fastify from 'fastify';
import cookie from '@fastify/cookie';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import type { AppConfig } from '@bharatlens/config';
import { createDatabase, EventCatalog, EventQueries } from '@bharatlens/database';
import {
  createAnalysisQueue,
  createClaimsQueue,
  createIngestQueue,
  createJobsConnection,
} from '@bharatlens/jobs';
import { DomainError } from '@bharatlens/shared';
import errorHandler from './plugins/error-handler.js';
import requestId from './plugins/request-id.js';
import { publicApi } from './plugins/public-api.js';
import { AdminAuth } from './modules/admin/auth.js';
import { adminApiRoutes, adminAuthRoutes } from './modules/admin/routes.js';
import { createRedis } from './infrastructure/redis.js';
import { healthRoutes, type HealthDeps } from './routes/health.js';

export async function buildApp(config: AppConfig) {
  const app = Fastify({
    logger: {
      level: config.LOG_LEVEL,
      redact: {
        paths: ['DATABASE_URL', 'REDIS_URL', 'password', 'token', 'authorization'],
        censor: '[redacted]',
      },
    },
    requestIdHeader: 'x-request-id',
    disableRequestLogging: false,
    bodyLimit: 1_048_576,
  });

  await app.register(helmet);
  await app.register(cors, {
    origin: config.WEB_ORIGIN,
    credentials: true,
  });
  await app.register(cookie);
  await app.register(rateLimit, {
    global: false,
  });
  await app.register(requestId);
  await app.register(errorHandler);

  if (!config.ADMIN_PASSWORD) {
    throw new DomainError(
      'VALIDATION_ERROR',
      'ADMIN_PASSWORD is required to run the API. Copy .env.example and set it.',
    );
  }

  const database = createDatabase(config.DATABASE_URL);
  const redis = createRedis(config.REDIS_URL);
  await redis.connect();

  // Producer-side queues for admin triggers (analyze / ingest) and the
  // overview endpoint's queue depth.
  const jobsConnection = createJobsConnection(config.REDIS_URL);
  const analysisQueue = createAnalysisQueue(jobsConnection);
  const claimsQueue = createClaimsQueue(jobsConnection);
  const ingestQueue = createIngestQueue(jobsConnection);
  const queues = [analysisQueue, claimsQueue, ingestQueue];

  const auth = new AdminAuth({
    password: config.ADMIN_PASSWORD,
    ttlHours: config.ADMIN_SESSION_TTL_HOURS,
    secureCookies: config.ADMIN_COOKIE_SECURE,
  });

  const deps: HealthDeps = { database, redis };

  await app.register(healthRoutes, deps);
  await app.register(publicApi, { db: database.db });

  await app.register(
    async (admin) => {
      await admin.register(adminAuthRoutes, { auth });
      await admin.register(adminApiRoutes, {
        catalog: new EventCatalog(database.db),
        queries: new EventQueries(database.db),
        auth,
        analysisQueue,
        ingestQueue,
        claimsQueue,
      });
    },
    { prefix: '/api/v1/admin' },
  );

  return { app, deps: { ...deps, queues } };
}
