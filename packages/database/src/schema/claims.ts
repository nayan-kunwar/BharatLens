import { index, integer, pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';
import { articles } from './articles.js';
import { claimStatusEnum, claimTypeEnum, evidenceStrengthEnum } from './enums.js';
import { events } from './events.js';
import { sources } from './sources.js';

export const claims = pgTable(
  'claims',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    eventId: uuid('event_id')
      .notNull()
      .references(() => events.id, { onDelete: 'cascade' }),
    sourceId: uuid('source_id').references(() => sources.id, { onDelete: 'set null' }),
    articleId: uuid('article_id').references(() => articles.id, { onDelete: 'set null' }),
    statement: text('statement').notNull(),
    type: claimTypeEnum('type').notNull(),
    status: claimStatusEnum('status').notNull().default('PENDING'),
    evidenceStrength: evidenceStrengthEnum('evidence_strength').notNull().default('WEAK'),
    sourceCount: integer('source_count').notNull().default(0),
    independentSourceCount: integer('independent_source_count').notNull().default(0),
    officialSourceCount: integer('official_source_count').notNull().default(0),
    evidenceReason: text('evidence_reason'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('claims_event_id_idx').on(table.eventId)],
);

export const evidence = pgTable(
  'evidence',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    claimId: uuid('claim_id')
      .notNull()
      .references(() => claims.id, { onDelete: 'cascade' }),
    sourceId: uuid('source_id')
      .notNull()
      .references(() => sources.id, { onDelete: 'restrict' }),
    articleId: uuid('article_id').references(() => articles.id, { onDelete: 'set null' }),
    excerpt: varchar('excerpt', { length: 500 }),
    url: varchar('url', { length: 1000 }).notNull(),
    publishedAt: timestamp('published_at', { withTimezone: true }),
    retrievedAt: timestamp('retrieved_at', { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('evidence_claim_id_idx').on(table.claimId)],
);
