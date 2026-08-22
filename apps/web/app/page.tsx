const apiBaseUrl = process.env.API_BASE_URL ?? 'http://localhost:3001';

async function loadApiHealth(): Promise<string> {
  try {
    const response = await fetch(`${apiBaseUrl}/health`, { cache: 'no-store' });
    if (!response.ok) {
      return `HTTP ${response.status}`;
    }
    const body = (await response.json()) as { success?: boolean };
    return body.success ? 'reachable' : 'unexpected response';
  } catch {
    return 'unreachable (start the API or Docker Compose)';
  }
}

export default async function HomePage() {
  const apiHealth = await loadApiHealth();

  return (
    <main>
      <p className="brand">BharatLens</p>
      <h1>See the world through India&apos;s lens.</h1>
      <p>
        A geopolitical intelligence platform. India Impact is the core feature: when something
        happens in the world, what does it mean for India?
      </p>
      <p>This homepage is the M0 foundation shell. Events, evidence, and analysis come later.</p>
      <dl className="status">
        <dt>Frontend</dt>
        <dd>ok</dd>
        <dt>API liveness</dt>
        <dd>{apiHealth}</dd>
      </dl>
    </main>
  );
}
