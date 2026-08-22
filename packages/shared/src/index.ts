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
} as const;

export { DomainError } from './errors.js';
export {
  ANALYSIS_CONFIDENCE_LEVELS,
  ARTICLE_STATUSES,
  ASSESSMENT_STATUSES,
  CLAIM_STATUSES,
  CLAIM_TYPES,
  EVENT_STATUSES,
  EVIDENCE_STRENGTHS,
  EXCERPT_MAX_LENGTH,
  IMPACT_CATEGORIES,
  IMPACT_LEVELS,
  IMPORTANCE_LEVELS,
  SOURCE_TYPES,
} from './domain.js';
export type {
  AnalysisConfidence,
  ArticleStatus,
  AssessmentStatus,
  ClaimStatus,
  ClaimType,
  EventStatus,
  EvidenceStrength,
  ImpactCategory,
  ImpactLevel,
  ImportanceLevel,
  SourceType,
} from './domain.js';
export {
  assertEventStatusTransition,
  canTransitionEventStatus,
  nextStatusAfterTimelineUpdate,
} from './lifecycle.js';
