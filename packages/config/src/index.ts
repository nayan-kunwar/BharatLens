import { z } from 'zod';

const nodeEnvSchema = z.enum(['development', 'test', 'production']);

const logLevelSchema = z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']);

/**
 * Process-wide configuration. Validated once at startup so missing env vars
 * fail immediately instead of at the first request.
 */
export const envSchema = z.object({
  NODE_ENV: nodeEnvSchema.default('development'),
  LOG_LEVEL: logLevelSchema.default('info'),
  API_HOST: z.string().min(1).default('0.0.0.0'),
  API_PORT: z.coerce.number().int().min(1).max(65535).default(3001),
  WORKER_HEALTH_PORT: z.coerce.number().int().min(1).max(65535).default(3002),
  WEB_ORIGIN: z.string().min(1).default('http://localhost:3000'),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  REDIS_URL: z.string().min(1, 'REDIS_URL is required'),
  /**
   * Minutes between scheduled RSS polls by the worker. 0 disables scheduling.
   */
  INGEST_POLL_MINUTES: z.coerce.number().int().min(0).max(1440).default(30),
  /** Admin console password. Optional here because only the API needs it; the
   * API refuses to start without it (fail fast where the feature lives). */
  ADMIN_PASSWORD: z.string().min(8).optional(),
  /** Admin session cookie lifetime. */
  ADMIN_SESSION_TTL_HOURS: z.coerce.number().int().min(1).max(720).default(12),
  /**
   * Set ONLY when the console is served over HTTPS by a real deployment.
   * Defaults off because local Compose serves production mode over http.
   */
  ADMIN_COOKIE_SECURE: z
    .string()
    .optional()
    .transform((value) => value === 'true'),
});

export type AppConfig = z.infer<typeof envSchema>;

export function loadConfig(source: NodeJS.ProcessEnv = process.env): AppConfig {
  const parsed = envSchema.safeParse(source);

  if (!parsed.success) {
    const details = parsed.error.issues
      .map((issue) => `${issue.path.join('.') || 'env'}: ${issue.message}`)
      .join('; ');
    throw new Error(`Invalid configuration: ${details}`);
  }

  return parsed.data;
}
