export type { NewsSourceAdapter, RawArticle } from './adapter.js';
export { DEFAULT_FEEDS, resolveFeeds } from './feeds.js';
export type { FeedConfig } from './feeds.js';
export {
  canonicalizeUrl,
  hashArticle,
  matchTitle,
  normalizeArticle,
  normalizeTitle,
  stripHtml,
} from './normalize.js';
export {
  DEDUPE_WINDOW_HOURS,
  findDuplicate,
  isEntityOverlapMatch,
  isHardDuplicate,
} from './dedupe.js';
export type { DuplicateMatch, DuplicateReason } from './dedupe.js';
export { ingestFeed } from './pipeline.js';
export type { IngestSourceResult } from './pipeline.js';
export { parseFeedXml } from './rss.js';
export { RssAdapter } from './rss-adapter.js';
