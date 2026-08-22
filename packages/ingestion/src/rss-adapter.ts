import { DomainError, ErrorCode } from '@bharatlens/shared';
import type { NewsSourceAdapter, RawArticle } from './adapter.js';
import { parseFeedXml } from './rss.js';

export const DEFAULT_ITEM_LIMIT = 40;
export const FETCH_TIMEOUT_MS = 15_000;
export const INGEST_USER_AGENT = 'BharatLens/0.1 (educational RSS metadata ingest)';

type FetchLike = typeof fetch;

export class RssAdapter implements NewsSourceAdapter {
  constructor(
    private readonly feedUrl: string,
    private readonly fetchImpl: FetchLike = fetch,
    private readonly itemLimit = DEFAULT_ITEM_LIMIT,
  ) {}

  async fetchArticles(): Promise<RawArticle[]> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    let response: Response;
    try {
      response = await this.fetchImpl(this.feedUrl, {
        signal: controller.signal,
        headers: {
          accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml',
          'user-agent': INGEST_USER_AGENT,
        },
      });
    } catch (error) {
      throw new DomainError(
        ErrorCode.INGESTION_FAILED,
        `Failed to fetch RSS feed: ${error instanceof Error ? error.message : 'network error'}`,
      );
    } finally {
      clearTimeout(timeout);
    }

    if (!response.ok) {
      throw new DomainError(
        ErrorCode.INGESTION_FAILED,
        `RSS feed returned HTTP ${response.status}`,
      );
    }

    const xml = await response.text();
    const items = parseFeedXml(xml);
    if (items.length === 0) {
      throw new DomainError(ErrorCode.INGESTION_FAILED, 'RSS feed contained no items');
    }

    return items.slice(0, this.itemLimit);
  }
}
