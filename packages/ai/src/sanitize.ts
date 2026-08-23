import { classifyClaimType } from '@bharatlens/shared';
import type { EventAnalysis } from './schema.js';

const URL_PATTERN = /https?:\/\/[^\s"'<>]+/gi;

export function extractUrls(text: string): string[] {
  return [...text.matchAll(URL_PATTERN)].map((match) => match[0].replace(/[),.;]+$/g, ''));
}

export function collectUnknownUrls(analysis: EventAnalysis, allowed: Set<string>): string[] {
  const unknown: string[] = [];
  const visit = (value: unknown) => {
    if (typeof value === 'string') {
      for (const url of extractUrls(value)) {
        if (!allowed.has(url)) {
          unknown.push(url);
        }
      }
    } else if (Array.isArray(value)) {
      for (const item of value) {
        visit(item);
      }
    } else if (value && typeof value === 'object') {
      for (const item of Object.values(value)) {
        visit(item);
      }
    }
  };

  visit(analysis);
  return [...new Set(unknown)];
}

/**
 * Model claims are never FACT. URLs not in the allowlist are dropped.
 * Linguistic classifyClaimType can still mark ANALYSIS / SCENARIO / UNKNOWN.
 */
export function sanitizeEventAnalysis(
  analysis: EventAnalysis,
  allowedUrls: Set<string>,
): EventAnalysis {
  const unknown = collectUnknownUrls(analysis, allowedUrls);
  if (unknown.length > 0) {
    throw new Error(
      `Model output cited URLs that were not in the source set: ${unknown.join(', ')}`,
    );
  }

  return {
    ...analysis,
    claims: analysis.claims.map((claim) => {
      const evidenceUrls = claim.evidenceUrls.filter((url) => allowedUrls.has(url));
      const type = claim.type === 'FACT' ? 'UNKNOWN' : claim.type;
      const linguistic = classifyClaimType(claim.statement);
      return {
        statement: claim.statement,
        type: type === 'UNKNOWN' ? linguistic : type,
        evidenceUrls,
      };
    }),
  };
}
