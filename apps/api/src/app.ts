import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import type { AppConfig } from '@bharatlens/config';
import { createDatabase } from '@bharatlens/database';
import errorHandler from './plugins/error-handler.js';
import requestId from './plugins/request-id.js';
import { publicApi } from './plugins/public-api.js';
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
  });
  await app.register(requestId);
  await app.register(errorHandler);

  const database = createDatabase(config.DATABASE_URL);
  const redis = createRedis(config.REDIS_URL);
  await redis.connect();

  const deps: HealthDeps = { database, redis };
  await app.register(healthRoutes, deps);
  await app.register(publicApi, { db: database.db });

  return { app, deps };
}
