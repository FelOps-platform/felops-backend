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
  updateUserPasswordAndVerify,
} from '../auth.repository.js';
import {
  issueAuthCode,
  issueSession,
  sendAuthEmail,
  verifyActiveAuthCode,
} from './auth-code.helper.js';
import type { SessionAuthResult } from './auth-code.helper.js';

export async function signUp(input: {
  name: string;
  email: string;
  password: string;
}): Promise<void> {
  const email = input.email;
  const name = input.name;
  const passwordHash = await hashPassword(input.password);
  const now = new Date();

  let code: string | null = null;
  try {
    code = await getDb().transaction(async (tx) => {
      const existing = await findUserByEmail(email, tx);
      if (existing?.isVerified) {
        return null;
      }

      // Never overwrite credentials for an existing unverified account: verification
      // proves email ownership, not who set the password.
      const user = existing ?? (await createUser({ name, email, passwordHash }, tx));

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

  await sendAuthEmail('sign_up_verification', () =>
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
  password: string;
  userAgent: string | null;
}): Promise<SessionAuthResult> {
  const email = input.email;
  const now = new Date();
  const passwordHash = await hashPassword(input.password);

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

    // The verifier sets the authoritative password; a password written before verification cannot survive.
    const verifiedUser = await updateUserPasswordAndVerify({ userId: user.id, passwordHash }, tx);
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

export async function resendVerification(input: { email: string }): Promise<void> {
  const email = input.email;
  const now = new Date();

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

  await sendAuthEmail('resend_verification', () =>
    sendVerificationCode({
      to: email,
      code,
      expiresInMinutes: AUTH_CODE_TTL_MINUTES,
    }),
  );
}
