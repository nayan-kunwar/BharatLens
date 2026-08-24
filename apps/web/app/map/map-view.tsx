'use client';

import { useState } from 'react';
import { WorldMap, type MapPartner } from './world-map';
import { PartnerPanel } from './partner-panel';

/** Client island owning the selected-country state for the /map page. */
export function MapView({ partners }: { partners: MapPartner[] }) {
  const [selected, setSelected] = useState<string | null>(null);
  const partner = partners.find((entry) => entry.code === selected) ?? null;

  return (
    <div className="map-layout">
      <WorldMap partners={partners} selected={selected} onSelect={setSelected} />
      <PartnerPanel partner={partner} selectedCode={selected} />
    </div>
  );
}
