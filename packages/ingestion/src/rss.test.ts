import { describe, expect, it } from 'vitest';
import { parseFeedXml } from './rss.js';

const rss = `<?xml version="1.0"?>
<rss version="2.0">
  <channel>
    <title>Fixture</title>
    <item>
      <title><![CDATA[ Shipping disruption ]]></title>
      <link>https://example.test/a?utm_source=rss</link>
      <guid>guid-a</guid>
      <pubDate>Thu, 20 Aug 2026 00:00:00 GMT</pubDate>
      <description><![CDATA[<p>Short excerpt.</p>]]></description>
    </item>
    <item>
      <title></title>
      <link>https://example.test/missing-title</link>
    </item>
  </channel>
</rss>`;

const atom = `<?xml version="1.0"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>Fixture</title>
  <entry>
    <title>Atom headline</title>
    <id>atom-1</id>
    <link rel="alternate" href="https://example.test/atom"/>
    <updated>2026-08-21T00:00:00Z</updated>
    <summary>Atom summary</summary>
  </entry>
</feed>`;

describe('feed parsing', () => {
  it('reads RSS items including CDATA titles', () => {
    const items = parseFeedXml(rss);
    expect(items).toHaveLength(2);
    expect(items[0]?.title).toBe('Shipping disruption');
    expect(items[0]?.externalId).toBe('guid-a');
    expect(items[0]?.url).toContain('example.test/a');
  });

  it('reads Atom entries from link href', () => {
    const items = parseFeedXml(atom);
    expect(items).toHaveLength(1);
    expect(items[0]?.url).toBe('https://example.test/atom');
    expect(items[0]?.title).toBe('Atom headline');
  });
});
