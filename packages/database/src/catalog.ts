import {
  type AnalysisConfidence,
  type ArticleStatus,
  type ClaimStatus,
  type ClaimType,
  type EventStatus,
  type EvidenceStrength,
  type ImpactCategory,
  type ImpactLevel,
  type ImportanceLevel,
  type IngestionJobStatus,
  type SourceType,
  DomainError,
  EXCERPT_MAX_LENGTH,
  PUBLIC_EVENT_STATUSES,
  assertEventStatusTransition,
  computeEvidenceStrength,
  describeEvidenceCounts,
  isOfficialSourceType,
  nextStatusAfterTimelineUpdate,
} from '@bharatlens/shared';
import { and, desc, eq, gte, inArray, isNotNull, lte } from 'drizzle-orm';
import type { Database } from './client.js';
import { articles } from './schema/articles.js';
import { claims, evidence } from './schema/claims.js';
import { countries } from './schema/countries.js';
import {
  eventArticles,
  eventCountries,
  eventTopics,
  eventUpdates,
  events,
  impactAssessments,
  impactCategoryLevels,
  watchItems,
} from './schema/events.js';
import { ingestionJobs } from './schema/ingestion.js';
import { sources } from './schema/sources.js';
import { topics } from './schema/topics.js';

export { computeEvidenceStrength } from '@bharatlens/shared';

export class EventCatalog {
  constructor(private readonly db: Database) {}

  async createSource(input: {
    name: string;
    slug: string;
    type: SourceType;
    homepageUrl?: string;
  }) {
    const [row] = await this.db
      .insert(sources)
      .values({
        name: input.name,
        slug: input.slug,
        type: input.type,
        homepageUrl: input.homepageUrl,
      })
      .returning();

    if (!row) {
      throw new DomainError('INTERNAL_ERROR', 'Failed to create source');
    }

    return row;
  }

  async upsertSource(input: {
    name: string;
    slug: string;
    type: SourceType;
    homepageUrl?: string;
  }) {
    const [row] = await this.db
      .insert(sources)
      .values({
        name: input.name,
        slug: input.slug,
        type: input.type,
        homepageUrl: input.homepageUrl,
      })
      .onConflictDoUpdate({
        target: sources.slug,
        set: {
          name: input.name,
          type: input.type,
          homepageUrl: input.homepageUrl,
          updatedAt: new Date(),
        },
      })
      .returning();

    if (!row) {
      throw new DomainError('INTERNAL_ERROR', 'Failed to upsert source');
    }

    return row;
  }

  async createCountry(input: { code: string; name: string; slug: string }) {
    const [row] = await this.db
      .insert(countries)
      .values({
        code: input.code.toUpperCase(),
        name: input.name,
        slug: input.slug,
      })
      .returning();

    if (!row) {
      throw new DomainError('INTERNAL_ERROR', 'Failed to create country');
    }

    return row;
  }

  async createTopic(input: { slug: string; name: string }) {
    const [row] = await this.db.insert(topics).values(input).returning();
    if (!row) {
      throw new DomainError('INTERNAL_ERROR', 'Failed to create topic');
    }
    return row;
  }

  async createEvent(input: {
    title: string;
    slug: string;
    summary?: string;
    description?: string;
    countryIds?: string[];
    topicIds?: string[];
    importance?: ImportanceLevel;
    occurredAt?: Date;
  }) {
    return this.db.transaction(async (tx) => {
      const [event] = await tx
        .insert(events)
        .values({
          title: input.title,
          slug: input.slug,
          summary: input.summary,
          description: input.description,
          status: 'CANDIDATE',
          importance: input.importance ?? 'MEDIUM',
          occurredAt: input.occurredAt,
        })
        .returning();

      if (!event) {
        throw new DomainError('INTERNAL_ERROR', 'Failed to create event');
      }

      if (input.countryIds?.length) {
        await tx
          .insert(eventCountries)
          .values(input.countryIds.map((countryId) => ({ eventId: event.id, countryId })));
      }

      if (input.topicIds?.length) {
        await tx
          .insert(eventTopics)
          .values(input.topicIds.map((topicId) => ({ eventId: event.id, topicId })));
      }

      return event;
    });
  }

