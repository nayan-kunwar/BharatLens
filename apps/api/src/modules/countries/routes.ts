import type { FastifyPluginAsync } from 'fastify';
import type { EventQueries } from '@bharatlens/database';
import { ok } from '@bharatlens/shared';
import { codeParamsSchema, parseWithSchema } from '../../http/validation.js';

export const countryRoutes: FastifyPluginAsync<{ queries: EventQueries }> = async (app, opts) => {
  app.get('/countries', async () => {
    return ok(await opts.queries.listCountries());
  });

  app.get('/countries/:code', async (request) => {
    const params = parseWithSchema(codeParamsSchema, request.params);
    return ok(await opts.queries.getCountryByCode(params.code));
  });
};
