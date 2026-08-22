import { defineConfig } from 'vitest/config';

process.env.DATABASE_URL ??= 'postgres://bharatlens:bharatlens@localhost:5433/bharatlens';

export default defineConfig({
  test: {
    environment: 'node',
    testTimeout: 20_000,
  },
});
