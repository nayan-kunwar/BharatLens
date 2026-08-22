import type { ImpactLevel } from '../lib/api';
import { formatLabel, impactClass } from '../lib/presentation';

export function ImpactBadge({ level }: { level: ImpactLevel }) {
  return <span className={`impact-badge ${impactClass(level)}`}>{formatLabel(level)}</span>;
}
