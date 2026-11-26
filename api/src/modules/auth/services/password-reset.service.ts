import { getDb } from '../../../config/db.js';
import { NotFoundError, UnprocessableEntityError } from '../../../errors/app-error.js';
import { getEmailSender } from '../../../infra/email/email-sender.js';
import {
  AUTH_CODE_MAX_ATTEMPTS,
  AUTH_CODE_PURPOSE,
  AUTH_CODE_TTL_MINUTES,
  AUTH_ERROR_CODES,
  USER_RESOURCE_NAME,
} from '../auth.constants.js';
import { hashPassword, signResetToken, verifyResetToken } from '../auth.crypto.js';
import {
  consumeAuthCode,
  findAuthCodeById,
  findUserByEmail,
  revokeAllUserSessions,
  updateUserPasswordAndVerify,
} from '../auth.repository.js';
import {
  assertCooldownAllowed,
  issueAuthCode,
  normalizeEmail,
  sendEmailSafely,
  verifyActiveAuthCode,
} from './auth-code.helper.js';

export async function requestPasswordReset(input: {
  email: string;
  clientIp: string;
}): Promise<void> {
  const email = normalizeEmail(input.email);
  const now = new Date();
  assertCooldownAllowed({ action: 'password_reset', email, clientIp: input.clientIp, now });

  const user = await findUserByEmail(email);
  if (!user) {
    throw new NotFoundError('User not found', 'NOT_FOUND', [{ resource: USER_RESOURCE_NAME }]);
  }

  const code = await getDb().transaction((tx) =>
    issueAuthCode(
      {
        userId: user.id,
        purpose: AUTH_CODE_PURPOSE.PASSWORD_RESET,
        now,
        shouldInvalidatePrior: true,
      },
      tx,
    ),
  );

  await sendEmailSafely('password_reset', () =>
    getEmailSender().sendPasswordResetCode({
      to: email,
      code,
      expiresInMinutes: AUTH_CODE_TTL_MINUTES,
    }),
  );
}

export async function verifyPasswordResetCode(input: {
  email: string;
  code: string;
}): Promise<{ resetToken: string }> {
  const email = normalizeEmail(input.email);
  const now = new Date();

  const txResult = await getDb().transaction(async (tx) => {
    const user = await findUserByEmail(email, tx);
    if (!user) {
      return { isValid: false as const, reason: 'invalid' as const };
    }

    const check = await verifyActiveAuthCode(
      { userId: user.id, purpose: AUTH_CODE_PURPOSE.PASSWORD_RESET, code: input.code, now },
      tx,
    );
    if (!check.isValid) {
      return check;
    }

    return { isValid: true as const, userId: user.id, authCodeId: check.authCode.id };
  });

  if (!txResult.isValid) {
    const errorCode =
      txResult.reason === 'expired'
        ? AUTH_ERROR_CODES.RESET_CODE_EXPIRED
        : AUTH_ERROR_CODES.INVALID_RESET_CODE;
    throw new UnprocessableEntityError('Password reset code check failed', errorCode);
  }

  const resetToken = await signResetToken({
    userId: txResult.userId,
    authCodeId: txResult.authCodeId,
  });
  return { resetToken };
}

export async function confirmPasswordReset(input: {
  resetToken: string;
  newPassword: string;
}): Promise<void> {
  let payload: { userId: number; authCodeId: number };
  try {
    payload = await verifyResetToken(input.resetToken);
  } catch (err) {
    if (err instanceof Error && err.name === 'JWTExpired') {
      throw new UnprocessableEntityError(
        'Password reset token expired',
        AUTH_ERROR_CODES.RESET_CODE_EXPIRED,
        undefined,
        { cause: err },
      );
    }
    throw new UnprocessableEntityError(
      'Invalid password reset token',
      AUTH_ERROR_CODES.INVALID_RESET_CODE,
      undefined,
      { cause: err },
    );
  }

  const now = new Date();
  const authCode = await findAuthCodeById(payload.authCodeId);

  if (
    !authCode ||
    authCode.userId !== payload.userId ||
    authCode.purpose !== AUTH_CODE_PURPOSE.PASSWORD_RESET ||
    authCode.consumedAt !== null ||
    authCode.attempts >= AUTH_CODE_MAX_ATTEMPTS
  ) {
    throw new UnprocessableEntityError(
      'Invalid password reset code',
      AUTH_ERROR_CODES.INVALID_RESET_CODE,
    );
  }

  if (authCode.expiresAt.getTime() <= now.getTime()) {
    throw new UnprocessableEntityError(
      'Password reset code expired',
      AUTH_ERROR_CODES.RESET_CODE_EXPIRED,
    );
  }

  // Hash password outside the DB transaction to avoid holding a connection during Argon2id.
  const passwordHash = await hashPassword(input.newPassword);

  await getDb().transaction(async (tx) => {
    const isConsumed = await consumeAuthCode({ authCodeId: authCode.id, now }, tx);
    if (!isConsumed) {
      throw new UnprocessableEntityError(
        'Invalid password reset code',
        AUTH_ERROR_CODES.INVALID_RESET_CODE,
      );
    }

    await updateUserPasswordAndVerify({ userId: payload.userId, passwordHash }, tx);
    await revokeAllUserSessions({ userId: payload.userId, revokedAt: now }, tx);
  });
}
