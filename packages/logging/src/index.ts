import pino, { type Logger, type LoggerOptions } from 'pino';

type CreateLoggerOptions = {
  service: string;
  level: string;
  environment: string;
};

const redactPaths = ['DATABASE_URL', 'REDIS_URL', 'password', 'token', 'authorization', 'cookie'];

export function createLogger(options: CreateLoggerOptions): Logger {
  const config: LoggerOptions = {
    level: options.level,
    base: {
      service: options.service,
      env: options.environment,
    },
    redact: {
      paths: redactPaths,
      censor: '[redacted]',
    },
  };

  if (options.environment === 'development') {
    config.transport = {
      target: 'pino-pretty',
      options: { colorize: true, translateTime: 'SYS:standard' },
    };
  }

  return pino(config);
}

export type { Logger };
