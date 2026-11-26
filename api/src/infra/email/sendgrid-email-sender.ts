import sgMail from '@sendgrid/mail';
import type { AuthCodeEmailInput, EmailSender } from './email-sender.js';

export interface SendGridMailData {
  to: string;
  from: string;
  subject: string;
  text: string;
}

export interface SendGridClient {
  setApiKey(apiKey: string): void;
  send(data: SendGridMailData): Promise<unknown>;
}

export interface SendGridEmailSenderOptions {
  apiKey: string;
  from: string;
  client?: SendGridClient;
}

export class SendGridEmailSender implements EmailSender {
  private readonly client: SendGridClient;
  private readonly from: string;

  constructor(options: SendGridEmailSenderOptions) {
    this.client = options.client ?? sgMail;
    this.from = options.from;
    this.client.setApiKey(options.apiKey);
  }

  async sendVerificationCode({ to, code, expiresInMinutes }: AuthCodeEmailInput): Promise<void> {
    await this.client.send({
      to,
      from: this.from,
      subject: 'Verify your FelOps email address',
      text: `Your FelOps verification code is ${code}. It expires in ${expiresInMinutes} minutes.`,
    });
  }

  async sendPasswordResetCode({ to, code, expiresInMinutes }: AuthCodeEmailInput): Promise<void> {
    await this.client.send({
      to,
      from: this.from,
      subject: 'Reset your FelOps password',
      text: `Your FelOps password reset code is ${code}. It expires in ${expiresInMinutes} minutes.`,
    });
  }
}
