import type { FastifyPluginAsync } from 'fastify';
import type { EventQueries } from '@bharatlens/database';
import { ok } from '@bharatlens/shared';
import { parseWithSchema, slugParamsSchema } from '../../http/validation.js';

export const topicRoutes: FastifyPluginAsync<{ queries: EventQueries }> = async (app, opts) => {
  app.get('/topics', async () => {
    return ok(await opts.queries.listTopics());
  });

  app.get('/topics/:slug', async (request) => {
    const params = parseWithSchema(slugParamsSchema, request.params);
    return ok(await opts.queries.getTopicBySlug(params.slug));
  });
};
