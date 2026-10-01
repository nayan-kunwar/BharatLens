'use client';

import { geoOrthographic, type GeoPermissibleObjects } from 'd3-geo';
import { feature } from 'topojson-client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { countBucket } from '../lib/map-scale';
import { PARTNER_CENTROIDS } from '../lib/country-centroids';

export type MapPartner = {
  code: string;
  name: string;
  eventCount: number;
};

type Topology = {
  objects: { countries: unknown };
};

type CountryProperties = { name?: string };

/** Natural Earth draws the Line of Control, so this atlas feature is replaced. */
const INDIA_ATLAS_ID = '356';

type IndiaBoundary = {
  type: 'MultiPolygon';
  coordinates: number[][][][];
};

const WIDTH = 640;
const HEIGHT = 640;

/**
 * India-centered world map. Geography comes from the world-atlas TopoJSON
 * (Natural Earth data) for every country EXCEPT India: Natural Earth draws
 * the de facto Line of Control, so India's full official boundary comes
 * from a simplified DataMeet composite (Country/india-composite.geojson,
 * CC BY 4.0 — see ADR-010). Projection is orthographic rotated onto India.
 * Rendering is plain SVG via d3-geo — no wrapper library (ADR-010).
 */
export function WorldMap({
  partners,
  selected,
  onSelect,
}: {
  partners: MapPartner[];
  selected: string | null;
  onSelect: (code: string | null) => void;
}) {
  const [paths, setPaths] = useState<Array<{ id: string; d: string; name: string }> | null>(null);
  const [markerPoints, setMarkerPoints] = useState<Array<{ code: string; x: number; y: number }>>(
    [],
  );
  const [tooltip, setTooltip] = useState<{ x: number; y: number; label: string } | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const partnerByCode = useMemo(() => {
    const map = new Map<string, MapPartner>();
    for (const partner of partners) {
      map.set(partner.code, partner);
    }
    return map;
  }, [partners]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const [{ geoPath }, topo, indiaBoundary] = await Promise.all([
        import('d3-geo'),
        import('world-atlas/countries-110m.json') as Promise<Topology>,
        import('./india-boundary.json') as Promise<IndiaBoundary>,
      ]);
      const countries = feature(topo as never, topo.objects.countries as never) as unknown as {
        features: Array<GeoPermissibleObjects & { id: string; properties: CountryProperties }>;
      };

      // Orthographic projection centered on India (~78E, 22N).
      const projection = geoOrthographic()
        .rotate([-78, -22])
        .fitExtent(
          [
            [12, 12],
            [WIDTH - 12, HEIGHT - 12],
          ],
          { type: 'Sphere' } as GeoPermissibleObjects,
        );
      const path = geoPath(projection);

      const rendered = countries.features
        .filter((country) => String(country.id) !== INDIA_ATLAS_ID)
        .map((country) => ({
          id: String(country.id),
          name: country.properties?.name ?? '',
          d: path(country),
        }))
        .filter((entry): entry is { id: string; d: string; name: string } => Boolean(entry.d));

      // Full-boundary India, drawn LAST so it paints over the atlas
      // Pakistan/China slivers in the Kashmir region. Same id ('356') so
      // fill, tooltip, and click handling resolve to India unchanged.
      const indiaFeature = {
        type: 'Feature',
        properties: { name: 'India' },
        geometry: indiaBoundary,
      } as unknown as GeoPermissibleObjects;
      const indiaPath = path(indiaFeature);
      if (indiaPath) {
        rendered.push({ id: INDIA_ATLAS_ID, name: 'India', d: indiaPath });
      }

      const markers = partners
        .map((partner) => {
          const centroid = PARTNER_CENTROIDS[partner.code];
          if (!centroid) {
            return null;
          }
          const projected = projection([centroid[0], centroid[1]]);
          return projected ? { code: partner.code, x: projected[0], y: projected[1] } : null;
        })
        .filter((point): point is { code: string; x: number; y: number } => point !== null);

      if (!cancelled) {
        setPaths(rendered);
        setMarkerPoints(markers);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [partners]);

  function handleClick(id: string) {
    const alpha2 = NUMERIC_TO_ALPHA2[id];
    onSelect(alpha2 && partnerByCode.has(alpha2) ? alpha2 : null);
  }

  function handleMarkerClick(code: string) {
    onSelect(selected === code ? null : code);
  }

  return (
    <div className="world-map">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        role="img"
        aria-label="World map centered on India showing shared published events"
      >
        <circle cx={WIDTH / 2} cy={HEIGHT / 2} r={WIDTH / 2 - 10} className="world-map__sphere" />
        {paths?.map((entry) => {
          const partnerCode = NUMERIC_TO_ALPHA2[entry.id];
          const partner = partnerCode ? partnerByCode.get(partnerCode) : undefined;
          const isIndia = partnerCode === 'IN';
          const bucket = partner ? countBucket(partner.eventCount) : 'none';
          const classNames = ['world-map__country'];
          if (isIndia) {
            classNames.push('world-map__india');
          } else if (bucket !== 'none') {
            classNames.push(`world-map__fill--${bucket}`);
          }
          if (partnerCode && partnerCode === selected) {
            classNames.push('world-map__selected');
          }
          return (
            <path
              key={entry.id}
              d={entry.d}
              className={classNames.join(' ')}
              onMouseEnter={(event) =>
                setTooltip({
                  x: event.nativeEvent.offsetX,
                  y: event.nativeEvent.offsetY,
                  label: `${partner?.name ?? entry.name}${partner ? ` — ${partner.eventCount} shared events` : ''}`,
                })
              }
              onMouseLeave={() => setTooltip(null)}
              onClick={() => handleClick(entry.id)}
            />
          );
        })}
        {markerPoints.map((point) => (
          <circle
            key={point.code}
            cx={point.x}
            cy={point.y}
            r={4}
            className={`world-map__marker${selected === point.code ? ' world-map__marker--active' : ''}`}
            onClick={() => handleMarkerClick(point.code)}
          >
            <title>{partnerByCode.get(point.code)?.name}</title>
          </circle>
        ))}
      </svg>
      {tooltip ? (
        <div className="world-map__tooltip" style={{ left: tooltip.x + 12, top: tooltip.y + 12 }}>
          {tooltip.label}
        </div>
      ) : null}
      <div className="world-map__legend">
        {[1, 3, 6, 12].map((threshold) => {
          const bucket = countBucket(threshold);
          return (
            <span key={bucket} className="world-map__legend-item">
              <span className={`world-map__swatch world-map__fill--${bucket}`} />
              {bucket === 'low'
                ? '1–2'
                : bucket === 'mid'
                  ? '3–5'
                  : bucket === 'high'
                    ? '6–11'
                    : '12+'}
            </span>
          );
        })}
      </div>
      <p className="world-map__attribution">
        India boundary © DataMeet community (CC BY 4.0); other boundaries © Natural Earth.
      </p>
    </div>
  );
}

/** ISO 3166-1 numeric → alpha-2 for countries the seed data can involve. */
export const NUMERIC_TO_ALPHA2: Record<string, string> = {
  '356': 'IN',
  '840': 'US',
  '156': 'CN',
  '643': 'RU',
  '364': 'IR',
  '586': 'PK',
  '682': 'SA',
  '784': 'AE',
  '392': 'JP',
  '276': 'DE',
  '826': 'GB',
  '250': 'FR',
  '376': 'IL',
  '512': 'OM',
  '414': 'KW',
  '634': 'QA',
  '036': 'AU',
  '124': 'CA',
  '076': 'BR',
  '710': 'ZA',
  '702': 'SG',
  '764': 'TH',
  '360': 'ID',
  '410': 'KR',
  '818': 'EG',
  '004': 'AF',
  '050': 'BD',
  '104': 'MM',
  '144': 'LK',
  '524': 'NP',
  '064': 'BT',
  '462': 'MV',
  '398': 'KZ',
  '795': 'TM',
  '860': 'UZ',
};
