import type { CookieOptions, Request, Response } from 'express';
import { getConfig } from '../../config/env.js';
import { getAuthUser } from '../../middleware/authenticate.js';
import { getValidated } from '../../middleware/validate.js';
import {
  REFRESH_COOKIE_NAME,
  REFRESH_COOKIE_PATH,
  REFRESH_SESSION_TTL_MS,
} from './auth.constants.js';
import type {
  PasswordResetConfirmInput,
  PasswordResetRequestInput,
  PasswordResetVerifyInput,
  ResendVerificationInput,
  SignInInput,
  SignUpInput,
  VerifyEmailInput,
} from './auth.schemas.js';
import type { SessionAuthResult } from './services/auth-code.helper.js';
import {
  confirmPasswordReset,
  requestPasswordReset,
  verifyPasswordResetCode,
} from './services/password-reset.service.js';
import { resendVerification, signUp, verifyEmail } from './services/registration.service.js';
import { getCurrentUser, refresh, signIn, signOut } from './services/session.service.js';

export async function signUpHandler(_req: Request, res: Response): Promise<void> {
  const { body } = getValidated<SignUpInput>(res);
  await signUp(body);
  res.status(202).send();
}

export async function verifyEmailHandler(req: Request, res: Response): Promise<void> {
  const { body } = getValidated<VerifyEmailInput>(res);
  const result = await verifyEmail({ ...body, userAgent: req.get('user-agent') ?? null });
  sendSessionResponse(res, result);
}

export async function resendVerificationHandler(req: Request, res: Response): Promise<void> {
  const { body } = getValidated<ResendVerificationInput>(res);
  await resendVerification({ email: body.email, clientIp: req.ip ?? 'unknown' });
  res.status(202).send();
}

export async function signInHandler(req: Request, res: Response): Promise<void> {
  const { body } = getValidated<SignInInput>(res);
  const result = await signIn({ ...body, userAgent: req.get('user-agent') ?? null });
  sendSessionResponse(res, result);
}

export async function refreshHandler(req: Request, res: Response): Promise<void> {
  const result = await refresh({ rawRefreshToken: getRefreshCookie(req) });
  sendSessionResponse(res, result);
}

export async function signOutHandler(req: Request, res: Response): Promise<void> {
  await signOut({ rawRefreshToken: getRefreshCookie(req) });
  clearRefreshCookie(res);
  res.status(204).send();
}

export async function getMeHandler(_req: Request, res: Response): Promise<void> {
  const { userId } = getAuthUser(res);
  const user = await getCurrentUser(userId);
  res.status(200).json({ data: user });
}

export async function requestPasswordResetHandler(req: Request, res: Response): Promise<void> {
  const { body } = getValidated<PasswordResetRequestInput>(res);
  await requestPasswordReset({ email: body.email, clientIp: req.ip ?? 'unknown' });
  res.status(202).send();
}

export async function verifyPasswordResetCodeHandler(_req: Request, res: Response): Promise<void> {
  const { body } = getValidated<PasswordResetVerifyInput>(res);
  const result = await verifyPasswordResetCode(body);
  res.status(200).json({ data: result });
}

export async function confirmPasswordResetHandler(_req: Request, res: Response): Promise<void> {
  const { body } = getValidated<PasswordResetConfirmInput>(res);
  await confirmPasswordReset(body);
  res.status(204).send();
}

function sendSessionResponse(res: Response, result: SessionAuthResult): void {
  setRefreshCookie(res, { token: result.refreshToken, expiresAt: result.sessionExpiresAt });
  res.status(200).json({ data: { accessToken: result.accessToken, user: result.user } });
}

function getRefreshCookie(req: Request): string | undefined {
  const cookies = req.cookies as Record<string, unknown> | undefined;
  const raw = cookies?.[REFRESH_COOKIE_NAME];
  return typeof raw === 'string' && raw.length > 0 ? raw : undefined;
}

function buildCookieBaseOptions(): CookieOptions {
  return {
    httpOnly: true,
    secure: getConfig().COOKIE_SECURE,
    sameSite: 'strict',
    path: REFRESH_COOKIE_PATH,
  };
}

function setRefreshCookie(res: Response, input: { token: string; expiresAt: Date }): void {
  const remainingMs = Math.max(0, input.expiresAt.getTime() - Date.now());
  res.cookie(REFRESH_COOKIE_NAME, input.token, {
    ...buildCookieBaseOptions(),
    maxAge: Math.min(remainingMs, REFRESH_SESSION_TTL_MS),
  });
}

function clearRefreshCookie(res: Response): void {
  res.clearCookie(REFRESH_COOKIE_NAME, buildCookieBaseOptions());
}
