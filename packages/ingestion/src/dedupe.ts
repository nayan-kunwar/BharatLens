import type { EventCatalog } from '@bharatlens/database';
import { matchTitle } from './normalize.js';

export const DEDUPE_WINDOW_HOURS = 48;

export const HARD_DUPLICATE_REASONS = ['URL', 'EXTERNAL_ID'] as const;
export const SOFT_DUPLICATE_REASONS = ['CONTENT_HASH', 'TITLE_WINDOW', 'ENTITY_OVERLAP'] as const;

export type DuplicateReason =
  (typeof HARD_DUPLICATE_REASONS)[number] | (typeof SOFT_DUPLICATE_REASONS)[number];

export type DuplicateMatch = {
  articleId: string;
  reason: DuplicateReason;
};

const STOPWORDS = new Set([
  'a',
  'an',
  'the',
  'and',
  'or',
  'of',
  'to',
  'in',
  'on',
  'for',
  'with',
  'by',
  'from',
  'at',
  'as',
  'is',
  'are',
  'was',
  'after',
  'over',
  'into',
  'about',
  'new',
  'says',
  'say',
  'said',
  'report',
  'reports',
  'latest',
  'update',
  'amid',
  'near',
  'as',
]);

/** Small gazetteer — not NER. Enough to require a shared place/topic token. */
const NAMED_ENTITIES = new Set([
  'india',
  'indian',
  'china',
  'chinese',
  'iran',
  'iranian',
  'pakistan',
  'russia',
  'russian',
  'ukraine',
  'ukrainian',
  'usa',
  'united',
  'states',
  'america',
  'saudi',
  'arabia',
  'uae',
  'emirates',
  'israel',
  'gaza',
  'hormuz',
  'strait',
  'taiwan',
  'japan',
  'germany',
  'un',
  'nato',
  'rbi',
  'crude',
  'oil',
  'lng',
  'gas',
]);

export function significantTokens(text: string): Set<string> {
  const tokens = matchTitle(text)
    .split(' ')
    .filter((token) => token.length >= 3 && !STOPWORDS.has(token));
  return new Set(tokens);
}

export function jaccard(left: Set<string>, right: Set<string>): number {
  if (left.size === 0 || right.size === 0) {
    return 0;
  }

  let intersection = 0;
  for (const token of left) {
    if (right.has(token)) {
      intersection += 1;
    }
  }

  const union = left.size + right.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

export function sharedCount(left: Set<string>, right: Set<string>): number {
  let count = 0;
  for (const token of left) {
    if (right.has(token)) {
      count += 1;
    }
  }
  return count;
}

export function namedEntityTokens(tokens: Set<string>): Set<string> {
  const named = new Set<string>();
  for (const token of tokens) {
    if (NAMED_ENTITIES.has(token)) {
      named.add(token);
    }
  }
  return named;
}

/**
 * Soft match after URL / external id / hash. Requires a time window at the caller.
 * Title Jaccard plus either several shared tokens or a shared gazetteer entity.
 */
export function isEntityOverlapMatch(leftText: string, rightText: string): boolean {
  const left = significantTokens(leftText);
  const right = significantTokens(rightText);
  if (left.size < 3 || right.size < 3) {
    return false;
  }

  const titleScore = jaccard(left, right);
  const shared = sharedCount(left, right);
  const sharedEntities = sharedCount(namedEntityTokens(left), namedEntityTokens(right));
  const overlap = shared / Math.min(left.size, right.size);

  if (titleScore >= 0.65 && shared >= 3) {
    return true;
  }

  return shared >= 3 && overlap >= 0.5 && sharedEntities >= 1;
}

export function isHardDuplicate(reason: DuplicateReason): boolean {
  return (HARD_DUPLICATE_REASONS as readonly string[]).includes(reason);
}

export async function findDuplicate(
  catalog: EventCatalog,
  input: {
    sourceId: string;
    url: string;
    externalId?: string;
    contentHash: string;
    matchTitle: string;
    summary?: string;
    publishedAt?: Date;
  },
): Promise<DuplicateMatch | null> {
  const byUrl = await catalog.findArticleByUrl(input.url);
  if (byUrl) {
    return { articleId: byUrl.id, reason: 'URL' };
  }

  if (input.externalId) {
    const byExternal = await catalog.findArticleBySourceExternalId(
      input.sourceId,
      input.externalId,
    );
    if (byExternal) {
      return { articleId: byExternal.id, reason: 'EXTERNAL_ID' };
    }
  }

  const byHash = await catalog.findCanonicalArticleByContentHash(input.contentHash);
  if (byHash) {
    return { articleId: byHash.id, reason: 'CONTENT_HASH' };
  }

  if (!input.publishedAt) {
    return null;
  }

  const nearby = await catalog.listCanonicalArticlesNearPublishedAt(
    input.publishedAt,
    DEDUPE_WINDOW_HOURS,
  );
  const incomingText = `${input.matchTitle} ${input.summary ?? ''}`;

  for (const article of nearby) {
    const existingTitle = article.normalizedTitle ?? matchTitle(article.title);
    if (existingTitle && existingTitle === input.matchTitle) {
      return { articleId: article.id, reason: 'TITLE_WINDOW' };
    }
  }

  for (const article of nearby) {
    const existingText = `${article.normalizedTitle ?? article.title} ${article.summary ?? ''}`;
    if (isEntityOverlapMatch(incomingText, existingText)) {
      return { articleId: article.id, reason: 'ENTITY_OVERLAP' };
    }
  }

  return null;
}
