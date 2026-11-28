import express from 'express';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '@/app.js';
import { authenticate } from '@/middleware/authenticate.js';
import { AUTH_ERROR_CODES, REFRESH_COOKIE_NAME } from '@/modules/auth/auth.constants.js';
import { authRouter } from '@/modules/auth/auth.routes.js';
import type * as AuthCrypto from '@/modules/auth/auth.crypto.js';
import { createTestRuntime } from '../helpers/test-runtime.js';
import type { RecordedEmailSender, TestRuntime } from '../helpers/test-runtime.js';

vi.mock('@/infra/email/email-sender.js');
// Limiter counters are module-level and not reset by runtime.reset(); the real wrapper is tested in app.test.ts.
vi.mock('@/middleware/rate-limit.js', () => ({
  createRateLimiter: () => (_req: unknown, _res: unknown, next: () => void) => next(),
}));
vi.mock('@/modules/auth/auth.crypto.js', async (importOriginal) => {
  const actual = await importOriginal<typeof AuthCrypto>();
  return {
    ...actual,
    hashPassword: async (password: string) => `mock-hash:${password}`,
    verifyPassword: async (input: { hash: string; password: string }) =>
      input.hash === `mock-hash:${input.password}`,
  };
});

function extractCookieHeader(setCookie: string[] | string | undefined): string {
  const list = Array.isArray(setCookie) ? setCookie : setCookie ? [setCookie] : [];
  const match = list.find((c) => c.startsWith(`${REFRESH_COOKIE_NAME}=`));
  if (!match) {
    throw new Error('Refresh cookie not set');
  }
  return match.split(';')[0];
}

