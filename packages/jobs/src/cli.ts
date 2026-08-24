import { loadConfig } from '@bharatlens/config';
import {
  createAnalysisQueue,
  createClaimsQueue,
  createIngestQueue,
  createJobsConnection,
  enqueueAnalysis,
  enqueueClaims,
  enqueueIngest,
} from './index.js';

function usage(): never {
  console.error(`Usage:
  pnpm queue ingest --feed=<slug>
  pnpm queue claims --event=<slug>
  pnpm queue analyze --event=<slug> [--force]

Enqueues a background job; the worker process executes it.
--force applies to analyze: it bypasses the same-day duplicate guard.`);
  process.exit(1);
}

const [command, ...rest] = process.argv.slice(2);

if (command !== 'ingest' && command !== 'claims' && command !== 'analyze') {
  usage();
}

const feedArg = rest.find((arg) => arg.startsWith('--feed='))?.slice('--feed='.length);
const eventArg = rest.find((arg) => arg.startsWith('--event='))?.slice('--event='.length);
const force = rest.includes('--force');

if (command === 'ingest' && !feedArg) {
  console.error('Pass --feed=<slug>, for example --feed=bbc-world');
  process.exit(1);
}

if ((command === 'claims' || command === 'analyze') && !eventArg) {
  console.error('Pass --event=<slug>, for example --event=strait-of-hormuz-shipping-disruption');
  process.exit(1);
}

const config = loadConfig();
const connection = createJobsConnection(config.REDIS_URL);

try {
  if (command === 'ingest' && feedArg) {
    const queue = createIngestQueue(connection);
    const result = await enqueueIngest(queue, { feedSlug: feedArg });
    console.log(JSON.stringify(result));
    await queue.close();
  } else if (command === 'claims' && eventArg) {
    const queue = createClaimsQueue(connection);
    const result = await enqueueClaims(queue, { eventSlug: eventArg });
    console.log(JSON.stringify(result));
    await queue.close();
  } else if (command === 'analyze' && eventArg) {
    const queue = createAnalysisQueue(connection);
    const result = await enqueueAnalysis(queue, { eventSlug: eventArg, force });
    console.log(JSON.stringify(result));
    await queue.close();
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
