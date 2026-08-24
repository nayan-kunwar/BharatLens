import type { Logger } from '@bharatlens/logging';
import { POLL_FEEDS_JOB_NAME } from './processors/ingest.js';

/** Minimal producer surface needed to register the repeatable tick. */
export interface SchedulableQueue {
  add(
    name: string,
    data: unknown,
    opts?: { jobId?: string; repeat?: { every: number } },
  ): Promise<unknown>;
}

export type SchedulerDeps = {
  ingestQueue: SchedulableQueue;
  logger: Logger;
  pollMinutes: number;
};

/**
 * Registers a repeatable "tick" job on the ingest queue. The tick processor
 * fans out one ingest job per configured feed.
 *
 * The repeat schedule lives in Redis, so it survives worker restarts, and
 * re-registering the same schedule is an upsert rather than a duplicate.
 * INGEST_POLL_MINUTES=0 disables scheduled polling entirely (manual enqueues
 * still work).
 */
export async function startIngestScheduler(deps: SchedulerDeps): Promise<void> {
  if (deps.pollMinutes <= 0) {
    deps.logger.info(
      { pollMinutes: deps.pollMinutes },
      'scheduled ingestion disabled (INGEST_POLL_MINUTES=0)',
    );
    return;
  }

  await deps.ingestQueue.add(
    POLL_FEEDS_JOB_NAME,
    {},
    {
      jobId: POLL_FEEDS_JOB_NAME,
      repeat: { every: deps.pollMinutes * 60 * 1000 },
    },
  );

  deps.logger.info({ pollMinutes: deps.pollMinutes }, 'ingest scheduler registered');
}
