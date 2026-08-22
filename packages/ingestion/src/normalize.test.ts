import { describe, expect, it } from 'vitest';
import { canonicalizeUrl, hashArticle, normalizeArticle } from './normalize.js';

describe('article normalization', () => {
  it('strips tracking params and hashes stable fields', () => {
    const first = normalizeArticle({
      title: '  Hormuz   disruption ',
      url: 'https://WWW.Example.test/story/?utm_source=rss&id=1',
      publishedAt: '2026-08-20T00:00:00.000Z',
      summary: '<p>Short summary.</p>',
    });
    const second = normalizeArticle({
      title: 'Hormuz disruption',
      url: 'https://www.example.test/story?id=1&utm_campaign=x',
      publishedAt: '2026-08-20T00:00:00.000Z',
      summary: 'Short summary.',
    });

    expect(first?.url).toBe('https://www.example.test/story?id=1');
    expect(first?.contentHash).toBe(second?.contentHash);
    expect(first?.contentHash).toHaveLength(64);
  });

  it('rejects missing titles and non-http URLs', () => {
    expect(normalizeArticle({ title: '  ', url: 'https://example.test/a' })).toBeNull();
    expect(normalizeArticle({ title: 'Ok', url: 'ftp://example.test/a' })).toBeNull();
    expect(canonicalizeUrl('not a url')).toBeNull();
  });

  it('changes the hash when the summary changes', () => {
    const url = 'https://example.test/a';
    expect(
      hashArticle({ title: 'A', url, summary: 'one' }) ===
        hashArticle({ title: 'A', url, summary: 'two' }),
    ).toBe(false);
  });
});
