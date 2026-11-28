import { ZodError } from 'zod';
import {
  AppError,
  BadRequestError,
  ConflictError,
  UnauthorizedError,
  UnprocessableEntityError,
} from './app-error.js';

export const PG_ERROR_CODES = {
  UNIQUE_VIOLATION: '23505',
  FOREIGN_KEY_VIOLATION: '23503',
  INVALID_TEXT_REPRESENTATION: '22P02',
  NUMERIC_VALUE_OUT_OF_RANGE: '22003',
  CHECK_VIOLATION: '23514',
  SERIALIZATION_FAILURE: '40001',
  DEADLOCK_DETECTED: '40P01',
} as const;

const JWT_ERROR_NAMES = new Set([
  'JWTExpired',
  'JWTInvalid',
  'JWSSignatureVerificationFailed',
  'JWSInvalid',
  'JWTClaimValidationFailed',
  'JOSEError',
]);

interface BodyParserError {
  type?: string;
  status?: number;
}

interface PgLikeError {
  code?: string;
  cause?: unknown;
}

export function extractPgCode(err: unknown): string | undefined {
  if (!err || typeof err !== 'object') {
    return undefined;
  }
  const pgErr = err as PgLikeError;
  if (typeof pgErr.code === 'string') {
    return pgErr.code;
  }
  if (pgErr.cause && typeof pgErr.cause === 'object') {
    const cause = pgErr.cause as PgLikeError;
    if (typeof cause.code === 'string') {
      return cause.code;
    }
  }
  return undefined;
}

export function normalizeError(err: unknown): AppError {
  if (err instanceof AppError) {
    return err;
  }

  if (err instanceof ZodError) {
    return new UnprocessableEntityError(
      'Validation failed',
      'VALIDATION_ERROR',
      formatZodIssues(err),
      {
        cause: err,
      },
    );
  }

  if (err instanceof SyntaxError && (err as BodyParserError).type === 'entity.parse.failed') {
    return new BadRequestError('Malformed JSON body', 'MALFORMED_REQUEST', undefined, {
      cause: err,
    });
  }

  if (err && typeof err === 'object' && (err as BodyParserError).type === 'entity.too.large') {
    return new AppError(413, 'PAYLOAD_TOO_LARGE', 'Request payload too large', undefined, true, {
      cause: err,
    });
  }

  if (err instanceof Error && JWT_ERROR_NAMES.has(err.name)) {
    return new UnauthorizedError('Invalid or expired access token', 'UNAUTHENTICATED', undefined, {
      cause: err,
    });
  }

  const pgCode = extractPgCode(err);
  if (pgCode) {
    switch (pgCode) {
      case PG_ERROR_CODES.UNIQUE_VIOLATION:
        return new ConflictError('Duplicate resource', 'CONFLICT', undefined, { cause: err });
      case PG_ERROR_CODES.FOREIGN_KEY_VIOLATION:
      case PG_ERROR_CODES.INVALID_TEXT_REPRESENTATION:
      case PG_ERROR_CODES.NUMERIC_VALUE_OUT_OF_RANGE:
      case PG_ERROR_CODES.CHECK_VIOLATION:
        return new UnprocessableEntityError(
          'Invalid data representation',
          'VALIDATION_ERROR',
          undefined,
          {
            cause: err,
          },
        );
      case PG_ERROR_CODES.SERIALIZATION_FAILURE:
      case PG_ERROR_CODES.DEADLOCK_DETECTED:
        return new AppError(
          503,
          'UPSTREAM_UNAVAILABLE',
          'Database serialization or deadlock failure',
          [{ service: 'storage' }],
          true,
          { cause: err },
        );
      default:
        break;
    }
  }

  return new AppError(500, 'INTERNAL_ERROR', 'Unexpected internal error', undefined, false, {
    cause: err,
  });
}

function formatZodIssues(err: ZodError): Array<{ field: string; code: string }> {
  return err.issues.map((issue) => ({
    field: issue.path.join('.'),
    code: issue.code,
  }));
}
