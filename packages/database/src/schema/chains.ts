import {
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { assessmentStatusEnum, chainNodeKindEnum, impactCategoryEnum } from './enums.js';
import { events } from './events.js';

/**
 * Impact chains are versioned exactly like impact assessments: drafts are
 * editable, publishing stamps and freezes a version, and the event points at
 * the current published one. History is a product feature — the causal story
 * can change as a situation evolves.
 */
export const impactChains = pgTable(
  'impact_chains',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    eventId: uuid('event_id')
      .notNull()
      .references(() => events.id, { onDelete: 'cascade' }),
    version: integer('version').notNull(),
    status: assessmentStatusEnum('status').notNull().default('DRAFT'),
    reasoning: text('reasoning'),
    modelName: varchar('model_name', { length: 120 }),
    promptVersion: varchar('prompt_version', { length: 80 }),
    publishedAt: timestamp('published_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('impact_chains_event_id_version_idx').on(table.eventId, table.version),
    index('impact_chains_event_id_idx').on(table.eventId),
    index('impact_chains_status_idx').on(table.status),
  ],
);

export const impactChainNodes = pgTable(
  'impact_chain_nodes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    chainId: uuid('chain_id')
      .notNull()
      .references(() => impactChains.id, { onDelete: 'cascade' }),
    kind: chainNodeKindEnum('kind').notNull(),
    label: varchar('label', { length: 200 }).notNull(),
    description: text('description'),
    category: impactCategoryEnum('category'),
    sortOrder: integer('sort_order').notNull().default(0),
  },
  (table) => [index('impact_chain_nodes_chain_id_idx').on(table.chainId)],
);

export const impactChainEdges = pgTable(
  'impact_chain_edges',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    chainId: uuid('chain_id')
      .notNull()
      .references(() => impactChains.id, { onDelete: 'cascade' }),
    fromNodeId: uuid('from_node_id')
      .notNull()
      .references(() => impactChainNodes.id, { onDelete: 'cascade' }),
    toNodeId: uuid('to_node_id')
      .notNull()
      .references(() => impactChainNodes.id, { onDelete: 'cascade' }),
    label: varchar('label', { length: 200 }),
  },
  (table) => [
    uniqueIndex('impact_chain_edges_chain_from_to_idx').on(
      table.chainId,
      table.fromNodeId,
      table.toNodeId,
    ),
    index('impact_chain_edges_chain_id_idx').on(table.chainId),
  ],
);
