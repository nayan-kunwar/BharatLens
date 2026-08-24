import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

const ADMIN_SESSION_COOKIE = 'bharatlens_admin_session';
const API_BASE = (process.env.API_BASE_URL ?? 'http://localhost:3001').replace(/\/$/, '');

/** Generic authenticated proxy for console mutations: /api/admin-action?path=/claims/:id/review */
export async function POST(request: Request) {
  const jar = await cookies();
  const token = jar.get(ADMIN_SESSION_COOKIE)?.value;
  if (!token) {
    return NextResponse.json({ error: 'Admin session required' }, { status: 401 });
  }

  const path = new URL(request.url).searchParams.get('path');
  if (!path || !path.startsWith('/') || path.includes('//')) {
    return NextResponse.json({ error: 'Invalid path' }, { status: 400 });
  }

  let upstream: Response;
  try {
    upstream = await fetch(`${API_BASE}/api/v1/admin${path}`, {
      method: request.method,
      headers: {
        'content-type': 'application/json',
        cookie: `${ADMIN_SESSION_COOKIE}=${token}`,
      },
      body: request.body ? await request.text() : undefined,
    });
  } catch {
    return NextResponse.json({ error: 'Admin API unavailable' }, { status: 503 });
  }

  if (!upstream.ok) {
    const payload = (await upstream.json().catch(() => null)) as {
      error?: { message?: string };
    } | null;
    return NextResponse.json(
      { error: payload?.error?.message ?? `Request failed (${upstream.status})` },
      { status: upstream.status },
    );
  }

  return NextResponse.json({ ok: true });
}
