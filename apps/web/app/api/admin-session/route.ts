import { NextResponse } from 'next/server';

const ADMIN_SESSION_COOKIE = 'bharatlens_admin_session';
const API_BASE = (process.env.API_BASE_URL ?? 'http://localhost:3001').replace(/\/$/, '');

/** Proxies login so API_BASE_URL stays server-side and forwards the session cookie. */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { password?: string } | null;
  if (!body?.password) {
    return NextResponse.json({ error: 'Password is required' }, { status: 400 });
  }

  let upstream: Response;
  try {
    upstream = await fetch(`${API_BASE}/api/v1/admin/auth/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ password: body.password }),
    });
  } catch {
    return NextResponse.json({ error: 'Admin API unavailable' }, { status: 503 });
  }

  const payload = await upstream.json().catch(() => null);
  if (!upstream.ok) {
    return NextResponse.json(
      { error: payload?.error?.message ?? 'Login failed' },
      { status: upstream.status },
    );
  }

  const setCookie = upstream.headers.get('set-cookie');
  const tokenMatch = /bharatlens_admin_session=([^;]+)/.exec(setCookie ?? '');
  const expiresMatch = /expires=([^;]+)/i.exec(setCookie ?? '');

  const response = NextResponse.json({ authenticated: true });
  if (tokenMatch) {
    response.cookies.set(ADMIN_SESSION_COOKIE, tokenMatch[1]!, {
      httpOnly: true,
      sameSite: 'lax',
      expires: expiresMatch ? new Date(expiresMatch[1]!) : undefined,
      path: '/',
    });
  }

  return response;
}

export async function DELETE() {
  try {
    await fetch(`${API_BASE}/api/v1/admin/auth/logout`, { method: 'POST' });
  } catch {
    // Clearing locally is what matters for the console session.
  }

  const response = NextResponse.json({ authenticated: false });
  response.cookies.set(ADMIN_SESSION_COOKIE, '', { httpOnly: true, path: '/', maxAge: 0 });
  return response;
}
