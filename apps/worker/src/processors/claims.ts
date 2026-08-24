import { extractClaimsForEvent } from '@bharatlens/ingestion';
import { claimsJobSchema, type ClaimsJobPayload } from '@bharatlens/jobs';
import type { EventCatalog } from '@bharatlens/database';
import type { Logger } from '@bharatlens/logging';
import type { Processor } from 'bullmq';

export type ClaimsProcessorDeps = {
  catalog: EventCatalog;
  logger: Logger;
};

export function createClaimsProcessor(deps: ClaimsProcessorDeps): Processor<ClaimsJobPayload> {
  return async (job) => {
    const { eventSlug } = claimsJobSchema.parse(job.data);

    const result = await extractClaimsForEvent(deps.catalog, eventSlug);

    deps.logger.info(
      {
        jobType: 'claims',
        jobId: job.id,
        eventSlug,
        attempt: job.attemptsMade + 1,
        articlesLinked: result.articlesLinked,
        claimsCreated: result.claimsCreated,
        evidenceAdded: result.evidenceAdded,
      },
      'claims job finished',
    );

    return result;
  };
}
