import {
  type AnyPgColumn,
  index,
  integer,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { customType } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { articles } from './articles.js';
import { impactChains } from './chains.js';
import { countries } from './countries.js';
import {
  analysisConfidenceEnum,
  assessmentStatusEnum,
  eventStatusEnum,
  evidenceStrengthEnum,
  impactCategoryEnum,
  impactLevelEnum,
  importanceLevelEnum,
} from './enums.js';
import { topics } from './topics.js';

/** PostgreSQL tsvector column (M12 full-text search). */
const tsvector = customType<{ data: string; driverData: string }>({
  dataType() {
    return 'tsvector';
  },
});

export const events = pgTable(
  'events',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    title: varchar('title', { length: 300 }).notNull(),
    slug: varchar('slug', { length: 180 }).notNull(),
    summary: text('summary'),
    description: text('description'),
    eventType: varchar('event_type', { length: 80 }),
    status: eventStatusEnum('status').notNull().default('CANDIDATE'),
    importance: importanceLevelEnum('importance').notNull().default('MEDIUM'),
    occurredAt: timestamp('occurred_at', { withTimezone: true }),
    publishedAt: timestamp('published_at', { withTimezone: true }),
    currentImpactAssessmentId: uuid('current_impact_assessment_id').references(
      (): AnyPgColumn => impactAssessments.id,
      { onDelete: 'set null' },
    ),
    currentImpactChainId: uuid('current_impact_chain_id').references(
      (): AnyPgColumn => impactChains.id,
      { onDelete: 'set null' },
    ),
    searchVector: tsvector('search_vector').generatedAlwaysAs(
      sql`setweight(to_tsvector('english', coalesce(title, '')), 'A') || setweight(to_tsvector('english', coalesce(summary, '')), 'B') || setweight(to_tsvector('english', coalesce(description, '')), 'C')`,
    ),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('events_slug_idx').on(table.slug),
    index('events_status_idx').on(table.status),
    index('events_occurred_at_idx').on(table.occurredAt),
    index('events_published_at_idx').on(table.publishedAt),
    index('events_current_impact_assessment_id_idx').on(table.currentImpactAssessmentId),
    index('events_current_impact_chain_id_idx').on(table.currentImpactChainId),
    index('events_search_vector_idx').using('gin', table.searchVector),
  ],
);

export const eventCountries = pgTable(
  'event_countries',
  {
    eventId: uuid('event_id')
      .notNull()
      .references(() => events.id, { onDelete: 'cascade' }),
    countryId: uuid('country_id')
      .notNull()
      .references(() => countries.id, { onDelete: 'restrict' }),
  },
  (table) => [primaryKey({ columns: [table.eventId, table.countryId] })],
);

export const eventTopics = pgTable(
  'event_topics',
  {
    eventId: uuid('event_id')
      .notNull()
      .references(() => events.id, { onDelete: 'cascade' }),
    topicId: uuid('topic_id')
      .notNull()
      .references(() => topics.id, { onDelete: 'restrict' }),
  },
  (table) => [primaryKey({ columns: [table.eventId, table.topicId] })],
);

export const eventArticles = pgTable(
  'event_articles',
  {
    eventId: uuid('event_id')
      .notNull()
      .references(() => events.id, { onDelete: 'cascade' }),
    articleId: uuid('article_id')
      .notNull()
      .references(() => articles.id, { onDelete: 'cascade' }),
  },
  (table) => [primaryKey({ columns: [table.eventId, table.articleId] })],
);

export const eventUpdates = pgTable(
  'event_updates',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    eventId: uuid('event_id')
      .notNull()
      .references(() => events.id, { onDelete: 'cascade' }),
    occurredAt: timestamp('occurred_at', { withTimezone: true }).notNull(),
    title: varchar('title', { length: 300 }).notNull(),
    body: text('body'),
    impactChange: varchar('impact_change', { length: 200 }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('event_updates_event_id_idx').on(table.eventId)],
);

export const watchItems = pgTable(
  'watch_items',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    eventId: uuid('event_id')
      .notNull()
      .references(() => events.id, { onDelete: 'cascade' }),
    label: varchar('label', { length: 200 }).notNull(),
    sortOrder: integer('sort_order').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('watch_items_event_id_idx').on(table.eventId)],
);

export const impactAssessments = pgTable(
  'impact_assessments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    eventId: uuid('event_id')
      .notNull()
      .references(() => events.id, { onDelete: 'cascade' }),
    version: integer('version').notNull(),
    status: assessmentStatusEnum('status').notNull().default('DRAFT'),
    overallLevel: impactLevelEnum('overall_level').notNull(),
    reasoning: text('reasoning').notNull(),
    evidenceStrength: evidenceStrengthEnum('evidence_strength').notNull(),
    analysisConfidence: analysisConfidenceEnum('analysis_confidence').notNull(),
    modelName: varchar('model_name', { length: 120 }),
    promptVersion: varchar('prompt_version', { length: 80 }),
    publishedAt: timestamp('published_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('impact_assessments_event_id_version_idx').on(table.eventId, table.version),
    index('impact_assessments_event_id_idx').on(table.eventId),
  ],
);

export const impactCategoryLevels = pgTable(
  'impact_category_levels',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    assessmentId: uuid('assessment_id')
      .notNull()
      .references(() => impactAssessments.id, { onDelete: 'cascade' }),
    category: impactCategoryEnum('category').notNull(),
    level: impactLevelEnum('level').notNull(),
    reasoning: text('reasoning').notNull(),
  },
  (table) => [
    uniqueIndex('impact_category_levels_assessment_category_idx').on(
      table.assessmentId,
      table.category,
    ),
  ],
);
