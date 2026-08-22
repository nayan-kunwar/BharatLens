import { describe, expect, it } from 'vitest';
import { DomainError } from '@bharatlens/shared';
import { RssAdapter } from './rss-adapter.js';

describe('RssAdapter', () => {
  it('parses a successful feed response', async () => {
    const adapter = new RssAdapter(
      'https://example.test/rss.xml',
      async () =>
        new Response(
          `<rss><channel><item><title>One</title><link>https://example.test/1</link></item></channel></rss>`,
          { status: 200, headers: { 'content-type': 'application/rss+xml' } },
        ),
    );

    const items = await adapter.fetchArticles();
    expect(items).toHaveLength(1);
    expect(items[0]?.title).toBe('One');
  });

  it('fails when the feed is empty or not ok', async () => {
    const empty = new RssAdapter(
      'https://example.test/rss.xml',
      async () => new Response(`<rss><channel></channel></rss>`, { status: 200 }),
    );
    await expect(empty.fetchArticles()).rejects.toBeInstanceOf(DomainError);

    const missing = new RssAdapter(
      'https://example.test/rss.xml',
      async () => new Response('nope', { status: 404 }),
    );
    await expect(missing.fetchArticles()).rejects.toBeInstanceOf(DomainError);
  });
});
