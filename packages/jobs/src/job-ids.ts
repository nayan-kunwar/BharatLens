/**
 * Job ids encode the dedupe policy per job type.
 *
 * Ingest and claims run repeatedly by design (freshness matters more than
 * enqueue suppression) and are idempotent downstream: article-level dedupe in
 * the ingestion pipeline, unique claim/evidence constraints in the database.
 * Their ids are therefore unique per request — readable, never suppressing.
 *
 * Analysis spends money (LLM calls), so its id is deterministic per event per
 * UTC day: re-adding it while a recent attempt is retained is a no-op. The
 * processor additionally refuses to run when a draft assessment already
 * exists. force generates a unique id to intentionally re-run.
 *
 * BullMQ forbids ":" inside custom ids; "__" separates segments instead.
 */

const NONCE_LENGTH = 4;

function nonce(): string {
  return Math.random()
    .toString(16)
    .slice(2, 2 + NONCE_LENGTH);
}

export function utcDayKey(date: Date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

export function ingestJobId(feedSlug: string, date: Date = new Date()): string {
  return `ingest__${feedSlug}__${date.getTime().toString(36)}__${nonce()}`;
}

export function claimsJobId(eventSlug: string, date: Date = new Date()): string {
  return `claims__${eventSlug}__${date.getTime().toString(36)}__${nonce()}`;
}

export function analysisJobId(eventSlug: string, force = false): string {
  const day = utcDayKey();
  if (force) {
    return `analyze__${eventSlug}__${day}__${nonce()}`;
  }
  return `analyze__${eventSlug}__${day}`;
}
