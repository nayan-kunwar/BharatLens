import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { DomainError, ErrorCode } from '@bharatlens/shared';

export const SESSION_COOKIE_NAME = 'bharatlens_admin_session';

export type AdminSessionConfig = {
  password: string;
  ttlHours: number;
  secureCookies: boolean;
};

/**
 * Stateless admin sessions: `{payload}.{signature}` where payload is
 * `sessionId.expiryEpochSeconds`. The HMAC key is derived from the admin
 * password, so rotating the password invalidates every live session —
 * desirable for a single-operator console and avoids a second secret.
 *
 * Not a replacement for real user accounts (M10 scope note in AGENTS.md);
 * there are no roles because there is exactly one operator.
 */
export class AdminAuth {
  constructor(private readonly config: AdminSessionConfig) {}

  private sign(value: string): string {
    return createHmac('sha256', this.config.password).update(value).digest('base64url');
  }

  verifyPassword(candidate: string): boolean {
    return safeEqual(candidate, this.config.password);
  }

  issueSession(now = new Date()): { token: string; expiresAt: Date } {
    const expiresAt = new Date(now.getTime() + this.config.ttlHours * 60 * 60 * 1000);
    const payload = `${randomUUID()}.${Math.floor(expiresAt.getTime() / 1000)}`;
    return { token: `${payload}.${this.sign(payload)}`, expiresAt };
  }

  verifySession(token: string | undefined, now = new Date()): boolean {
    if (!token) {
      return false;
    }

    const parts = token.split('.');
    if (parts.length !== 3) {
      return false;
    }

    const [sessionId, expiry, signature] = parts;
    const payload = `${sessionId}.${expiry}`;

    const expected = this.sign(payload);
    if (!safeEqual(signature ?? '', expected)) {
      return false;
    }

    const expirySeconds = Number.parseInt(expiry ?? '', 10);
    if (!Number.isFinite(expirySeconds)) {
      return false;
    }

    return expirySeconds * 1000 > now.getTime();
  }

  setSessionCookie(reply: FastifyReply, token: string, expiresAt: Date): void {
    void reply.setCookie(SESSION_COOKIE_NAME, token, {
      path: '/api/v1/admin',
      httpOnly: true,
      sameSite: 'lax',
      secure: this.config.secureCookies,
      expires: expiresAt,
    });
  }

  clearSessionCookie(reply: FastifyReply): void {
    void reply.setCookie(SESSION_COOKIE_NAME, '', {
      path: '/api/v1/admin',
      httpOnly: true,
      sameSite: 'lax',
      secure: this.config.secureCookies,
      maxAge: 0,
    });
  }

  /** Fastify preHandler guard. Throws DomainErrors handled by the error plugin. */
  requireAdmin(request: FastifyRequest): void {
    const token =
      request.cookies[SESSION_COOKIE_NAME] ?? bearerToken(request.headers.authorization ?? '');

    if (!token || !this.verifySession(token)) {
      throw new DomainError(ErrorCode.UNAUTHORIZED, 'Admin authentication required');
    }
  }
}

function bearerToken(header: string): string | undefined {
  const match = /^Bearer\s+(.+)$/i.exec(header.trim());
  return match?.[1];
}

function safeEqual(left: string, right: string): boolean {
  const leftBytes = Buffer.from(left, 'utf8');
  const rightBytes = Buffer.from(right, 'utf8');
  // Lengths must match for timingSafeEqual; leaking length via early exit is
  // acceptable (password/token lengths are not secret here), but we still do a
  // constant-time comparison of equal-length buffers.
  if (leftBytes.length !== rightBytes.length) {
    // Compare against self to keep timing uniform, then fail.
    timingSafeEqual(leftBytes, leftBytes);
    return false;
  }

  return timingSafeEqual(leftBytes, rightBytes);
}