  async transitionEvent(eventId: string, to: EventStatus) {
    const event = await this.requireEvent(eventId);
    assertEventStatusTransition(event.status, to);

    const publishedAt = to === 'PUBLISHED' ? new Date() : event.publishedAt;

    const [updated] = await this.db
      .update(events)
      .set({ status: to, publishedAt, updatedAt: new Date() })
      .where(eq(events.id, eventId))
      .returning();

    return updated;
  }

  async createArticle(input: {
    sourceId: string;
    title: string;
    url: string;
    status?: ArticleStatus;
    publishedAt?: Date;
    summary?: string;
    contentHash?: string;
    externalId?: string;
    author?: string;
  }) {
    const [row] = await this.db
      .insert(articles)
      .values({
        sourceId: input.sourceId,
        title: input.title,
        url: input.url,
        status: input.status ?? 'INGESTED',
        publishedAt: input.publishedAt,
        summary: input.summary,
        contentHash: input.contentHash,
        externalId: input.externalId,
        author: input.author,
      })
      .returning();

    if (!row) {
      throw new DomainError('INTERNAL_ERROR', 'Failed to create article');
    }

    return row;
  }

  async ingestArticle(input: {
    sourceId: string;
    title: string;
    url: string;
    status?: ArticleStatus;
    publishedAt?: Date;
    summary?: string;
    contentHash?: string;
    normalizedTitle?: string;
    duplicateOfArticleId?: string;
    externalId?: string;
    author?: string;
  }) {
    const [row] = await this.db
      .insert(articles)
      .values({
        sourceId: input.sourceId,
        title: input.title,
        url: input.url,
        status: input.status ?? 'NORMALIZED',
        publishedAt: input.publishedAt,
        summary: input.summary,
        contentHash: input.contentHash,
        normalizedTitle: input.normalizedTitle,
        duplicateOfArticleId: input.duplicateOfArticleId,
        externalId: input.externalId,
        author: input.author,
      })
      .onConflictDoNothing()
      .returning();

    return row ?? null;
  }

  async findArticleByUrl(url: string) {
    const [row] = await this.db.select().from(articles).where(eq(articles.url, url)).limit(1);
    return row ?? null;
  }

  async findArticleBySourceExternalId(sourceId: string, externalId: string) {
    const [row] = await this.db
      .select()
      .from(articles)
      .where(and(eq(articles.sourceId, sourceId), eq(articles.externalId, externalId)))
      .limit(1);
    return row ?? null;
  }

  async findCanonicalArticleByContentHash(contentHash: string) {
    const [row] = await this.db
      .select()
      .from(articles)
      .where(
        and(
          eq(articles.contentHash, contentHash),
          inArray(articles.status, ['INGESTED', 'NORMALIZED', 'LINKED']),
        ),
      )
      .limit(1);
    return row ?? null;
  }

  async listCanonicalArticlesNearPublishedAt(publishedAt: Date, windowHours: number) {
    const ms = windowHours * 60 * 60 * 1000;
    const from = new Date(publishedAt.getTime() - ms);
    const to = new Date(publishedAt.getTime() + ms);

    return this.db
      .select()
      .from(articles)
      .where(
        and(
          inArray(articles.status, ['INGESTED', 'NORMALIZED', 'LINKED']),
          isNotNull(articles.publishedAt),
          gte(articles.publishedAt, from),
          lte(articles.publishedAt, to),
        ),
      )
      .limit(200);
  }

  async startIngestionJob(sourceId: string) {
    const [row] = await this.db
      .insert(ingestionJobs)
      .values({ sourceId, status: 'RUNNING' })
      .returning();

    if (!row) {
      throw new DomainError('INTERNAL_ERROR', 'Failed to create ingestion job');
    }

    return row;
  }

  async completeIngestionJob(
    jobId: string,
    input: {
      status: IngestionJobStatus;
      itemsSeen: number;
      itemsInserted: number;
      itemsDuplicate: number;
      itemsRejected: number;
      errorMessage?: string;
    },
  ) {
    const [row] = await this.db
      .update(ingestionJobs)
      .set({
        status: input.status,
        itemsSeen: input.itemsSeen,
        itemsInserted: input.itemsInserted,
        itemsDuplicate: input.itemsDuplicate,
        itemsRejected: input.itemsRejected,
        errorMessage: input.errorMessage,
        finishedAt: new Date(),
      })
      .where(eq(ingestionJobs.id, jobId))
      .returning();

    return row;
  }

