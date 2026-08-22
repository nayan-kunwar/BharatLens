import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import postgres, { type Sql } from 'postgres';
import { schema } from './schema.js';

export type Database = PostgresJsDatabase<typeof schema>;

export type DatabasePool = {
  db: Database;
  sql: Sql;
};

export function createDatabase(databaseUrl: string): DatabasePool {
  const sql = postgres(databaseUrl, {
    max: 10,
    idle_timeout: 20,
    connect_timeout: 10,
  });

  const db = drizzle(sql, { schema });
  return { db, sql };
}

export async function pingDatabase(sql: Sql): Promise<void> {
  await sql`select 1 as ok`;
}

export async function closeDatabase(sql: Sql): Promise<void> {
  await sql.end({ timeout: 5 });
}
