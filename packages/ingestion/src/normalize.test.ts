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
    expect(
      hashArticle({ title: 'A', summary: 'one' }) === hashArticle({ title: 'A', summary: 'two' }),
    ).toBe(false);
  });

  it('hashes the match title not the URL so syndication can collide', () => {
    const first = normalizeArticle({
      title: 'Hormuz disruption',
      url: 'https://example.test/bbc/hormuz',
      publishedAt: '2026-08-20T00:00:00.000Z',
      summary: 'Shipping interrupted.',
    });
    const second = normalizeArticle({
      title: 'Hormuz disruption!',
      url: 'https://news.example.test/un/hormuz',
      publishedAt: '2026-08-20T12:00:00.000Z',
      summary: 'Shipping interrupted.',
    });
    expect(first?.contentHash).toBe(second?.contentHash);
    expect(first?.matchTitle).toBe(second?.matchTitle);
  });
});
