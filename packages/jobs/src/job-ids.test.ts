import { describe, expect, it } from 'vitest';
import { analysisJobId, claimsJobId, ingestJobId, utcDayKey } from './job-ids.js';

describe('job ids', () => {
  const date = new Date('2026-08-23T10:30:00.000Z');

  it('formats the UTC day key', () => {
    expect(utcDayKey(date)).toBe('2026-08-23');
  });

  it('makes ingest and claims ids unique per request', () => {
    const first = ingestJobId('bbc-world', date);
    const second = ingestJobId('bbc-world', date);
    expect(first).not.toBe(second);
    expect(first.startsWith('ingest__bbc-world__')).toBe(true);

    const claim = claimsJobId('hormuz', date);
    expect(claim.startsWith('claims__hormuz__')).toBe(true);
    expect(claimsJobId('hormuz', date)).not.toBe(claim);
  });

  it('keeps analysis ids deterministic per day unless forced', () => {
    expect(analysisJobId('hormuz')).toBe(`analyze__hormuz__${utcDayKey()}`);
    const forced = [analysisJobId('hormuz', true), analysisJobId('hormuz', true)];
    expect(forced[0]).not.toBe(forced[1]);
    expect(forced[0]!.startsWith(`analyze__hormuz__${utcDayKey()}__`)).toBe(true);
  });
});
