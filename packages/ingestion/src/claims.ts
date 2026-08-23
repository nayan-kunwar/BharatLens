import { classifyClaimType, EXCERPT_MAX_LENGTH } from '@bharatlens/shared';
import type { EventCatalog } from '@bharatlens/database';
import { isEntityOverlapMatch, isEventCoverageMatch } from './dedupe.js';
import { truncateSummary } from './normalize.js';

export type ExtractClaimsResult = {
  eventSlug: string;
  articlesLinked: number;
  claimsCreated: number;
  evidenceAdded: number;
};

function articleText(article: {
  title: string;
  summary: string | null;
  normalizedTitle?: string | null;
}) {
  return `${article.normalizedTitle ?? article.title} ${article.summary ?? ''}`;
}

export async function extractClaimsForEvent(
  catalog: EventCatalog,
  eventSlug: string,
): Promise<ExtractClaimsResult> {
  const event = await catalog.getEventBySlug(eventSlug);
  if (!event) {
    throw new Error(`Event not found: ${eventSlug}`);
  }

  const eventText = `${event.title} ${event.summary ?? ''} ${event.description ?? ''}`;
  const linked = await catalog.listLinkedArticles(event.id);
  const linkedIds = new Set(linked.map((article) => article.id));
  const canonical = await catalog.listCanonicalArticles();

  const matched = canonical.filter((article) => {
    if (linkedIds.has(article.id)) {
      return false;
    }
    return isEventCoverageMatch(eventText, articleText(article));
  });

  let articlesLinked = 0;
  for (const article of matched) {
    await catalog.attachArticle(event.id, article.id);
    articlesLinked += 1;
    linkedIds.add(article.id);
  }

  const articles = [
    ...linked,
    ...matched.map((article) => ({
      id: article.id,
      sourceId: article.sourceId,
      title: article.title,
      url: article.url,
      summary: article.summary,
      publishedAt: article.publishedAt,
      status: article.status,
      normalizedTitle: article.normalizedTitle,
    })),
  ];

  const existingClaims = await catalog.listClaimsForEvent(event.id);
  let claimsCreated = 0;
  let evidenceAdded = 0;

  for (const article of articles) {
    const excerpt =
      truncateSummary(article.summary ?? undefined) ?? article.title.slice(0, EXCERPT_MAX_LENGTH);
    const overlapping = existingClaims.filter((claim) =>
      isEntityOverlapMatch(articleText(article), claim.statement),
    );

    const targets =
      overlapping.length > 0
        ? overlapping
        : [
            await catalog.addClaim({
              eventId: event.id,
              statement: article.title,
              type: classifyClaimType(`${article.title} ${article.summary ?? ''}`),
              status: 'PENDING',
              sourceId: article.sourceId,
              articleId: article.id,
            }),
          ];

    if (overlapping.length === 0) {
      const created = targets[0];
      if (created && !existingClaims.some((claim) => claim.id === created.id)) {
        claimsCreated += 1;
        existingClaims.push(created);
      }
    }

    for (const claim of targets) {
      const beforeCount = claim.sourceCount;
      const updated = await catalog.addEvidence({
        claimId: claim.id,
        sourceId: article.sourceId,
        url: article.url,
        excerpt,
        articleId: article.id,
        publishedAt: article.publishedAt ?? undefined,
      });
      if (updated && updated.sourceCount > beforeCount) {
        evidenceAdded += 1;
        claim.sourceCount = updated.sourceCount;
      }
    }
  }

  return {
    eventSlug,
    articlesLinked,
    claimsCreated,
    evidenceAdded,
  };
}

export async function extractClaimsForEvents(catalog: EventCatalog, eventSlug?: string) {
  if (eventSlug) {
    return [await extractClaimsForEvent(catalog, eventSlug)];
  }

  const events = await catalog.listPublicEvents();
  const results = [];
  for (const event of events) {
    results.push(await extractClaimsForEvent(catalog, event.slug));
  }
  return results;
}
