import { ForbiddenError, UnauthorizedError } from '../../../errors/app-error.js';
import { AUTH_ERROR_CODES, REFRESH_GRACE_WINDOW_MS } from '../auth.constants.js';
import {
  generateRefreshToken,
  hashPassword,
  hashRefreshSecret,
  parseRefreshToken,
  signAccessToken,
  verifyPassword,
  verifyRefreshSecretHash,
} from '../auth.crypto.js';
import { toUserDto } from '../auth.mapper.js';
import type { UserDto } from '../auth.mapper.js';
import {
  findSessionById,
  findUserByEmail,
  findUserById,
  revokeSession,
  rotateSessionToken,
} from '../auth.repository.js';
import { deleteRefreshGrace, findRefreshGrace, setRefreshGrace } from '../auth.stores.js';
import { issueSession } from './auth-code.helper.js';
import type { SessionAuthResult } from './auth-code.helper.js';

const DUMMY_PASSWORD_VALUE = 'felops-timing-equalization-dummy-password';
let dummyHashPromise: Promise<string> | null = null;

export async function signIn(input: {
  email: string;
  password: string;
  userAgent: string | null;
}): Promise<SessionAuthResult> {
  const email = input.email;
  const user = await findUserByEmail(email);

  if (!user) {
    // Run dummy Argon2id verification to reduce timing side-channel enumeration.
    await verifyPassword({ hash: await getDummyHash(), password: input.password });
    throw new UnauthorizedError('Invalid credentials', AUTH_ERROR_CODES.INVALID_CREDENTIALS);
  }

  const isValidPassword = await verifyPassword({
    hash: user.passwordHash,
    password: input.password,
  });
  if (!isValidPassword) {
    throw new UnauthorizedError('Invalid credentials', AUTH_ERROR_CODES.INVALID_CREDENTIALS);
  }

  if (!user.isVerified) {
    throw new ForbiddenError('Email address is not verified', AUTH_ERROR_CODES.EMAIL_NOT_VERIFIED);
  }

  const session = await issueSession({
    userId: user.id,
    userAgent: input.userAgent,
    now: new Date(),
  });

  return {
    accessToken: session.accessToken,
    user: toUserDto(user),
    refreshToken: session.refreshToken,
    sessionExpiresAt: session.sessionExpiresAt,
  };
}

export async function refresh(input: {
  rawRefreshToken: string | undefined;
}): Promise<SessionAuthResult> {
  if (!input.rawRefreshToken) {
    throw new UnauthorizedError('Refresh token missing', AUTH_ERROR_CODES.SESSION_EXPIRED);
  }

  const parsed = parseRefreshToken(input.rawRefreshToken);
  if (!parsed) {
    throw new UnauthorizedError('Refresh token malformed', AUTH_ERROR_CODES.SESSION_EXPIRED);
  }

  const now = new Date();
  const session = await findSessionById(parsed.sessionId);
  if (!session || session.revokedAt || session.expiresAt.getTime() <= now.getTime()) {
    throw new UnauthorizedError('Session expired or revoked', AUTH_ERROR_CODES.SESSION_EXPIRED);
  }

  const isCurrentToken = verifyRefreshSecretHash({
    secret: parsed.secret,
    expectedHash: session.refreshTokenHash,
  });

  if (!isCurrentToken) {
    // Allow brief concurrent-tab refresh retries with the just-rotated token before revoking.
    return resolveGracedOrRevoke({
      sessionId: session.id,
      secret: parsed.secret,
      now,
      reason: 'Refresh token mismatch; session revoked',
    });
  }

  const user = await findUserById(session.userId);
  if (!user) {
    throw new UnauthorizedError('Session user missing', AUTH_ERROR_CODES.SESSION_EXPIRED);
  }

  const { rawToken: rotatedRefreshToken, secret: newSecret } = generateRefreshToken(session.id);
  const newRefreshTokenHash = hashRefreshSecret(newSecret);
  const accessToken = await signAccessToken({ userId: user.id, sessionId: session.id });
  const userDto = toUserDto(user);

  const isRotated = await rotateSessionToken({
    sessionId: session.id,
    expectedRefreshTokenHash: session.refreshTokenHash,
    newRefreshTokenHash,
    lastUsedAt: now,
  });

  if (!isRotated) {
    return resolveGracedOrRevoke({
      sessionId: session.id,
      secret: parsed.secret,
      now,
      reason: 'Concurrent refresh mismatch; session revoked',
    });
  }

  setRefreshGrace({
    sessionId: session.id,
    nowMs: now.getTime(),
    entry: {
      previousTokenHash: session.refreshTokenHash,
      accessToken,
      user: userDto,
      rotatedRefreshToken,
      sessionExpiresAt: session.expiresAt,
      expiresAt: now.getTime() + REFRESH_GRACE_WINDOW_MS,
    },
  });

  return {
    accessToken,
    user: userDto,
    refreshToken: rotatedRefreshToken,
    sessionExpiresAt: session.expiresAt,
  };
}

export async function signOut(input: { rawRefreshToken: string | undefined }): Promise<void> {
  if (!input.rawRefreshToken) {
    return;
  }

  const parsed = parseRefreshToken(input.rawRefreshToken);
  if (!parsed) {
    return;
  }

  const session = await findSessionById(parsed.sessionId);
  if (!session || session.revokedAt) {
    return;
  }

  const isMatch = verifyRefreshSecretHash({
    secret: parsed.secret,
    expectedHash: session.refreshTokenHash,
  });
  if (!isMatch) {
    return;
  }

  await revokeSession({ sessionId: session.id, revokedAt: new Date() });
  deleteRefreshGrace(session.id);
}

export async function getCurrentUser(userId: number): Promise<UserDto> {
  const user = await findUserById(userId);
  if (!user) {
    throw new UnauthorizedError('Authenticated user not found', AUTH_ERROR_CODES.UNAUTHENTICATED);
  }
  return toUserDto(user);
}

function getDummyHash(): Promise<string> {
  if (!dummyHashPromise) {
    dummyHashPromise = hashPassword(DUMMY_PASSWORD_VALUE);
  }
  return dummyHashPromise;
}

async function resolveGracedOrRevoke(input: {
  sessionId: string;
  secret: string;
  now: Date;
  reason: string;
}): Promise<SessionAuthResult> {
  const graced = findGracedSession(input);
  if (graced) {
    return graced;
  }
  await revokeSession({ sessionId: input.sessionId, revokedAt: input.now });
  deleteRefreshGrace(input.sessionId);
  throw new UnauthorizedError(input.reason, AUTH_ERROR_CODES.SESSION_EXPIRED);
}

function findGracedSession(input: {
  sessionId: string;
  secret: string;
  now: Date;
}): SessionAuthResult | null {
  const graceEntry = findRefreshGrace({
    sessionId: input.sessionId,
    nowMs: input.now.getTime(),
  });
  if (!graceEntry) {
    return null;
  }
  const isPreviousMatch = verifyRefreshSecretHash({
    secret: input.secret,
    expectedHash: graceEntry.previousTokenHash,
  });
  if (!isPreviousMatch) {
    return null;
  }
  return {
    accessToken: graceEntry.accessToken,
    user: graceEntry.user,
    refreshToken: graceEntry.rotatedRefreshToken,
    sessionExpiresAt: graceEntry.sessionExpiresAt,
  };
}
