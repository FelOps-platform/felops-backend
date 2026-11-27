# Frontend integration and local development

This page explains how a browser client authenticates against the Backend and how to run the frontend locally against a deployed API.

Related: [Auth workflows](../features/auth.md), [API outline](../api/api-design-outline.md), and [Engineering conventions](../standards/engineering-conventions.md).

## Deployed API

The Backend is deployed on Render:

```text
https://felops-backend.onrender.com/api/v1
```

Health check: `GET https://felops-backend.onrender.com/api/v1/health` (verified 2026-11-27). Use this URL as the local dev proxy target and as the smoke-test `--url`. There is no deployed frontend yet; add its origin to `CORS_ORIGINS` when it exists.

## 1. Token transport

| Token         | Transport                                | Lifetime         | Frontend access                |
| ------------- | ---------------------------------------- | ---------------- | ------------------------------ |
| Access token  | `Authorization: Bearer <token>`          | ~15 minutes      | Read from JSON, keep in memory |
| Refresh token | `HttpOnly` cookie `felops_refresh_token` | 30 days absolute | Not readable by JavaScript     |

Sign-in, verify-email, and refresh return `{ data: { accessToken, user } }` and set the refresh cookie. Refresh and sign-out take no body; they use the cookie.

The frontend must never store the refresh token in `localStorage` or attempt to read it from `document.cookie`.

### Email verification password

The password entered on the Create Account screen is provisional. `POST /auth/verify-email` requires:

```json
{ "email": "...", "code": "123456", "password": "..." }
```

Verification sets that password as authoritative. The frontend should keep the sign-up password in memory, send it with the code, and clear it afterward. Do not persist it in browser storage. If it is lost after a reload or on another device, restart sign-up or use password reset. No extra verification field is needed for the normal flow. See [ADR-0011](../adr/ADR-0011-pre-account-hijacking-mitigation.md).

## 2. Cookie behavior

| Setting    | Development (`NODE_ENV=development`) | Production (`NODE_ENV=production`) |
| ---------- | ------------------------------------ | ---------------------------------- |
| `HttpOnly` | Yes                                  | Yes                                |
| `Secure`   | No                                   | Yes                                |
| `SameSite` | `Lax`                                | `None`                             |
| `Path`     | `/api/v1/auth`                       | `/api/v1/auth`                     |
| `Domain`   | Not set (host-only)                  | Not set (host-only)                |

`COOKIE_SECURE` is derived from `NODE_ENV`; it is not a vault value.

Production therefore requires HTTPS. A `SameSite=None` cookie without `Secure` is rejected by browsers.

## 3. Sites, origins, and why a proxy is needed

- **Origin** = scheme + host + port.
- **Site** = scheme + registrable domain.

Examples:

| Pair                                  | Same origin? | Same site? |
| ------------------------------------- | ------------ | ---------- |
| `app.example.com` / `api.example.com` | No           | Yes        |
| `localhost:3000` / `localhost:4000`   | No           | Yes        |
| `localhost:3000` / `api.example.com`  | No           | No         |
| `app.vercel.app` / `api.onrender.com` | No           | No         |

When the frontend and API are on different sites, the refresh cookie is a **third-party cookie**. Browsers may block it even when `SameSite=None; Secure` is set. Access-token requests still work; refresh sessions do not reliably survive.

The reliable options are:

1. Put both on the same registrable domain (`app.example.com` + `api.example.com`).
2. Proxy `/api` through the frontend domain so the browser only sees one site.

The Backend does not need code changes for either option. It needs the browser origin in `CORS_ORIGINS`.

## 4. Local development against a deployed API

Use a dev proxy. The browser talks to `localhost`; the proxy forwards to the deployed API. The refresh cookie becomes first-party to `localhost`.

```text
Browser localhost:3000
  -> dev-server proxy
    -> https://api.example.com
      <- Set-Cookie
  <- Set-Cookie appears to come from localhost
```

### Vite

```ts
server: {
  proxy: {
    '/api': {
      target: 'https://felops-backend.onrender.com',
      changeOrigin: true,
      secure: true,
    },
  },
},
```

### Next.js

```ts
async rewrites() {
  return [{
    source: '/api/:path*',
    destination: 'https://felops-backend.onrender.com/api/:path*',
  }];
}
```

### Frontend API base

Use a relative base:

```ts
const API_BASE = "/api/v1";
```

An absolute API URL bypasses the proxy and returns to cross-site cookie behavior.

