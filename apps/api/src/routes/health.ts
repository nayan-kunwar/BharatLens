import type { FastifyPluginAsync } from 'fastify';
import { closeDatabase, pingDatabase, type DatabasePool } from '@bharatlens/database';
import { ErrorCode, fail, ok } from '@bharatlens/shared';
import type { Redis } from 'ioredis';
import { pingRedis } from '../infrastructure/redis.js';

export type HealthDeps = {
  database: DatabasePool;
  redis: Redis;
};

export type CheckStatus = 'ok' | 'error';

export type HealthPayload = {
  service: 'api';
  status: 'ok' | 'degraded';
  checks: {
    postgres: CheckStatus;
    redis: CheckStatus;
  };
};

export const healthRoutes: FastifyPluginAsync<HealthDeps> = async (app, deps) => {
  app.get('/health', async () => {
    return ok({
      service: 'api',
      status: 'ok',
    });
  });

  app.get('/ready', async (_request, reply) => {
    const checks: HealthPayload['checks'] = {
      postgres: 'ok',
      redis: 'ok',
    };

    try {
      await pingDatabase(deps.database.sql);
    } catch (error) {
      app.log.error({ err: error }, 'postgres readiness failed');
      checks.postgres = 'error';
    }

    try {
      await pingRedis(deps.redis);
    } catch (error) {
      app.log.error({ err: error }, 'redis readiness failed');
      checks.redis = 'error';
    }

    const ready = checks.postgres === 'ok' && checks.redis === 'ok';
    const payload = ok<HealthPayload>({
      service: 'api',
      status: ready ? 'ok' : 'degraded',
      checks,
    });

    if (!ready) {
      return reply
        .status(503)
        .send(fail(ErrorCode.SERVICE_UNAVAILABLE, 'One or more dependencies are unavailable'));
    }

    return payload;
  });
};

export async function closeHealthDeps(deps: HealthDeps): Promise<void> {
  await Promise.all([closeDatabase(deps.database.sql), deps.redis.quit()]);
}
