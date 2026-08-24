import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { ImpactCategory, ImpactLevel } from '@bharatlens/shared';
import {
  closeDatabase,
  createDatabase,
  EventCatalog,
  EventQueries,
  type DatabasePool,
} from '@bharatlens/database';

const databaseUrl = process.env.DATABASE_URL;

describe.skipIf(!databaseUrl)('analytics queries (postgres)', () => {
  let pool: DatabasePool;
  let catalog: EventCatalog;
  let queries: EventQueries;
  const suffix = randomUUID().slice(0, 6);
  const indiaId = { current: '' };

  beforeAll(async () => {
    pool = createDatabase(databaseUrl!);
    catalog = new EventCatalog(pool.db);
    queries = new EventQueries(pool.db);

    const [india] = (
      await pool.sql<[{ id: string }]>`select id from countries where code = 'IN' limit 1`
    ).map((row) => row);
    indiaId.current = india!.id;
  });

  afterAll(async () => {
    if (pool) {
      await pool.sql`delete from events where slug like ${'anl-%'}`;
      await pool.sql`delete from countries where slug like ${'anl-%'}`;
      await pool.sql`delete from topics where slug like ${'anl-%'}`;
      await closeDatabase(pool.sql);
    }
  });

  async function publishWithLevels(input: {
    slugTag: string;
    topicSlug?: string;
    countryCode?: string;
    levels: Array<{ category: ImpactCategory; level: ImpactLevel; reasoning: string }>;
    overallLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    daysAgoPublished?: number;
  }) {
    const topicIds = [];
    if (input.topicSlug) {
      const topic = await catalog.createTopic({
        slug: `${input.topicSlug}-${suffix}`,
        name: input.topicSlug,
      });
      topicIds.push(topic.id);
    }
    const countryIds = [];
    if (input.countryCode) {
      const country = await catalog.createCountry({
        code: `${input.countryCode[0]}${(input.countryCode.charCodeAt(1) + suffix.charCodeAt(0)) % 26}`
          .toUpperCase()
          .slice(0, 2),
        name: `ANL ${input.countryCode} ${suffix}`,
        slug: `anl-${input.countryCode.toLowerCase()}-${suffix}`,
      });
      countryIds.push(country.id);
    }

    const event = await catalog.createEvent({
      title: `Analytics fixture ${input.slugTag} ${suffix}`,
      slug: `anl-${input.slugTag}-${suffix}`,
      summary: undefined,
      topicIds,
      countryIds,
    });

    if (countryIds.length > 0 && indiaId.current) {
      await pool.sql`
        insert into event_countries (event_id, country_id)
        values (${event.id}, ${indiaId.current}) on conflict do nothing`;
    }

    await catalog.transitionEvent(event.id, 'DRAFT');
    await catalog.transitionEvent(event.id, 'ANALYZED');
    await catalog.transitionEvent(event.id, 'REVIEW_REQUIRED');
    await catalog.transitionEvent(event.id, 'PUBLISHED');

    const publishedAt =
      input.daysAgoPublished !== undefined
        ? new Date(Date.now() - input.daysAgoPublished * 86_400_000)
        : undefined;

    // createImpactAssessment publishes with now(); adjust afterwards so trend
    // windows can be tested deterministically.
    const assessment = await catalog.createImpactAssessment({
      eventId: event.id,
      overallLevel: input.overallLevel,
      reasoning: 'Fixture.',
      evidenceStrength: 'WEAK',
      analysisConfidence: 'LOW',
      status: 'PUBLISHED',
      categories: input.levels,
    });
    if (publishedAt) {
      await pool.sql`
        update impact_assessments set published_at = ${publishedAt.toISOString()}
        where id = ${assessment.id}`;
      await pool.sql`
        update events set published_at = ${publishedAt.toISOString()} where id = ${event.id}`;
    }
    void assessment;
    return event;
  }

  it('computes category exposure over current published assessments only', async () => {
    const before = new Map(
      (await queries.getCategoryExposure()).map((row) => [row.category, row.counts]),
    );

    await publishWithLevels({
      slugTag: 'exp1',
      levels: [
        { category: 'ENERGY', level: 'HIGH', reasoning: 'Fixture.' },
        { category: 'TRADE', level: 'MEDIUM', reasoning: 'Fixture.' },
      ],
      overallLevel: 'HIGH',
    });
    // Supersession happens WITHIN one event: v1 CRITICAL replaced by v2 LOW.
    const supersededEvent = await catalog.createEvent({
      title: `Analytics fixture exp2 ${suffix}`,
      slug: `anl-exp2-${suffix}`,
      summary: undefined,
    });
    await catalog.transitionEvent(supersededEvent.id, 'DRAFT');
    await catalog.transitionEvent(supersededEvent.id, 'ANALYZED');
    await catalog.transitionEvent(supersededEvent.id, 'REVIEW_REQUIRED');
    await catalog.transitionEvent(supersededEvent.id, 'PUBLISHED');
    const v1 = await catalog.createImpactAssessment({
      eventId: supersededEvent.id,
      overallLevel: 'CRITICAL',
      reasoning: 'Fixture.',
      evidenceStrength: 'WEAK',
      analysisConfidence: 'LOW',
      status: 'PUBLISHED',
      categories: [{ category: 'ECONOMY', level: 'CRITICAL', reasoning: 'Fixture.' }],
    });
    const v2 = await catalog.createImpactAssessment({
      eventId: supersededEvent.id,
      overallLevel: 'MEDIUM',
      reasoning: 'Fixture.',
      evidenceStrength: 'WEAK',
      analysisConfidence: 'LOW',
      status: 'PUBLISHED',
      categories: [{ category: 'ECONOMY', level: 'LOW', reasoning: 'Fixture.' }],
    });
    expect(v2.version).toBe(2);
    void v1;

    const after = new Map(
      (await queries.getCategoryExposure()).map((row) => [row.category, row.counts]),
    );
    const deltaOf = (category: ImpactCategory, level: ImpactLevel) =>
      (after.get(category)?.[level] ?? 0) - (before.get(category)?.[level] ?? 0);

    expect(deltaOf('ENERGY', 'HIGH')).toBe(1);
    expect(deltaOf('TRADE', 'MEDIUM')).toBe(1);
    // exp2's CRITICAL economy row is superseded by exp3's LOW (current pointer).
    expect(deltaOf('ECONOMY', 'LOW')).toBe(1);
    expect(deltaOf('ECONOMY', 'CRITICAL')).toBe(0);
    // Zero-filled categories stay present with untouched deltas.
    expect(after.get('DEFENCE')).toEqual({ LOW: 0, MEDIUM: 0, HIGH: 0, CRITICAL: 0 });
  });

  it('buckets the weekly trend and counts level transitions', async () => {
    // Upgrade then downgrade across three versions of one event.
    await publishWithLevels({
      slugTag: 'tr1',
      levels: [{ category: 'ENERGY', level: 'LOW', reasoning: 'Fixture.' }],
      overallLevel: 'MEDIUM',
      daysAgoPublished: 10,
    });
    await pool.sql`
      insert into impact_assessments (event_id, version, status, overall_level, reasoning, evidence_strength, analysis_confidence, published_at)
      select id, 2, 'PUBLISHED', 'HIGH', 'Fixture.', 'WEAK', 'LOW', now() - interval '5 days'
      from events where slug = ${`anl-tr1-${suffix}`}`;
    await pool.sql`
      insert into impact_assessments (event_id, version, status, overall_level, reasoning, evidence_strength, analysis_confidence, published_at)
      select id, 3, 'PUBLISHED', 'LOW', 'Fixture.', 'WEAK', 'LOW', now() - interval '2 days'
      from events where slug = ${`anl-tr1-${suffix}`}`;

    const trend = await queries.getImpactTrend(90);
    expect(trend.weeks.length).toBeGreaterThan(0);

    const totalNew = trend.weeks.reduce((sum, week) => sum + week.newAssessments, 0);
    expect(totalNew).toBeGreaterThanOrEqual(3);
    expect(trend.transitions.upgrades).toBeGreaterThanOrEqual(1);
    expect(trend.transitions.downgrades).toBeGreaterThanOrEqual(1);
  });

  it('computes topic and country movers against the prior window', async () => {
    const recentTopic = `movt-${suffix.slice(0, 4)}`;
    await publishWithLevels({
      slugTag: 'mv1',
      topicSlug: recentTopic,
      countryCode: 'JP',
      levels: [{ category: 'ENERGY', level: 'LOW', reasoning: 'Fixture.' }],
      overallLevel: 'LOW',
    });
    // Second recent event on the same topic via junction reuse.
    const second = await publishWithLevels({
      slugTag: 'mv2',
      levels: [{ category: 'TRADE', level: 'MEDIUM', reasoning: 'Fixture.' }],
      overallLevel: 'MEDIUM',
    });
    const [topicRow] = (
      await pool.sql<
        [{ id: string }]
      >`select id from topics where slug like ${`${recentTopic}%`} limit 1`
    ).map((row) => row);
    await pool.sql`
      insert into event_topics (event_id, topic_id) values (${second.id}, ${topicRow!.id})
      on conflict do nothing`;

    const topics = await queries.getTopicTrend(30);
    const ours = topics.find((entry) => entry.slug.startsWith(recentTopic));
    expect(ours).toBeDefined();
    expect(ours!.currentCount).toBe(2);
    expect(ours!.priorCount).toBe(0);
    expect(ours!.delta).toBe(2);

    const countries = await queries.getCountryMovers(30);
    const japan = countries.find((entry) => entry.name === `ANL JP ${suffix}`);
    expect(japan?.currentCount).toBe(1);
    // India itself never appears as a partner.
    expect(countries.some((entry) => entry.code === 'IN')).toBe(false);
  });
});
