/**
 * Maps a value series to an SVG polyline points string. Zero-dependency chart
 * primitive for the analytics page (ADR-011: no chart library).
 */
export function sparklinePoints(values: number[], width: number, height: number): string {
  if (values.length === 0) {
    return '';
  }

  const max = Math.max(...values, 1);
  const step = values.length === 1 ? width / 2 : width / (values.length - 1);

  return values
    .map((value, index) => {
      const x = values.length === 1 ? width / 2 : index * step;
      const y = height - 1 - (Math.max(0, value) / max) * (height - 2);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
}
