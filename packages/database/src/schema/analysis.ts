import { index, jsonb, pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';
import { analysisRunStatusEnum } from './enums.js';
import { events } from './events.js';

export type AnalysisInputReferences = {
  eventId: string;
  claimIds: string[];
  articleIds: string[];
  evidenceUrls: string[];
};

export const analysisRuns = pgTable(
  'analysis_runs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    eventId: uuid('event_id')
      .notNull()
      .references(() => events.id, { onDelete: 'cascade' }),
    status: analysisRunStatusEnum('status').notNull().default('RUNNING'),
    modelName: varchar('model_name', { length: 120 }).notNull(),
    promptVersion: varchar('prompt_version', { length: 80 }).notNull(),
    inputReferences: jsonb('input_references').$type<AnalysisInputReferences>().notNull(),
    output: jsonb('output').$type<Record<string, unknown>>(),
    errorMessage: text('error_message'),
    generatedAt: timestamp('generated_at', { withTimezone: true }),
    reviewedAt: timestamp('reviewed_at', { withTimezone: true }),
    reviewedBy: varchar('reviewed_by', { length: 120 }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('analysis_runs_event_id_idx').on(table.eventId),
    index('analysis_runs_status_idx').on(table.status),
  ],
);
