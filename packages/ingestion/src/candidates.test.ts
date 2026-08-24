import { describe, expect, it } from 'vitest';
import { buildCandidateDraft, clusterArticles, evaluateCluster } from './candidates.js';
import type { CandidateArticle } from './candidates.js';

const T0 = Date.UTC(2026, 7, 20, 8);

function article(id: string, title: string, hoursOffset = 0, sourceId = 'src-1'): CandidateArticle {
  return {
    id,
    sourceId,
    title,
    summary: null,
    publishedAt: new Date(T0 + hoursOffset * 60 * 60 * 1000),
  };
}

describe('clusterArticles', () => {
  it('merges clearly-overlapping reports and separates unrelated ones', () => {
    const clusters = clusterArticles([
      article('a1', 'Gaza ceasefire deal announced india watches crude'),
      article('a2', 'Gaza ceasefire agreement signed india crude markets calm', 2),
      article('b1', 'Taiwan Strait military drill begins', 1),
    ]);

    expect(clusters).toHaveLength(2);
    const sizes = clusters.map((cluster) => cluster.articles.length).sort();
    expect(sizes).toEqual([1, 2]);
  });

  it('respects the time window even for identical wording', () => {
    const clusters = clusterArticles([
      article('x1', 'Gaza ceasefire holds steady'),
      article('x2', 'Gaza ceasefire holds steady', 72),
    ]);

    expect(clusters).toHaveLength(2);
  });
});

describe('evaluateCluster', () => {
  it('rejects singletons and clusters without a shared named entity', () => {
    const [single] = clusterArticles([article('s1', 'Something happened today')]);
    expect(evaluateCluster(single!)).toEqual({ ok: false, reason: 'TOO_SMALL' });

    // Near-identical wording merges via Jaccard alone (no gazetteer entity).
    const [pair] = clusterArticles([
      article('p1', 'Council election results certified today nationwide'),
      article('p2', 'Council election results certified today', 1),
    ]);
    const gate = evaluateCluster(pair!);
    expect(gate.ok).toBe(false);
    if (!gate.ok) {
      expect(gate.reason).toBe('NO_SHARED_ENTITY');
    }
  });

  it('accepts a qualifying cluster and rejects non-India clusters', () => {
    const [good] = clusterArticles([
      article('g1', 'Gaza ceasefire announced india crude importers react'),
      article('g2', 'Gaza ceasefire takes effect india watching crude flows', 1),
    ]);
    expect(evaluateCluster(good!)).toMatchObject({ ok: true });

    const [noIndia] = clusterArticles([
      article('n1', 'Gaza ceasefire announced israel confirms terms'),
      article('n2', 'Gaza ceasefire takes effect israel gaza border opens', 1),
    ]);
    expect(evaluateCluster(noIndia!)).toEqual({ ok: false, reason: 'NOT_INDIA_RELEVANT' });
  });
});

describe('buildCandidateDraft', () => {
  it('derives title from the medoid headline and a provenance summary', () => {
    const [cluster] = clusterArticles([
      article('m1', 'Red Sea attack disrupts shipping india crude routes', 0),
      article('m2', 'Red Sea shipping attack worries india crude traders', 1, 'src-2'),
      article('m3', 'Red Sea attack shipping india crude exposure grows', 2, 'src-3'),
    ]);

    const draft = buildCandidateDraft(cluster!, new Set());
    expect(draft.title.toLowerCase()).toContain('red sea');
    expect(draft.summary).toContain('3 reports');
    expect(draft.summary).toContain('3 outlets');
    expect(draft.summary).toContain('Not yet reviewed');
    expect(draft.slug).toMatch(/^red-sea-.*-\d{8}$/);
  });

  it('avoids slug collisions deterministically', () => {
    const [cluster] = clusterArticles([
      article('c1', 'Gaza ceasefire india note'),
      article('c2', 'Gaza ceasefire india reaction', 1),
    ]);

    const first = buildCandidateDraft(cluster!, new Set());
    const second = buildCandidateDraft(cluster!, new Set([first.slug]));
    expect(second.slug).not.toBe(first.slug);
    expect(second.slug.startsWith(first.slug)).toBe(true);
  });
});
