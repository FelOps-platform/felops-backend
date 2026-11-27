import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  AUTH_CODE_TTL_MS,
  AUTH_ERROR_CODES,
  REFRESH_GRACE_WINDOW_MS,
} from '@/modules/auth/auth.constants.js';
import { findUserByEmail } from '@/modules/auth/auth.repository.js';
import {
  confirmPasswordReset,
  requestPasswordReset,
  verifyPasswordResetCode,
} from '@/modules/auth/services/password-reset.service.js';
import {
  resendVerification,
  signUp,
  verifyEmail,
} from '@/modules/auth/services/registration.service.js';
import { getCurrentUser, refresh, signIn } from '@/modules/auth/services/session.service.js';
import type * as AuthCrypto from '@/modules/auth/auth.crypto.js';
import { createTestRuntime } from '../helpers/test-runtime.js';
import type { RecordedEmailSender, TestRuntime } from '../helpers/test-runtime.js';

vi.mock('@/infra/email/email-sender.js');
vi.mock('@/modules/auth/auth.crypto.js', async (importOriginal) => {
  const actual = await importOriginal<typeof AuthCrypto>();
  return {
    ...actual,
    hashPassword: async (password: string) => `mock-hash:${password}`,
    verifyPassword: async (input: { hash: string; password: string }) =>
      input.hash === `mock-hash:${input.password}`,
  };
});

