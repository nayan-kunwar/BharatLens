import { z } from 'zod';
import {
  ANALYSIS_CONFIDENCE_LEVELS,
  CHAIN_NODE_KINDS,
  DomainError,
  IMPORTANCE_LEVELS,
  IMPACT_CATEGORIES,
  IMPACT_LEVELS,
  EVENT_STATUSES,
} from '@bharatlens/shared';

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

// --- Admin ---

export const loginBodySchema = z.object({
  password: z.string().min(1).max(200),
});

export const adminEventListQuerySchema = paginationSchema.extend({
  status: z.enum(EVENT_STATUSES).optional(),
  q: z.string().trim().max(200).optional(),
});

const slugify = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120);

export const adminCreateEventSchema = z.object({
  title: z.string().min(3).max(250),
  slug: z
    .string()
    .min(3)
    .max(140)
    .regex(/^[a-z0-9-]+$/, 'slug must be lowercase kebab-case')
    .optional(),
  summary: z.string().max(600).optional(),
  description: z.string().max(8000).optional(),
  importance: z.enum(IMPORTANCE_LEVELS).optional(),
  eventType: z.string().min(2).max(80).optional(),
  occurredAt: z.coerce.date().optional(),
  countryCodes: z.array(z.string().length(2)).max(10).default([]),
  topicSlugs: z.array(z.string().min(1).max(80)).max(10).default([]),
});

export const adminUpdateEventSchema = adminCreateEventSchema
  .omit({ slug: true, countryCodes: true, topicSlugs: true })
  .partial()
  .refine((value) => Object.keys(value).length > 0, 'At least one field is required');

export const claimReviewBodySchema = z.object({
  status: z.enum(['APPROVED', 'REJECTED']),
});

export const categoryLevelSchema = z.object({
  category: z.enum(IMPACT_CATEGORIES),
  level: z.enum(IMPACT_LEVELS),
  reasoning: z.string().min(1).max(1000),
});

export const draftAssessmentPatchSchema = z
  .object({
    overallLevel: z.enum(IMPACT_LEVELS).optional(),
    reasoning: z.string().min(1).max(4000).optional(),
    analysisConfidence: z.enum(ANALYSIS_CONFIDENCE_LEVELS).optional(),
    categories: z.array(categoryLevelSchema).min(1).max(20).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, 'At least one field is required');

export const analysisRunReviewBodySchema = z.object({
  reviewedBy: z.string().min(1).max(120).default('admin'),
});

const chainKey = z
  .string()
  .trim()
  .min(1)
  .max(24)
  .regex(/^[a-zA-Z0-9_-]+$/, 'chain node keys must be alphanumeric');

export const chainDraftSchema = z.object({
  reasoning: z.string().max(4000).optional(),
  nodes: z
    .array(
      z.object({
        key: chainKey,
        kind: z.enum(CHAIN_NODE_KINDS),
        label: z.string().trim().min(3).max(200),
        description: z.string().trim().max(500).optional(),
        category: z.enum(IMPACT_CATEGORIES).optional(),
      }),
    )
    .min(3)
    .max(20),
  edges: z
    .array(z.object({ from: chainKey, to: chainKey }))
    .min(2)
    .max(30),
});

export { slugify };

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
