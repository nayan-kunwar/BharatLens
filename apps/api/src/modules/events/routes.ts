import type { FastifyPluginAsync } from 'fastify';
import type { EventQueries } from '@bharatlens/database';
import { ok } from '@bharatlens/shared';
import {
  eventListQuerySchema,
  paginationMeta,
  parseWithSchema,
  searchQuerySchema,
  slugParamsSchema,
  uuidParamsSchema,
} from '../../http/validation.js';

export const eventRoutes: FastifyPluginAsync<{ queries: EventQueries }> = async (app, opts) => {
  const { queries } = opts;

  app.get('/events', async (request) => {
    const query = parseWithSchema(eventListQuerySchema, request.query);
    const { items, total } = await queries.listEvents({
      page: query.page,
      limit: query.limit,
      countryCode: query.country,
      topicSlug: query.topic,
      importance: query.importance,
      sort: query.sort,
      order: query.order,
    });

    return ok(items, paginationMeta(query.page, query.limit, total));
  });

  app.get('/events/:slug', async (request) => {
    const params = parseWithSchema(slugParamsSchema, request.params);
    const event = await queries.getPublicEventBySlug(params.slug);
    return ok(event);
  });

  app.get('/events/:id/sources', async (request) => {
    const params = parseWithSchema(uuidParamsSchema, request.params);
    const sources = await queries.listEventSources(params.id);
    return ok(sources);
  });

  app.get('/events/:id/claims', async (request) => {
    const params = parseWithSchema(uuidParamsSchema, request.params);
    const claims = await queries.listEventClaims(params.id);
    return ok(claims);
  });

  app.get('/events/:id/impact', async (request) => {
    const params = parseWithSchema(uuidParamsSchema, request.params);
    const impact = await queries.getEventImpact(params.id);
    return ok(impact);
  });

  app.get('/events/:id/updates', async (request) => {
    const params = parseWithSchema(uuidParamsSchema, request.params);
    const updates = await queries.listEventUpdates(params.id);
    return ok(updates);
  });

  app.get('/search', async (request) => {
    const query = parseWithSchema(searchQuerySchema, request.query);
    const { items, total } = await queries.listEvents({
      page: query.page,
      limit: query.limit,
      query: query.q,
      sort: query.sort,
      order: query.order,
    });

    return ok(items, { ...paginationMeta(query.page, query.limit, total), q: query.q });
  });
};
