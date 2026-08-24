import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { DomainError, ErrorCode, ok } from '@bharatlens/shared';
import type { EventCatalog, EventQueries } from '@bharatlens/database';
import type { AnalysisJobPayload, IngestJobPayload } from '@bharatlens/jobs';
import { enqueueAnalysis, enqueueIngest } from '@bharatlens/jobs';
import type { JobsQueue } from '../../types.js';
import {
  adminCreateEventSchema,
  adminEventListQuerySchema,
  adminUpdateEventSchema,
  analysisRunReviewBodySchema,
  chainDraftSchema,
  claimReviewBodySchema,
  draftAssessmentPatchSchema,
  loginBodySchema,
  paginationMeta,
  parseWithSchema,
  slugParamsSchema,
  slugify,
  uuidParamsSchema,
} from '../../http/validation.js';
import type { AdminAuth } from './auth.js';

/** Audit label stamped on reviews performed through the console. */
const CONSOLE_REVIEWER = 'admin-console';

export type AdminRouteDeps = {
  catalog: EventCatalog;
  queries: EventQueries;
  auth: AdminAuth;
  analysisQueue: JobsQueue<AnalysisJobPayload>;
  ingestQueue: JobsQueue<IngestJobPayload>;
  claimsQueue: JobsQueue<{ eventSlug: string }>;
};

/**
 * Login and logout are registered separately because everything else under
 * /admin requires the session cookie guard.
 */
export const adminAuthRoutes: FastifyPluginAsync<{ auth: AdminAuth }> = async (app, opts) => {
  app.post(
    '/auth/login',
    { config: { rateLimit: { max: 10, timeWindow: '1 minute' } } },
    async (request, reply) => {
      const body = parseWithSchema(loginBodySchema, request.body);

      if (!opts.auth.verifyPassword(body.password)) {
        throw new DomainError(ErrorCode.INVALID_CREDENTIALS, 'Invalid admin password');
      }

      const session = opts.auth.issueSession();
      opts.auth.setSessionCookie(reply, session.token, session.expiresAt);
      return ok({ authenticated: true, expiresAt: session.expiresAt.toISOString() });
    },
  );

  app.post('/auth/logout', async (_request, reply) => {
    opts.auth.clearSessionCookie(reply);
    return ok({ authenticated: false });
  });
};

