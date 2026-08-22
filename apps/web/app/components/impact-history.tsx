import type { ImpactAssessmentSnapshot } from '../lib/api';
import { formatDate, formatLabel } from '../lib/presentation';
import { diffCategoryLevels, compareImpactLevel } from '@bharatlens/shared';
import { ImpactBadge } from './impact-badge';

export function ImpactHistory({ history }: { history: ImpactAssessmentSnapshot[] }) {
  if (history.length === 0) {
    return <p className="empty-state">No published India Impact versions are available yet.</p>;
  }

  return (
    <ol className="impact-versions">
      {history.map((assessment, index) => {
        const previous = history[index - 1];
        const overallChange = compareImpactLevel(
          previous?.overallLevel ?? null,
          assessment.overallLevel,
        );
        const categoryChanges = diffCategoryLevels(
          previous?.categories ?? [],
          assessment.categories,
        ).filter((item) => item.change !== 'UNCHANGED');

        return (
          <li key={assessment.id}>
            <div className="impact-versions__header">
              <span>v{assessment.version}</span>
              <ImpactBadge level={assessment.overallLevel} />
              <time dateTime={assessment.publishedAt ?? undefined}>
                {formatDate(assessment.publishedAt)}
              </time>
            </div>
            <p>{assessment.reasoning}</p>
            <p className="impact-versions__meta">
              Evidence {formatLabel(assessment.evidenceStrength)} · Analysis estimate{' '}
              {formatLabel(assessment.analysisConfidence)}
              {previous
                ? ` · Overall ${formatLabel(previous.overallLevel)} → ${formatLabel(assessment.overallLevel)} (${formatLabel(overallChange)})`
                : ' · First published version'}
            </p>
            {categoryChanges.length > 0 ? (
              <ul className="impact-versions__diffs">
                {categoryChanges.map((change) => (
                  <li key={change.category}>
                    {formatLabel(change.category)}: {change.from ? formatLabel(change.from) : '—'} →{' '}
                    {formatLabel(change.to)}
                  </li>
                ))}
              </ul>
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}
