import type { DbExecutor } from '../../../config/db.js';
import { getLogger } from '../../../config/logger.js';
import { TooManyRequestsError } from '../../../errors/app-error.js';
import {
  AUTH_CODE_MAX_ATTEMPTS,
  AUTH_CODE_TTL_MS,
  AUTH_COOLDOWN_MS,
  AUTH_ERROR_CODES,
  MAX_USER_AGENT_LENGTH,
  REFRESH_SESSION_TTL_MS,
} from '../auth.constants.js';
import type { AuthCodePurpose } from '../auth.constants.js';
import {
  generateRefreshToken,
  generateSessionId,
  generateSixDigitCode,
  hashAuthCode,
  hashRefreshSecret,
  signAccessToken,
  verifyAuthCodeHash,
} from '../auth.crypto.js';
import type { UserDto } from '../auth.mapper.js';
import {
  createAuthCode,
  createSession,
  findLatestActiveAuthCode,
  incrementAuthCodeAttempts,
  invalidateActiveAuthCodes,
} from '../auth.repository.js';
import type { AuthCodeRecord } from '../auth.repository.js';
import { checkAndSetCooldown } from '../auth.stores.js';

export interface SessionAuthResult {
  accessToken: string;
  user: UserDto;
  refreshToken: string;
  sessionExpiresAt: Date;
}

export type VerifyAuthCodeOutcome =
  { isValid: true; authCode: AuthCodeRecord } | { isValid: false; reason: 'invalid' | 'expired' };

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function assertCooldownAllowed(input: {
  action: string;
  email: string;
  clientIp: string;
  now: Date;
}): void {
  const isAllowed = checkAndSetCooldown({
    key: `${input.action}:${input.email}:${input.clientIp}`,
    ttlMs: AUTH_COOLDOWN_MS,
    nowMs: input.now.getTime(),
  });
  if (!isAllowed) {
    throw new TooManyRequestsError(
      `${input.action} cooldown active`,
      AUTH_ERROR_CODES.RATE_LIMITED,
    );
  }
}

export async function sendEmailSafely(action: string, sendFn: () => Promise<void>): Promise<void> {
  try {
    await sendFn();
  } catch (err) {
    getLogger().error({ err, action }, 'Auth email delivery failed');
  }
}

export async function issueAuthCode(
  input: {
    userId: number;
    purpose: AuthCodePurpose;
    now: Date;
    shouldInvalidatePrior?: boolean;
  },
  tx: DbExecutor,
): Promise<string> {
  if (input.shouldInvalidatePrior) {
    await invalidateActiveAuthCodes(
      { userId: input.userId, purpose: input.purpose, now: input.now },
      tx,
    );
  }

  const code = generateSixDigitCode();
  await createAuthCode(
    {
      userId: input.userId,
      purpose: input.purpose,
      codeHash: hashAuthCode(code),
      expiresAt: new Date(input.now.getTime() + AUTH_CODE_TTL_MS),
    },
    tx,
  );
  return code;
}

export async function verifyActiveAuthCode(
  input: { userId: number; purpose: AuthCodePurpose; code: string; now: Date },
  tx: DbExecutor,
): Promise<VerifyAuthCodeOutcome> {
  const authCode = await findLatestActiveAuthCode(
    { userId: input.userId, purpose: input.purpose, isForUpdate: true },
    tx,
  );

  if (!authCode || authCode.attempts >= AUTH_CODE_MAX_ATTEMPTS) {
    return { isValid: false, reason: 'invalid' };
  }

  // Validate hash before expiry; return (do not throw) so the attempt increment commits.
  const isMatch = verifyAuthCodeHash({ code: input.code, expectedHash: authCode.codeHash });
  if (!isMatch) {
    await incrementAuthCodeAttempts(authCode.id, tx);
    return { isValid: false, reason: 'invalid' };
  }

  if (authCode.expiresAt.getTime() <= input.now.getTime()) {
    return { isValid: false, reason: 'expired' };
  }

  return { isValid: true, authCode };
}

export async function issueSession(
  input: { userId: number; userAgent: string | null; now: Date },
  tx?: DbExecutor,
): Promise<{
  sessionId: string;
  refreshToken: string;
  accessToken: string;
  sessionExpiresAt: Date;
}> {
  const sessionId = generateSessionId();
  const { rawToken, secret } = generateRefreshToken(sessionId);
  const refreshTokenHash = hashRefreshSecret(secret);
  const sessionExpiresAt = new Date(input.now.getTime() + REFRESH_SESSION_TTL_MS);

  await createSession(
    {
      id: sessionId,
      userId: input.userId,
      refreshTokenHash,
      expiresAt: sessionExpiresAt,
      userAgent: input.userAgent ? input.userAgent.slice(0, MAX_USER_AGENT_LENGTH) : null,
    },
    tx,
  );

  const accessToken = await signAccessToken({ userId: input.userId, sessionId });
  return { sessionId, refreshToken: rawToken, accessToken, sessionExpiresAt };
}