  async attachArticle(eventId: string, articleId: string) {
    await this.requireEvent(eventId);

    await this.db.transaction(async (tx) => {
      await tx.insert(eventArticles).values({ eventId, articleId }).onConflictDoNothing();

      await tx
        .update(articles)
        .set({ status: 'LINKED', updatedAt: new Date() })
        .where(eq(articles.id, articleId));
    });
  }

  async addClaim(input: {
    eventId: string;
    statement: string;
    type: ClaimType;
    status?: ClaimStatus;
    sourceId?: string;
    articleId?: string;
  }) {
    await this.requireEvent(input.eventId);

    const [row] = await this.db
      .insert(claims)
      .values({
        eventId: input.eventId,
        statement: input.statement,
        type: input.type,
        status: input.status ?? 'PENDING',
        sourceId: input.sourceId,
        articleId: input.articleId,
      })
      .onConflictDoNothing()
      .returning();

    if (row) {
      return row;
    }

    const [existing] = await this.db
      .select()
      .from(claims)
      .where(and(eq(claims.eventId, input.eventId), eq(claims.statement, input.statement)))
      .limit(1);

    if (!existing) {
      throw new DomainError('INTERNAL_ERROR', 'Failed to create claim');
    }

    return existing;
  }

  async addEvidence(input: {
    claimId: string;
    sourceId: string;
    url: string;
    excerpt?: string;
    articleId?: string;
    publishedAt?: Date;
  }) {
    if (input.excerpt && input.excerpt.length > EXCERPT_MAX_LENGTH) {
      throw new DomainError(
        'VALIDATION_ERROR',
        `Evidence excerpt must be at most ${EXCERPT_MAX_LENGTH} characters`,
      );
    }

    return this.db.transaction(async (tx) => {
      const [claim] = await tx.select().from(claims).where(eq(claims.id, input.claimId)).limit(1);
      if (!claim) {
        throw new DomainError('VALIDATION_ERROR', 'Claim not found');
      }

      await tx
        .insert(evidence)
        .values({
          claimId: input.claimId,
          sourceId: input.sourceId,
          url: input.url,
          excerpt: input.excerpt,
          articleId: input.articleId,
          publishedAt: input.publishedAt,
        })
        .onConflictDoNothing();

      const evidenceRows = await tx
        .select({
          sourceId: evidence.sourceId,
          type: sources.type,
        })
        .from(evidence)
        .innerJoin(sources, eq(sources.id, evidence.sourceId))
        .where(eq(evidence.claimId, input.claimId));

      const sourceIds = new Set(evidenceRows.map((row) => row.sourceId));
      const officialIds = new Set(
        evidenceRows.filter((row) => isOfficialSourceType(row.type)).map((row) => row.sourceId),
      );
      const sourceCount = sourceIds.size;
      const independentSourceCount = sourceCount;
      const officialSourceCount = officialIds.size;
      const strength = computeEvidenceStrength({
        sourceCount,
        independentSourceCount,
        officialSourceCount,
      });

      const [updated] = await tx
        .update(claims)
        .set({
          sourceCount,
          independentSourceCount,
          officialSourceCount,
          evidenceStrength: strength,
          evidenceReason: describeEvidenceCounts({
            sourceCount,
            independentSourceCount,
            officialSourceCount,
            evidenceStrength: strength,
          }),
          updatedAt: new Date(),
        })
        .where(eq(claims.id, input.claimId))
        .returning();

      return updated;
    });
  }

  async getEventBySlug(slug: string) {
    const [event] = await this.db.select().from(events).where(eq(events.slug, slug)).limit(1);
    return event ?? null;
  }

  async listPublicEvents() {
    return this.db
      .select()
      .from(events)
      .where(inArray(events.status, [...PUBLIC_EVENT_STATUSES]));
  }

  async listClaimsForEvent(eventId: string) {
    return this.db.select().from(claims).where(eq(claims.eventId, eventId));
  }

