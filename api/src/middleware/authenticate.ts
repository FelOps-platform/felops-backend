import type { NextFunction, Request, Response } from 'express';
import { UnauthorizedError } from '../errors/app-error.js';
import { verifyAccessToken } from '../modules/auth/auth.crypto.js';
import type { AccessTokenPayload } from '../modules/auth/auth.crypto.js';

export type AuthenticatedUser = AccessTokenPayload;

const BEARER_PREFIX = 'Bearer ';

export async function authenticate(req: Request, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.header('authorization');
  if (!authHeader || !authHeader.startsWith(BEARER_PREFIX)) {
    throw new UnauthorizedError('Missing or invalid authorization header', 'UNAUTHENTICATED');
  }

  const token = authHeader.slice(BEARER_PREFIX.length).trim();
  if (!token) {
    throw new UnauthorizedError('Missing bearer token', 'UNAUTHENTICATED');
  }

  const payload = await verifyAccessToken(token);
  res.locals.auth = payload satisfies AuthenticatedUser;
  next();
}

export function getAuthUser(res: Response): AuthenticatedUser {
  if (!res.locals.auth) {
    throw new Error('getAuthUser() called on a route missing authenticate middleware.');
  }
  return res.locals.auth as AuthenticatedUser;
}
