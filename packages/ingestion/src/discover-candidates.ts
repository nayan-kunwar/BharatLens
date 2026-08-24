import type { EventCatalog } from '@bharatlens/database';
import { isEventCoverageMatch } from './dedupe.js';
import {
  buildCandidateDraft,
  clusterArticles,
  evaluateCluster,
  type ArticleCluster,
  type CandidateArticle,
} from './candidates.js';

export type DiscoveryResult = {
  scanned: number;
  clustersFormed: number;
  candidatesCreated: number;
  articlesClustered: number;
  skippedExistingEvent: number;
  gatedOut: Record<string, number>;
};

function eventText(event: { title: string; summary: string | null; description: string | null }) {
  return `${event.title} ${event.summary ?? ''} ${event.description ?? ''}`;
}

/**
 * Deterministic candidate-event discovery over unmatched canonical articles:
 * cluster, gate, skip clusters an existing event already covers, then create
 * one CANDIDATE event per remaining cluster with all members attached.
 *
 * Idempotent by construction — attached articles become LINKED and drop out
 * of the next scan. No LLM is involved; analysis stays operator-triggered.
 */
export async function discoverCandidates(input: {
  catalog: EventCatalog;
  scanLimit?: number;
}): Promise<DiscoveryResult> {
  const result: DiscoveryResult = {
    scanned: 0,
    clustersFormed: 0,
    candidatesCreated: 0,
    articlesClustered: 0,
    skippedExistingEvent: 0,
    gatedOut: {},
  };

  const unmatched = await input.catalog.listUnmatchedCanonicalArticles(input.scanLimit ?? 300);
  result.scanned = unmatched.length;
  if (unmatched.length === 0) {
    return result;
  }

  const articles: CandidateArticle[] = unmatched.map((row) => ({
    id: row.id,
    sourceId: row.sourceId,
    title: row.title,
    summary: row.summary,
    publishedAt: row.publishedAt,
  }));

  const clusters = clusterArticles(articles);
  result.clustersFormed = clusters.length;

  const activeEvents = await input.catalog.listNonArchivedEventTexts();
  const existingSlugs = new Set(activeEvents.map((event) => event.slug));

  for (const cluster of clusters) {
    const gate = evaluateCluster(cluster);
    if (!gate.ok) {
      result.gatedOut[gate.reason] = (result.gatedOut[gate.reason] ?? 0) + 1;
      continue;
    }

    if (clusterCoveredByExistingEvent(cluster, activeEvents)) {
      result.skippedExistingEvent += 1;
      continue;
    }

    const draft = buildCandidateDraft(cluster, existingSlugs);
    await input.catalog.createCandidateFromArticles(
      draft,
      cluster.articles.map((article) => article.id),
    );
    existingSlugs.add(draft.slug);

    result.candidatesCreated += 1;
    result.articlesClustered += cluster.articles.length;
  }

  return result;
}

function clusterCoveredByExistingEvent(
  cluster: ArticleCluster,
  events: Array<{ title: string; summary: string | null; description: string | null }>,
): boolean {
  return cluster.articles.some((article) =>
    events.some((event) =>
      isEventCoverageMatch(eventText(event), `${article.title} ${article.summary ?? ''}`),
    ),
  );
}
