import { loadConfig } from '@bharatlens/config';
import { closeDatabase, createDatabase } from '@bharatlens/database';
import { createLogger } from '@bharatlens/logging';
import { buildWorkerApp, startIdleHeartbeat } from './app.js';
import { createRedis } from './infrastructure/redis.js';

async function main(): Promise<void> {
  const config = loadConfig();
  const logger = createLogger({
    service: 'worker',
    level: config.LOG_LEVEL,
    environment: config.NODE_ENV,
  });

  const database = createDatabase(config.DATABASE_URL);
  const redis = createRedis(config.REDIS_URL);
  await redis.connect();

  const deps = { database, redis };
  const app = await buildWorkerApp(logger, deps);
  const heartbeat = startIdleHeartbeat(logger, deps);

  const shutdown = async (signal: string) => {
    logger.info({ signal }, 'shutting down worker');
    clearInterval(heartbeat);
    await app.close();
    await Promise.all([closeDatabase(database.sql), redis.quit()]);
    process.exit(0);
  };

  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));

  await app.listen({ host: config.API_HOST, port: config.WORKER_HEALTH_PORT });
  logger.info({ mode: 'idle' }, 'worker started with no job processors (M0)');
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
