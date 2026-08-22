import type { ChronologyItem } from '@bharatlens/shared';
import { formatDate, formatLabel } from '../lib/presentation';
import { ImpactBadge } from './impact-badge';

export function EventTimeline({
  items,
  sourcesNote,
}: {
  items: ChronologyItem[];
  sourcesNote?: string;
}) {
  if (items.length === 0) {
    return <p className="empty-state">No verified timeline updates have been published yet.</p>;
  }

  return (
    <>
      <ol className="timeline">
        {items.map((item) =>
          item.kind === 'UPDATE' ? (
            <li className="timeline__item timeline__item--update" key={`update-${item.id}`}>
              <time dateTime={item.at}>{formatDate(item.at)}</time>
              <div>
                <p className="timeline__kind">Situation update</p>
                <h3>{item.title}</h3>
                {item.body ? <p>{item.body}</p> : null}
                {item.impactChange ? (
                  <p className="timeline__change">Impact change: {item.impactChange}</p>
                ) : null}
              </div>
            </li>
          ) : (
            <li className="timeline__item timeline__item--assessment" key={`assessment-${item.id}`}>
              <time dateTime={item.at}>{formatDate(item.at)}</time>
              <div>
                <p className="timeline__kind">India Impact v{item.version}</p>
                <h3>
                  Overall assessment <ImpactBadge level={item.overallLevel} />
                </h3>
                <p>{item.reasoning}</p>
                <p className="timeline__change">
                  {item.previousOverallLevel
                    ? `${formatLabel(item.previousOverallLevel)} → ${formatLabel(item.overallLevel)} (${formatLabel(item.overallChange)})`
                    : `First published assessment (${formatLabel(item.overallChange)})`}
                </p>
              </div>
            </li>
          ),
        )}
      </ol>
      {sourcesNote ? <p className="timeline__sources">{sourcesNote}</p> : null}
    </>
  );
}
