import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  closeDatabase,
  createDatabase,
  EventCatalog,
  type DatabasePool,
} from '@bharatlens/database';
import { analyzeEvent } from './pipeline.js';
import { DeterministicAnalysisModel } from './provider.js';
import type { AnalysisModel } from './provider.js';

const databaseUrl = process.env.DATABASE_URL;

class ScriptedModel implements AnalysisModel {
  readonly name = 'scripted-test';

  constructor(private readonly body: string) {}

  async complete(): Promise<string> {
    return this.body;
  }
}

describe.skipIf(!databaseUrl)('analyzeEvent (postgres)', () => {
  let pool: DatabasePool;
  let catalog: EventCatalog;

  beforeAll(() => {
    pool = createDatabase(databaseUrl!);
    catalog = new EventCatalog(pool.db);
  });

  afterAll(async () => {
    await closeDatabase(pool.sql);
  });

  it('stores a draft assessment and analysis run without publishing', async () => {
    const suffix = randomUUID().slice(0, 8);
    const source = await catalog.createSource({
      name: `Agency ${suffix}`,
      slug: `agency-ai-${suffix}`,
      type: 'NEWS_AGENCY',
    });
    const event = await catalog.createEvent({
      title: 'Strait of Hormuz shipping disruption',
      slug: `analyze-hormuz-${suffix}`,
      summary: 'Maritime disruption reported near Hormuz affecting crude shipping.',
    });
    const article = await catalog.createArticle({
      sourceId: source.id,
      title: 'Hormuz shipping disruption',
      url: `https://example.test/ai-${suffix}`,
      summary: 'Disruption near the strait.',
    });
    await catalog.attachArticle(event.id, article.id);
    await catalog.addClaim({
      eventId: event.id,
      statement: 'Shipping near Hormuz was disrupted.',
      type: 'UNKNOWN',
      status: 'PENDING',
    });

    const first = await analyzeEvent({
      catalog,
      eventSlug: event.slug,
      model: new DeterministicAnalysisModel(),
    });
    const second = await analyzeEvent({
      catalog,
      eventSlug: event.slug,
      model: new DeterministicAnalysisModel(),
    });

    expect(first.status).toBe('SUCCEEDED');
    expect(second.status).toBe('SUCCEEDED');
    expect(first.assessmentVersion).toBe(1);
    expect(second.assessmentVersion).toBe(2);
    expect(first.eventStatus).toBe('REVIEW_REQUIRED');
    expect(second.eventStatus).toBe('REVIEW_REQUIRED');

    const after = await catalog.loadAnalysisContext(event.id);

    expect(after.event.currentImpactAssessmentId).toBeNull();
    expect(after.event.status).toBe('REVIEW_REQUIRED');
    expect(after.event.eventType).toBeTruthy();
  });

  it('records FAILED when the model invents a URL and does not add an assessment', async () => {
    const suffix = randomUUID().slice(0, 8);
    const event = await catalog.createEvent({
      title: 'Unrelated diplomatic note',
      slug: `analyze-fail-${suffix}`,
      summary: 'A brief diplomatic note with no linked articles.',
    });

    const result = await analyzeEvent({
      catalog,
      eventSlug: event.slug,
      model: new ScriptedModel(
        JSON.stringify({
          eventType: 'DIPLOMACY',
          indiaRelevant: false,
          indiaRelevanceReason: 'Not enough evidence.',
          entities: [],
          summary: 'See https://invented.example/not-real for details.',
          whyItHappened: 'UNKNOWN',
          whyIndiaCares: 'UNKNOWN',
          claims: [],
          indiaImpact: {
            overallLevel: 'LOW',
            analysisConfidence: 'LOW',
            reasoning: 'Insufficient evidence.',
            categories: [
              { category: 'DIPLOMACY', level: 'LOW', reasoning: 'Insufficient evidence.' },
            ],
          },
          watchNext: ['Primary sources'],
        }),
      ),
    });

    expect(result.status).toBe('FAILED');
    expect(result.assessmentId).toBeUndefined();
    expect(result.errorMessage).toMatch(/not in the source set/);
  });
});
