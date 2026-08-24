/**
 * Queue topology shared by producers (CLIs, scheduler) and consumers (worker).
 *
 * A single Redis key prefix keeps BullMQ keys namespaced so a shared Redis
 * instance does not collide with other tooling. Job payloads are small and
 * reference domain rows by slug — processors re-load state from PostgreSQL so
 * a retried job always operates on current data.
 */

export const QUEUE_PREFIX = 'bharatlens';

export const QUEUE_NAMES = {
  ingest: 'ingest',
  claims: 'claims',
  analysis: 'analysis',
} as const;

export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES];

export const ALL_QUEUE_NAMES: readonly QueueName[] = Object.values(QUEUE_NAMES);

/**
 * Retention keeps recent completions inspectable for a day and failures for a
 * week while bounding Redis memory. Retained jobs with the same deterministic
 * id suppress duplicate enqueues until they expire; manual triggers can pass
 * force to bypass that.
 */
export const JOB_DEFAULTS = {
  attempts: 5,
  backoff: {
    type: 'exponential',
    delay: 5_000,
  },
  removeOnComplete: {
    age: 24 * 60 * 60,
    count: 1_000,
  },
  removeOnFail: {
    age: 7 * 24 * 60 * 60,
  },
} as const;