  async listLinkedArticles(eventId: string) {
    return this.db
      .select({
        id: articles.id,
        sourceId: articles.sourceId,
        title: articles.title,
        url: articles.url,
        summary: articles.summary,
        publishedAt: articles.publishedAt,
        status: articles.status,
        normalizedTitle: articles.normalizedTitle,
      })
      .from(eventArticles)
      .innerJoin(articles, eq(articles.id, eventArticles.articleId))
      .where(eq(eventArticles.eventId, eventId));
  }

  async listCanonicalArticles() {
    return this.db
      .select()
      .from(articles)
      .where(inArray(articles.status, ['INGESTED', 'NORMALIZED', 'LINKED']));
  }

  async addUpdate(input: {
    eventId: string;
    title: string;
    occurredAt: Date;
    body?: string;
    impactChange?: string;
  }) {
    return this.db.transaction(async (tx) => {
      const [event] = await tx.select().from(events).where(eq(events.id, input.eventId)).limit(1);
      if (!event) {
        throw new DomainError('EVENT_NOT_FOUND', 'Event not found');
      }

      const nextStatus = nextStatusAfterTimelineUpdate(event.status);

      const [update] = await tx
        .insert(eventUpdates)
        .values({
          eventId: input.eventId,
          title: input.title,
          occurredAt: input.occurredAt,
          body: input.body,
          impactChange: input.impactChange,
        })
        .returning();

      if (nextStatus !== event.status) {
        await tx
          .update(events)
          .set({ status: nextStatus, updatedAt: new Date() })
          .where(eq(events.id, input.eventId));
      }

      return update;
    });
  }

  async addWatchItem(eventId: string, label: string, sortOrder = 0) {
    await this.requireEvent(eventId);
    const [row] = await this.db
      .insert(watchItems)
      .values({ eventId, label, sortOrder })
      .returning();
    return row;
  }

  async createImpactAssessment(input: {
    eventId: string;
    overallLevel: ImpactLevel;
    reasoning: string;
    evidenceStrength: EvidenceStrength;
    analysisConfidence: AnalysisConfidence;
    categories: Array<{ category: ImpactCategory; level: ImpactLevel; reasoning: string }>;
    status?: 'DRAFT' | 'PUBLISHED';
    modelName?: string;
    promptVersion?: string;
    publishedAt?: Date;
  }) {
    return this.db.transaction(async (tx) => {
      const [event] = await tx.select().from(events).where(eq(events.id, input.eventId)).limit(1);
      if (!event) {
        throw new DomainError('EVENT_NOT_FOUND', 'Event not found');
      }

      const [latest] = await tx
        .select({ version: impactAssessments.version })
        .from(impactAssessments)
        .where(eq(impactAssessments.eventId, input.eventId))
        .orderBy(desc(impactAssessments.version))
        .limit(1);

      const version = (latest?.version ?? 0) + 1;
      const status = input.status ?? 'DRAFT';
      const publishedAt = status === 'PUBLISHED' ? (input.publishedAt ?? new Date()) : null;

      const [assessment] = await tx
        .insert(impactAssessments)
        .values({
          eventId: input.eventId,
          version,
          status,
          overallLevel: input.overallLevel,
          reasoning: input.reasoning,
          evidenceStrength: input.evidenceStrength,
          analysisConfidence: input.analysisConfidence,
          modelName: input.modelName,
          promptVersion: input.promptVersion,
          publishedAt,
        })
        .returning();

      if (!assessment) {
        throw new DomainError('INTERNAL_ERROR', 'Failed to create impact assessment');
      }

      if (input.categories.length > 0) {
        await tx.insert(impactCategoryLevels).values(
          input.categories.map((category) => ({
            assessmentId: assessment.id,
            category: category.category,
            level: category.level,
            reasoning: category.reasoning,
          })),
        );
      }

      if (status === 'PUBLISHED') {
        await tx
          .update(events)
          .set({
            currentImpactAssessmentId: assessment.id,
            updatedAt: new Date(),
          })
          .where(eq(events.id, input.eventId));
      }

      return assessment;
    });
  }

  private async requireEvent(eventId: string) {
    const [event] = await this.db.select().from(events).where(eq(events.id, eventId)).limit(1);
    if (!event) {
      throw new DomainError('EVENT_NOT_FOUND', 'Event not found');
    }
    return event;
  }
}
