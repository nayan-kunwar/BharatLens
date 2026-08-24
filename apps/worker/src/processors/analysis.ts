import { analyzeEvent, PROMPT_VERSION, type AnalysisModel } from '@bharatlens/ai';
import type { EventCatalog } from '@bharatlens/database';
import type { Logger } from '@bharatlens/logging';
import { analysisJobSchema, type AnalysisJobPayload } from '@bharatlens/jobs';
import type { Processor } from 'bullmq';

export type AnalysisProcessorDeps = {
  catalog: EventCatalog;
  model: AnalysisModel;
  logger: Logger;
};

export type AnalysisJobResult = {
  eventSlug: string;
  status: 'SUCCEEDED' | 'FAILED' | 'SKIPPED';
  reason?: string;
};

/**
 * Two idempotency layers protect against duplicate LLM spend:
 * 1. the deterministic per-day job id suppresses duplicate enqueues, and
 * 2. this guard refuses to run when a DRAFT assessment already exists for the
 *    same prompt version (a previous run already produced output).
 */
export function createAnalysisProcessor(
  deps: AnalysisProcessorDeps,
): Processor<AnalysisJobPayload> {
  return async (job): Promise<AnalysisJobResult> => {
    const { eventSlug } = analysisJobSchema.parse(job.data);

    const event = await deps.catalog.getEventBySlug(eventSlug);
    if (!event) {
      // Permanent failure: retrying will not create the event.
      throw new Error(`Event not found: ${eventSlug}`);
    }

    const draft = await deps.catalog.findDraftImpactAssessment(event.id, PROMPT_VERSION);
    if (draft && !job.data.force) {
      deps.logger.info(
        { jobType: 'analysis', jobId: job.id, eventSlug, assessmentId: draft.id },
        'analysis skipped: draft assessment already exists',
      );
      return {
        eventSlug,
        status: 'SKIPPED',
        reason: `Draft assessment ${draft.id} already exists for prompt ${PROMPT_VERSION}`,
      };
    }

    const result = await analyzeEvent({ catalog: deps.catalog, eventSlug, model: deps.model });

    deps.logger.info(
      {
        jobType: 'analysis',
        jobId: job.id,
        eventSlug,
        attempt: job.attemptsMade + 1,
        status: result.status,
        modelName: result.modelName,
        errorMessage: result.errorMessage,
      },
      'analysis job finished',
    );

    if (result.status === 'FAILED') {
      // analyzeEvent records the failure on its analysis run and returns a
      // result instead of throwing; surface it to BullMQ as an error so
      // retry/backoff applies.
      throw new Error(result.errorMessage ?? 'Analysis failed');
    }

    return { eventSlug, status: 'SUCCEEDED' };
  };
}
