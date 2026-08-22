export type { NewsSourceAdapter, RawArticle } from './adapter.js';
export { DEFAULT_FEEDS, resolveFeeds } from './feeds.js';
export type { FeedConfig } from './feeds.js';
export {
  canonicalizeUrl,
  hashArticle,
  normalizeArticle,
  normalizeTitle,
  stripHtml,
} from './normalize.js';
export { ingestFeed } from './pipeline.js';
export type { IngestSourceResult } from './pipeline.js';
export { parseFeedXml } from './rss.js';
export { RssAdapter } from './rss-adapter.js';
