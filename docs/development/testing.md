# Backend testing strategy

This page explains how the Backend test suite is organized, what is real, what is mocked, and how to add tests.

## Commands

Run from the repository root:

```bash
npm run lint --prefix api
npm run typecheck --prefix api
npm test --prefix api
npm run build --prefix api
npm run openapi:check --prefix api
bash bin/check-backend-docs.sh
bash bin/check-agent-workflow.sh
```

`npm test --prefix api` sets `NODE_ENV=test` and runs Vitest once. Tests do not need Infisical credentials, a live PostgreSQL server, or EmailJS access.

## Test stack

- **Vitest 5** for the runner, mocks, fake timers, and assertions.
- **Supertest** for HTTP integration through the real Express app.
- **`@electric-sql/pglite`** for an in-memory PostgreSQL database.
- **Real Drizzle migrations** from `api/drizzle/` applied in order.

The tests execute real SQL, constraints, indexes, transactions, and `ON DELETE` behavior. There are no `InMemory*Repository` fakes.

## Test runtime

`createTestRuntime()` in `api/tests/helpers/test-runtime.ts`:

1. Parses a known `NODE_ENV=test` config with `envSchema` and calls `initConfig()`.
2. Clears the in-memory refresh grace store.
3. Creates a fresh PGlite database.
4. Executes every `api/drizzle/<migration>/migration.sql` in sorted order.
5. Creates Drizzle with the real relations and injects it via `setDatabase()`.
6. Returns helpers:
   - `runtime.reset()` — clears auth stores and the email recorder, then runs `TRUNCATE TABLE users RESTART IDENTITY CASCADE`.
   - `runtime.close()` — closes PGlite.
   - `runtime.emailSender` — records verification/reset emails instead of sending them.

Typical lifecycle:

```ts
beforeAll(async () => {
  runtime = await createTestRuntime();
});
beforeEach(async () => {
  await runtime.reset();
});
afterAll(async () => {
  await runtime.close();
});
```

## What is mocked

Only slow or external boundaries are mocked:

| Boundary                                   | Where                       | Why                                                              |
| ------------------------------------------ | --------------------------- | ---------------------------------------------------------------- |
| EmailJS (`email-sender`)                    | Auth service and HTTP tests | No network, no real inbox                                        |
| Argon2 (`hashPassword` / `verifyPassword`) | Auth service and HTTP tests | Keep tests fast                                                  |
| Rate limiter                               | Auth HTTP test only         | Its counters are module-level and not reset by `runtime.reset()` |

Everything else is real: JWT signing, HMAC codes and refresh secrets, refresh rotation, transactions, SQL, constraints, and the error pipeline.

The real Argon2id implementation is still covered by `api/tests/unit/auth.crypto.test.ts`; Jest/Vitest timing is why that test has a longer timeout.

Email delivery details and EmailJS setup are in [Email delivery](email.md).

The rate-limit wrapper itself is covered by `api/tests/integration/app.test.ts`. The auth HTTP test mocks it so accumulated counters do not make later requests flaky.

## Coverage map

| File                                   | Layer           | What it protects                                                                                                               |
| -------------------------------------- | --------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `tests/integration/app.test.ts`        | HTTP foundation | Health, request IDs, 404, malformed JSON, 500 envelope, payload limit, rate-limit wrapper                                      |
| `tests/integration/auth.test.ts`       | HTTP auth       | Sign-up → verify → me → refresh → sign-out, password reset, cookies, Origin guard                                              |
| `tests/integration/workspaces.test.ts` | HTTP workspaces | Auth requirement, validation, create/list/get, owner isolation, 10-workspace cap                                               |
| `tests/unit/auth.service.test.ts`      | Auth services   | Sign-up edge cases, latest-code invalidation, attempt lockout, expiry, sign-in states, refresh grace, reset flow, email outage |
| `tests/unit/auth.crypto.test.ts`       | Crypto          | Argon2id, HMAC codes/secrets, refresh token parsing, JWT separation                                                            |
| `tests/unit/errors.test.ts`            | Errors/config   | `AppError` hierarchy, normalizer, `COOKIE_SECURE` derivation                                                                   |
| `tests/unit/email-sender.test.ts`      | Email adapter   | EmailJS payload, template selection, and error responses                                                                       |
| `tests/unit/schema.test.ts`            | Database schema | Enums, tables, columns, nullability, indexes, foreign keys, relations                                                          |

The former `workspaces.service.test.ts` was removed because it duplicated the HTTP integration coverage for list/create/isolation/cap. Service-specific edge cases that cannot be observed over HTTP remain in `auth.service.test.ts`.

## Deployed smoke test

The automated suite is local and deterministic. A smoke test checks the deployed wiring: real database, real EmailJS delivery, real cookies, CORS, and the Origin guard.

The API is currently deployed at `https://felops-backend.onrender.com/api/v1`. There is no deployed frontend yet, so `--origin` must be an origin already present in the deployed `CORS_ORIGINS` (or a local origin you added for frontend development).

```bash
npm run smoke:auth --prefix api -- \
  --url https://felops-backend.onrender.com \
  --origin http://localhost:5173 \
  --email smoke+unique@yourdomain.com
```

Signup mode sends a real email and prompts for the 6-digit code. To skip the prompt:

```bash
npm run smoke:auth --prefix api -- \
  --url https://felops-backend.onrender.com \
  --origin http://localhost:5173 \
  --email smoke+unique@yourdomain.com \
  --code 123456
```

To test an existing verified account without email:

```bash
npm run smoke:auth --prefix api -- \
  --url https://felops-backend.onrender.com \
  --origin http://localhost:5173 \
  --email smoke@yourdomain.com \
  --mode signin \
  --password 'YourSmokePassword123!'
```

The script verifies:

1. CORS preflight returns the exact allowed origin with credentials.
2. Sign-up or sign-in succeeds and sets the refresh cookie.
3. `GET /auth/me` works with the access token.
4. Refresh rotates the cookie.
5. Refresh from a disallowed Origin returns `403`.
6. Sign-out returns `204` and the session can no longer refresh.

It prints no tokens or cookies. Signup mode creates a real account; use a dedicated smoke inbox and prefer staging. Browser-only cookie behavior (third-party policy) still needs the frontend checklist in [Frontend integration and local development](frontend-integration.md).

## What is not covered here

These need staging or manual verification:

- Real EmailJS delivery and inbox behavior.
- Infisical secret retrieval and real environment values.
- Live Supabase migration state.
- Browser third-party cookie policy across Safari, Firefox, and Chrome.
- Multiple API instances sharing in-memory rate-limit/grace state.
- True concurrent races beyond the transactional guarantees already tested.

See [Frontend integration and local development](frontend-integration.md) for the browser/cookie staging checklist.

## Adding a test

- **HTTP contract** → add to `tests/integration/*.test.ts` with Supertest.
- **Service edge case not visible over HTTP** → add to `tests/unit/*.service.test.ts`.
- **Pure function** → add to the relevant unit file.
- Use `runtime.reset()` between tests.
- Mock only external boundaries with `vi.mock`; never add `NODE_ENV === 'test'` branches to `api/src`.
- Use fake timers for TTL/grace behavior and always restore them.
- Assert the stable error envelope `{ error: { code, details? } }`, not internal messages.

## Review checklist

- [ ] A failing behavior has a test that fails before the fix.
- [ ] The test uses real SQL and migrations unless it is a pure unit test.
- [ ] External boundaries are mocked at the module edge, not replaced with fake repositories.
- [ ] Timers and mocks are restored between tests.
- [ ] The test asserts behavior, not private implementation details.
