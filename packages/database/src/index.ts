export { closeDatabase, createDatabase, pingDatabase } from './client.js';
export type { Database, DatabasePool } from './client.js';
export { EventCatalog, computeEvidenceStrength } from './catalog.js';
export { EventQueries } from './queries.js';
export type { EventSortField, ListEventsInput, SortDirection } from './queries.js';
export * as schema from './schema/index.js';
