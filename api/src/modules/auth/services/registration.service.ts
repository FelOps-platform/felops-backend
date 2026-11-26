import { getDb } from '../../../config/db.js';
import {
  ConflictError,
  NotFoundError,
  UnprocessableEntityError,
} from '../../../errors/app-error.js';
import { extractPgCode, PG_ERROR_CODES } from '../../../errors/error-normalizer.js';
import { sendVerificationCode } from '../../../infra/email/email-sender.js';
import {
  AUTH_CODE_PURPOSE,
  AUTH_CODE_TTL_MINUTES,
  AUTH_ERROR_CODES,
  USER_RESOURCE_NAME,
} from '../auth.constants.js';
import { hashPassword } from '../auth.crypto.js';
import { toUserDto } from '../auth.mapper.js';
import {
  consumeAuthCode,
  createUser,
  findUserByEmail,
  markUserVerified,
  updateUnverifiedUser,
} from '../auth.repository.js';
import {
  assertCooldownAllowed,
  issueAuthCode,
  issueSession,
  normalizeEmail,
  sendEmailSafely,
  verifyActiveAuthCode,
} from './auth-code.helper.js';
import type { SessionAuthResult } from './auth-code.helper.js';

export async function signUp(input: {
  name: string;
  email: string;
  password: string;
}): Promise<void> {
  const email = normalizeEmail(input.email);
  const name = input.name.trim();
  const passwordHash = await hashPassword(input.password);
  const now = new Date();

  let code: string | null = null;
  try {
    code = await getDb().transaction(async (tx) => {
      const existing = await findUserByEmail(email, tx);
      if (existing?.isVerified) {
        return null;
      }

      const user = existing
        ? await updateUnverifiedUser({ userId: existing.id, name, passwordHash }, tx)
        : await createUser({ name, email, passwordHash }, tx);

      if (!user) {
        return null;
      }

      return issueAuthCode(
        {
          userId: user.id,
          purpose: AUTH_CODE_PURPOSE.EMAIL_VERIFICATION,
          now,
          shouldInvalidatePrior: Boolean(existing),
        },
        tx,
      );
    });
  } catch (err) {
    if (extractPgCode(err) !== PG_ERROR_CODES.UNIQUE_VIOLATION) {
      throw err;
    }
    code = null;
  }

  if (!code) {
    throw new ConflictError(
      'An account with this email already exists',
      AUTH_ERROR_CODES.EMAIL_ALREADY_EXISTS,
    );
  }

  await sendEmailSafely('sign_up_verification', () =>
    sendVerificationCode({
      to: email,
      code,
      expiresInMinutes: AUTH_CODE_TTL_MINUTES,
    }),
  );
}

export async function verifyEmail(input: {
  email: string;
  code: string;
  userAgent: string | null;
}): Promise<SessionAuthResult> {
  const email = normalizeEmail(input.email);
  const now = new Date();

  const txResult = await getDb().transaction(async (tx) => {
    const user = await findUserByEmail(email, tx);
    if (!user || user.isVerified) {
      return { isValid: false as const, reason: 'invalid' as const };
    }

    const check = await verifyActiveAuthCode(
      { userId: user.id, purpose: AUTH_CODE_PURPOSE.EMAIL_VERIFICATION, code: input.code, now },
      tx,
    );
    if (!check.isValid) {
      return check;
    }

    const isConsumed = await consumeAuthCode({ authCodeId: check.authCode.id, now }, tx);
    if (!isConsumed) {
      return { isValid: false as const, reason: 'invalid' as const };
    }

    const verifiedUser = await markUserVerified(user.id, tx);
    const session = await issueSession(
      { userId: verifiedUser.id, userAgent: input.userAgent, now },
      tx,
    );

    return {
      isValid: true as const,
      result: {
        accessToken: session.accessToken,
        user: toUserDto(verifiedUser),
        refreshToken: session.refreshToken,
        sessionExpiresAt: session.sessionExpiresAt,
      },
    };
  });

  if (!txResult.isValid) {
    const errorCode =
      txResult.reason === 'expired'
        ? AUTH_ERROR_CODES.VERIFICATION_CODE_EXPIRED
        : AUTH_ERROR_CODES.INVALID_VERIFICATION_CODE;
    throw new UnprocessableEntityError('Verification code check failed', errorCode);
  }

  return txResult.result;
}

export async function resendVerification(input: {
  email: string;
  clientIp: string;
}): Promise<void> {
  const email = normalizeEmail(input.email);
  const now = new Date();
  assertCooldownAllowed({ action: 'resend_verification', email, clientIp: input.clientIp, now });

  const user = await findUserByEmail(email);
  if (!user) {
    throw new NotFoundError('User not found', 'NOT_FOUND', [{ resource: USER_RESOURCE_NAME }]);
  }
  if (user.isVerified) {
    throw new ConflictError('Email is already verified', AUTH_ERROR_CODES.EMAIL_ALREADY_VERIFIED);
  }

  const code = await getDb().transaction((tx) =>
    issueAuthCode(
      {
        userId: user.id,
        purpose: AUTH_CODE_PURPOSE.EMAIL_VERIFICATION,
        now,
        shouldInvalidatePrior: true,
      },
      tx,
    ),
  );

  await sendEmailSafely('resend_verification', () =>
    sendVerificationCode({
      to: email,
      code,
      expiresInMinutes: AUTH_CODE_TTL_MINUTES,
    }),
  );
}
