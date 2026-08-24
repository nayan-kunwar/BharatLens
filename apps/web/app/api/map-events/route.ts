import { NextResponse } from 'next/server';

const API_BASE = (process.env.API_BASE_URL ?? 'http://localhost:3001').replace(/\/$/, '');

/**
 * Server-side proxy so the client map panel can fetch a partner's published
 * events without the browser needing to know the API origin.
 */
export async function GET(request: Request) {
  const country = new URL(request.url).searchParams.get('country');
  if (!country || !/^[a-z]{2}$/i.test(country)) {
    return NextResponse.json({ error: 'Invalid country code' }, { status: 400 });
  }

  try {
    const upstream = await fetch(
      `${API_BASE}/api/v1/events?country=${encodeURIComponent(country.toUpperCase())}&sort=updatedAt&order=desc&limit=8`,
      { cache: 'no-store', headers: { accept: 'application/json' } },
    );
    const body = await upstream.json();
    return NextResponse.json(body, { status: upstream.status });
  } catch {
    return NextResponse.json({ error: 'API unavailable' }, { status: 503 });
  }
}
