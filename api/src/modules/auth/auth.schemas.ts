import { z } from 'zod';
import {
  AUTH_CODE_LENGTH,
  MAX_EMAIL_LENGTH,
  MAX_PASSWORD_LENGTH,
  MAX_USER_NAME_LENGTH,
  MIN_PASSWORD_LENGTH,
} from './auth.constants.js';

// Normalize at the request boundary; auth services assume lowercase emails.
const emailSchema = z.string().trim().toLowerCase().max(MAX_EMAIL_LENGTH).pipe(z.email());
const sixDigitCodeSchema = z
  .string()
  .trim()
  .regex(new RegExp(`^\\d{${AUTH_CODE_LENGTH}}$`), 'Must be a 6-digit code');

export const signUpSchema = z.strictObject({
  name: z.string().trim().min(1).max(MAX_USER_NAME_LENGTH),
  email: emailSchema,
  password: z.string().min(MIN_PASSWORD_LENGTH).max(MAX_PASSWORD_LENGTH),
});

export const verifyEmailSchema = z.strictObject({
  email: emailSchema,
  code: sixDigitCodeSchema,
  password: z.string().min(MIN_PASSWORD_LENGTH).max(MAX_PASSWORD_LENGTH),
});

export const resendVerificationSchema = z.strictObject({
  email: emailSchema,
});

export const signInSchema = z.strictObject({
  email: emailSchema,
  password: z.string().min(1).max(MAX_PASSWORD_LENGTH),
});

export const passwordResetRequestSchema = z.strictObject({
  email: emailSchema,
});

export const passwordResetVerifySchema = z.strictObject({
  email: emailSchema,
  code: sixDigitCodeSchema,
});

export const passwordResetConfirmSchema = z.strictObject({
  resetToken: z.string().min(1),
  newPassword: z.string().min(MIN_PASSWORD_LENGTH).max(MAX_PASSWORD_LENGTH),
});

export type SignUpInput = z.infer<typeof signUpSchema>;
export type VerifyEmailInput = z.infer<typeof verifyEmailSchema>;
export type ResendVerificationInput = z.infer<typeof resendVerificationSchema>;
export type SignInInput = z.infer<typeof signInSchema>;
export type PasswordResetRequestInput = z.infer<typeof passwordResetRequestSchema>;
export type PasswordResetVerifyInput = z.infer<typeof passwordResetVerifySchema>;
export type PasswordResetConfirmInput = z.infer<typeof passwordResetConfirmSchema>;
