import type { Country, EventSummary, ImpactLevel, Topic } from './api';

export const CARD_IMPACT_CATEGORIES = ['ENERGY', 'TRADE', 'SECURITY'] as const;

export function isHighIndiaImpact(event: Pick<EventSummary, 'currentImpact'>) {
  const level = event.currentImpact?.overallLevel;
  return level === 'HIGH' || level === 'CRITICAL';
}

export function cardImpactLevels(
  categories: Array<{ category: string; level: ImpactLevel }> | undefined,
) {
  return CARD_IMPACT_CATEGORIES.flatMap((category) => {
    const match = categories?.find((item) => item.category === category);
    return match ? [{ category, level: match.level }] : [];
  });
}

export function uniqueFromEvents<T>(
  events: EventSummary[],
  pick: (event: EventSummary) => T[],
  fallback: T[],
  limit = 8,
) {
  const seen = new Set<string>();
  const items: T[] = [];

  for (const event of events) {
    for (const item of pick(event)) {
      const key = JSON.stringify(item);
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);
      items.push(item);
      if (items.length >= limit) {
        return items;
      }
    }
  }

  return items.length > 0 ? items : fallback.slice(0, limit);
}

export function countriesFromEvents(events: EventSummary[], countries: Country[]) {
  return uniqueFromEvents(
    events,
    (event) => event.countries,
    countries.map((country) => ({ code: country.code, name: country.name, slug: country.slug })),
  );
}

export function topicsFromEvents(events: EventSummary[], topics: Topic[]) {
  return uniqueFromEvents(
    events,
    (event) => event.topics,
    topics.map((topic) => ({ slug: topic.slug, name: topic.name })),
  );
}

export function formatDate(value: string | null) {
  if (!value) {
    return 'Date not available';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return 'Date not available';
  }

  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

export function formatLabel(value: string) {
  return value
    .toLowerCase()
    .split('_')
    .map((part) => `${part.slice(0, 1).toUpperCase()}${part.slice(1)}`)
    .join(' ');
}

export function impactClass(level: ImpactLevel) {
  return `impact--${level.toLowerCase()}`;
}

export function getOne(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export function withQuery(path: string, params: Record<string, string | number | undefined>) {
  const searchParams = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') {
      searchParams.set(key, String(value));
    }
  }

  const query = searchParams.toString();
  return query ? `${path}?${query}` : path;
}
