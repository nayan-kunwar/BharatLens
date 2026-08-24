import {
  DomainError,
  EVENT_STATUSES,
  IMPACT_CATEGORIES,
  PUBLIC_EVENT_STATUSES,
  type EventStatus,
} from '@bharatlens/shared';
import { analysisRuns } from './schema/analysis.js';
import { alias } from 'drizzle-orm/pg-core';
import {
  and,
  asc,
  count,
  countDistinct,
  desc,
  eq,
  gte,
  ilike,
  inArray,
  isNotNull,
  max,
  ne,
  or,
  sql,
  type SQL,
} from 'drizzle-orm';
import type { Database } from './client.js';
import { articles } from './schema/articles.js';
import { impactChainEdges, impactChainNodes, impactChains } from './schema/chains.js';
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

export type EventSortField = 'occurredAt' | 'publishedAt' | 'updatedAt' | 'relevance';
export type SortDirection = 'asc' | 'desc';

/**
 * Full-text match with an ILIKE fallback so partial words ("hormu") still
 * resolve; ranked by ts_rank when the caller asks for relevance.
 */
function textMatchFilter(query: string): SQL {
  const pattern = `%${query}%`;
  const tsQuery = sql`websearch_to_tsquery('english', ${query})`;
  return or(
    sql`${events.searchVector} @@ ${tsQuery}`,
    ilike(events.title, pattern),
    ilike(events.summary, pattern),
  )!;
}

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
      filters.push(textMatchFilter(input.query));
    }

    const whereClause = and(...filters);
    const useRelevance = input.sort === 'relevance' && Boolean(input.query);
    const sortColumn = {
      occurredAt: events.occurredAt,
      publishedAt: events.publishedAt,
      updatedAt: events.updatedAt,
    }[input.sort === 'relevance' ? 'publishedAt' : input.sort];
    const orderBy = useRelevance
      ? desc(
          sql`ts_rank(${events.searchVector}, websearch_to_tsquery('english', ${input.query ?? ''}))`,
        )
      : input.order === 'asc'
        ? asc(sortColumn)
        : desc(sortColumn);
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
    return this.loadEventSourceRows(eventId);
  }

  private async loadEventSourceRows(eventId: string) {
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

    const assessmentRows = (
      await this.db
        .select()
        .from(impactAssessments)
        .where(
          and(eq(impactAssessments.eventId, eventId), eq(impactAssessments.status, 'PUBLISHED')),
        )
        .orderBy(asc(impactAssessments.version))
    ).filter((row) => row.status === 'PUBLISHED');

    const assessmentIds = assessmentRows.map((row) => row.id);
    const categoryRows =
      assessmentIds.length === 0
        ? []
        : await this.db
            .select()
            .from(impactCategoryLevels)
            .where(inArray(impactCategoryLevels.assessmentId, assessmentIds));

    const history = assessmentRows.map((assessment) => ({
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
      categories: categoryRows
        .filter((category) => category.assessmentId === assessment.id)
        .map((category) => ({
          category: category.category,
          level: category.level,
          reasoning: category.reasoning,
        })),
    }));

    const current =
      history.find((item) => item.id === event.currentImpactAssessmentId) ?? history.at(-1) ?? null;

    return { current, history };
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

  /**
   * Admin listing: every status, optional status filter and text search, plus
   * per-status counts so the review dashboard can render queue badges in one
   * round trip.
   */
  async listAdminEvents(input: {
    status?: EventStatus;
    page: number;
    limit: number;
    query?: string;
  }) {
    const filters = [];

    if (input.status) {
      filters.push(eq(events.status, input.status));
    }

    if (input.query) {
      filters.push(textMatchFilter(input.query));
    }

    const whereClause = filters.length > 0 ? and(...filters) : undefined;
    const offset = (input.page - 1) * input.limit;

    const [rows, [totalRow], countRows] = await Promise.all([
      this.db
        .select()
        .from(events)
        .where(whereClause)
        .orderBy(desc(events.updatedAt))
        .limit(input.limit)
        .offset(offset),
      this.db.select({ value: count() }).from(events).where(whereClause),
      this.db.select({ status: events.status, value: count() }).from(events).groupBy(events.status),
    ]);

    const items = await this.hydrateList(rows);

    const countsByStatus = Object.fromEntries(EVENT_STATUSES.map((status) => [status, 0]));
    for (const row of countRows) {
      countsByStatus[row.status] = Number(row.value);
    }

    return { items, total: Number(totalRow?.value ?? 0), countsByStatus };
  }

  /** Full admin detail: drafts, pending claims, runs — everything review needs. */
  async getAdminEventDetail(slug: string) {
    const [event] = await this.db.select().from(events).where(eq(events.slug, slug)).limit(1);
    if (!event) {
      throw new DomainError('EVENT_NOT_FOUND', 'Event not found');
    }

    const base = await this.hydrateDetail(event);

    const [claimRows, assessmentRows, runRows, chainRows] = await Promise.all([
      this.db
        .select()
        .from(claims)
        .where(eq(claims.eventId, event.id))
        .orderBy(asc(claims.createdAt)),
      this.db
        .select()
        .from(impactAssessments)
        .where(eq(impactAssessments.eventId, event.id))
        .orderBy(asc(impactAssessments.version)),
      this.db
        .select()
        .from(analysisRuns)
        .where(eq(analysisRuns.eventId, event.id))
        .orderBy(desc(analysisRuns.createdAt))
        .limit(20),
      this.db
        .select()
        .from(impactChains)
        .where(eq(impactChains.eventId, event.id))
        .orderBy(asc(impactChains.version)),
    ]);

    const claimIds = claimRows.map((row) => row.id);
    const assessmentIds = assessmentRows.map((row) => row.id);
    const chainIds = chainRows.map((row) => row.id);

    const [evidenceRows, categoryRows, chainNodeRows, chainEdgeRows] = await Promise.all([
      claimIds.length === 0
        ? Promise.resolve([])
        : this.db.select().from(evidence).where(inArray(evidence.claimId, claimIds)),
      assessmentIds.length === 0
        ? Promise.resolve([])
        : this.db
            .select()
            .from(impactCategoryLevels)
            .where(inArray(impactCategoryLevels.assessmentId, assessmentIds)),
      chainIds.length === 0
        ? Promise.resolve([])
        : this.db
            .select()
            .from(impactChainNodes)
            .where(inArray(impactChainNodes.chainId, chainIds)),
      chainIds.length === 0
        ? Promise.resolve([])
        : this.db
            .select()
            .from(impactChainEdges)
            .where(inArray(impactChainEdges.chainId, chainIds)),
    ]);

    return {
      ...base,
      sources: this.loadEventSourceRows(event.id),
      claims: claimRows.map((claim) => ({
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
      })),
      assessments: assessmentRows.map((assessment) => ({
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
        createdAt: iso(assessment.createdAt),
        categories: categoryRows
          .filter((category) => category.assessmentId === assessment.id)
          .map((category) => ({
            category: category.category,
            level: category.level,
            reasoning: category.reasoning,
          })),
      })),
      analysisRuns: runRows.map((run) => ({
        id: run.id,
        status: run.status,
        modelName: run.modelName,
        promptVersion: run.promptVersion,
        errorMessage: run.errorMessage,
        generatedAt: iso(run.generatedAt),
        reviewedAt: iso(run.reviewedAt),
        reviewedBy: run.reviewedBy,
        createdAt: iso(run.createdAt),
      })),
      chains: chainRows.map((chain) => ({
        id: chain.id,
        version: chain.version,
        status: chain.status,
        reasoning: chain.reasoning,
        modelName: chain.modelName,
        promptVersion: chain.promptVersion,
        publishedAt: iso(chain.publishedAt),
        createdAt: iso(chain.createdAt),
        nodes: chainNodeRows
          .filter((node) => node.chainId === chain.id)
          .sort((a, b) => a.sortOrder - b.sortOrder)
          .map((node) => ({
            id: node.id,
            kind: node.kind,
            label: node.label,
            description: node.description,
            category: node.category,
            sortOrder: node.sortOrder,
          })),
        edges: chainEdgeRows
          .filter((edge) => edge.chainId === chain.id)
          .map((edge) => ({
            id: edge.id,
            fromNodeId: edge.fromNodeId,
            toNodeId: edge.toNodeId,
          })),
      })),
    };
  }

  /**
   * Published chain snapshots for the public event page — mirrors
   * getEventImpact's {current, history} shape. Drafts never appear here.
   */
  async getEventChain(eventId: string) {
    const [event] = await this.db
      .select({ id: events.id, currentChainId: events.currentImpactChainId })
      .from(events)
      .where(eq(events.id, eventId))
      .limit(1);
    if (!event) {
      throw new DomainError('EVENT_NOT_FOUND', 'Event not found');
    }

    const chainRows = await this.db
      .select()
      .from(impactChains)
      .where(and(eq(impactChains.eventId, eventId), eq(impactChains.status, 'PUBLISHED')))
      .orderBy(asc(impactChains.version));

    const chainIds = chainRows.map((row) => row.id);
    const [nodeRows, edgeRows] = await Promise.all([
      chainIds.length === 0
        ? Promise.resolve([])
        : this.db
            .select()
            .from(impactChainNodes)
            .where(inArray(impactChainNodes.chainId, chainIds)),
      chainIds.length === 0
        ? Promise.resolve([])
        : this.db
            .select()
            .from(impactChainEdges)
            .where(inArray(impactChainEdges.chainId, chainIds)),
    ]);

    const history = chainRows.map((chain) => ({
      id: chain.id,
      version: chain.version,
      status: chain.status,
      reasoning: chain.reasoning,
      modelName: chain.modelName,
      promptVersion: chain.promptVersion,
      publishedAt: iso(chain.publishedAt),
      nodes: nodeRows
        .filter((node) => node.chainId === chain.id)
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((node) => ({
          id: node.id,
          kind: node.kind,
          label: node.label,
          description: node.description,
          category: node.category,
        })),
      edges: edgeRows
        .filter((edge) => edge.chainId === chain.id)
        .map((edge) => ({ id: edge.id, fromNodeId: edge.fromNodeId, toNodeId: edge.toNodeId })),
    }));

    const current =
      history.find((item) => item.id === event.currentChainId) ?? history.at(-1) ?? null;

    return { current, history };
  }

  async listRecentAnalysisRuns(limit = 10) {
    const rows = await this.db
      .select({
        id: analysisRuns.id,
        eventId: analysisRuns.eventId,
        eventSlug: events.slug,
        eventTitle: events.title,
        status: analysisRuns.status,
        modelName: analysisRuns.modelName,
        promptVersion: analysisRuns.promptVersion,
        errorMessage: analysisRuns.errorMessage,
        createdAt: analysisRuns.createdAt,
      })
      .from(analysisRuns)
      .innerJoin(events, eq(events.id, analysisRuns.eventId))
      .orderBy(desc(analysisRuns.createdAt))
      .limit(limit);

    return rows.map((row) => ({ ...row, createdAt: iso(row.createdAt) }));
  }

  /**
   * India-centered partner overview for the M13 map: every country sharing at
   * least one PUBLISHED/UPDATED event with India, with plain counts and the
   * latest shared timestamp. Derived from published records only — no curated
   * or subjective relationship data exists.
   */
  async getIndiaMapOverview() {
    const india = alias(countries, 'india');
    const partner = alias(countries, 'partner');
    const ecIndia = alias(eventCountries, 'ec_india');
    const ecPartner = alias(eventCountries, 'ec_partner');

    const rows = await this.db
      .select({
        code: partner.code,
        name: partner.name,
        eventCount: countDistinct(ecIndia.eventId),
        lastSharedAt: max(events.updatedAt),
      })
      .from(ecIndia)
      .innerJoin(india, eq(india.id, ecIndia.countryId))
      .innerJoin(
        ecPartner,
        and(eq(ecPartner.eventId, ecIndia.eventId), ne(ecPartner.countryId, ecIndia.countryId)),
      )
      .innerJoin(partner, eq(partner.id, ecPartner.countryId))
      .innerJoin(events, eq(events.id, ecIndia.eventId))
      .where(and(eq(india.code, 'IN'), inArray(events.status, [...PUBLIC_EVENT_STATUSES])))
      .groupBy(partner.code, partner.name)
      .orderBy(desc(countDistinct(ecIndia.eventId)));

    return rows.map((row) => ({
      code: row.code,
      name: row.name,
      eventCount: Number(row.eventCount),
      lastSharedAt: iso(row.lastSharedAt),
    }));
  }

  // --- Analytics (M14) ---

  /**
   * Level distribution per category across the CURRENT published assessment
   * of every public event. Ordinal levels are reported as counts, never
   * averaged — an "average impact score" would invent precision.
   */
  async getCategoryExposure() {
    const rows = await this.db
      .select({
        category: impactCategoryLevels.category,
        level: impactCategoryLevels.level,
        count: count(),
      })
      .from(impactCategoryLevels)
      .innerJoin(impactAssessments, eq(impactAssessments.id, impactCategoryLevels.assessmentId))
      .innerJoin(events, eq(events.currentImpactAssessmentId, impactAssessments.id))
      .where(
        and(
          inArray(events.status, [...PUBLIC_EVENT_STATUSES]),
          eq(impactAssessments.status, 'PUBLISHED'),
        ),
      )
      .groupBy(impactCategoryLevels.category, impactCategoryLevels.level);

    const byCategory = new Map<
      string,
      { LOW: number; MEDIUM: number; HIGH: number; CRITICAL: number }
    >();
    for (const row of rows) {
      const entry = byCategory.get(row.category) ?? { LOW: 0, MEDIUM: 0, HIGH: 0, CRITICAL: 0 };
      entry[row.level] += Number(row.count);
      byCategory.set(row.category, entry);
    }

    return IMPACT_CATEGORIES.map((category) => ({
      category,
      counts: byCategory.get(category) ?? { LOW: 0, MEDIUM: 0, HIGH: 0, CRITICAL: 0 },
    }));
  }

  /**
   * Weekly publication trend for published assessments on public events, plus
   * upgrade/downgrade counts between consecutive versions. PostgreSQL compares
   * the level enum in declaration order (LOW < MEDIUM < HIGH < CRITICAL).
   */
  async getImpactTrend(days: number) {
    const window = sql`make_interval(days => ${days})`;

    const weekRows = await this.db
      .select({
        week: sql<string>`date_trunc('week', ${impactAssessments.publishedAt})`,
        newAssessments: count(),
        highPlus: sql<number>`count(*) filter (where ${impactAssessments.overallLevel} in ('HIGH','CRITICAL'))`,
      })
      .from(impactAssessments)
      .innerJoin(
        events,
        and(
          eq(events.id, impactAssessments.eventId),
          inArray(events.status, [...PUBLIC_EVENT_STATUSES]),
        ),
      )
      .where(
        and(
          eq(impactAssessments.status, 'PUBLISHED'),
          isNotNull(impactAssessments.publishedAt),
          gte(impactAssessments.publishedAt, sql`now() - ${window}`),
        ),
      )
      .groupBy(sql`date_trunc('week', ${impactAssessments.publishedAt})`)
      .orderBy(sql`date_trunc('week', ${impactAssessments.publishedAt})`);

    const transitionRows = await this.db.execute<{ upgrades: string; downgrades: string }>(sql`
      with ranked as (
        select overall_level,
               lag(overall_level) over (partition by event_id order by published_at) as previous_level
        from impact_assessments
        where status = 'PUBLISHED' and published_at is not null
          and event_id in (select id from events where status in ('PUBLISHED','UPDATED'))
          and published_at >= now() - make_interval(days => ${days})
      )
      select
        count(*) filter (where previous_level < overall_level)::text as upgrades,
        count(*) filter (where previous_level > overall_level)::text as downgrades
      from ranked
      where previous_level is not null
    `);
    const transitionRow = transitionRows[0];

    return {
      weeks: weekRows.map((row) => ({
        week: new Date(row.week).toISOString().slice(0, 10),
        newAssessments: Number(row.newAssessments),
        highPlus: Number(row.highPlus),
      })),
      transitions: {
        upgrades: Number(transitionRow?.upgrades ?? 0),
        downgrades: Number(transitionRow?.downgrades ?? 0),
      },
    };
  }

  /** Events-per-topic inside the window vs the preceding window of equal length. */
  async getTopicTrend(days: number) {
    const rows = await this.db.execute<{
      slug: string;
      name: string;
      current_count: string;
      prior_count: string;
    }>(sql`
      with windowed as (
        select t.slug, t.name, e.id,
          case when e.published_at >= now() - make_interval(days => ${days}) then 'current' else 'prior' end as bucket
        from event_topics et
        join topics t on t.id = et.topic_id
        join events e on e.id = et.event_id
        where e.status in ('PUBLISHED','UPDATED') and e.published_at is not null
          and e.published_at >= now() - make_interval(days => ${days * 2})
          and e.published_at < now() - make_interval(days => 0)
      )
      select slug, name,
        count(*) filter (where bucket = 'current')::text as current_count,
        count(*) filter (where bucket = 'prior')::text as prior_count
      from windowed group by slug, name
    `);

    return rows
      .map((row) => ({
        slug: row.slug,
        name: row.name,
        currentCount: Number(row.current_count),
        priorCount: Number(row.prior_count),
        delta: Number(row.current_count) - Number(row.prior_count),
      }))
      .sort((a, b) => b.delta - a.delta || b.currentCount - a.currentCount);
  }

  /** Same mover math as topics, per country (excluding India itself). */
  async getCountryMovers(days: number) {
    const rows = await this.db.execute<{
      code: string;
      name: string;
      current_count: string;
      prior_count: string;
    }>(sql`
      with windowed as (
        select c.code, c.name, e.id,
          case when e.published_at >= now() - make_interval(days => ${days}) then 'current' else 'prior' end as bucket
        from event_countries ec
        join countries c on c.id = ec.country_id and c.code <> 'IN'
        join events e on e.id = ec.event_id
        where e.status in ('PUBLISHED','UPDATED') and e.published_at is not null
          and e.published_at >= now() - make_interval(days => ${days * 2})
      )
      select code, name,
        count(*) filter (where bucket = 'current')::text as current_count,
        count(*) filter (where bucket = 'prior')::text as prior_count
      from windowed group by code, name
    `);

    return rows
      .map((row) => ({
        code: row.code,
        name: row.name,
        currentCount: Number(row.current_count),
        priorCount: Number(row.prior_count),
        delta: Number(row.current_count) - Number(row.prior_count),
      }))
      .sort((a, b) => b.delta - a.delta || b.currentCount - a.currentCount);
  }

  /**
   * Admin pipeline health: daily ingestion funnel plus analysis-run outcomes.
   * Derived from the existing audit tables; no counters of its own.
   */
  async getPipelineHealth(days: number) {
    const funnelRows = await this.db.execute<{
      day: string;
      seen: number;
      inserted: number;
      duplicates: number;
      rejected: number;
      failures: number;
    }>(sql`
      select started_at::date::text as day,
             coalesce(sum(items_seen), 0)::int as seen,
             coalesce(sum(items_inserted), 0)::int as inserted,
             coalesce(sum(items_duplicate), 0)::int as duplicates,
             coalesce(sum(items_rejected), 0)::int as rejected,
             count(*) filter (where status = 'FAILED')::int as failures
      from ingestion_jobs
      where started_at >= now() - make_interval(days => ${days})
      group by 1 order by 1
    `);

    const analysisRows = await this.db.execute<{
      model_name: string;
      status: string;
      runs: number;
    }>(sql`
      select model_name, status, count(*)::int as runs
      from analysis_runs
      where created_at >= now() - make_interval(days => ${days})
      group by 1, 2 order by 1, 2
    `);

    return {
      funnel: funnelRows.map((row) => ({
        day: row.day,
        seen: Number(row.seen),
        inserted: Number(row.inserted),
        duplicates: Number(row.duplicates),
        rejected: Number(row.rejected),
        failures: Number(row.failures),
      })),
      analysis: analysisRows.map((row) => ({
        modelName: row.model_name,
        status: row.status,
        runs: Number(row.runs),
      })),
    };
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
