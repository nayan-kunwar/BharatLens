import type { EventCatalog } from '@bharatlens/database';
import type { NewsSourceAdapter } from './adapter.js';
import { findDuplicate, isHardDuplicate, type DuplicateReason } from './dedupe.js';
import type { FeedConfig } from './feeds.js';
import { normalizeArticle } from './normalize.js';
import { RssAdapter } from './rss-adapter.js';

const emptyReasons = (): Record<DuplicateReason, number> => ({
  URL: 0,
  EXTERNAL_ID: 0,
  CONTENT_HASH: 0,
  TITLE_WINDOW: 0,
  ENTITY_OVERLAP: 0,
});

export type IngestSourceResult = {
  slug: string;
  jobId: string;
  status: 'SUCCEEDED' | 'FAILED';
  itemsSeen: number;
  itemsInserted: number;
  itemsDuplicate: number;
  itemsRejected: number;
  duplicateReasons: Record<DuplicateReason, number>;
  errorMessage?: string;
};

export async function ingestFeed(input: {
  catalog: EventCatalog;
  feed: FeedConfig;
  adapter?: NewsSourceAdapter;
}): Promise<IngestSourceResult> {
  const source = await input.catalog.upsertSource({
    name: input.feed.name,
    slug: input.feed.slug,
    type: input.feed.type,
    homepageUrl: input.feed.homepageUrl,
  });

  const job = await input.catalog.startIngestionJob(source.id);
  const adapter = input.adapter ?? new RssAdapter(input.feed.feedUrl);

  let itemsSeen = 0;
  let itemsInserted = 0;
  let itemsDuplicate = 0;
  let itemsRejected = 0;
  const duplicateReasons = emptyReasons();

  try {
    const rawItems = await adapter.fetchArticles();
    itemsSeen = rawItems.length;

    for (const raw of rawItems) {
      const normalized = normalizeArticle(raw);
      if (!normalized) {
        itemsRejected += 1;
        continue;
      }

      const duplicate = await findDuplicate(input.catalog, {
        sourceId: source.id,
        url: normalized.url,
        externalId: normalized.externalId,
        contentHash: normalized.contentHash,
        matchTitle: normalized.matchTitle,
        summary: normalized.summary,
        publishedAt: normalized.publishedAt,
      });

      if (duplicate && isHardDuplicate(duplicate.reason)) {
        itemsDuplicate += 1;
        duplicateReasons[duplicate.reason] += 1;
        continue;
      }

      const inserted = await input.catalog.ingestArticle({
        sourceId: source.id,
        title: normalized.title,
        url: normalized.url,
        publishedAt: normalized.publishedAt,
        summary: normalized.summary,
        contentHash: normalized.contentHash,
        normalizedTitle: normalized.matchTitle,
        externalId: normalized.externalId,
        author: normalized.author,
        status: duplicate ? 'DUPLICATE' : 'NORMALIZED',
        duplicateOfArticleId: duplicate?.articleId,
      });

      if (inserted) {
        if (duplicate) {
          itemsDuplicate += 1;
          duplicateReasons[duplicate.reason] += 1;
        } else {
          itemsInserted += 1;
        }
      } else {
        itemsDuplicate += 1;
        duplicateReasons.URL += 1;
      }
    }

    await input.catalog.completeIngestionJob(job.id, {
      status: 'SUCCEEDED',
      itemsSeen,
      itemsInserted,
      itemsDuplicate,
      itemsRejected,
    });

    return {
      slug: input.feed.slug,
      jobId: job.id,
      status: 'SUCCEEDED',
      itemsSeen,
      itemsInserted,
      itemsDuplicate,
      itemsRejected,
      duplicateReasons,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Ingestion failed';
    await input.catalog.completeIngestionJob(job.id, {
      status: 'FAILED',
      itemsSeen,
      itemsInserted,
      itemsDuplicate,
      itemsRejected,
      errorMessage,
    });

    return {
      slug: input.feed.slug,
      jobId: job.id,
      status: 'FAILED',
      itemsSeen,
      itemsInserted,
      itemsDuplicate,
      itemsRejected,
      duplicateReasons,
      errorMessage,
    };
  }
}
