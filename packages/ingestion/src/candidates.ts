import { INDIA_RELEVANCE_TOKENS } from '@bharatlens/shared';
import {
  isEntityOverlapMatch,
  namedEntityTokens,
  significantTokens,
  sharedCount,
} from './dedupe.js';

export const CANDIDATE_WINDOW_HOURS = 48;
export const MIN_CLUSTER_SIZE = 2;

/** Minimal article shape the discovery step works on. */
export type CandidateArticle = {
  id: string;
  sourceId: string;
  title: string;
  summary: string | null;
  publishedAt: Date | null;
};

export type ArticleCluster = {
  articles: CandidateArticle[];
};

function articleText(article: CandidateArticle): string {
  return `${article.title} ${article.summary ?? ''}`;
}

function withinWindow(left: CandidateArticle, right: CandidateArticle): boolean {
  if (!left.publishedAt || !right.publishedAt) {
    // Undated articles cannot be window-matched; treating them as always
    // inside the window would cluster unrelated evergreen coverage.
    return false;
  }
  const diff = Math.abs(left.publishedAt.getTime() - right.publishedAt.getTime());
  return diff <= CANDIDATE_WINDOW_HOURS * 60 * 60 * 1000;
}

/**
 * Union-find clustering of unmatched articles. Pairwise matching reuses the
 * precision-oriented dedupe matcher so two outlets are only grouped when they
 * are clearly about the same situation.
 */
export function clusterArticles(articles: CandidateArticle[]): ArticleCluster[] {
  const parent = articles.map((_, index) => index);
  const find = (index: number): number => {
    while (parent[index] !== index) {
      parent[index] = parent[parent[index]!]!;
      index = parent[index]!;
    }
    return index;
  };
  const union = (a: number, b: number) => {
    const [ra, rb] = [find(a), find(b)];
    if (ra !== rb) {
      parent[Math.max(ra, rb)] = Math.min(ra, rb);
    }
  };

  for (let i = 0; i < articles.length; i += 1) {
    for (let j = i + 1; j < articles.length; j += 1) {
      const left = articles[i]!;
      const right = articles[j]!;
      if (
        withinWindow(left, right) &&
        isEntityOverlapMatch(articleText(left), articleText(right))
      ) {
        union(i, j);
      }
    }
  }

  const groups = new Map<number, CandidateArticle[]>();
  articles.forEach((article, index) => {
    const root = find(index);
    groups.set(root, [...(groups.get(root) ?? []), article]);
  });

  return [...groups.values()].map((members) => ({ articles: members }));
}

export type ClusterGateResult =
  | { ok: true; sharedEntities: number }
  | { ok: false; reason: 'TOO_SMALL' | 'NO_SHARED_ENTITY' | 'NOT_INDIA_RELEVANT' };

/**
 * Gates applied after clustering, before any event is created:
 * size, a shared named entity, and a deterministic India-relevance signal.
 */
export function evaluateCluster(cluster: ArticleCluster): ClusterGateResult {
  if (cluster.articles.length < MIN_CLUSTER_SIZE) {
    return { ok: false, reason: 'TOO_SMALL' };
  }

  let maxSharedEntities = 0;
  for (let i = 0; i < cluster.articles.length; i += 1) {
    for (let j = i + 1; j < cluster.articles.length; j += 1) {
      const left = significantTokens(articleText(cluster.articles[i]!));
      const right = significantTokens(articleText(cluster.articles[j]!));
      maxSharedEntities = Math.max(
        maxSharedEntities,
        sharedCount(namedEntityTokens(left), namedEntityTokens(right)),
      );
    }
  }
  if (maxSharedEntities < 1) {
    return { ok: false, reason: 'NO_SHARED_ENTITY' };
  }

  const allTokens = new Set<string>();
  for (const article of cluster.articles) {
    for (const token of significantTokens(articleText(article))) {
      allTokens.add(token);
    }
  }
  if (!INDIA_RELEVANCE_TOKENS.some((token) => allTokens.has(token))) {
    return { ok: false, reason: 'NOT_INDIA_RELEVANT' };
  }

  return { ok: true, sharedEntities: maxSharedEntities };
}

/**
 * Derives the candidate draft strictly from member headlines — no invented
 * facts. The title basis is the medoid headline (highest pairwise overlap),
 * which is the member most representative of the cluster.
 */
export function buildCandidateDraft(
  cluster: ArticleCluster,
  existingSlugs: Set<string>,
): { title: string; slug: string; summary: string } {
  const tokensOf = cluster.articles.map((article) => significantTokens(article.title));

  let bestIndex = 0;
  let bestOverlap = -1;
  for (let i = 0; i < cluster.articles.length; i += 1) {
    const overlap = tokensOf.reduce(
      (sum, other, j) => (j === i ? sum : sum + sharedCount(tokensOf[i]!, other)),
      0,
    );
    if (overlap > bestOverlap) {
      bestOverlap = overlap;
      bestIndex = i;
    }
  }

  const title = cluster.articles[bestIndex]!.title.slice(0, 300);

  const outletCount = new Set(cluster.articles.map((article) => article.sourceId)).size;
  const count = cluster.articles.length;
  const summary = `Auto-grouped from ${count} report${count === 1 ? '' : 's'} across ${outletCount} outlet${outletCount === 1 ? '' : 's'}. Not yet reviewed by an editor.`;

  const dateForSlug =
    cluster.articles
      .map((article) => article.publishedAt?.getTime() ?? Date.now())
      .sort((a, b) => a - b)[Math.floor((cluster.articles.length - 1) / 2)] ?? Date.now();
  const dayKey = new Date(dateForSlug).toISOString().slice(0, 10).replaceAll('-', '');

  const leadTokens = [...significantTokens(title)].slice(0, 6);
  const base = (leadTokens.join('-') || 'candidate').slice(0, 120);

  let slug = `${base}-${dayKey}`;
  let suffix = 2;
  while (existingSlugs.has(slug)) {
    slug = `${base}-${dayKey}-${suffix}`;
    suffix += 1;
  }

  return { title, slug, summary };
}
