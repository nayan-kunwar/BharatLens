import { describe, expect, it } from 'vitest';
import { assertEventStatusTransition, nextStatusAfterTimelineUpdate } from './lifecycle.js';
import { DomainError } from './errors.js';

describe('event lifecycle', () => {
  it('allows candidate to become a draft', () => {
    expect(() => assertEventStatusTransition('CANDIDATE', 'DRAFT')).not.toThrow();
  });

  it('rejects publishing a candidate without review', () => {
    expect(() => assertEventStatusTransition('CANDIDATE', 'PUBLISHED')).toThrow(DomainError);
  });

  it('marks a published event as updated after a timeline entry', () => {
    expect(nextStatusAfterTimelineUpdate('PUBLISHED')).toBe('UPDATED');
    expect(nextStatusAfterTimelineUpdate('DRAFT')).toBe('DRAFT');
  });
});
