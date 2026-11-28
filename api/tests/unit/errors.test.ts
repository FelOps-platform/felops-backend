import type { Response } from 'express';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { envSchema } from '@/config/env.js';
import {
  AppError,
  BadRequestError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
  TooManyRequestsError,
  UnauthorizedError,
  UnprocessableEntityError,
} from '@/errors/app-error.js';
import { extractPgCode, normalizeError } from '@/errors/error-normalizer.js';
import { getAuthUser } from '@/middleware/authenticate.js';
import { getValidated } from '@/middleware/validate.js';

describe('AppError hierarchy and error normalizer', () => {
  it('constructs operational AppError subclasses with expected status and default codes', () => {
    expect(new BadRequestError()).toMatchObject({ statusCode: 400, code: 'MALFORMED_REQUEST' });
    expect(new UnauthorizedError()).toMatchObject({ statusCode: 401, code: 'UNAUTHENTICATED' });
    expect(new ForbiddenError()).toMatchObject({ statusCode: 403, code: 'FORBIDDEN' });
    expect(new NotFoundError()).toMatchObject({ statusCode: 404, code: 'NOT_FOUND' });
    expect(
      new NotFoundError('Workspace not found', 'NOT_FOUND', [{ resource: 'workspace' }]),
    ).toMatchObject({
      statusCode: 404,
      code: 'NOT_FOUND',
      details: [{ resource: 'workspace' }],
    });
    expect(new ConflictError()).toMatchObject({ statusCode: 409, code: 'CONFLICT' });
    expect(new UnprocessableEntityError()).toMatchObject({
      statusCode: 422,
      code: 'VALIDATION_ERROR',
    });
    expect(new TooManyRequestsError()).toMatchObject({ statusCode: 429, code: 'RATE_LIMITED' });
  });

  it('passes existing AppError through unchanged', () => {
    const err = new UnauthorizedError('Bad creds', 'INVALID_CREDENTIALS');
    expect(normalizeError(err)).toBe(err);
  });

  it('normalizes ZodError to 422 VALIDATION_ERROR with field details', () => {
    const schema = z.object({ email: z.email() });
    const result = schema.safeParse({ email: 'not-an-email' });
    expect(result.success).toBe(false);
    if (result.success) return;

    const normalized = normalizeError(result.error);
    expect(normalized.statusCode).toBe(422);
    expect(normalized.code).toBe('VALIDATION_ERROR');
    expect(normalized.details).toEqual([{ field: 'email', code: 'invalid_format' }]);
  });

  it('normalizes malformed JSON SyntaxError and payload too large', () => {
    const parseErr = Object.assign(new SyntaxError('Unexpected token'), {
      type: 'entity.parse.failed',
    });
    expect(normalizeError(parseErr)).toMatchObject({
      statusCode: 400,
      code: 'MALFORMED_REQUEST',
    });

    const tooLarge = { type: 'entity.too.large' };
    expect(normalizeError(tooLarge)).toMatchObject({
      statusCode: 413,
      code: 'PAYLOAD_TOO_LARGE',
    });
  });

  it('normalizes JWT errors to 401 UNAUTHENTICATED', () => {
    const jwtErr = new Error('token expired');
    jwtErr.name = 'JWTExpired';
    expect(normalizeError(jwtErr)).toMatchObject({
      statusCode: 401,
      code: 'UNAUTHENTICATED',
    });
  });

  it('normalizes PostgreSQL SQLSTATE errors', () => {
    expect(extractPgCode({ cause: { code: '23505' } })).toBe('23505');
    expect(extractPgCode(new Error('plain'))).toBeUndefined();
    expect(normalizeError({ code: '23505' })).toMatchObject({ statusCode: 409, code: 'CONFLICT' });
    expect(normalizeError({ code: '23503' })).toMatchObject({
      statusCode: 422,
      code: 'VALIDATION_ERROR',
    });
    expect(normalizeError({ cause: { code: '22P02' } })).toMatchObject({
      statusCode: 422,
      code: 'VALIDATION_ERROR',
    });
    expect(normalizeError({ code: '40001' })).toMatchObject({
      statusCode: 503,
      code: 'UPSTREAM_UNAVAILABLE',
      details: [{ service: 'storage' }],
    });
  });

  it('normalizes unknown errors to non-operational 500 INTERNAL_ERROR', () => {
    const normalized = normalizeError(new Error('secret db string'));
    expect(normalized).toBeInstanceOf(AppError);
    expect(normalized.statusCode).toBe(500);
    expect(normalized.code).toBe('INTERNAL_ERROR');
    expect(normalized.isOperational).toBe(false);
  });

  it('fails fast when getAuthUser or getValidated is called without middleware', () => {
    const emptyRes = { locals: {} } as unknown as Response;
    expect(() => getAuthUser(emptyRes)).toThrow(/authenticate middleware/);
    expect(() => getValidated(emptyRes)).toThrow(/validate\(\) middleware/);
  });

  it('derives COOKIE_SECURE from NODE_ENV and ignores supplied values', () => {
    const baseEnv = {
      NODE_ENV: 'production',
      LOG_LEVEL: 'info',
      PORT: 3000,
      DATABASE_URL: 'postgres://localhost:5432/felops',
      TRUST_PROXY: '1',
      CORS_ORIGINS: 'https://app.felops.dev',
      JWT_ACCESS_SECRET: 'a'.repeat(32),
      JWT_RESET_SECRET: 'b'.repeat(32),
      AUTH_CODE_PEPPER: 'c'.repeat(32),
      REFRESH_TOKEN_PEPPER: 'd'.repeat(32),
      EMAILJS_SERVICE_ID: 'service_test',
      EMAILJS_PUBLIC_KEY: 'public_test_key',
      EMAILJS_PRIVATE_KEY: 'private_test_key',
      EMAILJS_TEMPLATE_VERIFICATION_ID: 'template_verification',
      EMAILJS_TEMPLATE_RESET_ID: 'template_reset',
    };

    expect(envSchema.parse(baseEnv).COOKIE_SECURE).toBe(true);
    expect(envSchema.parse({ ...baseEnv, NODE_ENV: 'development' }).COOKIE_SECURE).toBe(false);
    expect(envSchema.parse({ ...baseEnv, NODE_ENV: 'test' }).COOKIE_SECURE).toBe(false);
    expect(envSchema.parse({ ...baseEnv, COOKIE_SECURE: 'false' }).COOKIE_SECURE).toBe(true);
  });
});
