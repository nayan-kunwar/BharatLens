import { pgEnum } from 'drizzle-orm/pg-core';

/** Keep these tuples aligned with `@bharatlens/shared` domain constants. */
export const eventStatusEnum = pgEnum('event_status', [
  'CANDIDATE',
  'DRAFT',
  'ANALYZED',
  'REVIEW_REQUIRED',
  'PUBLISHED',
  'UPDATED',
  'ARCHIVED',
]);

export const importanceLevelEnum = pgEnum('importance_level', [
  'LOW',
  'MEDIUM',
  'HIGH',
  'CRITICAL',
]);

export const impactLevelEnum = pgEnum('impact_level', ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']);

export const impactCategoryEnum = pgEnum('impact_category', [
  'ENERGY',
  'TRADE',
  'ECONOMY',
  'SECURITY',
  'DEFENCE',
  'DIPLOMACY',
  'TECHNOLOGY',
  'SUPPLY_CHAIN',
  'INDIAN_CITIZENS',
]);

export const claimTypeEnum = pgEnum('claim_type', ['FACT', 'ANALYSIS', 'SCENARIO', 'UNKNOWN']);

export const claimStatusEnum = pgEnum('claim_status', ['PENDING', 'APPROVED', 'REJECTED']);

export const evidenceStrengthEnum = pgEnum('evidence_strength', ['WEAK', 'MODERATE', 'STRONG']);

export const analysisConfidenceEnum = pgEnum('analysis_confidence', ['LOW', 'MEDIUM', 'HIGH']);

export const assessmentStatusEnum = pgEnum('assessment_status', ['DRAFT', 'PUBLISHED']);

export const articleStatusEnum = pgEnum('article_status', [
  'INGESTED',
  'NORMALIZED',
  'DUPLICATE',
  'REJECTED',
  'LINKED',
]);

export const sourceTypeEnum = pgEnum('source_type', [
  'NEWS_AGENCY',
  'NEWSPAPER',
  'GOVERNMENT',
  'INTERNATIONAL_ORG',
  'THINK_TANK',
  'OTHER',
]);

export const ingestionJobStatusEnum = pgEnum('ingestion_job_status', [
  'RUNNING',
  'SUCCEEDED',
  'FAILED',
]);

export const analysisRunStatusEnum = pgEnum('analysis_run_status', [
  'RUNNING',
  'SUCCEEDED',
  'FAILED',
]);

export const chainNodeKindEnum = pgEnum('chain_node_kind', ['ROOT', 'CHANNEL', 'IMPACT']);
