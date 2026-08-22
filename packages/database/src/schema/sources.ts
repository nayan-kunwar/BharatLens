import { pgTable, timestamp, uniqueIndex, uuid, varchar } from 'drizzle-orm/pg-core';
import { sourceTypeEnum } from './enums.js';

export const sources = pgTable(
  'sources',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: varchar('name', { length: 200 }).notNull(),
    slug: varchar('slug', { length: 120 }).notNull(),
    type: sourceTypeEnum('type').notNull(),
    homepageUrl: varchar('homepage_url', { length: 500 }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex('sources_slug_idx').on(table.slug)],
);