describe('Auth HTTP integration (/api/v1/auth)', () => {
  let runtime: TestRuntime;
  let emailSender: RecordedEmailSender;
  let app: express.Express;

  beforeAll(async () => {
    runtime = await createTestRuntime();
    emailSender = runtime.emailSender;

    const router = express.Router();
    router.use('/auth', authRouter);
    router.get('/protected', authenticate, (_req, res) => {
      res.status(200).json({ data: res.locals.auth });
    });
    app = createApp(router);
  });

  afterAll(async () => {
    await runtime.close();
  });

  beforeEach(async () => {
    await runtime.reset();
  });

  it('completes sign-up -> verify-email -> /auth/me -> refresh -> sign-out', async () => {
    const weakSignUp = await request(app).post('/api/v1/auth/sign-up').send({
      name: 'Hana Ehab',
      email: 'hana@acm.com',
      password: 'short',
    });
    expect(weakSignUp.status).toBe(422);
    expect(weakSignUp.body).toEqual({
      error: {
        code: 'VALIDATION_ERROR',
        details: [{ field: 'password', code: 'too_small' }],
      },
    });

    const signUpRes = await request(app).post('/api/v1/auth/sign-up').send({
      name: '  Hana Ehab  ',
      email: '  Hana@ACM.com  ',
      password: 'StrongPassword123!',
    });
    expect(signUpRes.status).toBe(202);
    expect(signUpRes.text).toBe('');

    const code = emailSender.latestCodeFor({ email: 'hana@acm.com', type: 'verification' });

    const verifyRes = await request(app).post('/api/v1/auth/verify-email').send({
      email: 'hana@acm.com',
      code,
      password: 'StrongPassword123!',
    });
    expect(verifyRes.status).toBe(200);
    expect(verifyRes.body.data.accessToken).toBeTruthy();
    expect(verifyRes.body.data.user).toMatchObject({
      name: 'Hana Ehab',
      email: 'hana@acm.com',
      isVerified: true,
    });
    expect(verifyRes.body.data.user.passwordHash).toBeUndefined();

    const duplicateSignUp = await request(app).post('/api/v1/auth/sign-up').send({
      name: 'Hana Ehab',
      email: 'hana@acm.com',
      password: 'StrongPassword123!',
    });
    expect(duplicateSignUp.status).toBe(409);
    expect(duplicateSignUp.body).toEqual({
      error: { code: AUTH_ERROR_CODES.EMAIL_ALREADY_EXISTS },
    });

    const rawSetCookie = verifyRes.headers['set-cookie'] as unknown as string[];
    expect(rawSetCookie[0]).toContain('HttpOnly');
    expect(rawSetCookie[0]).toContain('SameSite=Lax');
    expect(rawSetCookie[0]).toContain('Path=/api/v1/auth');

    const cookie1 = extractCookieHeader(rawSetCookie);

    const unauthMeRes = await request(app).get('/api/v1/auth/me');
    expect(unauthMeRes.status).toBe(401);
    expect(unauthMeRes.body).toEqual({ error: { code: AUTH_ERROR_CODES.UNAUTHENTICATED } });

    const meRes = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${verifyRes.body.data.accessToken}`);
    expect(meRes.status).toBe(200);
    expect(meRes.body.data).toMatchObject({
      id: verifyRes.body.data.user.id,
      email: 'hana@acm.com',
      isVerified: true,
    });

    const unauthRes = await request(app).get('/api/v1/protected');
    expect(unauthRes.status).toBe(401);
    expect(unauthRes.body).toEqual({ error: { code: AUTH_ERROR_CODES.UNAUTHENTICATED } });

    const authRes = await request(app)
      .get('/api/v1/protected')
      .set('Authorization', `Bearer ${verifyRes.body.data.accessToken}`);
    expect(authRes.status).toBe(200);
    expect(authRes.body.data.userId).toBe(verifyRes.body.data.user.id);

    const refreshRes = await request(app).post('/api/v1/auth/refresh').set('Cookie', cookie1);
    expect(refreshRes.status).toBe(200);
    expect(refreshRes.body.data.accessToken).toBeTruthy();
    const cookie2 = extractCookieHeader(refreshRes.headers['set-cookie']);
    expect(cookie2).not.toBe(cookie1);

    const signOutRes = await request(app).post('/api/v1/auth/sign-out').set('Cookie', cookie2);
    expect(signOutRes.status).toBe(204);

    const afterSignOut = await request(app).post('/api/v1/auth/refresh').set('Cookie', cookie2);
    expect(afterSignOut.status).toBe(401);
    expect(afterSignOut.body).toEqual({ error: { code: AUTH_ERROR_CODES.SESSION_EXPIRED } });

    const idempotentSignOut = await request(app).post('/api/v1/auth/sign-out');
    expect(idempotentSignOut.status).toBe(204);
  });

  it('completes 2-step password reset via HTTP and returns 422 on validation errors', async () => {
    const badSignIn = await request(app).post('/api/v1/auth/sign-in').send({});
    expect(badSignIn.status).toBe(422);
    expect(badSignIn.body.error.code).toBe('VALIDATION_ERROR');
    expect(badSignIn.body.error.details.length).toBeGreaterThan(0);

    await request(app).post('/api/v1/auth/sign-up').send({
      name: 'Hana',
      email: 'hana@acm.com',
      password: 'StrongPassword123!',
    });

    const unknownResetRes = await request(app)
      .post('/api/v1/auth/password-reset/request')
      .send({ email: 'missing@acm.com' });
    expect(unknownResetRes.status).toBe(404);
    expect(unknownResetRes.body).toEqual({
      error: { code: 'NOT_FOUND', details: [{ resource: 'user' }] },
    });

    const reqRes = await request(app)
      .post('/api/v1/auth/password-reset/request')
      .send({ email: 'hana@acm.com' });
    expect(reqRes.status).toBe(202);

    const resetCode = emailSender.latestCodeFor({ email: 'hana@acm.com', type: 'password_reset' });

    const verifyReset = await request(app)
      .post('/api/v1/auth/password-reset/verify')
      .send({ email: 'hana@acm.com', code: resetCode });
    expect(verifyReset.status).toBe(200);
    const { resetToken } = verifyReset.body.data;
    expect(resetToken).toBeTruthy();

    const weakConfirmRes = await request(app)
      .post('/api/v1/auth/password-reset/confirm')
      .send({ resetToken, newPassword: 'short' });
    expect(weakConfirmRes.status).toBe(422);
    expect(weakConfirmRes.body).toEqual({
      error: {
        code: 'VALIDATION_ERROR',
        details: [{ field: 'newPassword', code: 'too_small' }],
      },
    });

    const confirmRes = await request(app)
      .post('/api/v1/auth/password-reset/confirm')
      .send({ resetToken, newPassword: 'NewStrongPassword123!' });
    expect(confirmRes.status).toBe(204);

    const signInRes = await request(app).post('/api/v1/auth/sign-in').send({
      email: 'hana@acm.com',
      password: 'NewStrongPassword123!',
    });
    expect(signInRes.status).toBe(200);
    expect(signInRes.body.data.user.isVerified).toBe(true);
  });

  it('rejects cookie-authenticated requests from disallowed origins', async () => {
    const blocked = await request(app)
      .post('/api/v1/auth/refresh')
      .set('Origin', 'https://evil.example');
    expect(blocked.status).toBe(403);
    expect(blocked.body).toEqual({ error: { code: 'FORBIDDEN' } });

    const allowed = await request(app)
      .post('/api/v1/auth/refresh')
      .set('Origin', 'http://localhost:3000');
    expect(allowed.status).toBe(401);
  });
});
