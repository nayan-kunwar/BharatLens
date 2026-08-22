export const EVENT_STATUSES = [
  'CANDIDATE',
  'DRAFT',
  'ANALYZED',
  'REVIEW_REQUIRED',
  'PUBLISHED',
  'UPDATED',
  'ARCHIVED',
] as const;

export const PUBLIC_EVENT_STATUSES = ['PUBLISHED', 'UPDATED'] as const;
export type PublicEventStatus = (typeof PUBLIC_EVENT_STATUSES)[number];
export type EventStatus = (typeof EVENT_STATUSES)[number];

export const IMPORTANCE_LEVELS = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const;
export type ImportanceLevel = (typeof IMPORTANCE_LEVELS)[number];

export const IMPACT_LEVELS = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const;
export type ImpactLevel = (typeof IMPACT_LEVELS)[number];

export const IMPACT_CATEGORIES = [
  'ENERGY',
  'TRADE',
  'ECONOMY',
  'SECURITY',
  'DEFENCE',
  'DIPLOMACY',
  'TECHNOLOGY',
  'SUPPLY_CHAIN',
  'INDIAN_CITIZENS',
] as const;

export type ImpactCategory = (typeof IMPACT_CATEGORIES)[number];

export const CLAIM_TYPES = ['FACT', 'ANALYSIS', 'SCENARIO', 'UNKNOWN'] as const;
export type ClaimType = (typeof CLAIM_TYPES)[number];

export const CLAIM_STATUSES = ['PENDING', 'APPROVED', 'REJECTED'] as const;
export type ClaimStatus = (typeof CLAIM_STATUSES)[number];

export const EVIDENCE_STRENGTHS = ['WEAK', 'MODERATE', 'STRONG'] as const;
export type EvidenceStrength = (typeof EVIDENCE_STRENGTHS)[number];

export const ANALYSIS_CONFIDENCE_LEVELS = ['LOW', 'MEDIUM', 'HIGH'] as const;
export type AnalysisConfidence = (typeof ANALYSIS_CONFIDENCE_LEVELS)[number];

export const ASSESSMENT_STATUSES = ['DRAFT', 'PUBLISHED'] as const;
export type AssessmentStatus = (typeof ASSESSMENT_STATUSES)[number];

export const ARTICLE_STATUSES = [
  'INGESTED',
  'NORMALIZED',
  'DUPLICATE',
  'REJECTED',
  'LINKED',
] as const;

export type ArticleStatus = (typeof ARTICLE_STATUSES)[number];

export const SOURCE_TYPES = [
  'NEWS_AGENCY',
  'NEWSPAPER',
  'GOVERNMENT',
  'INTERNATIONAL_ORG',
  'THINK_TANK',
  'OTHER',
] as const;

export type SourceType = (typeof SOURCE_TYPES)[number];

export const EXCERPT_MAX_LENGTH = 500;
