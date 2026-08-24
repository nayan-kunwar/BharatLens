import { defineConfig } from 'vitest/config';

process.env.DATABASE_URL ??= 'postgres://bharatlens:bharatlens@localhost:5433/bharatlens';
process.env.REDIS_URL ??= 'redis://localhost:6379';

export default defineConfig({
  test: {
    environment: 'node',
    testTimeout: 30_000,
  },
});
