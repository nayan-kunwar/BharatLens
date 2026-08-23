import { type EventStatus } from './domain.js';
import { DomainError } from './errors.js';

const ALLOWED_TRANSITIONS: Record<EventStatus, readonly EventStatus[]> = {
  CANDIDATE: ['DRAFT', 'ARCHIVED'],
  DRAFT: ['ANALYZED', 'ARCHIVED'],
  ANALYZED: ['REVIEW_REQUIRED', 'DRAFT', 'ARCHIVED'],
  REVIEW_REQUIRED: ['PUBLISHED', 'DRAFT', 'ARCHIVED'],
  PUBLISHED: ['UPDATED', 'ARCHIVED'],
  UPDATED: ['UPDATED', 'ARCHIVED'],
  ARCHIVED: [],
};

export function canTransitionEventStatus(from: EventStatus, to: EventStatus): boolean {
  return ALLOWED_TRANSITIONS[from].includes(to);
}

export function assertEventStatusTransition(from: EventStatus, to: EventStatus): void {
  if (from === to) {
    return;
  }

  if (!canTransitionEventStatus(from, to)) {
    throw new DomainError('INVALID_EVENT_STATUS', `Cannot transition event from ${from} to ${to}`);
  }
}

export function nextStatusAfterTimelineUpdate(current: EventStatus): EventStatus {
  if (current === 'PUBLISHED') {
    return 'UPDATED';
  }

  return current;
}

/**
 * Successful analysis never publishes. Unpublished events move toward
 * REVIEW_REQUIRED. Public events keep their status; the new assessment stays DRAFT.
 */
export function statusesAfterSuccessfulAnalysis(current: EventStatus): EventStatus[] {
  switch (current) {
    case 'CANDIDATE':
      return ['DRAFT', 'ANALYZED', 'REVIEW_REQUIRED'];
    case 'DRAFT':
      return ['ANALYZED', 'REVIEW_REQUIRED'];
    case 'ANALYZED':
      return ['REVIEW_REQUIRED'];
    default:
      return [];
  }
}
