import { and, eq } from 'drizzle-orm';
import { closeDatabase, createDatabase } from './client.js';
import { EventCatalog } from './catalog.js';
import { countries } from './schema/countries.js';
import { eventUpdates, events, impactAssessments } from './schema/events.js';
import { topics } from './schema/topics.js';

const HORMUZ_SLUG = 'strait-of-hormuz-shipping-disruption';
const LNG_SLUG = 'india-lng-import-exposure';

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error('DATABASE_URL is required to seed the database');
}

const { db, sql } = createDatabase(databaseUrl);
const catalog = new EventCatalog(db);

async function ensureCountry(input: { code: string; name: string; slug: string }) {
  const code = input.code.toUpperCase();
  const [existing] = await db.select().from(countries).where(eq(countries.code, code)).limit(1);
  if (existing) {
    return existing;
  }
  return catalog.createCountry({ ...input, code });
}

async function ensureTopic(input: { slug: string; name: string }) {
  const [existing] = await db.select().from(topics).where(eq(topics.slug, input.slug)).limit(1);
  if (existing) {
    return existing;
  }
  return catalog.createTopic(input);
}

async function getEventBySlug(slug: string) {
  const [existing] = await db.select().from(events).where(eq(events.slug, slug)).limit(1);
  return existing ?? null;
}

async function publishEvent(eventId: string) {
  await catalog.transitionEvent(eventId, 'DRAFT');
  await catalog.transitionEvent(eventId, 'ANALYZED');
  await catalog.transitionEvent(eventId, 'REVIEW_REQUIRED');
  await catalog.transitionEvent(eventId, 'PUBLISHED');
}

async function ensureUpdates(
  eventId: string,
  updates: Array<{ title: string; occurredAt: Date; body: string; impactChange?: string }>,
) {
  const existing = await db
    .select({ title: eventUpdates.title })
    .from(eventUpdates)
    .where(eq(eventUpdates.eventId, eventId));
  const titles = new Set(existing.map((row) => row.title));

  for (const update of updates) {
    if (titles.has(update.title)) {
      continue;
    }
    await catalog.addUpdate({
      eventId,
      title: update.title,
      occurredAt: update.occurredAt,
      body: update.body,
      impactChange: update.impactChange,
    });
  }
}

async function publishedAssessmentCount(eventId: string) {
  const rows = await db
    .select({ id: impactAssessments.id })
    .from(impactAssessments)
    .where(and(eq(impactAssessments.eventId, eventId), eq(impactAssessments.status, 'PUBLISHED')));
  return rows.length;
}

