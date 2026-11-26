import type { NextFunction, Request, Response } from 'express';
import type { ZodType } from 'zod';

export interface ValidationSchemas<TBody = unknown, TQuery = unknown, TParams = unknown> {
  body?: ZodType<TBody>;
  query?: ZodType<TQuery>;
  params?: ZodType<TParams>;
}

export interface ValidatedRequest<TBody = unknown, TQuery = unknown, TParams = unknown> {
  body: TBody;
  query: TQuery;
  params: TParams;
}

export function validate<TBody = unknown, TQuery = unknown, TParams = unknown>(
  schemas: ValidationSchemas<TBody, TQuery, TParams>,
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const body = schemas.body ? schemas.body.parse(req.body ?? {}) : (req.body as TBody);
    const query = schemas.query ? schemas.query.parse(req.query) : (req.query as TQuery);
    const params = schemas.params ? schemas.params.parse(req.params) : (req.params as TParams);

    res.locals.validated = { body, query, params } satisfies ValidatedRequest<
      TBody,
      TQuery,
      TParams
    >;
    next();
  };
}

export function getValidated<TBody = unknown, TQuery = unknown, TParams = unknown>(
  res: Response,
): ValidatedRequest<TBody, TQuery, TParams> {
  if (!res.locals.validated) {
    throw new Error('getValidated() called on a route missing validate() middleware.');
  }
  return res.locals.validated as ValidatedRequest<TBody, TQuery, TParams>;
}
