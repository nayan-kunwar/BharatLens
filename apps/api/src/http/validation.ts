import { z } from 'zod';
import { DomainError, IMPORTANCE_LEVELS } from '@bharatlens/shared';

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const eventListQuerySchema = paginationSchema.extend({
  country: z.string().length(2).optional(),
  topic: z.string().min(1).max(80).optional(),
  importance: z.enum(IMPORTANCE_LEVELS).optional(),
  sort: z.enum(['occurredAt', 'publishedAt', 'updatedAt']).default('publishedAt'),
  order: z.enum(['asc', 'desc']).default('desc'),
});

export const searchQuerySchema = paginationSchema.extend({
  q: z.string().trim().min(2).max(200),
  sort: z.enum(['occurredAt', 'publishedAt', 'updatedAt']).default('publishedAt'),
  order: z.enum(['asc', 'desc']).default('desc'),
});

export const slugParamsSchema = z.object({
  slug: z.string().min(1).max(180),
});

export const codeParamsSchema = z.object({
  code: z.string().length(2),
});

export const uuidParamsSchema = z.object({
  id: z.string().uuid(),
});

export function parseWithSchema<T>(schema: z.ZodType<T>, value: unknown): T {
  const parsed = schema.safeParse(value);
  if (!parsed.success) {
    const message = parsed.error.issues.map((issue) => issue.message).join('; ');
    throw new DomainError('VALIDATION_ERROR', message);
  }
  return parsed.data;
}

export function paginationMeta(page: number, limit: number, total: number) {
  return {
    page,
    limit,
    total,
    pageCount: Math.ceil(total / limit) || 0,
  };
}
