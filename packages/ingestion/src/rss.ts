import type { RawArticle } from './adapter.js';
import { decodeXmlEntities } from './normalize.js';

function blocks(xml: string, tag: string): string[] {
  const pattern = new RegExp(`<${tag}(?:\\s[^>]*)?>[\\s\\S]*?<\\/${tag}>`, 'gi');
  return xml.match(pattern) ?? [];
}

function textTag(block: string, tag: string): string | undefined {
  const cdata = block.match(
    new RegExp(`<${tag}(?:\\s[^>]*)?>\\s*<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>\\s*<\\/${tag}>`, 'i'),
  );
  if (cdata?.[1] !== undefined) {
    return decodeXmlEntities(cdata[1].trim());
  }

  const plain = block.match(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`, 'i'));
  if (plain?.[1] === undefined) {
    return undefined;
  }
  return decodeXmlEntities(plain[1].replace(/<[^>]+>/g, ' ').trim());
}

function href(block: string): string | undefined {
  const rssLink = textTag(block, 'link');
  if (rssLink && /^https?:\/\//i.test(rssLink)) {
    return rssLink;
  }

  const atomAlternate = block.match(
    /<link[^>]*rel=["']alternate["'][^>]*href=["']([^"']+)["'][^>]*\/?>/i,
  );
  if (atomAlternate?.[1]) {
    return atomAlternate[1];
  }

  const atomHref = block.match(/<link[^>]*href=["']([^"']+)["'][^>]*\/?>/i);
  return atomHref?.[1];
}

function toRaw(block: string): RawArticle | null {
  const title = textTag(block, 'title') ?? '';
  const url = href(block) ?? textTag(block, 'guid') ?? '';
  if (!url) {
    return null;
  }

  return {
    title,
    url,
    externalId: textTag(block, 'guid') ?? textTag(block, 'id'),
    author: textTag(block, 'author') ?? textTag(block, 'dc:creator'),
    publishedAt:
      textTag(block, 'pubDate') ?? textTag(block, 'published') ?? textTag(block, 'updated'),
    summary:
      textTag(block, 'description') ?? textTag(block, 'summary') ?? textTag(block, 'content'),
  };
}

export function parseFeedXml(xml: string): RawArticle[] {
  const items = [...blocks(xml, 'item'), ...blocks(xml, 'entry')]
    .map(toRaw)
    .filter((item): item is RawArticle => item !== null);

  return items;
}