describe('auth services (PGlite PostgreSQL)', () => {
  let runtime: TestRuntime;
  let emailSender: RecordedEmailSender;

  beforeAll(async () => {
    runtime = await createTestRuntime();
    emailSender = runtime.emailSender;
  });

  afterAll(async () => {
    await runtime.close();
  });

  beforeEach(async () => {
    await runtime.reset();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-26T12:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('replaces any pre-verification password with the verifier password and returns 409 once verified', async () => {
    await signUp({ name: 'Hana', email: 'hana@acm.com', password: 'AttackerPassword123!' });
    const firstCode = emailSender.latestCodeFor({ email: 'hana@acm.com', type: 'verification' });

    await signUp({ name: 'Hana', email: 'hana@acm.com', password: 'VictimPassword123!' });
    const secondCode = emailSender.latestCodeFor({ email: 'hana@acm.com', type: 'verification' });

    await expect(
      verifyEmail({
        email: 'hana@acm.com',
        code: firstCode,
        password: 'VerifierPassword123!',
        userAgent: null,
      }),
    ).rejects.toMatchObject({ statusCode: 422, code: AUTH_ERROR_CODES.INVALID_VERIFICATION_CODE });

    const verified = await verifyEmail({
      email: 'hana@acm.com',
      code: secondCode,
      password: 'VerifierPassword123!',
      userAgent: 'Vitest',
    });
    expect(verified.user.name).toBe('Hana');
    expect(verified.user.isVerified).toBe(true);
    expect(verified.accessToken).toBeTruthy();
    expect(verified.refreshToken).toContain('.');

    const me = await getCurrentUser(verified.user.id);
    expect(me.email).toBe('hana@acm.com');

    await expect(
      signIn({ email: 'hana@acm.com', password: 'AttackerPassword123!', userAgent: null }),
    ).rejects.toMatchObject({ statusCode: 401, code: AUTH_ERROR_CODES.INVALID_CREDENTIALS });

    await expect(
      signIn({ email: 'hana@acm.com', password: 'VictimPassword123!', userAgent: null }),
    ).rejects.toMatchObject({ statusCode: 401, code: AUTH_ERROR_CODES.INVALID_CREDENTIALS });

    const signedIn = await signIn({
      email: 'hana@acm.com',
      password: 'VerifierPassword123!',
      userAgent: null,
    });
    expect(signedIn.accessToken).toBeTruthy();

    await expect(
      signUp({ name: 'Attacker', email: 'hana@acm.com', password: 'AttackerPassword123!' }),
    ).rejects.toMatchObject({ statusCode: 409, code: AUTH_ERROR_CODES.EMAIL_ALREADY_EXISTS });

    const saved = await findUserByEmail('hana@acm.com');
    expect(saved?.name).toBe('Hana');
  });

  it('sets the verifier password when an attacker signs up after the victim', async () => {
    await signUp({ name: 'Hana', email: 'hana@acm.com', password: 'VictimPassword123!' });
    await signUp({ name: 'Hana', email: 'hana@acm.com', password: 'AttackerPassword123!' });
    const code = emailSender.latestCodeFor({ email: 'hana@acm.com', type: 'verification' });

    const verified = await verifyEmail({
      email: 'hana@acm.com',
      code,
      password: 'VerifierPassword123!',
      userAgent: null,
    });
    expect(verified.user.isVerified).toBe(true);

    await expect(
      signIn({ email: 'hana@acm.com', password: 'AttackerPassword123!', userAgent: null }),
    ).rejects.toMatchObject({ statusCode: 401, code: AUTH_ERROR_CODES.INVALID_CREDENTIALS });

    await expect(
      signIn({ email: 'hana@acm.com', password: 'VictimPassword123!', userAgent: null }),
    ).rejects.toMatchObject({ statusCode: 401, code: AUTH_ERROR_CODES.INVALID_CREDENTIALS });

    const signedIn = await signIn({
      email: 'hana@acm.com',
      password: 'VerifierPassword123!',
      userAgent: null,
    });
    expect(signedIn.accessToken).toBeTruthy();
  });

  it('enforces hash-before-expiry ordering and 5-attempt lockout on verification codes', async () => {
    await signUp({ name: 'Hana', email: 'hana@acm.com', password: 'StrongPassword123!' });
    const validCode = emailSender.latestCodeFor({ email: 'hana@acm.com', type: 'verification' });
    const wrongCode = validCode === '000000' ? '111111' : '000000';

    vi.advanceTimersByTime(AUTH_CODE_TTL_MS + 1000);
    await expect(
      verifyEmail({
        email: 'hana@acm.com',
        code: wrongCode,
        password: 'StrongPassword123!',
        userAgent: null,
      }),
    ).rejects.toMatchObject({ statusCode: 422, code: AUTH_ERROR_CODES.INVALID_VERIFICATION_CODE });

    await expect(
      verifyEmail({
        email: 'hana@acm.com',
        code: validCode,
        password: 'StrongPassword123!',
        userAgent: null,
      }),
    ).rejects.toMatchObject({ statusCode: 422, code: AUTH_ERROR_CODES.VERIFICATION_CODE_EXPIRED });

    for (let i = 0; i < 4; i++) {
      await expect(
        verifyEmail({
          email: 'hana@acm.com',
          code: wrongCode,
          password: 'StrongPassword123!',
          userAgent: null,
        }),
      ).rejects.toMatchObject({
        statusCode: 422,
        code: AUTH_ERROR_CODES.INVALID_VERIFICATION_CODE,
      });
    }

    await expect(
      verifyEmail({
        email: 'hana@acm.com',
        code: validCode,
        password: 'StrongPassword123!',
        userAgent: null,
      }),
    ).rejects.toMatchObject({ statusCode: 422, code: AUTH_ERROR_CODES.INVALID_VERIFICATION_CODE });
  });

  it('returns explicit 404/409 errors on resend', async () => {
    await expect(resendVerification({ email: 'ghost@acm.com' })).rejects.toMatchObject({
      statusCode: 404,
      code: 'NOT_FOUND',
      details: [{ resource: 'user' }],
    });
    expect(emailSender.sent).toHaveLength(0);

    await signUp({ name: 'Hana', email: 'hana@acm.com', password: 'StrongPassword123!' });
    const code = emailSender.latestCodeFor({ email: 'hana@acm.com', type: 'verification' });
    await verifyEmail({
      email: 'hana@acm.com',
      code,
      password: 'StrongPassword123!',
      userAgent: null,
    });

    await expect(resendVerification({ email: 'hana@acm.com' })).rejects.toMatchObject({
      statusCode: 409,
      code: AUTH_ERROR_CODES.EMAIL_ALREADY_VERIFIED,
    });
  });

  it('returns 403 EMAIL_NOT_VERIFIED for unverified sign-in and 401 INVALID_CREDENTIALS for wrong password', async () => {
    await signUp({ name: 'Hana', email: 'hana@acm.com', password: 'StrongPassword123!' });

    await expect(
      signIn({ email: 'hana@acm.com', password: 'WrongPassword123!', userAgent: null }),
    ).rejects.toMatchObject({ statusCode: 401, code: AUTH_ERROR_CODES.INVALID_CREDENTIALS });

    await expect(
      signIn({ email: 'missing@acm.com', password: 'WrongPassword123!', userAgent: null }),
    ).rejects.toMatchObject({ statusCode: 401, code: AUTH_ERROR_CODES.INVALID_CREDENTIALS });

    await expect(
      signIn({ email: 'hana@acm.com', password: 'StrongPassword123!', userAgent: null }),
    ).rejects.toMatchObject({ statusCode: 403, code: AUTH_ERROR_CODES.EMAIL_NOT_VERIFIED });
  });

  it('rotates refresh tokens, honors concurrent grace window, and revokes on stale reuse outside grace', async () => {
    await signUp({ name: 'Hana', email: 'hana@acm.com', password: 'StrongPassword123!' });
    const code = emailSender.latestCodeFor({ email: 'hana@acm.com', type: 'verification' });
    const session1 = await verifyEmail({
      email: 'hana@acm.com',
      code,
      password: 'StrongPassword123!',
      userAgent: null,
    });

    const rotated = await refresh({ rawRefreshToken: session1.refreshToken });
    expect(rotated.refreshToken).not.toBe(session1.refreshToken);

    const concurrent = await refresh({ rawRefreshToken: session1.refreshToken });
    expect(concurrent.refreshToken).toBe(rotated.refreshToken);

    vi.advanceTimersByTime(REFRESH_GRACE_WINDOW_MS + 1000);
    await expect(refresh({ rawRefreshToken: session1.refreshToken })).rejects.toMatchObject({
      statusCode: 401,
      code: AUTH_ERROR_CODES.SESSION_EXPIRED,
    });

    await expect(refresh({ rawRefreshToken: rotated.refreshToken })).rejects.toMatchObject({
      statusCode: 401,
      code: AUTH_ERROR_CODES.SESSION_EXPIRED,
    });
  });

  it('supports 2-step password reset and reports email outages as upstream failures', async () => {
    await signUp({ name: 'Hana', email: 'hana@acm.com', password: 'StrongPassword123!' });
    const verifyCode = emailSender.latestCodeFor({ email: 'hana@acm.com', type: 'verification' });
    const verified = await verifyEmail({
      email: 'hana@acm.com',
      code: verifyCode,
      password: 'StrongPassword123!',
      userAgent: null,
    });

    await expect(requestPasswordReset({ email: 'ghost@acm.com' })).rejects.toMatchObject({
      statusCode: 404,
      code: 'NOT_FOUND',
      details: [{ resource: 'user' }],
    });

    await requestPasswordReset({ email: 'hana@acm.com' });
    const resetCode = emailSender.latestCodeFor({ email: 'hana@acm.com', type: 'password_reset' });

    const { resetToken } = await verifyPasswordResetCode({
      email: 'hana@acm.com',
      code: resetCode,
    });
    expect(resetToken).toBeTruthy();

    await confirmPasswordReset({ resetToken, newPassword: 'BrandNewStrongPassword123!' });

    await expect(
      confirmPasswordReset({ resetToken, newPassword: 'AnotherStrongPassword123!' }),
    ).rejects.toMatchObject({ statusCode: 422, code: AUTH_ERROR_CODES.INVALID_RESET_CODE });

    await expect(refresh({ rawRefreshToken: verified.refreshToken })).rejects.toMatchObject({
      statusCode: 401,
      code: AUTH_ERROR_CODES.SESSION_EXPIRED,
    });

    const signedIn = await signIn({
      email: 'hana@acm.com',
      password: 'BrandNewStrongPassword123!',
      userAgent: null,
    });
    expect(signedIn.accessToken).toBeTruthy();

    await requestPasswordReset({ email: 'hana@acm.com' });
    const resetCode2 = emailSender.latestCodeFor({
      email: 'hana@acm.com',
      type: 'password_reset',
    });
    const wrongCode = resetCode2 === '000000' ? '111111' : '000000';

    vi.advanceTimersByTime(AUTH_CODE_TTL_MS + 1000);
    await expect(
      verifyPasswordResetCode({ email: 'hana@acm.com', code: wrongCode }),
    ).rejects.toMatchObject({ statusCode: 422, code: AUTH_ERROR_CODES.INVALID_RESET_CODE });

    await expect(
      verifyPasswordResetCode({ email: 'hana@acm.com', code: resetCode2 }),
    ).rejects.toMatchObject({ statusCode: 422, code: AUTH_ERROR_CODES.RESET_CODE_EXPIRED });

    const originalSendReset = emailSender.sendPasswordResetCode.bind(emailSender);
    emailSender.sendPasswordResetCode = async () => {
      throw new Error('EmailJS outage');
    };
    try {
      await expect(requestPasswordReset({ email: 'hana@acm.com' })).rejects.toMatchObject({
        statusCode: 503,
        code: 'UPSTREAM_UNAVAILABLE',
        details: [{ service: 'email' }],
      });
    } finally {
      emailSender.sendPasswordResetCode = originalSendReset;
    }
  });
});
