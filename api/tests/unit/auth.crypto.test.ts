import { beforeAll, describe, expect, it } from 'vitest';
import {
  generateRefreshToken,
  generateSessionId,
  generateSixDigitCode,
  hashAuthCode,
  hashPassword,
  hashRefreshSecret,
  parseRefreshToken,
  signAccessToken,
  signResetToken,
  verifyAccessToken,
  verifyAuthCodeHash,
  verifyPassword,
  verifyRefreshSecretHash,
  verifyResetToken,
} from '@/modules/auth/auth.crypto.js';
import { initTestConfig } from '../helpers/test-runtime.js';

describe('auth.crypto', () => {
  beforeAll(() => {
    initTestConfig();
  });

  it('hashes and verifies passwords with Argon2id', async () => {
    const hash = await hashPassword('StrongPassword123!');
    expect(hash.startsWith('$argon2id$')).toBe(true);
    expect(await verifyPassword({ hash, password: 'StrongPassword123!' })).toBe(true);
    expect(await verifyPassword({ hash, password: 'WrongPassword123!' })).toBe(false);
  });

  it('generates 6-digit codes and verifies HMAC-SHA-256 hashes', () => {
    const code = generateSixDigitCode();
    expect(code).toMatch(/^\d{6}$/);
    const hash = hashAuthCode(code);
    expect(hash).toHaveLength(64);
    expect(verifyAuthCodeHash({ code, expectedHash: hash })).toBe(true);
    expect(verifyAuthCodeHash({ code: '000000', expectedHash: hash })).toBe(code === '000000');
  });

  it('generates, parses, and hashes opaque refresh tokens', () => {
    const sessionId = generateSessionId();
    const { rawToken, secret } = generateRefreshToken(sessionId);
    const parsed = parseRefreshToken(rawToken);
    expect(parsed).toEqual({ sessionId, secret });
    expect(parseRefreshToken('invalid-no-dot')).toBeNull();
    expect(parseRefreshToken('a.b.c')).toBeNull();

    const hash = hashRefreshSecret(secret);
    expect(verifyRefreshSecretHash({ secret, expectedHash: hash })).toBe(true);
    expect(verifyRefreshSecretHash({ secret: 'wrong', expectedHash: hash })).toBe(false);
  });

  it('signs and verifies access tokens and reset tokens separately', async () => {
    const access = await signAccessToken({ userId: 42, sessionId: 'sess-1' });
    expect(await verifyAccessToken(access)).toEqual({ userId: 42, sessionId: 'sess-1' });
    await expect(verifyResetToken(access)).rejects.toThrow();

    const reset = await signResetToken({ userId: 42, authCodeId: 9 });
    expect(await verifyResetToken(reset)).toEqual({ userId: 42, authCodeId: 9 });
    await expect(verifyAccessToken(reset)).rejects.toThrow();
  });
});
