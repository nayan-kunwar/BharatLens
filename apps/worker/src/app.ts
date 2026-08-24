import Fastify from 'fastify';
import type { Logger } from '@bharatlens/logging';
import { pingDatabase, type DatabasePool } from '@bharatlens/database';
import { ErrorCode, fail, ok } from '@bharatlens/shared';
import type { Redis } from 'ioredis';
import { pingRedis } from './infrastructure/redis.js';

export const IDLE_POLL_INTERVAL_MS = 30_000;

/** Minimal queue surface used by the health endpoints; avoids BullMQ's
 * invariant generics leaking into the app layer. */
export interface QueueStatsSource {
  readonly name: string;
  getJobCounts(...keys: string[]): Promise<Record<string, number>>;
}

export type WorkerDeps = {
  database: DatabasePool;
  redis: Redis;
  queues: Array<QueueStatsSource>;
};

const QUEUE_COUNT_KEYS = ['waiting', 'active', 'completed', 'failed', 'delayed', 'paused'] as const;

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
      mode: 'processing',
      queues: deps.queues.map((queue) => queue.name),
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
      mode: 'processing',
      checks: { postgres, redis },
    });
  });

  /** Small operational window into queue depth for observability. */
  app.get('/queues', async () => {
    const queues = await Promise.all(
      deps.queues.map(async (queue) => ({
        name: queue.name,
        counts: await queue.getJobCounts(...QUEUE_COUNT_KEYS),
      })),
    );
    return ok({ service: 'worker', queues });
  });

  return app;
}
