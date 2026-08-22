import { DomainError, PUBLIC_EVENT_STATUSES } from '@bharatlens/shared';
import { and, asc, count, desc, eq, ilike, inArray, or, type SQL } from 'drizzle-orm';
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
import { sources } from './schema/sources.js';
import { topics } from './schema/topics.js';

export type EventSortField = 'occurredAt' | 'publishedAt' | 'updatedAt';
export type SortDirection = 'asc' | 'desc';

export type ListEventsInput = {
  page: number;
  limit: number;
  countryCode?: string;
  topicSlug?: string;
  importance?: (typeof events.$inferSelect)['importance'];
  sort: EventSortField;
  order: SortDirection;
  query?: string;
};

function iso(value: Date | null): string | null {
  return value ? value.toISOString() : null;
}

function publicEventFilter(): SQL {
  return inArray(events.status, PUBLIC_EVENT_STATUSES);
}

export class EventQueries {
  constructor(private readonly db: Database) {}

  async listEvents(input: ListEventsInput) {
    const filters = [publicEventFilter()];

    if (input.importance) {
      filters.push(eq(events.importance, input.importance));
    }

    if (input.query) {
      const pattern = `%${input.query}%`;
      filters.push(or(ilike(events.title, pattern), ilike(events.summary, pattern))!);
    }

    const whereClause = and(...filters);
    const sortColumn = {
      occurredAt: events.occurredAt,
      publishedAt: events.publishedAt,
      updatedAt: events.updatedAt,
    }[input.sort];
    const orderBy = input.order === 'asc' ? asc(sortColumn) : desc(sortColumn);
    const offset = (input.page - 1) * input.limit;

    let eventIdFilter: string[] | undefined;

    if (input.countryCode) {
      const rows = await this.db
        .select({ eventId: eventCountries.eventId })
        .from(eventCountries)
        .innerJoin(countries, eq(countries.id, eventCountries.countryId))
        .where(eq(countries.code, input.countryCode.toUpperCase()));
      eventIdFilter = rows.map((row) => row.eventId);
    }

    if (input.topicSlug) {
      const rows = await this.db
        .select({ eventId: eventTopics.eventId })
        .from(eventTopics)
        .innerJoin(topics, eq(topics.id, eventTopics.topicId))
        .where(eq(topics.slug, input.topicSlug));
      const topicIds = rows.map((row) => row.eventId);
      eventIdFilter = eventIdFilter
        ? eventIdFilter.filter((id) => topicIds.includes(id))
        : topicIds;
    }

    if (eventIdFilter && eventIdFilter.length === 0) {
      return { items: [], total: 0 };
    }

    const scopedWhere =
      eventIdFilter !== undefined
        ? and(whereClause, inArray(events.id, eventIdFilter))
        : whereClause;

    const [totalRow] = await this.db.select({ total: count() }).from(events).where(scopedWhere);
    const rows = await this.db
      .select()
      .from(events)
      .where(scopedWhere)
      .orderBy(orderBy)
      .limit(input.limit)
      .offset(offset);

    const items = await this.hydrateList(rows);
    return { items, total: Number(totalRow?.total ?? 0) };
  }

  async getPublicEventBySlug(slug: string) {
    const [event] = await this.db
      .select()
      .from(events)
      .where(and(eq(events.slug, slug), publicEventFilter()))
      .limit(1);

    if (!event) {
      throw new DomainError('EVENT_NOT_FOUND', 'Event not found');
    }

    return this.hydrateDetail(event);
  }

  async requirePublicEventById(eventId: string) {
    const [event] = await this.db
      .select()
      .from(events)
      .where(and(eq(events.id, eventId), publicEventFilter()))
      .limit(1);

    if (!event) {
      throw new DomainError('EVENT_NOT_FOUND', 'Event not found');
    }

    return event;
  }

  async listCountries() {
    const rows = await this.db.select().from(countries).orderBy(asc(countries.name));
    return rows.map((row) => ({
      id: row.id,
      code: row.code,
      name: row.name,
      slug: row.slug,
    }));
  }

  async getCountryByCode(code: string) {
    const [row] = await this.db
      .select()
      .from(countries)
      .where(eq(countries.code, code.toUpperCase()))
      .limit(1);

    if (!row) {
      throw new DomainError('COUNTRY_NOT_FOUND', 'Country not found');
    }

    return { id: row.id, code: row.code, name: row.name, slug: row.slug };
  }

