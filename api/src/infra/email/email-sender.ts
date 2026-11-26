import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import { getConfig } from '../../config/env.js';

export interface AuthCodeEmailInput {
  to: string;
  code: string;
  expiresInMinutes: number;
}

let cachedTransporter: Transporter | null = null;

export async function sendVerificationCode({
  to,
  code,
  expiresInMinutes,
}: AuthCodeEmailInput): Promise<void> {
  await sendEmail({
    to,
    subject: 'Verify your FelOps email address',
    text: `Your FelOps verification code is ${code}. It expires in ${expiresInMinutes} minutes.`,
  });
}

export async function sendPasswordResetCode({
  to,
  code,
  expiresInMinutes,
}: AuthCodeEmailInput): Promise<void> {
  await sendEmail({
    to,
    subject: 'Reset your FelOps password',
    text: `Your FelOps password reset code is ${code}. It expires in ${expiresInMinutes} minutes.`,
  });
}

async function sendEmail(input: { to: string; subject: string; text: string }): Promise<void> {
  const { EMAIL_FROM } = getConfig();
  await getTransporter().sendMail({
    to: input.to,
    from: EMAIL_FROM,
    subject: input.subject,
    text: input.text,
  });
}

function getTransporter(): Transporter {
  if (!cachedTransporter) {
    const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = getConfig();
    cachedTransporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      // Port 465 uses implicit TLS; port 587 upgrades via STARTTLS.
      secure: SMTP_PORT === 465,
      auth: {
        user: SMTP_USER,
        pass: SMTP_PASS,
      },
    });
  }
  return cachedTransporter;
}
