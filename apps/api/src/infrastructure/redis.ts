import { Redis } from 'ioredis';

export function createRedis(redisUrl: string): Redis {
  return new Redis(redisUrl, {
    maxRetriesPerRequest: 1,
    enableReadyCheck: true,
    lazyConnect: true,
  });
}

export async function pingRedis(redis: Redis): Promise<void> {
  const response = await redis.ping();
  if (response !== 'PONG') {
    throw new Error('Redis ping failed');
  }
}
