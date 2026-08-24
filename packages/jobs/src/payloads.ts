import { z } from 'zod';

/**
 * Job payloads are intentionally minimal: an opaque slug plus options.
 * Processors resolve current database state by slug, which keeps retries safe
 * and avoids shipping stale data through Redis.
 */

export const ingestJobSchema = z.object({
  feedSlug: z.string().min(1),
});

export type IngestJobPayload = z.infer<typeof ingestJobSchema>;

export const claimsJobSchema = z.object({
  eventSlug: z.string().min(1),
});

export type ClaimsJobPayload = z.infer<typeof claimsJobSchema>;

export const analysisJobSchema = z.object({
  eventSlug: z.string().min(1),
  /**
   * Bypass the deterministic job id (and the draft-assessment guard in the
   * processor) to force a fresh analysis run for the same day.
   */
  force: z.boolean().optional(),
});

export type AnalysisJobPayload = z.infer<typeof analysisJobSchema>;
