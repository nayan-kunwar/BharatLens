import { relations } from 'drizzle-orm';
import { articles } from './articles.js';
import { claims, evidence } from './claims.js';
import { countries } from './countries.js';
import {
  eventArticles,
  eventCountries,
  eventTopics,
  eventUpdates,
  events,
  impactAssessments,
  impactCategoryLevels,
  watchItems,
} from './events.js';
import { sources } from './sources.js';
import { topics } from './topics.js';
import { ingestionJobs } from './ingestion.js';

export const sourcesRelations = relations(sources, ({ many }) => ({
  articles: many(articles),
  ingestionJobs: many(ingestionJobs),
}));

export const articlesRelations = relations(articles, ({ one, many }) => ({
  source: one(sources, { fields: [articles.sourceId], references: [sources.id] }),
  events: many(eventArticles),
  duplicateOf: one(articles, {
    fields: [articles.duplicateOfArticleId],
    references: [articles.id],
  }),
}));

export const countriesRelations = relations(countries, ({ many }) => ({
  eventCountries: many(eventCountries),
}));

export const topicsRelations = relations(topics, ({ many }) => ({
  eventTopics: many(eventTopics),
}));

export const eventsRelations = relations(events, ({ many, one }) => ({
  currentAssessment: one(impactAssessments, {
    fields: [events.currentImpactAssessmentId],
    references: [impactAssessments.id],
  }),
  countries: many(eventCountries),
  topics: many(eventTopics),
  articles: many(eventArticles),
  updates: many(eventUpdates),
  watchItems: many(watchItems),
  assessments: many(impactAssessments),
  claims: many(claims),
}));

export const eventCountriesRelations = relations(eventCountries, ({ one }) => ({
  event: one(events, { fields: [eventCountries.eventId], references: [events.id] }),
  country: one(countries, { fields: [eventCountries.countryId], references: [countries.id] }),
}));

export const eventTopicsRelations = relations(eventTopics, ({ one }) => ({
  event: one(events, { fields: [eventTopics.eventId], references: [events.id] }),
  topic: one(topics, { fields: [eventTopics.topicId], references: [topics.id] }),
}));

export const eventArticlesRelations = relations(eventArticles, ({ one }) => ({
  event: one(events, { fields: [eventArticles.eventId], references: [events.id] }),
  article: one(articles, { fields: [eventArticles.articleId], references: [articles.id] }),
}));

export const eventUpdatesRelations = relations(eventUpdates, ({ one }) => ({
  event: one(events, { fields: [eventUpdates.eventId], references: [events.id] }),
}));

export const watchItemsRelations = relations(watchItems, ({ one }) => ({
  event: one(events, { fields: [watchItems.eventId], references: [events.id] }),
}));

export const impactAssessmentsRelations = relations(impactAssessments, ({ one, many }) => ({
  event: one(events, { fields: [impactAssessments.eventId], references: [events.id] }),
  categories: many(impactCategoryLevels),
}));

export const impactCategoryLevelsRelations = relations(impactCategoryLevels, ({ one }) => ({
  assessment: one(impactAssessments, {
    fields: [impactCategoryLevels.assessmentId],
    references: [impactAssessments.id],
  }),
}));

export const claimsRelations = relations(claims, ({ one, many }) => ({
  event: one(events, { fields: [claims.eventId], references: [events.id] }),
  source: one(sources, { fields: [claims.sourceId], references: [sources.id] }),
  article: one(articles, { fields: [claims.articleId], references: [articles.id] }),
  evidence: many(evidence),
}));

export const evidenceRelations = relations(evidence, ({ one }) => ({
  claim: one(claims, { fields: [evidence.claimId], references: [claims.id] }),
  source: one(sources, { fields: [evidence.sourceId], references: [sources.id] }),
  article: one(articles, { fields: [evidence.articleId], references: [articles.id] }),
}));

export const ingestionJobsRelations = relations(ingestionJobs, ({ one }) => ({
  source: one(sources, { fields: [ingestionJobs.sourceId], references: [sources.id] }),
}));
