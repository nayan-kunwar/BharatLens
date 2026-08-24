import { defineConfig } from 'vitest/config';

process.env.DATABASE_URL ??= 'postgres://bharatlens:bharatlens@localhost:5433/bharatlens';

export default defineConfig({
  test: {
    environment: 'node',
    testTimeout: 20_000,
    // Integration tests share one Postgres database; run files sequentially so
    // fixture cleanup in one file cannot race another file's inserts.
    fileParallelism: false,
  },
});
