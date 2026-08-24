import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { ok } from '@bharatlens/shared';
import type { EventQueries } from '@bharatlens/database';
import { parseWithSchema } from '../../http/validation.js';

const analyticsQuerySchema = z.object({
  days: z.coerce.number().int().min(7).max(365).default(90),
});

export const analyticsRoutes: FastifyPluginAsync<{ queries: EventQueries }> = async (app, opts) => {
  /**
   * Derived analytics over published records. Levels are reported as
   * distributions and counts — never an invented average score (ADR-011).
   */
  app.get('/analytics/overview', async (request) => {
    const query = parseWithSchema(analyticsQuerySchema, request.query);
    const [categoryExposure, impactTrend, topicTrend, countryMovers] = await Promise.all([
      opts.queries.getCategoryExposure(),
      opts.queries.getImpactTrend(query.days),
      opts.queries.getTopicTrend(query.days),
      opts.queries.getCountryMovers(query.days),
    ]);

    return ok({
      windowDays: query.days,
      categoryExposure,
      impactTrend,
      topicTrend,
      countryMovers,
    });
  });
};
