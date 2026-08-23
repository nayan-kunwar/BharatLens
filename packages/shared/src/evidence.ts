import { type ClaimType, type EvidenceStrength, type SourceType } from './domain.js';

export const OFFICIAL_SOURCE_TYPES: readonly SourceType[] = ['GOVERNMENT', 'INTERNATIONAL_ORG'];

export function isOfficialSourceType(type: SourceType): boolean {
  return (OFFICIAL_SOURCE_TYPES as readonly string[]).includes(type);
}

export function computeEvidenceStrength(input: {
  sourceCount: number;
  independentSourceCount: number;
  officialSourceCount: number;
}): EvidenceStrength {
  if (input.officialSourceCount >= 1 && input.independentSourceCount >= 2) {
    return 'STRONG';
  }

  if (input.independentSourceCount >= 2 || input.officialSourceCount >= 1) {
    return 'MODERATE';
  }

  if (input.sourceCount >= 1) {
    return 'WEAK';
  }

  return 'WEAK';
}

export function describeEvidenceCounts(input: {
  sourceCount: number;
  independentSourceCount: number;
  officialSourceCount: number;
  evidenceStrength: EvidenceStrength;
}): string {
  return [
    `${input.sourceCount} linked source${input.sourceCount === 1 ? '' : 's'}`,
    `${input.independentSourceCount} independent`,
    `${input.officialSourceCount} official`,
    `strength ${input.evidenceStrength} from linked evidence, not a model score`,
  ].join('; ');
}

/**
 * Linguistic labels only. RSS headlines are never classified as FACT:
 * a headline is not the same as a verified, evidence-backed fact.
 */
export function classifyClaimType(text: string): ClaimType {
  const value = text.toLowerCase();

  if (/\b(if|could|might|would|may|should the|in case|risks? of|potential(?:ly)?)\b/.test(value)) {
    return 'SCENARIO';
  }

  if (
    /\b(impact|exposure|because|raises|threatens|means|likely|suggests|could affect|india cares)\b/.test(
      value,
    )
  ) {
    return 'ANALYSIS';
  }

  return 'UNKNOWN';
}
