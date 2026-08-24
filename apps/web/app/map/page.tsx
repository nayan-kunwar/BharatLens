import type { Metadata } from 'next';
import { getMapOverview } from '../lib/api';
import { MapView } from './map-view';

export const metadata: Metadata = {
  title: 'India-centered map',
  description: 'Published-event relationships between India and the world.',
};

export default async function MapPage() {
  const partners = await getMapOverview().catch(() => []);

  return (
    <main className="page-shell page-content">
      <header className="page-intro">
        <p className="eyebrow">Geopolitical map</p>
        <h1>India and the world</h1>
        <p>
          Shading shows how many published events each country shares with India. This is derived
          evidence from the record — not a statement about friendships, alliances, or intentions.
          Click a shaded country or marker for details.
        </p>
      </header>

      {partners.length === 0 ? (
        <p className="empty-state">
          No published events involve India together with another country yet.
        </p>
      ) : (
        <MapView partners={partners} />
      )}
    </main>
  );
}
