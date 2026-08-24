import { describe, expect, it } from 'vitest';
import { analysisJobSchema, claimsJobSchema, ingestJobSchema } from './payloads.js';

describe('job payload schemas', () => {
  it('accepts minimal payloads', () => {
    expect(ingestJobSchema.parse({ feedSlug: 'bbc-world' })).toEqual({ feedSlug: 'bbc-world' });
    expect(claimsJobSchema.parse({ eventSlug: 'hormuz' })).toEqual({ eventSlug: 'hormuz' });
    expect(analysisJobSchema.parse({ eventSlug: 'hormuz', force: true })).toEqual({
      eventSlug: 'hormuz',
      force: true,
    });
  });

  it('rejects empty slugs and unknown fields', () => {
    expect(() => ingestJobSchema.parse({ feedSlug: '' })).toThrow();
    expect(() => claimsJobSchema.parse({})).toThrow();
    expect(() => analysisJobSchema.parse({ eventSlug: 'x', force: 'yes' })).toThrow();
  });
});
