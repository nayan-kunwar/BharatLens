import type { FastifyPluginAsync } from 'fastify';
import { ok } from '@bharatlens/shared';
import type { EventQueries } from '@bharatlens/database';

export const mapRoutes: FastifyPluginAsync<{ queries: EventQueries }> = async (app, opts) => {
  /** India-centered partner overview for the public geopolitical map (M13). */
  app.get('/map/overview', async () => {
    const partners = await opts.queries.getIndiaMapOverview();
    return ok({ partners });
  });
};
