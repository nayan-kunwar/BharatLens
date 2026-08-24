import type { Queue } from 'bullmq';

/** Queue name type widened to string; see @bharatlens/jobs enqueue helpers. */
export type JobsQueue<T> = Queue<T, unknown, string>;
