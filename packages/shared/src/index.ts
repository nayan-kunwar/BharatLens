export const API_ENVELOPE_VERSION = 'v1' as const;

export type ApiSuccess<T> = {
  success: true;
  data: T;
  meta: Record<string, unknown>;
};

export type ApiErrorBody = {
  success: false;
  error: {
    code: string;
    message: string;
  };
};

export function ok<T>(data: T, meta: Record<string, unknown> = {}): ApiSuccess<T> {
  return { success: true, data, meta };
}

export function fail(code: string, message: string): ApiErrorBody {
  return {
    success: false,
    error: { code, message },
  };
}

export const ErrorCode = {
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
  EVENT_NOT_FOUND: 'EVENT_NOT_FOUND',
  INVALID_EVENT_STATUS: 'INVALID_EVENT_STATUS',
  SOURCE_NOT_FOUND: 'SOURCE_NOT_FOUND',
  DUPLICATE_EVENT: 'DUPLICATE_EVENT',
  INSUFFICIENT_EVIDENCE: 'INSUFFICIENT_EVIDENCE',
  INGESTION_FAILED: 'INGESTION_FAILED',
  COUNTRY_NOT_FOUND: 'COUNTRY_NOT_FOUND',
  TOPIC_NOT_FOUND: 'TOPIC_NOT_FOUND',
} as const;

export { DomainError } from './errors.js';
export {
  ANALYSIS_CONFIDENCE_LEVELS,
  ARTICLE_STATUSES,
  ASSESSMENT_STATUSES,
  CLAIM_STATUSES,
  CLAIM_TYPES,
  EVENT_STATUSES,
  PUBLIC_EVENT_STATUSES,
  EVIDENCE_STRENGTHS,
  EXCERPT_MAX_LENGTH,
  IMPACT_CATEGORIES,
  IMPACT_LEVEL_RANK,
  IMPACT_LEVELS,
  IMPORTANCE_LEVELS,
  SOURCE_TYPES,
  INGESTION_JOB_STATUSES,
} from './domain.js';
export type {
  AnalysisConfidence,
  ArticleStatus,
  AssessmentStatus,
  ClaimStatus,
  ClaimType,
  EventStatus,
  PublicEventStatus,
  EvidenceStrength,
  ImpactCategory,
  ImpactLevel,
  ImportanceLevel,
  SourceType,
  IngestionJobStatus,
} from './domain.js';
export {
  assertEventStatusTransition,
  canTransitionEventStatus,
  nextStatusAfterTimelineUpdate,
} from './lifecycle.js';
export { compareImpactLevel, diffCategoryLevels, mergeEventChronology } from './timeline.js';
export {
  classifyClaimType,
  computeEvidenceStrength,
  describeEvidenceCounts,
  isOfficialSourceType,
  OFFICIAL_SOURCE_TYPES,
} from './evidence.js';
export type {
  CategoryLevel,
  CategoryLevelChange,
  ChronologyAssessment,
  ChronologyItem,
  ChronologyUpdate,
  ImpactLevelChange,
} from './timeline.js';