async function seedHormuz(ids: {
  indiaId: string;
  iranId: string;
  usaId: string;
  energyId: string;
  maritimeId: string;
  tradeId: string;
}) {
  let event = await getEventBySlug(HORMUZ_SLUG);

  if (!event) {
    event = await catalog.createEvent({
      title: 'Strait of Hormuz shipping disruption',
      slug: HORMUZ_SLUG,
      summary:
        'Reported disruption to commercial shipping through a chokepoint that carries a large share of seaborne crude. This is a hand-authored example, not live news.',
      description:
        'Commercial shipping through the Strait of Hormuz has been reported as disrupted. The strait is a major route for seaborne crude oil and related energy cargoes. BharatLens is treating this as a candidate situation for India-focused context: energy import costs, freight, and follow-on inflation pressure — not as a prediction of conflict outcomes.',
      importance: 'HIGH',
      occurredAt: new Date('2026-08-20T00:00:00.000Z'),
      countryIds: [ids.indiaId, ids.iranId, ids.usaId],
      topicIds: [ids.energyId, ids.maritimeId, ids.tradeId],
    });

    await catalog.addClaim({
      eventId: event.id,
      statement:
        'The Strait of Hormuz is a maritime chokepoint used by a substantial share of global seaborne crude shipments.',
      type: 'ANALYSIS',
      status: 'APPROVED',
    });
    await catalog.addClaim({
      eventId: event.id,
      statement:
        'A prolonged disruption could raise India’s energy import bill if alternative routes or cargoes cost more.',
      type: 'ANALYSIS',
      status: 'APPROVED',
    });
    await catalog.addClaim({
      eventId: event.id,
      statement:
        'If disruption lasted several months, inflationary pressure in India could become more significant through energy and freight costs.',
      type: 'SCENARIO',
      status: 'APPROVED',
    });
    await catalog.addClaim({
      eventId: event.id,
      statement: 'The duration of any disruption is not established in this hand-authored example.',
      type: 'UNKNOWN',
      status: 'APPROVED',
    });

    await publishEvent(event.id);

    await catalog.createImpactAssessment({
      eventId: event.id,
      overallLevel: 'HIGH',
      reasoning:
        'India imports a large share of its crude oil. Disruption on this route is an exposure and cost question, not a statement that any outcome is certain.',
      evidenceStrength: 'WEAK',
      analysisConfidence: 'MEDIUM',
      status: 'PUBLISHED',
      promptVersion: 'hand-authored-m4',
      publishedAt: new Date('2026-08-20T12:00:00.000Z'),
      categories: [
        {
          category: 'ENERGY',
          level: 'HIGH',
          reasoning: 'Seaborne crude and related cargoes may face delay or higher freight.',
        },
        {
          category: 'TRADE',
          level: 'HIGH',
          reasoning:
            'Shipping disruption can raise transportation costs for energy and other cargoes.',
        },
        {
          category: 'ECONOMY',
          level: 'MEDIUM',
          reasoning: 'Higher energy costs can feed into inflation and the import bill.',
        },
        {
          category: 'SECURITY',
          level: 'MEDIUM',
          reasoning:
            'Regional instability can affect India’s strategic environment without implying a specific military outcome.',
        },
        {
          category: 'DIPLOMACY',
          level: 'MEDIUM',
          reasoning:
            'India may need to manage relationships with several energy producers and transit partners.',
        },
        {
          category: 'SUPPLY_CHAIN',
          level: 'MEDIUM',
          reasoning: 'Freight disruption can cascade into delayed industrial inputs.',
        },
      ],
    });

    await catalog.addWatchItem(event.id, 'Reported shipping traffic through the strait', 0);
    await catalog.addWatchItem(event.id, 'Crude prices and freight rates', 1);
    await catalog.addWatchItem(
      event.id,
      'Official statements from energy importers and producers',
      2,
    );
    await catalog.addWatchItem(
      event.id,
      'India’s crude import mix and alternative supply notices',
      3,
    );
  }

  if ((await publishedAssessmentCount(event.id)) < 2) {
    await catalog.createImpactAssessment({
      eventId: event.id,
      overallLevel: 'MEDIUM',
      reasoning:
        'A prolonged closure has not been established. Import-route exposure remains, but this version steps the overall assessment down while the situation is still uncertain.',
      evidenceStrength: 'WEAK',
      analysisConfidence: 'MEDIUM',
      status: 'PUBLISHED',
      promptVersion: 'hand-authored-m4',
      publishedAt: new Date('2026-08-23T00:00:00.000Z'),
      categories: [
        {
          category: 'ENERGY',
          level: 'MEDIUM',
          reasoning: 'Alternative routing and inventory can reduce immediate import-cost pressure.',
        },
        {
          category: 'TRADE',
          level: 'MEDIUM',
          reasoning: 'Freight risk remains, but a lasting chokepoint closure is not established.',
        },
        {
          category: 'ECONOMY',
          level: 'LOW',
          reasoning: 'Pass-through to inflation is not shown for this shorter disruption window.',
        },
        {
          category: 'SECURITY',
          level: 'MEDIUM',
          reasoning: 'Regional instability can still affect India’s strategic environment.',
        },
        {
          category: 'DIPLOMACY',
          level: 'MEDIUM',
          reasoning: 'India may still need to manage relationships with several energy partners.',
        },
        {
          category: 'SUPPLY_CHAIN',
          level: 'LOW',
          reasoning: 'Cascading industrial delays are less likely if disruption is brief.',
        },
      ],
    });
  }

  await ensureUpdates(event.id, [
    {
      title: 'Initial disruption reports',
      occurredAt: new Date('2026-08-20T00:00:00.000Z'),
      body: 'Public reporting described interruption to commercial shipping in the strait.',
    },
    {
      title: 'Energy transportation risk highlighted',
      occurredAt: new Date('2026-08-21T00:00:00.000Z'),
      body: 'Follow-on coverage focused on crude transportation risk rather than a confirmed long-term closure.',
      impactChange: 'Energy exposure remained HIGH in v1.',
    },
    {
      title: 'Alternative routing discussed',
      occurredAt: new Date('2026-08-22T00:00:00.000Z'),
      body: 'Reporting discussed possible alternative routing and inventory buffers. Duration of disruption remained unknown.',
    },
    {
      title: 'No confirmed prolonged closure',
      occurredAt: new Date('2026-08-23T00:00:00.000Z'),
      body: 'This hand-authored example treats a prolonged closure as unestablished, which is why the later assessment is MEDIUM rather than HIGH.',
      impactChange: 'Overall India Impact HIGH → MEDIUM in v2.',
    },
  ]);
}

