import { createHmac, randomBytes, randomInt, randomUUID, timingSafeEqual } from 'node:crypto';
import argon2 from 'argon2';
import { SignJWT, jwtVerify } from 'jose';
import type { JWTPayload } from 'jose';
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

export async function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, { type: argon2.argon2id });
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
  const { userId, payload } = await verifyJwt({
    token,
    secret: getConfig().JWT_ACCESS_SECRET,
    expectedType: 'access',
    errorMessage: 'Invalid access token claims',
  });
  const sessionId = typeof payload.sid === 'string' ? payload.sid : '';
  if (!sessionId) {
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
  const { userId, payload } = await verifyJwt({
    token,
    secret: getConfig().JWT_RESET_SECRET,
    expectedType: 'password_reset',
    errorMessage: 'Invalid reset token claims',
  });
  const authCodeId = Number(payload.jti);
  if (!Number.isInteger(authCodeId) || authCodeId <= 0) {
    throw createJwtInvalidError('Invalid reset token claims');
  }
  return { userId, authCodeId };
}

async function verifyJwt(input: {
  token: string;
  secret: string;
  expectedType: string;
  errorMessage: string;
}): Promise<{ userId: number; payload: JWTPayload }> {
  const secretKey = TEXT_ENCODER.encode(input.secret);
  const { payload } = await jwtVerify(input.token, secretKey, { algorithms: [JWT_ALGORITHM] });
  const userId = Number(payload.sub);
  if (!Number.isInteger(userId) || userId <= 0 || payload.typ !== input.expectedType) {
    throw createJwtInvalidError(input.errorMessage);
  }
  return { userId, payload };
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
