import { Router } from 'express';
import { getConfig } from '../../config/env.js';
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

// Deferred function so getConfig() runs per request rather than at module import time (before loadEnv()).
const shouldSkipInTest = () => getConfig().NODE_ENV === 'test';
const authRateLimit = (limits: { windowMs: number; limit: number }) =>
  createRateLimiter({ ...limits, shouldSkip: shouldSkipInTest });

export const authRouter = Router();

authRouter.post(
  '/sign-up',
  authRateLimit(AUTH_RATE_LIMITS.SIGN_UP),
  validate({ body: signUpSchema }),
  signUpHandler,
);

authRouter.post(
  '/verify-email',
  authRateLimit(AUTH_RATE_LIMITS.VERIFY_EMAIL),
  validate({ body: verifyEmailSchema }),
  verifyEmailHandler,
);

authRouter.post(
  '/resend-verification',
  authRateLimit(AUTH_RATE_LIMITS.RESEND_VERIFICATION),
  validate({ body: resendVerificationSchema }),
  resendVerificationHandler,
);

authRouter.post(
  '/sign-in',
  authRateLimit(AUTH_RATE_LIMITS.SIGN_IN),
  validate({ body: signInSchema }),
  signInHandler,
);

authRouter.post('/refresh', refreshHandler);

authRouter.post('/sign-out', signOutHandler);

authRouter.get('/me', authenticate, getMeHandler);

authRouter.post(
  '/password-reset/request',
  authRateLimit(AUTH_RATE_LIMITS.PASSWORD_RESET_REQUEST),
  validate({ body: passwordResetRequestSchema }),
  requestPasswordResetHandler,
);

authRouter.post(
  '/password-reset/verify',
  authRateLimit(AUTH_RATE_LIMITS.PASSWORD_RESET_VERIFY),
  validate({ body: passwordResetVerifySchema }),
  verifyPasswordResetCodeHandler,
);

authRouter.post(
  '/password-reset/confirm',
  authRateLimit(AUTH_RATE_LIMITS.PASSWORD_RESET_CONFIRM),
  validate({ body: passwordResetConfirmSchema }),
  confirmPasswordResetHandler,
);
