import { closeDatabase, createDatabase, EventCatalog } from '@bharatlens/database';
import { analyzeEvent } from './pipeline.js';
import { resolveAnalysisModel } from './provider.js';

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error('DATABASE_URL is required to run analysis');
}

const eventSlug = process.argv.find((arg) => arg.startsWith('--event='))?.slice('--event='.length);

if (!eventSlug) {
  throw new Error('Pass --event=<slug>, for example --event=strait-of-hormuz-shipping-disruption');
}

const model = resolveAnalysisModel();
if (model.name === 'deterministic-stub') {
  console.error(
    'No LLM_API_KEY set; using deterministic stub. Output is still schema-validated and not published.',
  );
}

const { db, sql } = createDatabase(databaseUrl);
const catalog = new EventCatalog(db);

try {
  const result = await analyzeEvent({ catalog, eventSlug, model });
  console.log(JSON.stringify(result));
  if (result.status === 'FAILED') {
    process.exitCode = 1;
  }
} finally {
  await closeDatabase(sql);
}
