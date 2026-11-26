import { describe, expect, it, vi } from 'vitest';
import { SendGridEmailSender } from '@/infra/email/sendgrid-email-sender.js';

describe('SendGridEmailSender', () => {
  it('configures API key and sends verification and password-reset emails', async () => {
    const setApiKey = vi.fn();
    const send = vi.fn().mockResolvedValue([{ statusCode: 202 }]);

    const sender = new SendGridEmailSender({
      apiKey: 'SG.test-key',
      from: 'noreply@felops.test',
      client: { setApiKey, send },
    });

    expect(setApiKey).toHaveBeenCalledWith('SG.test-key');

    await sender.sendVerificationCode({
      to: 'hana@acm.com',
      code: '123456',
      expiresInMinutes: 10,
    });
    await sender.sendPasswordResetCode({
      to: 'hana@acm.com',
      code: '654321',
      expiresInMinutes: 10,
    });

    expect(send).toHaveBeenCalledTimes(2);
    expect(send).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        to: 'hana@acm.com',
        from: 'noreply@felops.test',
        text: expect.stringContaining('123456'),
      }),
    );
    expect(send).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        to: 'hana@acm.com',
        from: 'noreply@felops.test',
        text: expect.stringContaining('654321'),
      }),
    );
  });
});
