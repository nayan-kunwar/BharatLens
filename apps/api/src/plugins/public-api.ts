import type { FastifyPluginAsync } from 'fastify';
import type { Database } from '@bharatlens/database';
import { EventQueries } from '@bharatlens/database';
import { countryRoutes } from '../modules/countries/routes.js';
import { eventRoutes } from '../modules/events/routes.js';
import { mapRoutes } from '../modules/map/routes.js';
import { topicRoutes } from '../modules/topics/routes.js';

export const publicApi: FastifyPluginAsync<{ db: Database }> = async (app, opts) => {
  const queries = new EventQueries(opts.db);

  await app.register(
    async (v1) => {
      await v1.register(eventRoutes, { queries });
      await v1.register(countryRoutes, { queries });
      await v1.register(topicRoutes, { queries });
      await v1.register(mapRoutes, { queries });
    },
    { prefix: '/api/v1' },
  );
};
