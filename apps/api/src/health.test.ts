import { describe, expect, it } from 'vitest';
import Fastify from 'fastify';
import { ok } from '@bharatlens/shared';

describe('liveness contract', () => {
  it('returns a success envelope without dependencies', async () => {
    const app = Fastify();
    app.get('/health', async () => ok({ service: 'api', status: 'ok' }));

    const response = await app.inject({ method: 'GET', url: '/health' });
    expect(response.statusCode).toBe(200);

    const body = response.json() as { success: boolean; data: { service: string } };
    expect(body.success).toBe(true);
    expect(body.data.service).toBe('api');

    await app.close();
  });
});
