import Fastify from 'fastify';
import type { Logger } from '@bharatlens/logging';
import { pingDatabase, type DatabasePool } from '@bharatlens/database';
import { ErrorCode, fail, ok } from '@bharatlens/shared';
import type { Redis } from 'ioredis';
import { pingRedis } from './infrastructure/redis.js';

export const IDLE_POLL_INTERVAL_MS = 30_000;

export type WorkerDeps = {
  database: DatabasePool;
  redis: Redis;
};

export async function buildWorkerApp(logger: Logger, deps: WorkerDeps) {
  const app = Fastify({
    logger: {
      level: logger.level,
    },
    bodyLimit: 16_384,
  });

  app.get('/health', async () => {
    return ok({
      service: 'worker',
      status: 'ok',
      mode: 'idle',
    });
  });

  app.get('/ready', async (_request, reply) => {
    let postgres: 'ok' | 'error' = 'ok';
    let redis: 'ok' | 'error' = 'ok';

    try {
      await pingDatabase(deps.database.sql);
    } catch (error) {
      app.log.error({ err: error }, 'postgres readiness failed');
      postgres = 'error';
    }

    try {
      await pingRedis(deps.redis);
    } catch (error) {
      app.log.error({ err: error }, 'redis readiness failed');
      redis = 'error';
    }

    const ready = postgres === 'ok' && redis === 'ok';
    if (!ready) {
      return reply
        .status(503)
        .send(fail(ErrorCode.SERVICE_UNAVAILABLE, 'Worker dependencies are unavailable'));
    }

    return ok({
      service: 'worker',
      status: 'ok',
      mode: 'idle',
      checks: { postgres, redis },
    });
  });

  return app;
}

export function startIdleHeartbeat(logger: Logger, deps: WorkerDeps): NodeJS.Timeout {
  return setInterval(() => {
    void (async () => {
      try {
        await pingDatabase(deps.database.sql);
        await pingRedis(deps.redis);
        logger.info({ mode: 'idle' }, 'worker heartbeat');
      } catch (error) {
        logger.error({ err: error, mode: 'idle' }, 'worker heartbeat failed');
      }
    })();
  }, IDLE_POLL_INTERVAL_MS);
}
