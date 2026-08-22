import { closeDatabase, createDatabase, EventCatalog } from '@bharatlens/database';
import { resolveFeeds } from './feeds.js';
import { ingestFeed } from './pipeline.js';

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error('DATABASE_URL is required to ingest RSS feeds');
}

const slugArg = process.argv.find((arg) => arg.startsWith('--source='))?.slice('--source='.length);

const { db, sql } = createDatabase(databaseUrl);
const catalog = new EventCatalog(db);

try {
  const feeds = resolveFeeds(slugArg);
  const results = [];

  for (const feed of feeds) {
    const result = await ingestFeed({ catalog, feed });
    results.push(result);
    console.log(JSON.stringify(result));
  }

  const failed = results.some((result) => result.status === 'FAILED');
  if (failed) {
    process.exitCode = 1;
  }
} finally {
  await closeDatabase(sql);
}
