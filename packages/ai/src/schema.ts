import {
  ANALYSIS_CONFIDENCE_LEVELS,
  CLAIM_TYPES,
  IMPACT_CATEGORIES,
  IMPACT_LEVELS,
} from '@bharatlens/shared';
import { z } from 'zod';

const entityKindSchema = z.enum(['COUNTRY', 'ORG', 'PLACE', 'OTHER']);

export const eventAnalysisSchema = z.object({
  eventType: z.string().trim().min(1).max(80),
  indiaRelevant: z.boolean(),
  indiaRelevanceReason: z.string().trim().min(1).max(2000),
  entities: z
    .array(
      z.object({
        name: z.string().trim().min(1).max(120),
        kind: entityKindSchema,
      }),
    )
    .max(20),
  summary: z.string().trim().min(1).max(4000),
  whyItHappened: z.string().trim().min(1).max(4000),
  whyIndiaCares: z.string().trim().min(1).max(4000),
  claims: z
    .array(
      z.object({
        statement: z.string().trim().min(1).max(1000),
        type: z.enum(CLAIM_TYPES),
        evidenceUrls: z.array(z.string().url()).max(8).default([]),
      }),
    )
    .max(12),
  indiaImpact: z.object({
    overallLevel: z.enum(IMPACT_LEVELS),
    analysisConfidence: z.enum(ANALYSIS_CONFIDENCE_LEVELS),
    reasoning: z.string().trim().min(1).max(4000),
    categories: z
      .array(
        z.object({
          category: z.enum(IMPACT_CATEGORIES),
          level: z.enum(IMPACT_LEVELS),
          reasoning: z.string().trim().min(1).max(2000),
        }),
      )
      .min(1)
      .max(IMPACT_CATEGORIES.length),
  }),
  watchNext: z.array(z.string().trim().min(1).max(200)).max(12),
});

export type EventAnalysis = z.infer<typeof eventAnalysisSchema>;

export function parseEventAnalysisJson(raw: string): unknown {
  const trimmed = raw.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced?.[1]?.trim() ?? trimmed;
  return JSON.parse(candidate) as unknown;
}

export function validateEventAnalysis(value: unknown): EventAnalysis {
  return eventAnalysisSchema.parse(value);
}
