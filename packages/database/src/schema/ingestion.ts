import { index, integer, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { ingestionJobStatusEnum } from './enums.js';
import { sources } from './sources.js';

export const ingestionJobs = pgTable(
  'ingestion_jobs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    sourceId: uuid('source_id')
      .notNull()
      .references(() => sources.id, { onDelete: 'restrict' }),
    status: ingestionJobStatusEnum('status').notNull().default('RUNNING'),
    startedAt: timestamp('started_at', { withTimezone: true }).notNull().defaultNow(),
    finishedAt: timestamp('finished_at', { withTimezone: true }),
    itemsSeen: integer('items_seen').notNull().default(0),
    itemsInserted: integer('items_inserted').notNull().default(0),
    itemsDuplicate: integer('items_duplicate').notNull().default(0),
    itemsRejected: integer('items_rejected').notNull().default(0),
    errorMessage: text('error_message'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('ingestion_jobs_source_id_idx').on(table.sourceId),
    index('ingestion_jobs_started_at_idx').on(table.startedAt),
  ],
);
