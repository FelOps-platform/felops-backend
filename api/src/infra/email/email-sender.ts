export interface AuthCodeEmailInput {
  to: string;
  code: string;
  expiresInMinutes: number;
}

export interface EmailSender {
  sendVerificationCode(input: AuthCodeEmailInput): Promise<void>;
  sendPasswordResetCode(input: AuthCodeEmailInput): Promise<void>;
}

let currentEmailSender: EmailSender | null = null;

export function initEmailSender(sender: EmailSender): EmailSender {
  currentEmailSender = sender;
  return currentEmailSender;
}

export function getEmailSender(): EmailSender {
  if (!currentEmailSender) {
    throw new Error('EmailSender not initialized; call initEmailSender() first.');
  }
  return currentEmailSender;
}
