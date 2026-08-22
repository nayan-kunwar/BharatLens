import { loadConfig } from '@bharatlens/config';
import { createLogger } from '@bharatlens/logging';
import { buildApp } from './app.js';
import { closeHealthDeps } from './routes/health.js';

async function main(): Promise<void> {
  const config = loadConfig();
  const logger = createLogger({
    service: 'api',
    level: config.LOG_LEVEL,
    environment: config.NODE_ENV,
  });

  const { app, deps } = await buildApp(config);

  const shutdown = async (signal: string) => {
    logger.info({ signal }, 'shutting down api');
    await app.close();
    await closeHealthDeps(deps);
    process.exit(0);
  };

  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));

  await app.listen({ host: config.API_HOST, port: config.API_PORT });
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
