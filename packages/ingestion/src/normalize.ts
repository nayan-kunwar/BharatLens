import { createHash } from 'node:crypto';
import { EXCERPT_MAX_LENGTH } from '@bharatlens/shared';

const TRACKING_PARAM = /^(utm_|fbclid$|gclid$|mc_cid$|mc_eid$)/i;

export type NormalizedArticle = {
  title: string;
  url: string;
  externalId?: string;
  author?: string;
  publishedAt?: Date;
  summary?: string;
  contentHash: string;
  matchTitle: string;
};

export function canonicalizeUrl(raw: string): string | null {
  let parsed: URL;
  try {
    parsed = new URL(raw.trim());
  } catch {
    return null;
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return null;
  }

  parsed.hash = '';
  parsed.hostname = parsed.hostname.toLowerCase();

  for (const key of [...parsed.searchParams.keys()]) {
    if (TRACKING_PARAM.test(key)) {
      parsed.searchParams.delete(key);
    }
  }
  parsed.searchParams.sort();

  if (parsed.pathname.length > 1 && parsed.pathname.endsWith('/')) {
    parsed.pathname = parsed.pathname.slice(0, -1);
  }

  return parsed.toString();
}

export function normalizeTitle(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

/** Lowercase, punctuation-stripped title used for duplicate matching. */
export function matchTitle(value: string): string {
  return value
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function stripHtml(value: string): string {
  return decodeXmlEntities(
    value
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim(),
  );
}

export function decodeXmlEntities(value: string): string {
  return value
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'");
}

export function truncateSummary(value: string | undefined): string | undefined {
  if (!value) {
    return undefined;
  }
  const cleaned = stripHtml(value);
  if (!cleaned) {
    return undefined;
  }
  return cleaned.length > EXCERPT_MAX_LENGTH ? cleaned.slice(0, EXCERPT_MAX_LENGTH) : cleaned;
}

export function hashArticle(input: {
  title: string;
  publishedAt?: string;
  summary?: string;
}): string {
  return createHash('sha256')
    .update(
      `${matchTitle(input.title)}\n${input.publishedAt?.slice(0, 10) ?? ''}\n${input.summary ?? ''}`,
    )
    .digest('hex');
}

export function normalizeArticle(input: {
  title: string;
  url: string;
  externalId?: string;
  author?: string;
  publishedAt?: string;
  summary?: string;
}): NormalizedArticle | null {
  const title = normalizeTitle(decodeXmlEntities(input.title));
  const url = canonicalizeUrl(input.url);
  if (!title || !url) {
    return null;
  }

  const publishedAt = input.publishedAt ? new Date(input.publishedAt) : undefined;
  const publishedIso =
    publishedAt && !Number.isNaN(publishedAt.getTime()) ? publishedAt.toISOString() : undefined;
  const summary = truncateSummary(input.summary);
  const externalId = input.externalId?.trim() || undefined;
  const author = input.author?.trim() || undefined;

  return {
    title,
    url,
    externalId,
    author,
    publishedAt: publishedIso ? new Date(publishedIso) : undefined,
    summary,
    matchTitle: matchTitle(title),
    contentHash: hashArticle({
      title,
      publishedAt: publishedIso,
      summary,
    }),
  };
}