### Backend configuration

Add the exact local origin to the deployed environment's `CORS_ORIGINS`:

```text
http://localhost:3000,https://app.example.com
```

Use the staging Backend. Do not add `localhost` to production unless there is a temporary, explicitly approved reason.

`/auth/refresh` and `/auth/sign-out` reject Origins outside `CORS_ORIGINS` with `403 FORBIDDEN`.

Also check `TRUST_PROXY`; if the Backend is behind Render and an additional proxy, `req.ip` and rate limiting depend on the real hop count.

### Secure cookie on localhost

The deployed API sets `Secure`. Modern browsers generally allow `Secure` cookies on `localhost`. If one does not, either run the dev server over local HTTPS or use a local Backend with `NODE_ENV=development`.

## 5. Production deployment

Choose one:

### Same registrable domain

```text
https://app.example.com
https://api.example.com
```

No proxy is required; the cookie is first-party. Add `https://app.example.com` to the Backend's `CORS_ORIGINS`.

### Frontend-domain proxy

```text
https://app.example.com/api/*  ->  https://felops-backend.onrender.com/api/*
```

Vercel rewrite for a Vite app:

```json
{
  "rewrites": [
    {
      "source": "/api/:path*",
      "destination": "https://api.example.com/api/:path*"
    }
  ]
}
```

The browser only sees `app.example.com`, so the refresh cookie is first-party. Add the frontend origin to `CORS_ORIGINS`.

Vercel preview deployments use changing origins. Do not rely on preview URLs for cookie sessions; use a stable custom domain or explicitly allowlist the needed preview origins.

## 6. Frontend request patterns

```ts
let accessToken: string | null = null;
let refreshPromise: Promise<boolean> | null = null;

async function refreshAccessToken(): Promise<boolean> {
  refreshPromise ??= (async () => {
    const res = await fetch("/api/v1/auth/refresh", {
      method: "POST",
      credentials: "include",
    });
    if (!res.ok) {
      accessToken = null;
      return false;
    }
    const body = await res.json();
    accessToken = body.data.accessToken;
    return true;
  })().finally(() => {
    refreshPromise = null;
  });

  return refreshPromise;
}

async function apiFetch(path: string, init: RequestInit = {}) {
  const res = await fetch(`/api/v1${path}`, {
    ...init,
    credentials: "include",
    headers: {
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...init.headers,
    },
  });

  if (res.status === 401 && path !== "/auth/refresh") {
    if (await refreshAccessToken()) {
      return apiFetch(path, init);
    }
  }

  return res;
}

async function signOut() {
  await fetch("/api/v1/auth/sign-out", {
    method: "POST",
    credentials: "include",
  });
  accessToken = null;
}
```

Rules:

- Keep the access token in memory.
- Send `credentials: 'include'` on auth requests.
- Single-flight refresh; do not fire one refresh per failed request.
- Never set `Cookie` or `Origin` manually.
- On refresh `401 SESSION_EXPIRED`, clear the token and redirect to sign-in.

## 7. Failure matrix

| Symptom                                            | Cause                                                                    |
| -------------------------------------------------- | ------------------------------------------------------------------------ |
| CORS error                                         | Origin missing from `CORS_ORIGINS`, or credentials not enabled           |
| `403 FORBIDDEN` on refresh/sign-out                | Origin not in `CORS_ORIGINS`                                             |
| `401 SESSION_EXPIRED` on refresh                   | Cookie missing, blocked, expired, or revoked                             |
| Refresh works locally, fails after deployment      | Frontend and API are different sites without a proxy                     |
| Cookie not visible in JavaScript                   | Expected; the refresh cookie is `HttpOnly`                               |
| `503 UPSTREAM_UNAVAILABLE` on sign-up/resend/reset | Email delivery failed (`details: [{ service: "email" }]`); retry is safe |

## 8. Checklist

- [ ] Frontend calls relative `/api/v1` URLs.
- [ ] Dev proxy targets the staging API.
- [ ] `http://localhost:<port>` is in staging `CORS_ORIGINS`.
- [ ] Production frontend origin is in production `CORS_ORIGINS`.
- [ ] Production uses a same-site API domain or a frontend-domain proxy.
- [ ] `TRUST_PROXY` matches the deployment topology.
- [ ] Access token stays in memory; refresh token stays in the HttpOnly cookie.
- [ ] Refresh is single-flight.
- [ ] Sign-out clears the in-memory access token.
