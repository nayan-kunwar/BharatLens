import { describe, expect, it } from 'vitest';
import {
  isEntityOverlapMatch,
  isEventCoverageMatch,
  jaccard,
  significantTokens,
} from './dedupe.js';

describe('article dedupe matching', () => {
  it('treats punctuation-equivalent titles as the same token set', () => {
    const left = significantTokens('Strait of Hormuz: shipping disruption');
    const right = significantTokens('Strait of Hormuz shipping disruption');
    expect(jaccard(left, right)).toBeGreaterThan(0.8);
  });

  it('matches overlapping Hormuz stories and rejects unrelated India headlines', () => {
    expect(
      isEntityOverlapMatch(
        'strait of hormuz shipping disruption raises india crude risk',
        'hormuz shipping disruption threatens indian crude imports',
      ),
    ).toBe(true);

    expect(
      isEntityOverlapMatch(
        'india wins cricket series against australia',
        'china announces new semiconductor export rules',
      ),
    ).toBe(false);
  });

  it('links official briefs to an event with a shared place token even when titles differ', () => {
    const event =
      'Strait of Hormuz shipping disruption Maritime disruption reported near Hormuz affecting crude shipping.';
    const official =
      'UN notes Hormuz shipping disruption and India energy exposure Official note on shipping disruption near Hormuz.';
    const unrelated = 'India wins cricket series against Australia after a late collapse.';

    expect(isEventCoverageMatch(event, official)).toBe(true);
    expect(isEntityOverlapMatch(event, official)).toBe(false);
    expect(isEventCoverageMatch(event, unrelated)).toBe(false);
  });
});
