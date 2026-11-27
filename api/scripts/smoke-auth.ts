import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';

const REFRESH_COOKIE = 'felops_refresh_token';

interface SmokeOptions {
  baseUrl: string;
  origin: string;
  email: string;
  password: string;
  mode: 'signup' | 'signin';
  code?: string;
}

interface AuthSession {
  accessToken: string;
  user?: { id: number; email: string; isVerified: boolean };
}

function arg(name: string): string | undefined {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function usage(exitCode = 1): never {
  console.error(
    [
      'Usage: npm run smoke:auth --prefix api -- --url <api-base-url> --origin <frontend-origin> --email <email> [options]',
      '',
      'Options:',
      '  --mode signup|signin   Default: signup. signin requires an already verified account.',
      '  --password <value>     Default: SmokePassword123!',
      '  --code <value>         Signup mode only. Skips the interactive code prompt.',
      '  --help                 Show this message.',
      '',
      'Environment fallbacks: SMOKE_API_URL, SMOKE_ORIGIN, SMOKE_EMAIL, SMOKE_PASSWORD, SMOKE_CODE',
    ].join('\n'),
  );
  process.exit(exitCode);
}

if (process.argv.includes('--help') || process.argv.includes('-h')) {
  usage(0);
}

function readOptions(): SmokeOptions {
  const baseUrl = arg('url') ?? process.env.SMOKE_API_URL;
  const origin = arg('origin') ?? process.env.SMOKE_ORIGIN;
  const email = arg('email') ?? process.env.SMOKE_EMAIL;
  const mode = (arg('mode') ?? 'signup') as SmokeOptions['mode'];

  if (!baseUrl || !origin || !email) {
    usage();
  }
  if (mode !== 'signup' && mode !== 'signin') {
    usage();
  }

  return {
    baseUrl: baseUrl.replace(/\/+$/, ''),
    origin,
    email,
    password: arg('password') ?? process.env.SMOKE_PASSWORD ?? 'SmokePassword123!',
    mode,
    code: arg('code') ?? process.env.SMOKE_CODE,
  };
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

function responseCookies(response: Response): string[] {
  const headers = response.headers as Headers & { getSetCookie?: () => string[] };
  if (typeof headers.getSetCookie === 'function') {
    return headers.getSetCookie();
  }
  const single = response.headers.get('set-cookie');
  return single ? [single] : [];
}

interface RefreshCookie {
  header: string;
  raw: string;
}

function refreshCookieFrom(response: Response): RefreshCookie | null {
  const raw = responseCookies(response).find((value) => value.startsWith(`${REFRESH_COOKIE}=`));
  return raw ? { header: raw.split(';', 1)[0], raw } : null;
}

function assertRefreshCookie(raw: string, isHttps: boolean): void {
  assert(/HttpOnly/i.test(raw), 'Refresh cookie is missing HttpOnly');
  assert(/Path=\/api\/v1\/auth/i.test(raw), 'Refresh cookie path is wrong');
  if (isHttps) {
    assert(/;\s*Secure/i.test(raw), 'Refresh cookie is missing Secure over HTTPS');
    assert(/SameSite=None/i.test(raw), 'Refresh cookie must use SameSite=None in production');
  } else {
    assert(!/;\s*Secure/i.test(raw), 'Refresh cookie unexpectedly has Secure over HTTP');
    assert(/SameSite=Lax/i.test(raw), 'Refresh cookie must use SameSite=Lax over HTTP');
  }
}

async function readJson<T>(response: Response): Promise<T> {
  const text = await response.text();
  if (!text) {
    return {} as T;
  }
  return JSON.parse(text) as T;
}

function describe(response: Response, body: unknown): string {
  return `status=${response.status} body=${JSON.stringify(body)}`;
}

async function main(): Promise<void> {
  const options = readOptions();
  const base = options.baseUrl.endsWith('/api/v1') ? options.baseUrl : `${options.baseUrl}/api/v1`;

  let refreshCookie: RefreshCookie | null = null;
  const isHttps = base.startsWith('https://');
  const requireRefreshCookie = (): RefreshCookie => {
    if (!refreshCookie) {
      throw new Error('The API did not set the refresh cookie');
    }
    return refreshCookie;
  };

  const call = async (path: string, init: RequestInit = {}): Promise<Response> => {
    const headers = new Headers(init.headers);
    if (refreshCookie) {
      headers.set('cookie', refreshCookie.header);
    }
    const response = await fetch(`${base}${path}`, {
      ...init,
      headers,
      redirect: 'manual',
    });
    refreshCookie = refreshCookieFrom(response) ?? refreshCookie;
    return response;
  };

  console.log(`Smoke target: ${base}`);
  console.log(`Allowed origin: ${options.origin}`);

  console.log('1/7 CORS preflight');
  const preflight = await fetch(`${base}/auth/sign-in`, {
    method: 'OPTIONS',
    headers: {
      origin: options.origin,
      'access-control-request-method': 'POST',
      'access-control-request-headers': 'content-type',
    },
  });
  assert(
    preflight.status >= 200 && preflight.status < 300,
    `CORS preflight failed (${preflight.status})`,
  );
  assert(
    preflight.headers.get('access-control-allow-origin') === options.origin,
    'CORS did not return the exact allowed origin',
  );
  assert(
    preflight.headers.get('access-control-allow-credentials') === 'true',
    'CORS did not allow credentials',
  );

  let session: AuthSession;

  if (options.mode === 'signin') {
    console.log('2/7 Sign in with the existing smoke account');
    const response = await call('/auth/sign-in', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: options.email, password: options.password }),
    });
    const body = await readJson<{ data?: AuthSession }>(response);
    assert(
      response.status === 200 && body.data?.accessToken,
      `Sign-in failed: ${describe(response, body)}`,
    );
    assertRefreshCookie(requireRefreshCookie().raw, isHttps);
    session = body.data;
  } else {
    console.log('2/7 Sign up');
    const response = await call('/auth/sign-up', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        name: 'Smoke Test',
        email: options.email,
        password: options.password,
      }),
    });
    const body = await readJson<unknown>(response);
    if (response.status === 409) {
      throw new Error(
        `Sign-up returned EMAIL_ALREADY_EXISTS. Use --mode signin for an existing verified account, or a fresh email.`,
      );
    }
    if (response.status === 503) {
      throw new Error(`Email delivery is unavailable: ${describe(response, body)}`);
    }
    assert(response.status === 202, `Sign-up failed: ${describe(response, body)}`);

    let code = options.code;
    if (!code) {
      const rl = createInterface({ input: stdin, output: stdout });
      try {
        code = (await rl.question('Enter the verification code from the email: ')).trim();
      } finally {
        rl.close();
      }
    }
    if (!code || !/^\d{6}$/.test(code)) {
      throw new Error('Verification code must be 6 digits');
    }

    console.log('3/7 Verify email');
    const verify = await call('/auth/verify-email', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: options.email, code }),
    });
    const bodyVerify = await readJson<{ data?: AuthSession }>(verify);
    assert(
      verify.status === 200 && bodyVerify.data?.accessToken,
      `Verify failed: ${describe(verify, bodyVerify)}`,
    );
    assertRefreshCookie(requireRefreshCookie().raw, isHttps);
    session = bodyVerify.data;
  }

  console.log('4/7 Get current user');
  const me = await call('/auth/me', {
    headers: { authorization: `Bearer ${session.accessToken}` },
  });
  const meBody = await readJson<{ data?: { email?: string } }>(me);
  assert(me.status === 200, `GET /auth/me failed: ${describe(me, meBody)}`);
  assert(
    meBody.data?.email === options.email.toLowerCase(),
    'GET /auth/me returned a different email',
  );

  console.log('5/7 Refresh session');
  const previousCookie = requireRefreshCookie();
  const refresh = await call('/auth/refresh', { method: 'POST' });
  const refreshBody = await readJson<{ data?: AuthSession }>(refresh);
  assert(
    refresh.status === 200 && refreshBody.data?.accessToken,
    `Refresh failed: ${describe(refresh, refreshBody)}`,
  );
  const currentCookie = requireRefreshCookie();
  assert(currentCookie.header !== previousCookie.header, 'Refresh did not rotate the cookie');
  assertRefreshCookie(currentCookie.raw, isHttps);

  console.log('6/7 Reject a disallowed Origin');
  const blocked = await call('/auth/refresh', {
    method: 'POST',
    headers: { origin: 'https://evil.example' },
  });
  assert(blocked.status === 403, `Disallowed origin was not rejected: ${blocked.status}`);
  const blockedBody = await readJson<{ error?: { code?: string } }>(blocked);
  assert(
    blockedBody.error?.code === 'FORBIDDEN',
    'Disallowed origin returned the wrong error code',
  );

  console.log('7/7 Sign out and verify refresh is revoked');
  const signOut = await call('/auth/sign-out', { method: 'POST' });
  assert(signOut.status === 204, `Sign-out failed: ${signOut.status}`);

  const afterSignOut = await call('/auth/refresh', { method: 'POST' });
  const afterBody = await readJson<{ error?: { code?: string } }>(afterSignOut);
  assert(
    afterSignOut.status === 401,
    `Refresh after sign-out did not fail: ${afterSignOut.status}`,
  );
  assert(
    afterBody.error?.code === 'SESSION_EXPIRED',
    'Refresh after sign-out returned the wrong error code',
  );

  console.log('Smoke test passed.');
}

main().catch((err: unknown) => {
  console.error(`Smoke test failed: ${err instanceof Error ? err.message : String(err)}`);
  process.exitCode = 1;
});
