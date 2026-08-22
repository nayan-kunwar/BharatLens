import { defineConfig } from 'drizzle-kit';

/**
 * Migrations for domain tables start in M1.
 * This file exists so Drizzle is wired the same way production will use it.
 */
export default defineConfig({
  dialect: 'postgresql',
  schema: './src/schema/index.ts',
  out: './drizzle',
  dbCredentials: {
    url: process.env.DATABASE_URL ?? '',
  },
});
