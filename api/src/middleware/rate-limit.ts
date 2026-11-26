import rateLimit from 'express-rate-limit';
import type { RequestHandler } from 'express';
import { TooManyRequestsError } from '../errors/app-error.js';

export interface RateLimitOptions {
  windowMs: number;
  limit: number;
  shouldSkip?: () => boolean;
}

export function createRateLimiter(options: RateLimitOptions): RequestHandler {
  return rateLimit({
    windowMs: options.windowMs,
    limit: options.limit,
    skip: options.shouldSkip,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    handler: (_req, _res, next) => {
      next(new TooManyRequestsError('Rate limit exceeded'));
    },
  });
}
