import { Queue } from 'bullmq';
import { JOB_DEFAULTS, QUEUE_NAMES, QUEUE_PREFIX } from './queues.js';
import {
  analysisJobSchema,
  claimsJobSchema,
  ingestJobSchema,
  type AnalysisJobPayload,
  type ClaimsJobPayload,
  type IngestJobPayload,
} from './payloads.js';
import { analysisJobId, claimsJobId, ingestJobId } from './job-ids.js';

export type JobsConnection = {
  url: string;
  maxRetriesPerRequest: null;
};

/**
 * Workers block on BRPOPLPUSH-style commands, so their connections must not
 * retry failed commands internally — BullMQ handles reconnection and needs to
 * see the error instead of a hanging client.
 */
export function createJobsConnection(url: string): JobsConnection {
  return { url, maxRetriesPerRequest: null };
}

// Queue name types are widened to string so processors and producers can use
// descriptive job names without fighting BullMQ's literal-name inference.
type JobsQueue<T> = Queue<T, unknown, string>;

export type QueueFactoryOptions = {
  /**
   * Redis key prefix override. Tests use a dedicated prefix so they never
   * share jobs with the production-prefixed worker.
   */
  prefix?: string;
};

export function createIngestQueue(
  connection: JobsConnection,
  options: QueueFactoryOptions = {},
): JobsQueue<IngestJobPayload> {
  return new Queue(QUEUE_NAMES.ingest, {
    connection,
    prefix: options.prefix ?? QUEUE_PREFIX,
    defaultJobOptions: { ...JOB_DEFAULTS },
  });
}

export function createClaimsQueue(
  connection: JobsConnection,
  options: QueueFactoryOptions = {},
): JobsQueue<ClaimsJobPayload> {
  return new Queue(QUEUE_NAMES.claims, {
    connection,
    prefix: options.prefix ?? QUEUE_PREFIX,
    defaultJobOptions: { ...JOB_DEFAULTS },
  });
}

export function createAnalysisQueue(
  connection: JobsConnection,
  options: QueueFactoryOptions = {},
): JobsQueue<AnalysisJobPayload> {
  return new Queue(QUEUE_NAMES.analysis, {
    connection,
    prefix: options.prefix ?? QUEUE_PREFIX,
    defaultJobOptions: { ...JOB_DEFAULTS },
  });
}

export type EnqueueResult = {
  queueName: string;
  jobId: string;
  /**
   * False when a job with the same deterministic id was still retained
   * (recently completed or failed), meaning BullMQ suppressed the add.
   */
  enqueued: boolean;
};

/**
 * Adds the job only when its deterministic id is not already retained. The
 * existence check races benignly: a concurrent duplicate add is still a no-op
 * inside BullMQ because of the unique job id.
 *
 * A minimal structural interface sidesteps BullMQ's deferred conditional
 * name-type inference on generic queues.
 */
interface EnqueueCapableQueue {
  readonly name: string;
  add(
    name: string,
    data: unknown,
    opts?: { jobId?: string },
  ): Promise<Omit<{ id?: string }, never> | undefined>;
  getJob(jobId: string): Promise<unknown | undefined>;
}

async function addIfAbsent<T>(
  queue: EnqueueCapableQueue,
  name: string,
  payload: T,
  jobId: string,
): Promise<EnqueueResult> {
  const existing = await queue.getJob(jobId);
  if (existing) {
    return { queueName: queue.name, jobId, enqueued: false };
  }

  await queue.add(name, payload, { jobId });
  return { queueName: queue.name, jobId, enqueued: true };
}

export async function enqueueIngest(
  queue: JobsQueue<IngestJobPayload>,
  payload: IngestJobPayload,
): Promise<EnqueueResult> {
  const parsed = ingestJobSchema.parse(payload);
  // Unique per request: freshness beats suppression, and the ingestion
  // pipeline is idempotent at the article level.
  const jobId = ingestJobId(parsed.feedSlug);

  await queue.add('ingest-feed', parsed, { jobId });
  return { queueName: queue.name, jobId, enqueued: true };
}

export async function enqueueClaims(
  queue: JobsQueue<ClaimsJobPayload>,
  payload: ClaimsJobPayload,
): Promise<EnqueueResult> {
  const parsed = claimsJobSchema.parse(payload);
  // Unique per request: claims extraction is idempotent via unique database
  // constraints on (event, statement) and (claim, url).
  const jobId = claimsJobId(parsed.eventSlug);

  await queue.add('extract-claims', parsed, { jobId });
  return { queueName: queue.name, jobId, enqueued: true };
}

export async function enqueueAnalysis(
  queue: JobsQueue<AnalysisJobPayload>,
  payload: AnalysisJobPayload,
): Promise<EnqueueResult> {
  const parsed = analysisJobSchema.parse(payload);
  const jobId = analysisJobId(parsed.eventSlug, parsed.force ?? false);

  // Deterministic id suppresses duplicate same-day analysis spend.
  return addIfAbsent(queue, 'analyze-event', parsed, jobId);
}
