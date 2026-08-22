import {
  type AnyPgColumn,
  index,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { articleStatusEnum } from './enums.js';
import { sources } from './sources.js';

export const articles = pgTable(
  'articles',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    sourceId: uuid('source_id')
      .notNull()
      .references(() => sources.id, { onDelete: 'restrict' }),
    externalId: varchar('external_id', { length: 200 }),
    title: varchar('title', { length: 500 }).notNull(),
    url: varchar('url', { length: 1000 }).notNull(),
    author: varchar('author', { length: 200 }),
    publishedAt: timestamp('published_at', { withTimezone: true }),
    retrievedAt: timestamp('retrieved_at', { withTimezone: true }).notNull().defaultNow(),
    summary: text('summary'),
    contentHash: varchar('content_hash', { length: 64 }),
    normalizedTitle: varchar('normalized_title', { length: 500 }),
    duplicateOfArticleId: uuid('duplicate_of_article_id').references(
      (): AnyPgColumn => articles.id,
      { onDelete: 'set null' },
    ),
    status: articleStatusEnum('status').notNull().default('INGESTED'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('articles_url_idx').on(table.url),
    index('articles_source_id_idx').on(table.sourceId),
    index('articles_published_at_idx').on(table.publishedAt),
    uniqueIndex('articles_source_external_id_idx').on(table.sourceId, table.externalId),
    index('articles_content_hash_idx').on(table.contentHash),
    index('articles_normalized_title_idx').on(table.normalizedTitle),
  ],
);
