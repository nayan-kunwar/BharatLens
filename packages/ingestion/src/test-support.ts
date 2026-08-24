import type { DatabasePool } from '@bharatlens/database';

/**
 * Deletes test-created rows so repeated integration runs against a persistent
 * dev database stay independent. Sources use RESTRICT foreign keys from
 * articles and ingestion_jobs, so dependents are removed first.
 */
export async function deleteFixtureData(
  pool: DatabasePool,
  opts: {
    sourceSlugPrefixes?: string[];
    eventSlugPrefixes?: string[];
  },
): Promise<void> {
  const sourceSlugPrefixes = opts.sourceSlugPrefixes ?? [];
  const eventSlugPrefixes = opts.eventSlugPrefixes ?? [];

  for (const prefix of sourceSlugPrefixes) {
    await pool.sql`
      delete from evidence
      where source_id in (select id from sources where slug like ${`${prefix}%`}
      )`;
    await pool.sql`
      delete from articles
      where source_id in (select id from sources where slug like ${`${prefix}%`}
      )`;
    await pool.sql`
      delete from ingestion_jobs
      where source_id in (select id from sources where slug like ${`${prefix}%`}
      )`;
    await pool.sql`delete from sources where slug like ${`${prefix}%`}`;
  }

  for (const prefix of eventSlugPrefixes) {
    await pool.sql`delete from events where slug like ${`${prefix}%`}`;
  }
}
