import { char, pgTable, timestamp, uniqueIndex, uuid, varchar } from 'drizzle-orm/pg-core';

export const countries = pgTable(
  'countries',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    code: char('code', { length: 2 }).notNull(),
    name: varchar('name', { length: 120 }).notNull(),
    slug: varchar('slug', { length: 120 }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('countries_code_idx').on(table.code),
    uniqueIndex('countries_slug_idx').on(table.slug),
  ],
);
