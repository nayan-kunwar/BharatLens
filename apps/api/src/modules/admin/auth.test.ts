import { describe, expect, it } from 'vitest';
import { AdminAuth } from './auth.js';

const config = {
  password: 'correct-horse-battery',
  ttlHours: 12,
  secureCookies: false,
};

describe('AdminAuth sessions', () => {
  it('round-trips a session token', () => {
    const auth = new AdminAuth(config);
    const { token, expiresAt } = auth.issueSession();

    expect(auth.verifySession(token)).toBe(true);
    expect(expiresAt.getTime()).toBeGreaterThan(Date.now());
  });

  it('rejects expired tokens', () => {
    const auth = new AdminAuth(config);
    const past = new Date(Date.now() - 13 * 60 * 60 * 1000);
    const { token } = auth.issueSession(past);

    expect(auth.verifySession(token)).toBe(false);
  });

  it('rejects tampered payloads and signatures', () => {
    const auth = new AdminAuth(config);
    const { token } = auth.issueSession();
    const [sessionId, expiry] = token.split('.');

    const forgedPayload = `${sessionId}.${expiry}`.replace(expiry!, '9999999999');
    expect(auth.verifySession(`${forgedPayload}.${token.split('.')[2]}`)).toBe(false);
    expect(auth.verifySession(`${token}x`)).toBe(false);
    expect(auth.verifySession(undefined)).toBe(false);
  });

  it('rejects tokens signed with a different password', () => {
    const issuer = new AdminAuth(config);
    const verifier = new AdminAuth({ ...config, password: 'another-password-123' });
    const { token } = issuer.issueSession();

    expect(verifier.verifySession(token)).toBe(false);
  });

  it('checks passwords without timing leaks on length mismatch', () => {
    const auth = new AdminAuth(config);
    expect(auth.verifyPassword('correct-horse-battery')).toBe(true);
    expect(auth.verifyPassword('short')).toBe(false);
    expect(auth.verifyPassword('wrong-but-correct-length!')).toBe(false);
  });

  it('expires sessions when the password rotates (key derivation)', () => {
    const oldAuth = new AdminAuth({ ...config, password: 'old-password-1' });
    const newAuth = new AdminAuth({ ...config, password: 'new-password-2' });
    const { token } = oldAuth.issueSession();

    expect(newAuth.verifySession(token)).toBe(false);
  });
});
