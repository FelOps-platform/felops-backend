import { createHmac, randomBytes, randomInt, randomUUID, timingSafeEqual } from 'node:crypto';
import argon2 from 'argon2';
import { SignJWT, jwtVerify } from 'jose';
import { getConfig } from '../../config/env.js';
import {
  ACCESS_TOKEN_TTL_SECONDS,
  AUTH_CODE_LENGTH,
  RESET_TOKEN_TTL_SECONDS,
} from './auth.constants.js';

export interface AccessTokenPayload {
  userId: number;
  sessionId: string;
}

export interface ResetTokenPayload {
  userId: number;
  authCodeId: number;
}

export interface ParsedRefreshToken {
  sessionId: string;
  secret: string;
}

const HMAC_ALGORITHM = 'sha256';
const JWT_ALGORITHM = 'HS256';
const REFRESH_SECRET_BYTES = 32;
const MAX_SESSION_ID_LENGTH = 36;
const TEXT_ENCODER = new TextEncoder();
const TEST_ARGON2_OPTIONS = { memoryCost: 1024, timeCost: 1, parallelism: 1 };

export async function hashPassword(password: string): Promise<string> {
  const isTest = getConfig().NODE_ENV === 'test';
  return argon2.hash(password, {
    type: argon2.argon2id,
    ...(isTest ? TEST_ARGON2_OPTIONS : {}),
  });
}

export async function verifyPassword(input: { hash: string; password: string }): Promise<boolean> {
  try {
    return await argon2.verify(input.hash, input.password);
  } catch {
    return false;
  }
}

export function generateSixDigitCode(): string {
  const max = 10 ** AUTH_CODE_LENGTH;
  return randomInt(0, max).toString().padStart(AUTH_CODE_LENGTH, '0');
}

export function hashAuthCode(code: string): string {
  return hmacHex({ value: code, pepper: getConfig().AUTH_CODE_PEPPER });
}

export function verifyAuthCodeHash(input: { code: string; expectedHash: string }): boolean {
  const computed = hashAuthCode(input.code);
  return isSafeHexEqual({ left: computed, right: input.expectedHash });
}

export function generateSessionId(): string {
  return randomUUID();
}

export function generateRefreshToken(sessionId: string): { rawToken: string; secret: string } {
  const secret = randomBytes(REFRESH_SECRET_BYTES).toString('base64url');
  return { rawToken: `${sessionId}.${secret}`, secret };
}

export function parseRefreshToken(rawToken: string): ParsedRefreshToken | null {
  const dotIndex = rawToken.indexOf('.');
  if (dotIndex <= 0 || dotIndex === rawToken.length - 1) {
    return null;
  }
  const sessionId = rawToken.slice(0, dotIndex);
  const secret = rawToken.slice(dotIndex + 1);
  if (secret.includes('.') || sessionId.length > MAX_SESSION_ID_LENGTH) {
    return null;
  }
  return { sessionId, secret };
}

export function hashRefreshSecret(secret: string): string {
  return hmacHex({ value: secret, pepper: getConfig().REFRESH_TOKEN_PEPPER });
}

export function verifyRefreshSecretHash(input: { secret: string; expectedHash: string }): boolean {
  const computed = hashRefreshSecret(input.secret);
  return isSafeHexEqual({ left: computed, right: input.expectedHash });
}

export async function signAccessToken(payload: AccessTokenPayload): Promise<string> {
  const secretKey = TEXT_ENCODER.encode(getConfig().JWT_ACCESS_SECRET);
  return new SignJWT({ sid: payload.sessionId, typ: 'access' })
    .setProtectedHeader({ alg: JWT_ALGORITHM })
    .setSubject(String(payload.userId))
    .setIssuedAt()
    .setExpirationTime(`${ACCESS_TOKEN_TTL_SECONDS}s`)
    .sign(secretKey);
}

export async function verifyAccessToken(token: string): Promise<AccessTokenPayload> {
  const secretKey = TEXT_ENCODER.encode(getConfig().JWT_ACCESS_SECRET);
  const { payload } = await jwtVerify(token, secretKey, { algorithms: [JWT_ALGORITHM] });
  const userId = Number(payload.sub);
  const sessionId = typeof payload.sid === 'string' ? payload.sid : '';
  if (!Number.isInteger(userId) || userId <= 0 || !sessionId || payload.typ !== 'access') {
    throw createJwtInvalidError('Invalid access token claims');
  }
  return { userId, sessionId };
}

export async function signResetToken(payload: ResetTokenPayload): Promise<string> {
  const secretKey = TEXT_ENCODER.encode(getConfig().JWT_RESET_SECRET);
  return new SignJWT({ typ: 'password_reset' })
    .setProtectedHeader({ alg: JWT_ALGORITHM })
    .setSubject(String(payload.userId))
    .setJti(String(payload.authCodeId))
    .setIssuedAt()
    .setExpirationTime(`${RESET_TOKEN_TTL_SECONDS}s`)
    .sign(secretKey);
}

export async function verifyResetToken(token: string): Promise<ResetTokenPayload> {
  const secretKey = TEXT_ENCODER.encode(getConfig().JWT_RESET_SECRET);
  const { payload } = await jwtVerify(token, secretKey, { algorithms: [JWT_ALGORITHM] });
  const userId = Number(payload.sub);
  const authCodeId = Number(payload.jti);
  if (
    !Number.isInteger(userId) ||
    userId <= 0 ||
    !Number.isInteger(authCodeId) ||
    authCodeId <= 0 ||
    payload.typ !== 'password_reset'
  ) {
    throw createJwtInvalidError('Invalid reset token claims');
  }
  return { userId, authCodeId };
}

function createJwtInvalidError(message: string): Error {
  // Match jose's JWTInvalid error name so normalizeError maps malformed claims to 401.
  const err = new Error(message);
  err.name = 'JWTInvalid';
  return err;
}

function hmacHex(input: { value: string; pepper: string }): string {
  return createHmac(HMAC_ALGORITHM, input.pepper).update(input.value).digest('hex');
}

function isSafeHexEqual(input: { left: string; right: string }): boolean {
  const bufA = Buffer.from(input.left, 'utf8');
  const bufB = Buffer.from(input.right, 'utf8');
  if (bufA.length !== bufB.length) {
    return false;
  }
  return timingSafeEqual(bufA, bufB);
}
