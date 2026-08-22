import { migrate } from 'drizzle-orm/postgres-js/migrator';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { closeDatabase, createDatabase } from './client.js';

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error('DATABASE_URL is required to run migrations');
}

const drizzleDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '../drizzle');

const { db, sql } = createDatabase(databaseUrl);

await migrate(db, { migrationsFolder: drizzleDir });
await closeDatabase(sql);
