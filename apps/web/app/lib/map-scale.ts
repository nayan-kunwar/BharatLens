export type ChoroplethBucket = 'none' | 'low' | 'mid' | 'high' | 'max';

/**
 * Plain-count intensity scale for the India map choropleth. Buckets are
 * explainable in UI copy ("1–2", "3–5", "6–11", "12+") rather than a formula.
 */
export function countBucket(eventCount: number): ChoroplethBucket {
  if (!Number.isFinite(eventCount) || eventCount <= 0) {
    return 'none';
  }
  if (eventCount <= 2) {
    return 'low';
  }
  if (eventCount <= 5) {
    return 'mid';
  }
  if (eventCount <= 11) {
    return 'high';
  }
  return 'max';
}

export const BUCKET_LABELS: Record<ChoroplethBucket, string> = {
  none: 'No shared published events',
  low: '1–2 shared events',
  mid: '3–5 shared events',
  high: '6–11 shared events',
  max: '12+ shared events',
};
