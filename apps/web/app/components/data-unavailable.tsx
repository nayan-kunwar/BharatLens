export function DataUnavailable({ area }: { area: string }) {
  return (
    <section className="data-unavailable" aria-live="polite">
      <p className="eyebrow">Live data unavailable</p>
      <h2>{area} cannot be loaded right now.</h2>
      <p>Check that the BharatLens API is running, then refresh this page.</p>
    </section>
  );
}
