import { Router } from 'express';
import type { RequestHandler } from 'express';
import { getConfig } from '../../config/env.js';
import { ForbiddenError } from '../../errors/app-error.js';
import { authenticate } from '../../middleware/authenticate.js';
import { createRateLimiter } from '../../middleware/rate-limit.js';
import { validate } from '../../middleware/validate.js';
import { AUTH_RATE_LIMITS } from './auth.constants.js';
import {
  confirmPasswordResetHandler,
  getMeHandler,
  refreshHandler,
  requestPasswordResetHandler,
  resendVerificationHandler,
  signInHandler,
  signOutHandler,
  signUpHandler,
  verifyEmailHandler,
  verifyPasswordResetCodeHandler,
} from './auth.controller.js';
import {
  passwordResetConfirmSchema,
  passwordResetRequestSchema,
  passwordResetVerifySchema,
  resendVerificationSchema,
  signInSchema,
  signUpSchema,
  verifyEmailSchema,
} from './auth.schemas.js';

// Cookie-authenticated requests need an Origin check when SameSite=None is used cross-site.
const requireAllowedOrigin: RequestHandler = (req, _res, next) => {
  const origin = req.header('origin');
  if (origin && !getConfig().CORS_ORIGINS.includes(origin)) {
    throw new ForbiddenError('Origin not allowed', 'FORBIDDEN');
  }
  next();
};

export const authRouter = Router();

authRouter.post(
  '/sign-up',
  createRateLimiter(AUTH_RATE_LIMITS.SIGN_UP),
  validate({ body: signUpSchema }),
  signUpHandler,
);

authRouter.post(
  '/verify-email',
  createRateLimiter(AUTH_RATE_LIMITS.VERIFY_EMAIL),
  validate({ body: verifyEmailSchema }),
  verifyEmailHandler,
);

authRouter.post(
  '/resend-verification',
  createRateLimiter(AUTH_RATE_LIMITS.RESEND_VERIFICATION),
  validate({ body: resendVerificationSchema }),
  resendVerificationHandler,
);

authRouter.post(
  '/sign-in',
  createRateLimiter(AUTH_RATE_LIMITS.SIGN_IN),
  validate({ body: signInSchema }),
  signInHandler,
);

authRouter.post('/refresh', requireAllowedOrigin, refreshHandler);

authRouter.post('/sign-out', requireAllowedOrigin, signOutHandler);

authRouter.get('/me', authenticate, getMeHandler);

authRouter.post(
  '/password-reset/request',
  createRateLimiter(AUTH_RATE_LIMITS.PASSWORD_RESET_REQUEST),
  validate({ body: passwordResetRequestSchema }),
  requestPasswordResetHandler,
);

authRouter.post(
  '/password-reset/verify',
  createRateLimiter(AUTH_RATE_LIMITS.PASSWORD_RESET_VERIFY),
  validate({ body: passwordResetVerifySchema }),
  verifyPasswordResetCodeHandler,
);

authRouter.post(
  '/password-reset/confirm',
  createRateLimiter(AUTH_RATE_LIMITS.PASSWORD_RESET_CONFIRM),
  validate({ body: passwordResetConfirmSchema }),
  confirmPasswordResetHandler,
);
