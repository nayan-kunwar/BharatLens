import { describe, expect, it } from 'vitest';
import boundary from './india-boundary.json';

/**
 * Regression test for the full-boundary India overlay.
 *
 * The world-atlas (Natural Earth) India polygon follows the Line of Control,
 * so /map renders a DataMeet-derived full official boundary instead.
 * These tests pin that choice: Kashmir probes must be inside, neighbours
 * outside, and the island territories must survive simplification.
 */

type Ring = number[][];
type Polygon = Ring[];

const polygons = (boundary as { coordinates: number[][][][] }).coordinates as Polygon[];

function ringContains(ring: Ring, x: number, y: number): boolean {
  let inside = false;
  let j = ring.length - 1;
  for (let i = 0; i < ring.length; i += 1) {
    const xi = ring[i]?.[0] ?? 0;
    const yi = ring[i]?.[1] ?? 0;
    const xj = ring[j]?.[0] ?? 0;
    const yj = ring[j]?.[1] ?? 0;
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
    j = i;
  }
  return inside;
}

function contains(x: number, y: number): boolean {
  return polygons.some((poly) => ringContains(poly[0] ?? [], x, y));
}

describe('india-boundary.json', () => {
  it('is a WGS84 MultiPolygon spanning the full official extent', () => {
    expect(boundary).toMatchObject({ type: 'MultiPolygon' });
    const xs = polygons.flatMap((poly) => poly.flatMap((ring) => ring.map((pt) => pt?.[0] ?? 0)));
    const ys = polygons.flatMap((poly) => poly.flatMap((ring) => ring.map((pt) => pt?.[1] ?? 0)));
    expect(Math.min(...xs)).toBeGreaterThanOrEqual(67);
    expect(Math.max(...xs)).toBeLessThanOrEqual(98);
    expect(Math.min(...ys)).toBeGreaterThanOrEqual(6);
    // 37N (Siachen) proves the Kashmir crown is present, not clipped.
    expect(Math.max(...ys)).toBeGreaterThan(36.5);
    expect(Math.max(...ys)).toBeLessThanOrEqual(38);
  });

  it('keeps the island territories as separate polygons', () => {
    const andaman = polygons.filter(
      (poly) => Math.min(...(poly[0] ?? []).map((pt) => pt?.[0] ?? -181)) > 92,
    );
    expect(andaman.length).toBeGreaterThanOrEqual(40);
    // Interior land probes (not city dots, which can sit on simplified shores).
    expect(contains(92.836, 12.604)).toBe(true); // Andaman landmass
    expect(contains(72.188, 10.861)).toBe(true); // Lakshadweep landmass
  });

  it('includes the full Kashmir region', () => {
    expect(contains(73.5, 34.37)).toBe(true); // Muzaffarabad (PoK)
    expect(contains(74.3, 35.92)).toBe(true); // Gilgit
    expect(contains(77.0, 35.5)).toBe(true); // Siachen
    expect(contains(74.8, 34.08)).toBe(true); // Srinagar
  });

  it('excludes neighbouring countries', () => {
    expect(contains(74.35, 31.55)).toBe(false); // Lahore, Pakistan
    expect(contains(85.32, 27.7)).toBe(false); // Kathmandu, Nepal
    expect(contains(77.2, 28.6)).toBe(true); // Delhi sanity check
  });
});