async function seedLngExposure(ids: {
  indiaId: string;
  uaeId: string;
  energyId: string;
  tradeId: string;
}) {
  let event = await getEventBySlug(LNG_SLUG);

  if (!event) {
    event = await catalog.createEvent({
      title: 'India LNG import exposure',
      slug: LNG_SLUG,
      summary:
        'Standing context on India’s liquefied natural gas import dependence. Hand-authored for the public UI, not a breaking-news item.',
      description:
        'India uses imported LNG as part of its energy mix. Prices and shipping availability can move with global gas markets. This event exists so the public interface can show a second published record with a lower overall India Impact than the Hormuz example.',
      importance: 'MEDIUM',
      occurredAt: new Date('2026-08-01T00:00:00.000Z'),
      countryIds: [ids.indiaId, ids.uaeId],
      topicIds: [ids.energyId, ids.tradeId],
    });

    await catalog.addClaim({
      eventId: event.id,
      statement: 'India imports LNG as part of its energy supply mix.',
      type: 'ANALYSIS',
      status: 'APPROVED',
    });
    await catalog.addClaim({
      eventId: event.id,
      statement:
        'How much a given global gas-price move would change Indian consumer prices in a specific month is not established here.',
      type: 'UNKNOWN',
      status: 'APPROVED',
    });

    await publishEvent(event.id);

    await catalog.createImpactAssessment({
      eventId: event.id,
      overallLevel: 'MEDIUM',
      reasoning:
        'Imported gas is a real exposure for India, but this record is background context rather than a claim of an acute crisis.',
      evidenceStrength: 'WEAK',
      analysisConfidence: 'MEDIUM',
      status: 'PUBLISHED',
      promptVersion: 'hand-authored-m4',
      publishedAt: new Date('2026-08-01T00:00:00.000Z'),
      categories: [
        {
          category: 'ENERGY',
          level: 'MEDIUM',
          reasoning: 'LNG import prices can move with global gas markets.',
        },
        {
          category: 'TRADE',
          level: 'MEDIUM',
          reasoning: 'Spot cargo availability and freight affect landed cost.',
        },
        {
          category: 'ECONOMY',
          level: 'LOW',
          reasoning:
            'Pass-through to inflation depends on contracts, subsidies, and the wider energy mix.',
        },
        {
          category: 'SECURITY',
          level: 'LOW',
          reasoning: 'This record does not describe a security incident.',
        },
      ],
    });

    await catalog.addWatchItem(event.id, 'Asian LNG spot prices', 0);
    await catalog.addWatchItem(event.id, 'Indian LNG terminal utilization notices', 1);
  }

  await ensureUpdates(event.id, [
    {
      title: 'Standing watch on LNG import prices',
      occurredAt: new Date('2026-08-01T00:00:00.000Z'),
      body: 'This record is background context. It does not claim a specific price spike on this date.',
    },
  ]);
}

try {
  const india = await ensureCountry({ code: 'IN', name: 'India', slug: 'india' });
  const iran = await ensureCountry({ code: 'IR', name: 'Iran', slug: 'iran' });
  const usa = await ensureCountry({ code: 'US', name: 'United States', slug: 'united-states' });
  const uae = await ensureCountry({
    code: 'AE',
    name: 'United Arab Emirates',
    slug: 'united-arab-emirates',
  });
  await ensureCountry({ code: 'SA', name: 'Saudi Arabia', slug: 'saudi-arabia' });
  await ensureCountry({ code: 'CN', name: 'China', slug: 'china' });

  const energy = await ensureTopic({ slug: 'energy', name: 'Energy' });
  const maritime = await ensureTopic({ slug: 'maritime', name: 'Maritime' });
  const trade = await ensureTopic({ slug: 'trade', name: 'Trade' });
  await ensureTopic({ slug: 'diplomacy', name: 'Diplomacy' });
  await ensureTopic({ slug: 'security', name: 'Security' });

  await seedHormuz({
    indiaId: india.id,
    iranId: iran.id,
    usaId: usa.id,
    energyId: energy.id,
    maritimeId: maritime.id,
    tradeId: trade.id,
  });
  await seedLngExposure({
    indiaId: india.id,
    uaeId: uae.id,
    energyId: energy.id,
    tradeId: trade.id,
  });

  console.log('Seed complete. Published example events are ready for the public UI.');
} finally {
  await closeDatabase(sql);
}
