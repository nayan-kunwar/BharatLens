import type { EventCatalog } from '@bharatlens/database';
import type { Logger } from '@bharatlens/logging';
import {
  enqueueClaims,
  enqueueIngest,
  ingestJobSchema,
  type ClaimsJobPayload,
  type IngestJobPayload,
} from '@bharatlens/jobs';
import { ingestFeed, resolveFeeds, type FeedConfig } from '@bharatlens/ingestion';
import type { Job, Processor } from 'bullmq';
import type { JobsQueue } from '../types.js';

/** Name of the repeatable scheduler tick handled by the ingest worker. */
export const POLL_FEEDS_JOB_NAME = 'poll-feeds';

export type IngestProcessorDeps = {
  catalog: EventCatalog;
  ingestQueue: JobsQueue<IngestJobPayload>;
  claimsQueue: JobsQueue<ClaimsJobPayload>;
  logger: Logger;
  /**
   * Feed registry access, injectable so tests can serve deterministic RSS
   * fixtures instead of the real network.
   */
  listFeeds?: () => FeedConfig[];
  resolveFeed?: (slug: string) => FeedConfig;
  /**
   * Events whose claims should refresh after new articles arrive. Injectable
   * for tests so fixture ingests never touch seeded production events.
   */
  listClaimTargets?: () => Promise<string[]>;
};

function defaultListFeeds(): FeedConfig[] {
  return resolveFeeds();
}

function defaultResolveFeed(slug: string): FeedConfig {
  const [feed] = resolveFeeds(slug);
  if (!feed) {
    throw new Error(`Unknown feed slug: ${slug}`);
  }
  return feed;
}

export function createIngestProcessor(deps: IngestProcessorDeps): Processor<IngestJobPayload> {
  const listFeeds = deps.listFeeds ?? defaultListFeeds;
  const resolveFeed = deps.resolveFeed ?? defaultResolveFeed;
  const listClaimTargets = deps.listClaimTargets ?? (() => deps.catalog.listActiveEventSlugs());

  return async (job: Job<IngestJobPayload>) => {
    if (job.name === POLL_FEEDS_JOB_NAME) {
      return fanOutFeeds(deps, listFeeds);
    }

    const { feedSlug } = ingestJobSchema.parse(job.data);
    const feed = resolveFeed(feedSlug);

    const result = await ingestFeed({ catalog: deps.catalog, feed });

    deps.logger.info(
      {
        jobType: 'ingest',
        jobId: job.id,
        feedSlug,
        attempt: job.attemptsMade + 1,
        status: result.status,
        itemsSeen: result.itemsSeen,
        itemsInserted: result.itemsInserted,
        itemsDuplicate: result.itemsDuplicate,
        itemsRejected: result.itemsRejected,
      },
      'ingest job finished',
    );

    // Deterministic pipeline step: newly ingested coverage may belong to
    // existing events, so refresh claims for every active event. Claims
    // extraction is idempotent (unique claim/evidence constraints), and LLM
    // analysis is deliberately NOT chained here — it costs money and stays a
    // manual or admin decision.
    if (result.status === 'SUCCEEDED' && result.itemsInserted > 0) {
      const slugs = await listClaimTargets();
      for (const eventSlug of slugs) {
        await enqueueClaims(deps.claimsQueue, { eventSlug });
      }
      if (slugs.length > 0) {
        deps.logger.info(
          { jobType: 'ingest', jobId: job.id, feedSlug, claimsJobsQueued: slugs.length },
          'queued claims refresh after new articles',
        );
      }
    }

    return result;
  };
}

async function fanOutFeeds(deps: IngestProcessorDeps, listFeeds: () => FeedConfig[]) {
  const feeds = listFeeds();
  const queued: string[] = [];
  for (const feed of feeds) {
    const result = await enqueueIngest(deps.ingestQueue, { feedSlug: feed.slug });
    if (result.enqueued) {
      queued.push(feed.slug);
    }
  }

  deps.logger.info(
    { jobType: 'ingest', tick: true, feedsResolved: feeds.length, feedsQueued: queued.length },
    'scheduler tick: feed ingestion queued',
  );

  return { queued };
}
