import { beforeEach, describe, expect, it, vi } from 'vitest';
import { initTestConfig } from '../helpers/test-runtime.js';

const { sendMail, createTransport } = vi.hoisted(() => {
  const sendMail = vi.fn().mockResolvedValue({ messageId: 'msg-1' });
  const createTransport = vi.fn(() => ({ sendMail }));
  return { sendMail, createTransport };
});

vi.mock('nodemailer', () => ({
  default: { createTransport },
}));

describe('email-sender', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    initTestConfig();
  });

  it('creates an SMTP transporter from config and sends verification and password-reset emails', async () => {
    const { sendVerificationCode, sendPasswordResetCode } =
      await import('@/infra/email/email-sender.js');

    await sendVerificationCode({
      to: 'hana@acm.com',
      code: '123456',
      expiresInMinutes: 10,
    });
    await sendPasswordResetCode({
      to: 'hana@acm.com',
      code: '654321',
      expiresInMinutes: 10,
    });

    expect(createTransport).toHaveBeenCalledTimes(1);
    expect(createTransport).toHaveBeenCalledWith({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      auth: {
        user: 'noreply@felops.test',
        pass: 'test-app-password',
      },
    });
    expect(sendMail).toHaveBeenCalledTimes(2);
    expect(sendMail).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        to: 'hana@acm.com',
        from: 'noreply@felops.test',
        text: expect.stringContaining('123456'),
      }),
    );
    expect(sendMail).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        to: 'hana@acm.com',
        from: 'noreply@felops.test',
        text: expect.stringContaining('654321'),
      }),
    );
  });
});
