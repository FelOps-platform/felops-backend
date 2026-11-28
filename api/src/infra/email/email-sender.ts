import { getConfig } from '../../config/env.js';

export interface AuthCodeEmailInput {
  to: string;
  code: string;
  expiresInMinutes: number;
}

const EMAILJS_SEND_URL = 'https://api.emailjs.com/api/v1.0/email/send';
const HTTP_TIMEOUT_MS = 30_000;

export async function sendVerificationCode({
  to,
  code,
  expiresInMinutes,
}: AuthCodeEmailInput): Promise<void> {
  const { EMAILJS_TEMPLATE_VERIFICATION_ID } = getConfig();
  await sendTemplateEmail({
    templateId: EMAILJS_TEMPLATE_VERIFICATION_ID,
    to,
    code,
    expiresInMinutes,
  });
}

export async function sendPasswordResetCode({
  to,
  code,
  expiresInMinutes,
}: AuthCodeEmailInput): Promise<void> {
  const { EMAILJS_TEMPLATE_RESET_ID } = getConfig();
  await sendTemplateEmail({
    templateId: EMAILJS_TEMPLATE_RESET_ID,
    to,
    code,
    expiresInMinutes,
  });
}

async function sendTemplateEmail(input: {
  templateId: string;
  to: string;
  code: string;
  expiresInMinutes: number;
}): Promise<void> {
  const { EMAILJS_SERVICE_ID, EMAILJS_PUBLIC_KEY, EMAILJS_PRIVATE_KEY } = getConfig();

  const response = await fetch(EMAILJS_SEND_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      service_id: EMAILJS_SERVICE_ID,
      template_id: input.templateId,
      user_id: EMAILJS_PUBLIC_KEY,
      accessToken: EMAILJS_PRIVATE_KEY,
      template_params: {
        to_email: input.to,
        code: input.code,
        expires_in_minutes: input.expiresInMinutes,
      },
    }),
    signal: AbortSignal.timeout(HTTP_TIMEOUT_MS),
  });

  if (!response.ok) {
    // Do not include the EmailJS response body: it can contain recipient PII.
    throw new Error(`EmailJS send failed with status ${response.status}`);
  }
}
