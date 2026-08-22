import { pgTable, timestamp, uniqueIndex, uuid, varchar } from 'drizzle-orm/pg-core';

export const topics = pgTable(
  'topics',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    slug: varchar('slug', { length: 80 }).notNull(),
    name: varchar('name', { length: 120 }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex('topics_slug_idx').on(table.slug)],
);