export const adminApiRoutes: FastifyPluginAsync<AdminRouteDeps> = async (app, opts) => {
  const { catalog, queries, auth, analysisQueue, ingestQueue, claimsQueue } = opts;

  app.addHook('preHandler', (request, _reply, done) => {
    try {
      auth.requireAdmin(request);
      done();
    } catch (error) {
      done(error instanceof Error ? error : new Error('Unauthorized'));
    }
  });

  app.get('/overview', async () => {
    const [{ countsByStatus }, recentRuns, queueDepth] = await Promise.all([
      queries.listAdminEvents({ page: 1, limit: 1 }),
      queries.listRecentAnalysisRuns(10),
      Promise.all(
        [ingestQueue, claimsQueue, analysisQueue].map(async (queue) => ({
          name: queue.name,
          counts: await queue.getJobCounts('waiting', 'active', 'completed', 'failed'),
        })),
      ),
    ]);

    return ok({
      countsByStatus,
      reviewQueue: countsByStatus.REVIEW_REQUIRED ?? 0,
      candidates: countsByStatus.CANDIDATE ?? 0,
      recentAnalysisRuns: recentRuns,
      queues: queueDepth,
    });
  });

  app.get('/events', async (request) => {
    const query = parseWithSchema(adminEventListQuerySchema, request.query);
    const { items, total, countsByStatus } = await queries.listAdminEvents({
      status: query.status,
      page: query.page,
      limit: query.limit,
      query: query.q,
    });

    return ok(items, {
      ...paginationMeta(query.page, query.limit, total),
      countsByStatus,
    });
  });

  app.get('/events/:slug', async (request) => {
    const params = parseWithSchema(slugParamsSchema, request.params);
    const detail = await queries.getAdminEventDetail(params.slug);
    return ok(detail);
  });

  app.post('/events', async (request) => {
    const body = parseWithSchema(adminCreateEventSchema, request.body);
    const slug = body.slug ?? slugify(body.title);
    if (!slug) {
      throw new DomainError(ErrorCode.VALIDATION_ERROR, 'Could not derive a slug from the title');
    }

    const countryIds: string[] = [];
    for (const code of body.countryCodes) {
      const country = await queries.getCountryByCode(code.toUpperCase());
      countryIds.push(country.id);
    }

    const topicIds: string[] = [];
    for (const topicSlug of body.topicSlugs) {
      const topic = await queries.getTopicBySlug(topicSlug);
      topicIds.push(topic.id);
    }

    const event = await catalog.createEvent({
      title: body.title,
      slug,
      summary: body.summary,
      description: body.description,
      importance: body.importance,
      occurredAt: body.occurredAt,
      countryIds,
      topicIds,
    });

    return ok(event);
  });

  app.patch('/events/:id', async (request) => {
    const params = parseWithSchema(uuidParamsSchema, request.params);
    const patch = parseWithSchema(adminUpdateEventSchema, request.body);
    const updated = await catalog.updateEventFields(params.id, patch);
    return ok(updated);
  });

  app.post('/claims/:id/review', async (request) => {
    const params = parseWithSchema(uuidParamsSchema, request.params);
    const body = parseWithSchema(claimReviewBodySchema, request.body);
    const claim = await catalog.setClaimStatus(params.id, body.status);
    return ok(claim);
  });

  app.put('/assessments/:id', async (request) => {
    const params = parseWithSchema(uuidParamsSchema, request.params);
    const patch = parseWithSchema(draftAssessmentPatchSchema, request.body);
    const assessment = await catalog.updateDraftAssessment(params.id, patch);
    return ok(assessment);
  });

  app.post('/assessments/:id/publish', async (request) => {
    const params = parseWithSchema(uuidParamsSchema, request.params);
    const result = await catalog.publishAssessment(params.id, { reviewedBy: CONSOLE_REVIEWER });
    return ok(result);
  });

  app.post('/analysis-runs/:id/review', async (request) => {
    const params = parseWithSchema(uuidParamsSchema, request.params);
    const body = parseWithSchema(analysisRunReviewBodySchema, request.body);
    const run = await catalog.reviewAnalysisRun(params.id, body.reviewedBy);
    return ok(run);
  });

  app.put('/chains/:id', async (request) => {
    const params = parseWithSchema(uuidParamsSchema, request.params);
    const body = parseWithSchema(chainDraftSchema, request.body);
    const chain = await catalog.updateDraftChain(params.id, body);
    return ok(chain);
  });

  app.post('/chains/:id/publish', async (request) => {
    const params = parseWithSchema(uuidParamsSchema, request.params);
    const result = await catalog.publishChain(params.id);
    return ok(result);
  });

  app.get('/analytics/pipeline', async (request) => {
    const query = parseWithSchema(
      z.object({ days: z.coerce.number().int().min(7).max(365).default(30) }),
      request.query,
    );
    const health = await queries.getPipelineHealth(query.days);
    return ok({ windowDays: query.days, ...health });
  });

  app.post('/events/:id/analyze', async (request) => {
    const params = parseWithSchema(uuidParamsSchema, request.params);
    const event = await catalog.requireEvent(params.id);

    const result = await enqueueAnalysis(analysisQueue, { eventSlug: event.slug });
    return ok(result);
  });

  // Kept beside analyze so the console can also trigger a feed poll directly.
  app.post('/feeds/:slug/ingest', async (request) => {
    const params = parseWithSchema(slugParamsSchema, request.params);
    const result = await enqueueIngest(ingestQueue, { feedSlug: params.slug });
    return ok(result);
  });
};
