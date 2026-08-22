import { IMPACT_LEVEL_RANK, type ImpactLevel } from './domain.js';

export type ImpactLevelChange = 'NEW' | 'UNCHANGED' | 'INCREASED' | 'DECREASED';

export type CategoryLevel = {
  category: string;
  level: ImpactLevel;
};

export type CategoryLevelChange = {
  category: string;
  from: ImpactLevel | null;
  to: ImpactLevel;
  change: ImpactLevelChange;
};

export type ChronologyUpdate = {
  kind: 'UPDATE';
  id: string;
  at: string;
  title: string;
  body: string | null;
  impactChange: string | null;
};

export type ChronologyAssessment = {
  kind: 'ASSESSMENT';
  id: string;
  at: string;
  version: number;
  overallLevel: ImpactLevel;
  previousOverallLevel: ImpactLevel | null;
  overallChange: ImpactLevelChange;
  reasoning: string;
  categoryChanges: CategoryLevelChange[];
};

export type ChronologyItem = ChronologyUpdate | ChronologyAssessment;

export function compareImpactLevel(from: ImpactLevel | null, to: ImpactLevel): ImpactLevelChange {
  if (from === null) {
    return 'NEW';
  }
  if (from === to) {
    return 'UNCHANGED';
  }
  return IMPACT_LEVEL_RANK[to] > IMPACT_LEVEL_RANK[from] ? 'INCREASED' : 'DECREASED';
}

export function diffCategoryLevels(
  previous: CategoryLevel[],
  next: CategoryLevel[],
): CategoryLevelChange[] {
  const previousByCategory = new Map(previous.map((item) => [item.category, item.level]));
  const categories = new Set([
    ...previous.map((item) => item.category),
    ...next.map((item) => item.category),
  ]);

  return [...categories]
    .sort((left, right) => left.localeCompare(right))
    .map((category) => {
      const from = previousByCategory.get(category) ?? null;
      const to = next.find((item) => item.category === category)?.level;
      if (!to) {
        return null;
      }
      return {
        category,
        from,
        to,
        change: compareImpactLevel(from, to),
      };
    })
    .filter((item): item is CategoryLevelChange => item !== null);
}

export function mergeEventChronology(input: {
  updates: Array<{
    id: string;
    occurredAt: string;
    title: string;
    body: string | null;
    impactChange: string | null;
  }>;
  assessments: Array<{
    id: string;
    version: number;
    overallLevel: ImpactLevel;
    reasoning: string;
    publishedAt: string | null;
    categories: CategoryLevel[];
  }>;
}): ChronologyItem[] {
  const published = input.assessments
    .filter((assessment) => assessment.publishedAt)
    .sort((left, right) => left.version - right.version);

  const items: ChronologyItem[] = [
    ...input.updates.map((update) => ({
      kind: 'UPDATE' as const,
      id: update.id,
      at: update.occurredAt,
      title: update.title,
      body: update.body,
      impactChange: update.impactChange,
    })),
    ...published.map((assessment, index) => {
      const previous = published[index - 1];
      return {
        kind: 'ASSESSMENT' as const,
        id: assessment.id,
        at: assessment.publishedAt as string,
        version: assessment.version,
        overallLevel: assessment.overallLevel,
        previousOverallLevel: previous?.overallLevel ?? null,
        overallChange: compareImpactLevel(previous?.overallLevel ?? null, assessment.overallLevel),
        reasoning: assessment.reasoning,
        categoryChanges: diffCategoryLevels(previous?.categories ?? [], assessment.categories),
      };
    }),
  ];

  return items.sort((left, right) => {
    const byTime = new Date(left.at).getTime() - new Date(right.at).getTime();
    if (byTime !== 0) {
      return byTime;
    }
    if (left.kind !== right.kind) {
      return left.kind === 'UPDATE' ? -1 : 1;
    }
    if (left.kind === 'ASSESSMENT' && right.kind === 'ASSESSMENT') {
      return left.version - right.version;
    }
    return 0;
  });
}
