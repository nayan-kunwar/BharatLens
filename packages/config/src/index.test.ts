import { describe, expect, it } from 'vitest';
import { loadConfig } from './index.js';

const validEnv = {
  NODE_ENV: 'development',
  LOG_LEVEL: 'info',
  API_HOST: '0.0.0.0',
  API_PORT: '3001',
  WORKER_HEALTH_PORT: '3002',
  WEB_ORIGIN: 'http://localhost:3000',
  DATABASE_URL: 'postgres://bharatlens:bharatlens@localhost:5432/bharatlens',
  REDIS_URL: 'redis://localhost:6379',
} satisfies NodeJS.ProcessEnv;

describe('loadConfig', () => {
  it('loads a valid environment', () => {
    const config = loadConfig(validEnv);
    expect(config.API_PORT).toBe(3001);
    expect(config.DATABASE_URL).toContain('bharatlens');
  });

  it('fails fast when DATABASE_URL is missing', () => {
    const { DATABASE_URL: _omitted, ...rest } = validEnv;
    expect(() => loadConfig(rest)).toThrow(/DATABASE_URL/);
  });

  it('fails fast when REDIS_URL is missing', () => {
    const { REDIS_URL: _omitted, ...rest } = validEnv;
    expect(() => loadConfig(rest)).toThrow(/REDIS_URL/);
  });
});
