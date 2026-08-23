import { closeDatabase, createDatabase, EventCatalog } from '@bharatlens/database';
import { extractClaimsForEvents } from './claims.js';

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error('DATABASE_URL is required to extract claims');
}

const eventSlug = process.argv.find((arg) => arg.startsWith('--event='))?.slice('--event='.length);

const { db, sql } = createDatabase(databaseUrl);
const catalog = new EventCatalog(db);

try {
  const results = await extractClaimsForEvents(catalog, eventSlug);
  for (const result of results) {
    console.log(JSON.stringify(result));
  }
} finally {
  await closeDatabase(sql);
}