  async listTopics() {
    const rows = await this.db.select().from(topics).orderBy(asc(topics.name));
    return rows.map((row) => ({ id: row.id, slug: row.slug, name: row.name }));
  }

  async getTopicBySlug(slug: string) {
    const [row] = await this.db.select().from(topics).where(eq(topics.slug, slug)).limit(1);
    if (!row) {
      throw new DomainError('TOPIC_NOT_FOUND', 'Topic not found');
    }
    return { id: row.id, slug: row.slug, name: row.name };
  }

  async listEventSources(eventId: string) {
    await this.requirePublicEventById(eventId);

    const rows = await this.db
      .select({
        id: sources.id,
        name: sources.name,
        slug: sources.slug,
        type: sources.type,
        homepageUrl: sources.homepageUrl,
        articleTitle: articles.title,
        articleUrl: articles.url,
        publishedAt: articles.publishedAt,
      })
      .from(eventArticles)
      .innerJoin(articles, eq(articles.id, eventArticles.articleId))
      .innerJoin(sources, eq(sources.id, articles.sourceId))
      .where(eq(eventArticles.eventId, eventId));

    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      slug: row.slug,
      type: row.type,
      homepageUrl: row.homepageUrl,
      articleTitle: row.articleTitle,
      articleUrl: row.articleUrl,
      publishedAt: iso(row.publishedAt),
    }));
  }

  async listEventClaims(eventId: string) {
    await this.requirePublicEventById(eventId);

    const claimRows = await this.db
      .select()
      .from(claims)
      .where(and(eq(claims.eventId, eventId), eq(claims.status, 'APPROVED')))
      .orderBy(asc(claims.createdAt));

    const claimIds = claimRows.map((row) => row.id);
    const evidenceRows =
      claimIds.length === 0
        ? []
        : await this.db.select().from(evidence).where(inArray(evidence.claimId, claimIds));

    return claimRows.map((claim) => ({
      id: claim.id,
      statement: claim.statement,
      type: claim.type,
      status: claim.status,
      evidenceStrength: claim.evidenceStrength,
      sourceCount: claim.sourceCount,
      independentSourceCount: claim.independentSourceCount,
      officialSourceCount: claim.officialSourceCount,
      evidenceReason: claim.evidenceReason,
      evidence: evidenceRows
        .filter((item) => item.claimId === claim.id)
        .map((item) => ({
          id: item.id,
          url: item.url,
          excerpt: item.excerpt,
          publishedAt: iso(item.publishedAt),
        })),
    }));
  }

  async getEventImpact(eventId: string) {
    const event = await this.requirePublicEventById(eventId);

    const historyRows = await this.db
      .select({
        id: impactAssessments.id,
        version: impactAssessments.version,
        status: impactAssessments.status,
        overallLevel: impactAssessments.overallLevel,
        publishedAt: impactAssessments.publishedAt,
      })
      .from(impactAssessments)
      .where(eq(impactAssessments.eventId, eventId))
      .orderBy(asc(impactAssessments.version));

    const history = historyRows.map((row) => ({
      ...row,
      publishedAt: iso(row.publishedAt),
    }));

    if (!event.currentImpactAssessmentId) {
      return { current: null, history };
    }

    const [assessment] = await this.db
      .select()
      .from(impactAssessments)
      .where(eq(impactAssessments.id, event.currentImpactAssessmentId))
      .limit(1);

    if (!assessment) {
      return { current: null, history };
    }

    const categories = await this.db
      .select()
      .from(impactCategoryLevels)
      .where(eq(impactCategoryLevels.assessmentId, assessment.id));

    return {
      current: {
        id: assessment.id,
        version: assessment.version,
        status: assessment.status,
        overallLevel: assessment.overallLevel,
        reasoning: assessment.reasoning,
        evidenceStrength: assessment.evidenceStrength,
        analysisConfidence: assessment.analysisConfidence,
        modelName: assessment.modelName,
        promptVersion: assessment.promptVersion,
        publishedAt: iso(assessment.publishedAt),
        categories: categories.map((category) => ({
          category: category.category,
          level: category.level,
          reasoning: category.reasoning,
        })),
      },
      history,
    };
  }

  async listEventUpdates(eventId: string) {
    await this.requirePublicEventById(eventId);

    const rows = await this.db
      .select()
      .from(eventUpdates)
      .where(eq(eventUpdates.eventId, eventId))
      .orderBy(asc(eventUpdates.occurredAt));

    return rows.map((row) => ({
      id: row.id,
      occurredAt: iso(row.occurredAt),
      title: row.title,
      body: row.body,
      impactChange: row.impactChange,
    }));
  }

  private async hydrateList(rows: Array<typeof events.$inferSelect>) {
    const ids = rows.map((row) => row.id);
    if (ids.length === 0) {
      return [];
    }

    const assessmentIds = rows
      .map((row) => row.currentImpactAssessmentId)
      .filter((id): id is string => Boolean(id));

    const [countryRows, topicRows, assessmentRows, categoryRows] = await Promise.all([
      this.db
        .select({
          eventId: eventCountries.eventId,
          code: countries.code,
          name: countries.name,
          slug: countries.slug,
        })
        .from(eventCountries)
        .innerJoin(countries, eq(countries.id, eventCountries.countryId))
        .where(inArray(eventCountries.eventId, ids)),
      this.db
        .select({
          eventId: eventTopics.eventId,
          slug: topics.slug,
          name: topics.name,
        })
        .from(eventTopics)
        .innerJoin(topics, eq(topics.id, eventTopics.topicId))
        .where(inArray(eventTopics.eventId, ids)),
      assessmentIds.length === 0
        ? Promise.resolve([])
        : this.db
            .select()
            .from(impactAssessments)
            .where(inArray(impactAssessments.id, assessmentIds)),
      assessmentIds.length === 0
        ? Promise.resolve([])
        : this.db
            .select({
              assessmentId: impactCategoryLevels.assessmentId,
              category: impactCategoryLevels.category,
              level: impactCategoryLevels.level,
            })
            .from(impactCategoryLevels)
            .where(inArray(impactCategoryLevels.assessmentId, assessmentIds)),
    ]);

    const assessmentsById = new Map(assessmentRows.map((row) => [row.id, row]));
    const categoriesByAssessmentId = new Map<string, Array<(typeof categoryRows)[number]>>();

    for (const category of categoryRows) {
      const existing = categoriesByAssessmentId.get(category.assessmentId) ?? [];
      existing.push(category);
      categoriesByAssessmentId.set(category.assessmentId, existing);
    }

    return rows.map((event) => {
      const assessment = event.currentImpactAssessmentId
        ? assessmentsById.get(event.currentImpactAssessmentId)
        : undefined;

      return {
        id: event.id,
        slug: event.slug,
        title: event.title,
        summary: event.summary,
        status: event.status,
        importance: event.importance,
        occurredAt: iso(event.occurredAt),
        publishedAt: iso(event.publishedAt),
        updatedAt: iso(event.updatedAt),
        countries: countryRows
          .filter((row) => row.eventId === event.id)
          .map(({ code, name, slug }) => ({ code, name, slug })),
        topics: topicRows
          .filter((row) => row.eventId === event.id)
          .map(({ slug, name }) => ({ slug, name })),
        currentImpact: assessment
          ? {
              overallLevel: assessment.overallLevel,
              evidenceStrength: assessment.evidenceStrength,
              analysisConfidence: assessment.analysisConfidence,
              version: assessment.version,
              categories: (categoriesByAssessmentId.get(assessment.id) ?? []).map((category) => ({
                category: category.category,
                level: category.level,
              })),
            }
          : null,
      };
    });
  }

  private async hydrateDetail(event: typeof events.$inferSelect) {
    const [list] = await this.hydrateList([event]);
    if (!list) {
      throw new DomainError('EVENT_NOT_FOUND', 'Event not found');
    }
    const watches = await this.db
      .select()
      .from(watchItems)
      .where(eq(watchItems.eventId, event.id))
      .orderBy(asc(watchItems.sortOrder));

    return {
      ...list,
      description: event.description,
      eventType: event.eventType,
      watchItems: watches.map((item) => ({
        id: item.id,
        label: item.label,
        sortOrder: item.sortOrder,
      })),
    };
  }
}
