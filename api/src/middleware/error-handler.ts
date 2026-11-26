import type { ErrorRequestHandler, NextFunction, Request, Response } from 'express';
import type { Logger } from 'pino';
import { NotFoundError } from '../errors/app-error.js';
import { normalizeError } from '../errors/error-normalizer.js';

export function notFoundMiddleware(_req: Request, _res: Response, next: NextFunction): void {
  next(new NotFoundError('Route not found'));
}

export function createErrorHandler(logger: Logger): ErrorRequestHandler {
  return (err, req, res, next) => {
    if (res.headersSent) {
      next(err);
      return;
    }

    const appError = normalizeError(err);
    const logContext = {
      reqId: req.id,
      statusCode: appError.statusCode,
      code: appError.code,
      method: req.method,
      route: req.route?.path ?? req.path,
      isOperational: appError.isOperational,
    };

    if (appError.statusCode >= 500) {
      logger.error(logContext, appError.message);
    } else {
      logger.warn(logContext, appError.message);
    }

    const payload: { error: { code: string; details?: unknown[] } } = {
      error: {
        code: appError.code,
        ...(appError.details && appError.details.length > 0 ? { details: appError.details } : {}),
      },
    };

    res.status(appError.statusCode).json(payload);
  };
}
