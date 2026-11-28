import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { sendPasswordResetCode, sendVerificationCode } from '@/infra/email/email-sender.js';
import { initTestConfig } from '../helpers/test-runtime.js';

const fetchMock = vi.fn();
const EMAILJS_SEND_URL = 'https://api.emailjs.com/api/v1.0/email/send';

describe('email-sender (EmailJS)', () => {
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
    initTestConfig();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('sends verification and reset templates', async () => {
    fetchMock.mockImplementation(() => Promise.resolve(new Response('OK', { status: 200 })));

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

    expect(fetchMock).toHaveBeenCalledTimes(2);

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(EMAILJS_SEND_URL);
    expect(new Headers(init.headers).get('content-type')).toBe('application/json');

    const payload = JSON.parse(init.body as string) as {
      service_id: string;
      template_id: string;
      user_id: string;
      accessToken: string;
      template_params: {
        to_email: string;
        code: string;
        expires_in_minutes: number;
      };
    };
    expect(payload).toMatchObject({
      service_id: 'service_test',
      template_id: 'template_verification',
      user_id: 'public_test_key',
      accessToken: 'private_test_key',
      template_params: {
        to_email: 'hana@acm.com',
        code: '123456',
        expires_in_minutes: 10,
      },
    });

    const secondPayload = JSON.parse(fetchMock.mock.calls[1][1].body as string) as {
      template_id: string;
      template_params: { code: string };
    };
    expect(secondPayload.template_id).toBe('template_reset');
    expect(secondPayload.template_params.code).toBe('654321');
  });

  it('rejects a non-2xx response', async () => {
    fetchMock.mockResolvedValue(
      new Response('The recipients address is corrupted', { status: 422 }),
    );

    await expect(
      sendVerificationCode({ to: 'hana@acm.com', code: '123456', expiresInMinutes: 10 }),
    ).rejects.toThrow(/^EmailJS send failed with status 422$/);
  });
});
